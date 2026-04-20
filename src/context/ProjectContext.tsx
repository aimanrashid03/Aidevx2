import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface RequirementDoc {
    id: string;
    title: string;
    type: string; // 'BRS', 'URS', etc.
    content: Record<string, unknown[]>; // Section content (Array of structural blocks)
    sectionStatuses?: Record<string, 'drafting' | 'complete'>;
    lastModified: string;
    status: 'draft' | 'final';
    currentVersion?: number;
    // OnlyOffice storage fields
    storagePath?: string | null;   // path in Supabase Storage: documents/{projectId}/{docId}/current.docx
    documentKey?: string | null;   // cache-busting key for OnlyOffice, rotated on every save
    // Last edited info (Phase 2)
    lastEditedBy?: string | null;
    lastEditedByName?: string | null;
    // Document locking (Phase 3)
    lockedBy?: string | null;
    lockedAt?: string | null;
    // CR versioning (Phase 4)
    parentDocId?: string | null;
    crNumber?: number | null;
}

export interface DocVersion {
    id: string;
    docId: string;
    projectId: string;
    versionNumber: number;
    content: Record<string, unknown[]>;
    sectionStatuses?: Record<string, 'drafting' | 'complete'>;
    title: string;
    status: string;
    createdBy: string | null;
    createdAt: string;
    changeSummary?: string;
    // OnlyOffice storage field
    storagePath?: string | null;   // path to DOCX snapshot: documents/{projectId}/{docId}/v{n}.docx
}

export interface Project {
    id: string;
    name: string;
    description: string;
    notes?: string;
    documents?: { id: string; name: string; path: string; embeddingStatus: string }[];
    requirementDocs: RequirementDoc[];
    createdAt: string;
    /** Current user's role: 'owner' if they created it, otherwise their project_members role */
    userRole?: 'owner' | 'editor' | 'viewer';
    memberCount?: number;
    ownerName?: string;
}

