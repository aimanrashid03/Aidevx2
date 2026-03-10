import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { getLlmConfig, getEmbeddingConfig, getRagConfig, getContentTypeConfig } from '../_shared/llmConfig.ts'
import { URS_TEXT_EXAMPLE, URS_TABLE_EXAMPLE, URS_DIAGRAM_EXAMPLE } from '../_shared/ursExamples.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TableSchema {
    columns: string[]
    exampleData?: string[][]
}

interface SectionContext {
    instructions?: string[]
    expectedFormat?: 'text' | 'table' | 'mixed' | 'diagram'
    tableSchemas?: TableSchema[]
    parentSection?: string | null
    siblingTitles?: string[]
    diagramHint?: string | null
}

interface RefinementContext {
    previousOutput: string
    feedback: string
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
            contentType = 'text',
            diagramFormat = 'mermaid',
            docType = 'BRS',
            sectionContext,
            documentOutline,
            refinementContext,
        }: {
            projectId: string
            sectionTitle: string
            instructions?: string
            chatMode?: boolean
            chatHistory?: { role: string; content: string }[]
            selectedDocumentPaths?: string[]
            contentType?: 'text' | 'table' | 'diagram'
            diagramFormat?: 'mermaid' | 'drawio'
            docType?: string
            sectionContext?: SectionContext
            documentOutline?: string[]
            refinementContext?: RefinementContext
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
        const ctConfig = getContentTypeConfig(contentType, !!chatMode)

        if (!llmConfig.apiKey) {
            throw new Error('No LLM API key configured (set LLM_API_KEY or OPENAI_API_KEY)')
        }

        // ── Helper: embed a single query ──────────────────────────────────────
        async function embedQuery(query: string): Promise<number[]> {
            const res = await fetch(`${embeddingConfig.baseUrl}/embeddings`, {
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
            if (!res.ok) throw new Error('Failed to generate query embedding')
            const data = await res.json()
            return data.data[0].embedding
        }

        // ── Helper: search chunks with a given embedding ──────────────────────
        async function searchChunks(embedding: number[]): Promise<{ id: string; content: string; document_path: string; similarity: number; metadata: Record<string, string> | null }[]> {
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
            const { data, error } = await supabaseAdmin.rpc(rpcName, rpcArgs)
            if (error) { console.error('Match error:', error); return [] }
            return data ?? []
        }

        // ── 1. Build multi-query embeddings ───────────────────────────────────
        const query1 = chatMode
            ? sectionTitle
            : `Context needed for ${docType} section: ${sectionTitle}. ${instructions || ''}`

        const templateInstructions = sectionContext?.instructions?.join(' ').slice(0, 300) || ''
        const parentSection = sectionContext?.parentSection || ''
        const query2 = chatMode ? '' : `${docType} ${parentSection} ${sectionTitle} ${templateInstructions}`

        const encoder = new TextEncoder()
        const statusEvent = encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Searching documents…' })}\n\n`)

        // ── 2. Parallel embedding + search ────────────────────────────────────
        const embedPromises = chatMode
            ? [embedQuery(query1)]
            : [embedQuery(query1), embedQuery(query2)]

        const embeddings = await Promise.all(embedPromises)
        const searchResults = await Promise.all(embeddings.map(e => searchChunks(e)))

        // Merge + deduplicate chunks by id, keeping highest similarity
        const chunkMap = new Map<string, typeof searchResults[0][0]>()
        for (const results of searchResults) {
            for (const chunk of results) {
                const existing = chunkMap.get(chunk.id)
                if (!existing || chunk.similarity > existing.similarity) {
                    chunkMap.set(chunk.id, chunk)
                }
            }
        }
        const matchedChunks = [...chunkMap.values()].sort((a, b) => b.similarity - a.similarity)

        // ── 3. Build context with source attribution ───────────────────────────
        const sourceMap = new Map<string, string[]>()
        for (const chunk of matchedChunks) {
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

        // ── 4. Build document outline block ───────────────────────────────────
        const outlineBlock = (documentOutline?.length && !chatMode)
            ? `\nDOCUMENT OUTLINE (for cross-section awareness):\n${documentOutline.map(s => `  - ${s}`).join('\n')}\n\nYou are writing: "${sectionTitle}"\nDo not duplicate content belonging in other sections. Reference other sections where appropriate (e.g. "as described in Section 3.1").\n`
            : ''

        // ── 5. Build prompt based on mode + content type ──────────────────────
        let messages: { role: string; content: string }[]

        if (chatMode) {
            const chatSystemPrompt =
                `You are an AI assistant for a requirements engineering tool called Aidevx.
You have access to the user's uploaded project documents as context below.
Answer questions, help draft content, summarize documents, and assist with technical writing.
When referencing information from the project context, mention which source document it comes from.
Format responses as clean HTML using only: <p>, <ul>, <ol>, <li>, <h3>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <em>.
Do NOT use markdown, <html>, <head>, <body>, or <style> tags.

--- PROJECT CONTEXT ---
${contextText}
-----------------------`

            const history = Array.isArray(chatHistory)
                ? chatHistory.slice(-10).map((m) => ({ role: m.role, content: m.content }))
                : []

            messages = [
                { role: 'system', content: chatSystemPrompt },
                ...history,
                { role: 'user', content: sectionTitle },
            ]
        } else {
            // Build template guidance block
            const guidanceLines: string[] = []
            if (sectionContext?.instructions?.length) {
                guidanceLines.push('TEMPLATE GUIDANCE:')
                sectionContext.instructions.forEach(inst => guidanceLines.push(`  - ${inst}`))
            }
            if (sectionContext?.parentSection) {
                guidanceLines.push(`PARENT SECTION: ${sectionContext.parentSection}`)
            }
            if (sectionContext?.siblingTitles?.length) {
                guidanceLines.push(`RELATED SECTIONS: ${sectionContext.siblingTitles.slice(0, 5).join(', ')}`)
            }
            const guidanceBlock = guidanceLines.length > 0 ? '\n' + guidanceLines.join('\n') + '\n' : ''

            let systemPrompt: string
            let userPrompt: string

            if (contentType === 'table') {
                const schema = sectionContext?.tableSchemas?.[0]
                const columnList = schema?.columns?.join(', ') || 'appropriate columns for this section'
                const exampleRow = schema?.exampleData?.[0]?.join(' | ') || ''
                const fewShot = docType === 'URS' ? `\nEXAMPLE OUTPUT (use as style/format reference):\n${URS_TABLE_EXAMPLE}\n` : ''

                systemPrompt =
                    `You are an expert technical writer drafting a ${docType} requirements document.
Your task is to generate a data table for the section titled "${sectionTitle}".
${guidanceBlock}
${outlineBlock}
RULES:
- Output a complete HTML <table> with <thead> and <tbody>
- Use EXACTLY these column headers: ${columnList}
${exampleRow ? `- Example row format: ${exampleRow}` : ''}
- Populate rows using facts from the Project Context below
- If context is insufficient, add rows with [placeholder] values
- Add a caption as <p><strong>Table: ${sectionTitle}</strong></p> before the table
- Use ONLY these HTML tags: <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <em>
- Do NOT use markdown or any other tags
- Every requirement must use MoSCoW priority: M (Must), S (Should), C (Could), W (Won't)
${fewShot}`

                userPrompt =
                    `Section: ${sectionTitle}
Additional instructions: ${instructions || 'None'}

--- PROJECT CONTEXT ---
${contextText}
-----------------------`

            } else if (contentType === 'diagram') {
                const diagramHint = sectionContext?.diagramHint || 'process flow'

                if (diagramFormat === 'mermaid') {
                    const fewShot = docType === 'URS' ? `\nEXAMPLE OUTPUT (use as style/format reference):\n${URS_DIAGRAM_EXAMPLE}\n` : ''
                    systemPrompt =
                        `You are an expert technical writer and diagram designer for ${docType} documents.
Your task is to generate a Mermaid diagram for the section titled "${sectionTitle}".
${guidanceBlock}
${outlineBlock}
The diagram should represent: ${diagramHint}

RULES:
- Output ONLY valid Mermaid syntax wrapped in: <pre class="mermaid">YOUR_MERMAID_CODE</pre>
- Choose the most appropriate diagram type:
  * flowchart TD or LR — for process flows, decision trees
  * sequenceDiagram — for system interactions, API flows
  * classDiagram — for data models, object relationships
  * stateDiagram-v2 — for state machines
  * erDiagram — for entity relationships
  * gantt — for project timelines
- Make the diagram clear, well-labeled, and directly relevant to the section content
- After the diagram, add a caption: <p><strong>Figure: ${sectionTitle}</strong></p>
- Use ONLY: <pre class="mermaid">, <p>, <strong> tags
- Do NOT output any other HTML or text
${fewShot}`

                    userPrompt =
                        `Section: ${sectionTitle}
Diagram type requested: ${diagramHint}
Additional instructions: ${instructions || 'None'}

--- PROJECT CONTEXT ---
${contextText}
-----------------------`
                } else {
                    systemPrompt =
                        `You are an expert diagram designer for ${docType} documents.
Your task is to generate a draw.io diagram in mxGraphModel XML format for the section titled "${sectionTitle}".
${guidanceBlock}
${outlineBlock}
The diagram should represent: ${diagramHint}

RULES:
- Output ONLY valid draw.io mxGraphModel XML wrapped in: <pre class="drawio">YOUR_XML_HERE</pre>
- Use simple shapes: mxgraph.basic.rect for boxes, mxgraph.basic.ellipse for circles, mxgraph.basic.arrow for arrows
- A minimal mxGraphModel looks like:
  <mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="2" value="Component" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="10" y="10" width="120" height="60" as="geometry"/></mxCell>
  </root></mxGraphModel>
- Keep the diagram simple (5-10 components max) and directly relevant to the section
- After the diagram, add: <p><strong>Figure: ${sectionTitle}</strong></p>
- Use ONLY: <pre class="drawio">, <p>, <strong> tags`

                    userPrompt =
                        `Section: ${sectionTitle}
Additional instructions: ${instructions || 'None'}

--- PROJECT CONTEXT ---
${contextText}
-----------------------`
                }
            } else {
                // ── Text mode ──
                const fewShot = docType === 'URS' ? `\nEXAMPLE OUTPUT (use as style/format reference):\n${URS_TEXT_EXAMPLE}\n` : ''
                systemPrompt =
                    `You are an expert technical writer drafting a ${docType} requirements document.
Your task is to write the content for the section titled "${sectionTitle}".
${guidanceBlock}
${outlineBlock}
RULES:
- Follow the template guidance above precisely — it defines what this section should contain
- Use the Project Context as your primary source of truth
- Do not hallucinate information outside of the context; infer standard technical practices where necessary
- If the context is insufficient, provide standard template text with [bracketed placeholders]
- Every statement must be traceable to the project context or marked as [TBD]
- Format your output as clean HTML using ONLY: <p>, <ul>, <ol>, <li>, <h3>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <em>, <br>
- Do NOT use markdown, <html>, <head>, <body>, or <style> tags
- Return ONLY the HTML content for this section
${fewShot}`

                userPrompt =
                    `Section Title: ${sectionTitle}
Section Instructions: ${instructions || 'No specific instructions. Write standard content appropriate for this section.'}

--- PROJECT CONTEXT (from uploaded documents) ---
${contextText}
-------------------------------------------------`
            }

            // ── 6. Handle refinement mode ──────────────────────────────────────
            if (refinementContext) {
                messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'assistant', content: refinementContext.previousOutput },
                    { role: 'user', content: `Revise the content based on this feedback: ${refinementContext.feedback}` },
                ]
            } else {
                messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ]
            }
        }

        // ── 7. Stream LLM response ────────────────────────────────────────────
        const completionResponse = await fetch(`${llmConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${llmConfig.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: llmConfig.model,
                messages,
                temperature: ctConfig.temperature,
                max_tokens: ctConfig.max_tokens,
                stream: true,
            }),
        })

        if (!completionResponse.ok || !completionResponse.body) {
            const err = await completionResponse.text()
            console.error('LLM Error:', err)
            throw new Error('Failed to generate content')
        }

        // ── 8. Stream: status event + sources metadata + LLM tokens ──────────
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
        const writer = writable.getWriter()

        writer.write(statusEvent).catch(() => {})

        writer.write(
            encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`)
        ).catch(() => {})

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
