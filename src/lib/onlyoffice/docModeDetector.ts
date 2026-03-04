import type { RequirementDoc } from '../../context/ProjectContext';

export type DocMode = 'onlyoffice' | 'tiptap-v1' | 'legacy';

/**
 * Determines how a document's content is stored, used to pick the correct
 * initialization path when opening the editor.
 */
export function detectDocMode(doc: RequirementDoc): DocMode {
    if (doc.storagePath) return 'onlyoffice';
    const c = doc.content as unknown as Record<string, unknown>;
    if (c?.__format === 'tiptap-v1') return 'tiptap-v1';
    return 'legacy';
}
