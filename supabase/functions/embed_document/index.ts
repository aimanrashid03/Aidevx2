import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { getEmbeddingConfig } from '../_shared/llmConfig.ts'
import { chunkText } from '../_shared/chunker.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 20  // Max chunks per embedding API call

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { projectId, documentPath, content } = await req.json()

        if (!projectId || !documentPath || !content) {
            throw new Error('Missing required fields: projectId, documentPath, content')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const embeddingConfig = getEmbeddingConfig()
        if (!embeddingConfig.apiKey) {
            throw new Error('No embedding API key configured (set EMBEDDING_API_KEY or OPENAI_API_KEY)')
        }

        // ── 1. Delete existing chunks for this document (dedup on re-upload) ──
        const { error: deleteError } = await supabaseAdmin
            .from('document_chunks')
            .delete()
            .eq('project_id', projectId)
            .eq('document_path', documentPath)

        if (deleteError) {
            console.error('Delete error (non-fatal):', deleteError)
        }

        // ── 2. Smart chunking ──────────────────────────────────────────────────
        const chunks = chunkText(content, documentPath)
        console.log(`Processing ${chunks.length} chunks for document: ${documentPath}`)

        if (chunks.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No chunks extracted.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 3. Batch embed + insert ────────────────────────────────────────────
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE)
            const inputs = batch.map(c => c.content)

            const embeddingResponse = await fetch(`${embeddingConfig.baseUrl}/embeddings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${embeddingConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: embeddingConfig.model,
                    input: inputs,
                    ...(embeddingConfig.dimensions !== 1536 ? { dimensions: embeddingConfig.dimensions } : {}),
                }),
            })

            if (!embeddingResponse.ok) {
                const err = await embeddingResponse.text()
                console.error('Embedding API Error:', err)
                throw new Error('Failed to generate embeddings')
            }

            const embeddingData = await embeddingResponse.json()
            const embeddings: number[][] = embeddingData.data
                .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
                .map((e: { embedding: number[] }) => e.embedding)

            const rows = batch.map((chunk, j) => ({
                project_id: projectId,
                document_path: documentPath,
                content: chunk.content,
                embedding: embeddings[j],
                metadata: chunk.metadata,
                embedding_model: embeddingConfig.model,
                chunk_index: chunk.metadata.chunkIndex,
            }))

            const { error: insertError } = await supabaseAdmin
                .from('document_chunks')
                .insert(rows)

            if (insertError) {
                console.error('Supabase insert error:', insertError)
                throw new Error('Failed to insert chunks')
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Successfully processed ${chunks.length} chunks.`,
                chunks: chunks.length,
                model: embeddingConfig.model,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