interface ProjectContextType {
    projects: Project[];
    loading: boolean;
    refreshProjects: () => Promise<void>;
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'requirementDocs'>) => Promise<string | null>;
    updateProject: (projectId: string, updates: Partial<Pick<Project, 'name' | 'description' | 'notes'>>) => Promise<void>;
    deleteProjectDocument: (path: string) => Promise<void>;
    deleteRequirementDoc: (id: string, projectId: string) => Promise<void>;
    saveRequirementDoc: (projectId: string, doc: RequirementDoc, changeSummary?: string) => Promise<void>;
    fetchDocVersions: (docId: string, projectId: string) => Promise<DocVersion[]>;
    restoreVersion: (version: DocVersion, projectId: string) => Promise<void>;
    restoreOnlyOfficeVersion: (version: DocVersion, projectId: string) => Promise<void>;
    // Phase 3: locking
    lockDocument: (docId: string, projectId: string) => Promise<void>;
    unlockDocument: (docId: string, projectId: string) => Promise<void>;
    // Phase 4: CR versioning
    createChangeRequest: (projectId: string, originalDocId: string, description: string) => Promise<string | null>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
        if (!user) {
            setProjects([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // 1. Fetch Projects (RLS returns owned + shared projects)
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;

            // 2. Fetch the current user's role for each project
            const projectIds = projectsData.map(p => p.id);
            const { data: memberRows } = await supabase
                .from('project_members')
                .select('project_id, role')
                .eq('user_id', user.id)
                .in('project_id', projectIds);

            const roleByProject: Record<string, string> = {};
            for (const m of memberRows || []) {
                roleByProject[m.project_id] = m.role;
            }

            // 3. Fetch all member counts in one query
            const { data: allMembers } = await supabase
                .from('project_members')
                .select('project_id')
                .in('project_id', projectIds);

            const memberCountByProject: Record<string, number> = {};
            for (const m of allMembers || []) {
                memberCountByProject[m.project_id] = (memberCountByProject[m.project_id] || 0) + 1;
            }

            // 4. Fetch owner profiles in one query
            const ownerIds = [...new Set(projectsData.map(p => p.user_id))];
            const { data: ownerProfiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', ownerIds);

            const ownerNameById: Record<string, string> = {};
            for (const profile of ownerProfiles || []) {
                if (profile.full_name) ownerNameById[profile.id] = profile.full_name;
            }

            // 5. Fetch related data for all projects
            const enrichedProjects = await Promise.all(projectsData.map(async (p) => {
                // Fetch Documents (Metadata)
                const { data: docsData } = await supabase
                    .from('project_documents')
                    .select('id, file_name, file_path, embedding_status')
                    .eq('project_id', p.id);

                // Fetch Requirement Docs
                const { data: reqDocsData } = await supabase
                    .from('requirement_docs')
                    .select('*')
                    .eq('project_id', p.id);

                // 6. Batch-fetch profiles for unique last_edited_by UUIDs in this project
                const editorIds = [...new Set(
                    (reqDocsData || [])
                        .map(d => d.last_edited_by as string | null)
                        .filter((id): id is string => Boolean(id))
                )];
                const editorNameById: Record<string, string> = {};
                if (editorIds.length > 0) {
                    const { data: editorProfiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, email')
                        .in('id', editorIds);
                    for (const ep of editorProfiles || []) {
                        editorNameById[ep.id] = ep.full_name || ep.email || ep.id;
                    }
                }

                return {
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    notes: p.notes,
                    createdAt: p.created_at,
                    userRole: (roleByProject[p.id] || (p.user_id === user.id ? 'owner' : 'viewer')) as 'owner' | 'editor' | 'viewer',
                    documents: docsData?.map(d => ({ id: d.id, name: d.file_name, path: d.file_path, embeddingStatus: d.embedding_status || 'pending' })) || [],
                    requirementDocs: reqDocsData?.map(d => ({
                        id: d.id,
                        title: d.title,
                        type: d.type,
                        content: d.content || {},
                        sectionStatuses: d.section_statuses || undefined,
                        lastModified: d.last_modified,
                        status: d.status as 'draft' | 'final',
                        currentVersion: d.current_version || 1,
                        storagePath: d.storage_path || null,
                        documentKey: d.document_key || null,
                        lastEditedBy: d.last_edited_by || null,
                        lastEditedByName: d.last_edited_by ? (editorNameById[d.last_edited_by] || null) : null,
                        lockedBy: d.locked_by || null,
                        lockedAt: d.locked_at || null,
                        parentDocId: d.parent_doc_id || null,
                        crNumber: d.cr_number || null,
                    })) || [],
                    memberCount: memberCountByProject[p.id] || 0,
                    ownerName: ownerNameById[p.user_id] || undefined,
                };
            }));

            setProjects(enrichedProjects);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'requirementDocs'>) => {
        if (!user) return null;

        try {
            const { data, error } = await supabase
                .from('projects')
                .insert({
                    user_id: user.id,
                    name: projectData.name,
                    description: projectData.description,
                    notes: projectData.notes
                })
                .select()
                .single();

            if (error) throw error;

            await fetchProjects();
            return data.id;
        } catch (error) {
            console.error('Error adding project:', error);
            return null;
        }
    };

    const saveRequirementDoc = async (projectId: string, doc: RequirementDoc, changeSummary?: string) => {
        if (!user) return;

        try {
            // 1. Check if doc already exists (for versioning snapshot)
            const { data: existing } = await supabase
                .from('requirement_docs')
                .select('id, content, title, status, current_version, section_statuses')
                .eq('id', doc.id)
                .eq('project_id', projectId)
                .single();

            let nextVersion = 1;

            if (existing) {
                // 2. Snapshot current content into doc_versions
                const currentVersion = existing.current_version || 1;
                nextVersion = currentVersion + 1;

                await supabase
                    .from('doc_versions')
                    .insert({
                        doc_id: doc.id,
                        project_id: projectId,
                        version_number: currentVersion,
                        content: existing.content || {},
                        section_statuses: existing.section_statuses,
                        title: existing.title,
                        status: existing.status,
                        created_by: user.id,
                        change_summary: changeSummary || null,
                    });
            }

            // 3. Upsert the current document with new content
            const { error } = await supabase
                .from('requirement_docs')
                .upsert({
                    id: doc.id,
                    project_id: projectId,
                    title: doc.title,
                    type: doc.type,
                    content: doc.content,
                    section_statuses: doc.sectionStatuses || null,
                    status: doc.status,
                    current_version: nextVersion,
                    last_modified: new Date().toISOString()
                });

            if (error) throw error;
            await fetchProjects();
        } catch (error) {
            console.error('Error saving document:', error);
        }
    };

    const fetchDocVersions = async (docId: string, projectId: string): Promise<DocVersion[]> => {
        try {
            const { data, error } = await supabase
                .from('doc_versions')
                .select('*')
                .eq('doc_id', docId)
                .eq('project_id', projectId)
                .order('version_number', { ascending: false });

            if (error) throw error;

            return (data || []).map(v => ({
                id: v.id,
                docId: v.doc_id,
                projectId: v.project_id,
                versionNumber: v.version_number,
                content: v.content || {},
                sectionStatuses: v.section_statuses || undefined,
                title: v.title,
                status: v.status,
                createdBy: v.created_by,
                createdAt: v.created_at,
                changeSummary: v.change_summary,
                storagePath: v.storage_path || null,
            }));
        } catch (error) {
            console.error('Error fetching versions:', error);
            return [];
        }
    };

    const restoreVersion = async (version: DocVersion, projectId: string) => {
        if (!user) return;

        try {
            // Save current state as a version first, then overwrite with restored content
            const restoredDoc: RequirementDoc = {
                id: version.docId,
                title: version.title,
                type: '', // type doesn't change, we'll read it
                content: version.content,
                sectionStatuses: version.sectionStatuses,
                lastModified: new Date().toISOString(),
                status: 'draft',
            };

            // Get current doc type
            const { data: current } = await supabase
                .from('requirement_docs')
                .select('type')
                .eq('id', version.docId)
                .eq('project_id', projectId)
                .single();

            restoredDoc.type = current?.type || 'BRS';

            await saveRequirementDoc(projectId, restoredDoc, `Restored from version ${version.versionNumber}`);
        } catch (error) {
            console.error('Error restoring version:', error);
        }
    };

    const restoreOnlyOfficeVersion = async (version: DocVersion, projectId: string) => {
        if (!user || !version.storagePath) return;

        try {
            const currentRelPath = `${projectId}/${version.docId}/current.docx`;
            const currentPath = `documents/${currentRelPath}`;

            // ── Snapshot current.docx → v{n}.docx before overwriting ────────────
            const { data: currentDocRow } = await supabase
                .from('requirement_docs')
                .select('current_version, title, status, section_statuses')
                .eq('id', version.docId)
                .eq('project_id', projectId)
                .single();

            const nextVersion = (currentDocRow?.current_version ?? 1) + 1;

            if (currentDocRow) {
                const snapshotVersion = currentDocRow.current_version ?? 1;
                const { data: currentBlob } = await supabase.storage
                    .from('documents')
                    .download(currentRelPath);

                if (currentBlob) {
                    const versionPath = `${projectId}/${version.docId}/v${snapshotVersion}.docx`;
                    await supabase.storage
                        .from('documents')
                        .upload(versionPath, currentBlob, {
                            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            upsert: true,
                        });
                    await supabase.from('doc_versions').insert({
                        doc_id: version.docId,
                        project_id: projectId,
                        version_number: snapshotVersion,
                        content: null,
                        storage_path: `documents/${versionPath}`,
                        section_statuses: currentDocRow.section_statuses,
                        title: currentDocRow.title,
                        status: currentDocRow.status,
                        created_by: user.id,
                        change_summary: `Snapshot before restoring to v${version.versionNumber}`,
                    });
                }
            }
            // ── End snapshot ──────────────────────────────────────────────────────

            // Download the version snapshot DOCX
            const versionRelPath = version.storagePath.startsWith('documents/')
                ? version.storagePath.slice('documents/'.length)
                : version.storagePath;

            const { data: versionFile, error: downloadErr } = await supabase.storage
                .from('documents')
                .download(versionRelPath);

            if (downloadErr || !versionFile) throw new Error('Could not download version file');

            // Upload it as the new current.docx
            const { error: uploadErr } = await supabase.storage
                .from('documents')
                .upload(currentRelPath, versionFile, {
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    upsert: true,
                });

            if (uploadErr) throw uploadErr;

            // Rotate the document key so OnlyOffice reloads and increment version
            const newKey = `${version.docId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            const { error: dbErr } = await supabase
                .from('requirement_docs')
                .update({
                    storage_path: currentPath,
                    document_key: newKey,
                    current_version: nextVersion,
                    last_modified: new Date().toISOString(),
                })
                .eq('id', version.docId)
                .eq('project_id', projectId);

            if (dbErr) throw dbErr;

            await fetchProjects();
        } catch (error) {
            console.error('Error restoring OnlyOffice version:', error);
            throw error;
        }
    };

    // ── Phase 3: Document Locking ────────────────────────────────────────────

    const lockDocument = async (docId: string, projectId: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('requirement_docs')
            .update({ locked_by: user.id, locked_at: new Date().toISOString() })
            .eq('id', docId)
            .eq('project_id', projectId);
        if (error) console.error('Error locking document:', error);
        else await fetchProjects();
    };

    const unlockDocument = async (docId: string, projectId: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('requirement_docs')
            .update({ locked_by: null, locked_at: null })
            .eq('id', docId)
            .eq('project_id', projectId);
        if (error) console.error('Error unlocking document:', error);
        else await fetchProjects();
    };

    // ── Phase 4: Change Request Versioning ──────────────────────────────────

    const createChangeRequest = async (
        projectId: string,
        originalDocId: string,
        description: string,
    ): Promise<string | null> => {
        if (!user) return null;

        try {
            // 1. Get next CR number
            const { data: existingCRs } = await supabase
                .from('change_requests')
                .select('cr_number')
                .eq('project_id', projectId)
                .eq('original_doc_id', originalDocId)
                .order('cr_number', { ascending: false })
                .limit(1);

            const nextCR = ((existingCRs?.[0]?.cr_number as number) ?? 0) + 1;

            // 2. Fetch original doc
            const { data: origDoc, error: origErr } = await supabase
                .from('requirement_docs')
                .select('*')
                .eq('id', originalDocId)
                .eq('project_id', projectId)
                .single();

            if (origErr || !origDoc) throw new Error('Original document not found');

            // 3. Build CR doc ID and clone storage
            const crDocId = `${originalDocId}-cr-${nextCR}`;
            const origBucketPath = `${projectId}/${originalDocId}/current.docx`;
            const crBucketPath = `${projectId}/${crDocId}/current.docx`;

            const { data: docxBlob } = await supabase.storage
                .from('documents')
                .download(origBucketPath);

            if (docxBlob) {
                await supabase.storage.from('documents').upload(crBucketPath, docxBlob, {
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    upsert: true,
                });
            }

            // 4. Insert CR doc record
            const newKey = `${crDocId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const { error: insertErr } = await supabase.from('requirement_docs').insert({
                id: crDocId,
                project_id: projectId,
                title: `${origDoc.title} — CR-${nextCR}`,
                type: origDoc.type,
                content: null,
                storage_path: `documents/${crBucketPath}`,
                document_key: newKey,
                status: 'draft',
                current_version: 1,
                parent_doc_id: originalDocId,
                cr_number: nextCR,
                last_modified: new Date().toISOString(),
            });

            if (insertErr) throw insertErr;

            // 5. Auto-lock the original document
            await supabase
                .from('requirement_docs')
                .update({ locked_by: user.id, locked_at: new Date().toISOString() })
                .eq('id', originalDocId)
                .eq('project_id', projectId);

            // 6. Insert change_requests tracking row
            await supabase.from('change_requests').insert({
                project_id: projectId,
                original_doc_id: originalDocId,
                cr_doc_id: crDocId,
                cr_number: nextCR,
                status: 'draft',
                created_by: user.id,
                description,
            });

            await fetchProjects();
            return crDocId;
        } catch (error) {
            console.error('Error creating change request:', error);
            return null;
        }
    };

    const updateProject = async (projectId: string, updates: Partial<Pick<Project, 'name' | 'description' | 'notes'>>) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('projects')
                .update(updates)
                .eq('id', projectId);

            if (error) throw error;
            await fetchProjects();
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    };

    const deleteProjectDocument = async (path: string) => {
        if (!user) return;
        try {
            // Remove from storage
            const { error: storageError } = await supabase.storage
                .from('project-files')
                .remove([path]);

            if (storageError) throw storageError;

            const { error: dbError } = await supabase
                .from('project_documents')
                .delete()
                .eq('file_path', path);

            if (dbError) throw dbError;

            await fetchProjects();
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    };

    const deleteRequirementDoc = async (id: string, projectId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('requirement_docs')
                .delete()
                .eq('id', id)
                .eq('project_id', projectId);

            if (error) throw error;

            await fetchProjects();
        } catch (error) {
            console.error('Error deleting requirement document:', error);
            throw error;
        }
    };

    return (
        <ProjectContext.Provider value={{
            projects,
            loading,
            refreshProjects: fetchProjects,
            addProject,
            updateProject,
            deleteProjectDocument,
            deleteRequirementDoc,
            saveRequirementDoc,
            fetchDocVersions,
            restoreVersion,
            restoreOnlyOfficeVersion,
            lockDocument,
            unlockDocument,
            createChangeRequest,
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjects() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
}
