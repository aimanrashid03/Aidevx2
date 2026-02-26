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
        const { projectId, documentPath, content } = await req.json()

        if (!projectId || !documentPath || !content) {
            throw new Error('Missing required fields: projectId, documentPath, content')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('OPENAI_API_KEY is not set')
        }

        // Split content into chunks (simple chunking by paragraph for now)
        const chunks = content.split('\n\n').filter((chunk: string) => chunk.trim().length > 0)

        console.log(`Processing ${chunks.length} chunks for document: ${documentPath}`);

        for (const chunk of chunks) {
            if (chunk.trim().length < 10) continue; // Skip very small chunks

            // Get embedding from OpenAI
            const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openAiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: chunk,
                }),
            })

            if (!embeddingResponse.ok) {
                const err = await embeddingResponse.text()
                console.error('OpenAI Error:', err)
                throw new Error('Failed to generate embedding')
            }

            const embeddingData = await embeddingResponse.json()
            const embedding = embeddingData.data[0].embedding

            // Insert into database
            const { error } = await supabaseAdmin
                .from('document_chunks')
                .insert({
                    project_id: projectId,
                    document_path: documentPath,
                    content: chunk,
                    embedding: embedding,
                })

            if (error) {
                console.error('Supabase Error:', error)
                throw new Error('Failed to insert chunk')
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: `Successfully processed ${chunks.length} chunks.` }),
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
