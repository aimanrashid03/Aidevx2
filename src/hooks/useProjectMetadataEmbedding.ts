import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useProjects } from '../context/ProjectContext'

type MetadataField = 'description' | 'notes'

const FIELD_CONFIG: Record<MetadataField, { fileName: string; statusCol: string }> = {
    description: { fileName: 'Project Description', statusCol: 'description_embedding_status' },
    notes: { fileName: 'Project Notes', statusCol: 'notes_embedding_status' },
}

/**
 * Embeds a project metadata field (description or notes) into document_chunks.
 * Safe to call fire-and-forget (e.g. from AddProject after navigation).
 * Empty content deletes existing chunks and resets status to 'pending'.
 */
export async function embedProjectField(
    projectId: string,
    field: MetadataField,
    content: string,
): Promise<void> {
    if (!projectId) return
    const { fileName, statusCol } = FIELD_CONFIG[field]
    const documentPath = `project-${field}/${projectId}`

    if (!content.trim()) {
        await supabase
            .from('document_chunks')
            .delete()
            .eq('project_id', projectId)
            .eq('document_path', documentPath)
        await supabase.from('projects').update({ [statusCol]: 'pending' }).eq('id', projectId)
        return
    }

    await supabase.from('projects').update({ [statusCol]: 'processing' }).eq('id', projectId)
    try {
        const { error } = await supabase.functions.invoke('embed_document', {
            body: {
                projectId,
                documentPath,
                content,
                extraMetadata: { fileName, source: 'project-metadata' },
            },
        })
        if (error) throw error
        await supabase.from('projects').update({ [statusCol]: 'processed' }).eq('id', projectId)
        supabase.functions.invoke('assess_coverage', { body: { projectId, docType: 'BRS' } }).catch(() => {})
    } catch (err) {
        console.error(`embedProjectField(${field}) failed:`, err)
        await supabase.from('projects').update({ [statusCol]: 'failed' }).eq('id', projectId)
    }
}

/**
 * Hook for components with a stable projectId (e.g. ProjectDetails).
 * Calls refreshProjects() after each embed so context badges stay in sync.
 */
export function useProjectMetadataEmbedding(projectId: string) {
    const { refreshProjects } = useProjects()

    const embedDescription = useCallback(async (content: string) => {
        if (!projectId) return
        await embedProjectField(projectId, 'description', content)
        await refreshProjects()
    }, [projectId, refreshProjects])

    const embedNotes = useCallback(async (content: string) => {
        if (!projectId) return
        await embedProjectField(projectId, 'notes', content)
        await refreshProjects()
    }, [projectId, refreshProjects])

    return { embedDescription, embedNotes }
}
