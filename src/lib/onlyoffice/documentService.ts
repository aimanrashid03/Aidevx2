import { supabase } from '../supabase';
import { buildDocx } from '../export/docxBuilder';
import { buildUrsDocxTemplate, buildUrsSectionConfig } from '../export/ursDocxTemplate';
import { tiptapJsonToDocxChildren } from '../../tiptap/converters/tiptapToDocx';
import { migrateToTiptap } from '../../tiptap/converters/legacyToTiptap';
import { structureToTiptapDoc } from '../../tiptap/converters/ursStructureToTiptap';
import { DOC_STRUCTURES } from '../../constants/docs';
import { Document, Packer } from 'docx';
import type { RequirementDoc } from '../../context/ProjectContext';
import type { DocSection } from '../../constants/urs_structure';

// ─── Key & path helpers ────────────────────────────────────────────────────────

/**
 * Generate a unique document key for OnlyOffice cache busting.
 * Must change on every save to force the editor to reload from storage.
 */
export function generateDocumentKey(docId: string): string {
    return `${docId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Storage path for the live document DOCX. */
export function getDocStoragePath(projectId: string, docId: string): string {
    return `documents/${projectId}/${docId}/current.docx`;
}

/** Storage path for a versioned DOCX snapshot. */
export function getVersionStoragePath(projectId: string, docId: string, versionNumber: number): string {
    return `documents/${projectId}/${docId}/v${versionNumber}.docx`;
}

// ─── Storage upload ────────────────────────────────────────────────────────────

/**
 * Uploads a DOCX blob to Supabase Storage and returns the public URL.
 * The storagePath is relative to the bucket root, e.g. "documents/{projectId}/{docId}/current.docx".
 */
export async function uploadDocxToStorage(blob: Blob, storagePath: string): Promise<string> {
    // Strip leading "documents/" — storage.upload path is relative to the bucket
    const bucketPath = storagePath.startsWith('documents/')
        ? storagePath.slice('documents/'.length)
        : storagePath;

    const { error } = await supabase.storage
        .from('documents')
        .upload(bucketPath, blob, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true,
        });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data } = supabase.storage.from('documents').getPublicUrl(bucketPath);
    return data.publicUrl;
}

/**
 * Returns the public URL for an already-uploaded document.
 */
export function getDocPublicUrl(storagePath: string): string {
    const bucketPath = storagePath.startsWith('documents/')
        ? storagePath.slice('documents/'.length)
        : storagePath;
    return supabase.storage.from('documents').getPublicUrl(bucketPath).data.publicUrl;
}

// ─── DOCX generation ──────────────────────────────────────────────────────────

/**
 * Converts an existing document (any format) or creates a blank document
 * into a DOCX Blob, then uploads it to Supabase Storage.
 *
 * Handles three cases:
 *   1. New document (doc === null): generates from template structure
 *   2. Tiptap-v1 format: converts via tiptapJsonToDocxChildren
 *   3. Legacy block format: migrates to Tiptap first, then converts
 *
 * Returns: { storagePath, documentKey, publicUrl }
 */
export async function initializeDocxForDoc(
    doc: RequirementDoc | null,
    projectId: string,
    docId: string,
    projectName: string,
    docTitle: string,
    docType: string,
): Promise<{ storagePath: string; documentKey: string; publicUrl: string }> {
    const structure = (DOC_STRUCTURES[docType] || DOC_STRUCTURES['BRS']) as (string | DocSection)[];
    const storagePath = getDocStoragePath(projectId, docId);
    const documentKey = generateDocumentKey(docId);

    let blob: Blob;

    if (!doc) {
        // ── Case 1: Brand-new document — generate from structure ──────────────
        if (docType === 'URS') {
            // URS: use cover page template + structure-based body
            const tiptapDoc = structureToTiptapDoc(structure as DocSection[]);
            const bodyChildren = await tiptapJsonToDocxChildren(tiptapDoc.doc);
            const ursOpts = await buildUrsDocxTemplate(projectName, docTitle);
            const section = buildUrsSectionConfig(ursOpts, bodyChildren);
            const wordDoc = new Document({ sections: [section] });
            blob = await Packer.toBlob(wordDoc);
        } else {
            blob = await buildDocx({
                projectName,
                docTitle,
                docType,
                structure,
                sectionContent: {} as Record<number, Record<string, unknown>[]>,
            });
        }
    } else {
        const rawContent = doc.content as unknown as Record<string, unknown>;

        if (rawContent?.__format === 'tiptap-v1') {
            // ── Case 2: Tiptap-v1 format ─────────────────────────────────────
            const tiptapDoc = rawContent.doc as import('@tiptap/core').JSONContent;
            const bodyChildren = await tiptapJsonToDocxChildren(tiptapDoc);

            if (docType === 'URS') {
                const ursOpts = await buildUrsDocxTemplate(projectName, docTitle);
                const section = buildUrsSectionConfig(ursOpts, bodyChildren);
                const wordDoc = new Document({ sections: [section] });
                blob = await Packer.toBlob(wordDoc);
            } else {
                // Non-URS tiptap: generate heading+content from the Tiptap JSON directly
                const wordDoc = new Document({
                    sections: [{
                        properties: {
                            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
                        },
                        children: bodyChildren,
                    }],
                });
                blob = await Packer.toBlob(wordDoc);
            }
        } else {
            // ── Case 3: Legacy block format — migrate first ───────────────────
            const migrated = migrateToTiptap(doc.content, structure);
            const bodyChildren = await tiptapJsonToDocxChildren(migrated.doc);

            if (docType === 'URS') {
                const ursOpts = await buildUrsDocxTemplate(projectName, docTitle);
                const section = buildUrsSectionConfig(ursOpts, bodyChildren);
                const wordDoc = new Document({ sections: [section] });
                blob = await Packer.toBlob(wordDoc);
            } else {
                const wordDoc = new Document({
                    sections: [{
                        properties: {
                            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
                        },
                        children: bodyChildren,
                    }],
                });
                blob = await Packer.toBlob(wordDoc);
            }
        }
    }

    const publicUrl = await uploadDocxToStorage(blob, storagePath);
    return { storagePath, documentKey, publicUrl };
}

// ─── OnlyOffice config builder ─────────────────────────────────────────────────

interface OnlyOfficeConfigParams {
    docId: string;
    projectId: string;
    docTitle: string;
    publicUrl: string;
    documentKey: string;
    callbackUrl: string;
    mode: 'edit' | 'view';
    userId: string;
    userDisplayName: string;
}

/**
 * Returns the config object expected by DocsAPI.DocEditor.
 * The document.key must be unique per document version; rotate it on every save.
 */
export function getOnlyOfficeConfig(params: OnlyOfficeConfigParams): object {
    return {
        document: {
            fileType: 'docx',
            key: params.documentKey,
            title: `${params.docTitle}.docx`,
            url: params.publicUrl,
            permissions: {
                edit: params.mode === 'edit',
                download: true,
                print: true,
                comment: false,
            },
        },
        documentType: 'word',
        editorConfig: {
            callbackUrl: params.callbackUrl,
            lang: 'en',
            mode: params.mode,
            user: {
                id: params.userId,
                name: params.userDisplayName,
            },
            customization: {
                autosave: true,
                forcesave: false,
                compactToolbar: false,
                hideRightMenu: true,
                toolbarNoTabs: false,
            },
        },
    };
}
