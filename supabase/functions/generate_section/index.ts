import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { getLlmConfig, getEmbeddingConfig, getRagConfig } from '../_shared/llmConfig.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const {
            projectId,
            sectionTitle,
            instructions,
            chatMode,
            chatHistory,
            selectedDocumentPaths,
        } = await req.json()

        if (!projectId || !sectionTitle) {
            throw new Error('Missing required fields: projectId, sectionTitle')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const llmConfig = getLlmConfig()
        const embeddingConfig = getEmbeddingConfig()
        const ragConfig = getRagConfig()

        if (!llmConfig.apiKey) {
            throw new Error('No LLM API key configured (set LLM_API_KEY or OPENAI_API_KEY)')
        }

        // ── 1. Embed the query ────────────────────────────────────────────────
        const query = chatMode
            ? sectionTitle  // in chat mode, sectionTitle is the user's message
            : `Context needed for section: ${sectionTitle}. Instructions: ${instructions || 'None'}`

        const embeddingResponse = await fetch(`${embeddingConfig.baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${embeddingConfig.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: embeddingConfig.model,
                input: query,
                ...(embeddingConfig.dimensions !== 1536 ? { dimensions: embeddingConfig.dimensions } : {}),
            }),
        })

        if (!embeddingResponse.ok) {
            throw new Error('Failed to generate query embedding')
        }

        const embeddingData = await embeddingResponse.json()
        const queryEmbedding = embeddingData.data[0].embedding

        // ── 2. Search for relevant chunks ─────────────────────────────────────
        const rpcName = selectedDocumentPaths?.length
            ? 'match_document_chunks_filtered'
            : 'match_document_chunks'

        const rpcArgs: Record<string, unknown> = {
            query_embedding: queryEmbedding,
            match_threshold: ragConfig.matchThreshold,
            match_count: ragConfig.matchCount,
            p_project_id: projectId,
        }
        if (selectedDocumentPaths?.length) {
            rpcArgs.p_document_paths = selectedDocumentPaths
        }

        const { data: matchedChunks, error: matchError } = await supabaseAdmin
            .rpc(rpcName, rpcArgs)

        if (matchError) {
            console.error('Match error:', matchError)
            throw new Error('Failed to find relevant documents')
        }

        // ── 3. Build context with source attribution ───────────────────────────
        const sourceMap = new Map<string, string[]>()
        for (const chunk of (matchedChunks ?? [])) {
            const source: string =
                (chunk.metadata as Record<string, string> | null)?.fileName
                || chunk.document_path.split('/').pop()
                || 'Unknown'
            if (!sourceMap.has(source)) sourceMap.set(source, [])
            sourceMap.get(source)!.push(chunk.content)
        }

        let contextText: string
        if (sourceMap.size === 0) {
            contextText = 'No relevant project documents provided or found.'
        } else {
            contextText = ''
            for (const [source, contents] of sourceMap) {
                contextText += `\n--- Source: ${source} ---\n`
                contextText += contents.join('\n\n')
                contextText += '\n'
            }
        }

        const sources = [...sourceMap.keys()]

        // ── 4. Build prompt ───────────────────────────────────────────────────
        let messages: { role: string; content: string }[]

        if (chatMode) {
            const chatSystemPrompt =
                `You are an AI assistant for a requirements engineering tool called Aidevx.
You have access to the user's uploaded project documents as context below.
Answer questions, help draft content, summarize documents, and assist with technical writing.
When referencing information from the project context, mention which source document it comes from.
Format responses as clean HTML using only: <p>, <ul>, <ol>, <li>, <h3>, <table>, <tr>, <th>, <td>, <strong>, <em>.
Do NOT use markdown, <html>, <head>, <body>, or <style> tags.

--- PROJECT CONTEXT ---
${contextText}
-----------------------`

            const history: { role: string; content: string }[] = Array.isArray(chatHistory)
                ? chatHistory.slice(-10).map((m: { role: string; content: string }) => ({
                    role: m.role,
                    content: m.content,
                }))
                : []

            messages = [
                { role: 'system', content: chatSystemPrompt },
                ...history,
                { role: 'user', content: sectionTitle },
            ]
        } else {
            const systemPrompt =
                `You are an expert technical writer drafting a requirement specification document.
Your task is to write the content for the section titled "${sectionTitle}".
Use the provided Project Context below as your source of truth. Do not hallucinate information outside of this context, but you may infer standard technical practices where necessary.
If the context does not contain enough information, provide generic standard template text that fits the section, and bracket any placeholders like [Customer Name] or [System Name].

Format your output as clean HTML using ONLY these tags:
<p> for paragraphs, <ul>/<ol>/<li> for lists, <h3> for sub-headings within the section,
<table>/<tr>/<th>/<td> for data tables, <strong> for bold, <em> for italic.
Do NOT use markdown, <html>, <head>, <body>, or <style> tags.
Return ONLY the HTML content for this section.`

            const userPrompt =
                `Section Title: ${sectionTitle}
Section Instructions: ${instructions || 'No specific instructions. Write standard content appropriate for this section type.'}

--- PROJECT CONTEXT (from uploaded documents) ---
${contextText}
-------------------------------------------------`

            messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ]
        }

        // ── 5. Stream LLM response ────────────────────────────────────────────
        const completionResponse = await fetch(`${llmConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${llmConfig.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: llmConfig.model,
                messages,
                temperature: llmConfig.temperature,
                stream: true,
            }),
        })

        if (!completionResponse.ok || !completionResponse.body) {
            const err = await completionResponse.text()
            console.error('LLM Error:', err)
            throw new Error('Failed to generate content')
        }

        // ── 6. Stream: sources metadata event first, then LLM tokens ──────────
        const encoder = new TextEncoder()
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
        const writer = writable.getWriter()

        // Send source document names as the first event (custom type)
        writer.write(
            encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`)
        ).catch(() => {})

        // Pipe the rest of the LLM stream through
        const reader = completionResponse.body.getReader()
        ;(async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    await writer.write(value)
                }
            } catch {
                // client disconnected — ignore
            } finally {
                writer.close().catch(() => {})
            }
        })()

        return new Response(readable, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
            },
        })
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
