/**
 * Shared RAG helper: embedding, chunk search, and context assembly.
 * Used by both `generate_section` and `auto_generate_document`.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export interface EmbeddingConfig {
    baseUrl: string
    apiKey: string
    model: string
    dimensions: number
}

export interface RagConfig {
    matchThreshold: number
    matchCount: number
}

export interface MatchedChunk {
    id: string
    content: string
    document_path: string
    similarity: number
    metadata: Record<string, string> | null
}

export interface RagResult {
    contextText: string
    sources: string[]
    contextQuality: 'none' | 'low' | 'medium' | 'high'
    chunkCount: number
}

/** Embed a single query string. */
export async function embedQuery(query: string, config: EmbeddingConfig): Promise<number[]> {
    const res = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config.model,
            input: query,
            ...(config.dimensions !== 1536 ? { dimensions: config.dimensions } : {}),
        }),
    })
    if (!res.ok) throw new Error('Failed to generate query embedding')
    const data = await res.json()
    return data.data[0].embedding
}

/** Search document chunks with a given embedding vector. */
export async function searchChunks(
    embedding: number[],
    projectId: string,
    selectedDocumentPaths: string[] | undefined,
    ragConfig: RagConfig,
    supabaseClient: SupabaseClient,
): Promise<MatchedChunk[]> {
    const rpcName = selectedDocumentPaths?.length
        ? 'match_document_chunks_filtered'
        : 'match_document_chunks'
    const rpcArgs: Record<string, unknown> = {
        query_embedding: embedding,
        match_threshold: ragConfig.matchThreshold,
        match_count: ragConfig.matchCount,
        p_project_id: projectId,
    }
    if (selectedDocumentPaths?.length) {
        rpcArgs.p_document_paths = selectedDocumentPaths
    }
    const { data, error } = await supabaseClient.rpc(rpcName, rpcArgs)
    if (error) { console.error('Match error:', error); return [] }
    return data ?? []
}

/** Merge and deduplicate chunks by id, keeping highest similarity. */
export function deduplicateChunks(searchResults: MatchedChunk[][]): MatchedChunk[] {
    const chunkMap = new Map<string, MatchedChunk>()
    for (const results of searchResults) {
        for (const chunk of results) {
            const existing = chunkMap.get(chunk.id)
            if (!existing || chunk.similarity > existing.similarity) {
                chunkMap.set(chunk.id, chunk)
            }
        }
    }
    return [...chunkMap.values()].sort((a, b) => b.similarity - a.similarity)
}

/** Build context text with source attribution from matched chunks.
 *  @param maxChars  Hard cap on total context length to avoid consuming the LLM
 *                   token budget. Defaults to 6000 chars (~1500 tokens).
 */
export function buildContextText(chunks: MatchedChunk[], maxChars = 6000): string {
    const sourceMap = new Map<string, string[]>()
    for (const chunk of chunks) {
        const source: string =
            (chunk.metadata as Record<string, string> | null)?.fileName
            || chunk.document_path.split('/').pop()
            || 'Unknown'
        if (!sourceMap.has(source)) sourceMap.set(source, [])
        sourceMap.get(source)!.push(chunk.content)
    }

    if (sourceMap.size === 0) {
        return 'No relevant project documents provided or found.'
    }

    let text = ''
    for (const [source, contents] of sourceMap) {
        const block = `\n--- Source: ${source} ---\n${contents.join('\n\n')}\n`
        if (text.length + block.length > maxChars) {
            // Fit as much of this source as possible, then stop
            const remaining = maxChars - text.length
            if (remaining > 100) text += block.slice(0, remaining) + '\n...(truncated)'
            break
        }
        text += block
    }
    return text
}

/** Get source file names from matched chunks. */
export function getSources(chunks: MatchedChunk[]): string[] {
    const sourceSet = new Set<string>()
    for (const chunk of chunks) {
        const source =
            (chunk.metadata as Record<string, string> | null)?.fileName
            || chunk.document_path.split('/').pop()
            || 'Unknown'
        sourceSet.add(source)
    }
    return [...sourceSet]
}

/** Assess context quality based on average similarity. */
export function assessContextQuality(chunks: MatchedChunk[]): 'none' | 'low' | 'medium' | 'high' {
    if (chunks.length === 0) return 'none'
    const avg = chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
    if (avg > 0.6) return 'high'
    if (avg > 0.4) return 'medium'
    return 'low'
}

/**
 * Full RAG pipeline: embed queries → search → deduplicate → build context.
 * Runs two parallel queries (direct + template-aware) for better recall.
 */
export async function performRag(
    sectionTitle: string,
    templateInstructions: string,
    parentSection: string,
    docType: string,
    projectId: string,
    selectedDocumentPaths: string[] | undefined,
    embeddingConfig: EmbeddingConfig,
    ragConfig: RagConfig,
    supabaseClient: SupabaseClient,
    userInstructions?: string,
): Promise<RagResult> {
    const query1 = `Context needed for ${docType} section: ${sectionTitle}. ${userInstructions || ''}`
    const query2 = `${docType} ${parentSection} ${sectionTitle} ${templateInstructions}`

    const embeddings = await Promise.all([
        embedQuery(query1, embeddingConfig),
        embedQuery(query2, embeddingConfig),
    ])
    const searchResults = await Promise.all(
        embeddings.map(e => searchChunks(e, projectId, selectedDocumentPaths, ragConfig, supabaseClient))
    )

    const chunks = deduplicateChunks(searchResults)
    console.log(`RAG: ${chunks.length} chunks matched for project ${projectId}, section "${sectionTitle}"`)

    return {
        contextText: buildContextText(chunks),
        sources: getSources(chunks),
        contextQuality: assessContextQuality(chunks),
        chunkCount: chunks.length,
    }
}
