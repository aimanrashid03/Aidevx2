import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { projectId, sectionTitle, instructions } = await req.json()

        if (!projectId || !sectionTitle) {
            throw new Error('Missing required fields: projectId, sectionTitle')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('OPENAI_API_KEY is not set')
        }

        // Prepare query for embedding
        const query = `Context needed for section: ${sectionTitle}. Instructions: ${instructions || 'None'}`

        // 1. Embed the query
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: query,
            }),
        })

        if (!embeddingResponse.ok) {
            throw new Error('Failed to generate query embedding')
        }

        const embeddingData = await embeddingResponse.json()
        const queryEmbedding = embeddingData.data[0].embedding

        // 2. Search for relevant chunks
        const { data: matchedChunks, error: matchError } = await supabaseAdmin
            .rpc('match_document_chunks', {
                query_embedding: queryEmbedding,
                match_threshold: 0.3, // Lower threshold for testing to ensure returns
                match_count: 5,
                p_project_id: projectId
            })

        if (matchError) {
            console.error('Match error:', matchError);
            throw new Error('Failed to find relevant documents');
        }

        const contextText = matchedChunks && matchedChunks.length > 0
            ? matchedChunks.map((chunk: any) => chunk.content).join('\n\n')
            : "No relevant project documents provided or found."

        // 3. Generate section content (streamed)
        const systemPrompt = `You are an expert technical writer drafting a requirement specification document.
Your task is to write the content for the section titled "${sectionTitle}".
Use the provided Project Context below as your source of truth. Do not hallucinate information outside of this context, but you may infer standard technical practices where necessary.
If the context does not contain enough information, provide generic standard template text that fits the section, and bracket any placeholders like [Customer Name] or [System Name].
Write in plain text paragraphs only. Do not use HTML tags, markdown symbols, or any special formatting characters. Separate paragraphs with a blank line. Return ONLY the section content, ready to be pasted into a document editor.`

        const userPrompt = `Section Title: ${sectionTitle}
Section Instructions: ${instructions || 'No specific instructions. Write standard content appropriate for this section type.'}

--- PROJECT CONTEXT (from uploaded documents) ---
${contextText}
-------------------------------------------------`

        const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.4,
                stream: true,
            }),
        })

        if (!completionResponse.ok || !completionResponse.body) {
            const err = await completionResponse.text()
            console.error('OpenAI Error:', err)
            throw new Error('Failed to generate content')
        }

        // Pipe the OpenAI SSE stream directly to the client
        return new Response(completionResponse.body, {
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
