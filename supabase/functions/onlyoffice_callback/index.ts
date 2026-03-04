// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * OnlyOffice Document Server Callback Endpoint
 *
 * OnlyOffice POSTs to this URL when the document state changes.
 * Status codes we handle:
 *   2 = Document is ready to save (all editors closed or user saved)
 *   6 = Force save being performed
 *
 * On each save we:
 *   1. Snapshot the current DOCX → doc_versions (v{n}.docx)
 *   2. Upload the new DOCX → current.docx
 *   3. Rotate document_key so the editor reloads fresh content
 *   4. Return { error: 0 } which OnlyOffice requires to confirm success
 *
 * Query params: docId, projectId, token (shared secret)
 * Body: { status, url, key, users? }
 */
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const docId = url.searchParams.get('docId')
        const projectId = url.searchParams.get('projectId')
        const authToken = url.searchParams.get('token')

        // Validate shared secret to prevent unauthorized saves
        const expectedToken = Deno.env.get('ONLYOFFICE_CALLBACK_SECRET')
        if (!expectedToken || authToken !== expectedToken) {
            console.warn('OnlyOffice callback: invalid token')
            // Still return error:0 so OnlyOffice doesn't retry
            return new Response(JSON.stringify({ error: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
        }

        if (!docId || !projectId) {
            console.error('OnlyOffice callback: missing docId or projectId')
            return new Response(JSON.stringify({ error: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
        }

        const body = await req.json()
        const { status, url: docUrl } = body

        console.log(`OnlyOffice callback: docId=${docId} projectId=${projectId} status=${status}`)

        // Only process save-ready statuses
        if (status !== 2 && status !== 6) {
            return new Response(JSON.stringify({ error: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
        }

        if (!docUrl) {
            console.error('OnlyOffice callback: no document URL in payload')
            return new Response(JSON.stringify({ error: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
        }

        // Admin client (bypasses RLS for system-level operations)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ── Step 1: Fetch current document record ─────────────────────────────
        const { data: currentDoc, error: fetchErr } = await supabaseAdmin
            .from('requirement_docs')
            .select('id, current_version, storage_path, title, status, section_statuses')
            .eq('id', docId)
            .eq('project_id', projectId)
            .single()

        if (fetchErr || !currentDoc) {
            console.error('OnlyOffice callback: document not found', fetchErr)
            return new Response(JSON.stringify({ error: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
        }

        const currentVersion = currentDoc.current_version ?? 1
        const nextVersion = currentVersion + 1

        // ── Step 2: Snapshot current.docx → v{n}.docx ────────────────────────
        if (currentDoc.storage_path) {
            const currentBucketPath = currentDoc.storage_path.startsWith('documents/')
                ? currentDoc.storage_path.slice('documents/'.length)
                : currentDoc.storage_path

            const { data: currentBlob, error: dlErr } = await supabaseAdmin.storage
                .from('documents')
                .download(currentBucketPath)

            if (!dlErr && currentBlob) {
                const versionBucketPath = `${projectId}/${docId}/v${currentVersion}.docx`

                await supabaseAdmin.storage
                    .from('documents')
                    .upload(versionBucketPath, currentBlob, {
                        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        upsert: true,
                    })

                // Record version in doc_versions
                await supabaseAdmin.from('doc_versions').insert({
                    doc_id: docId,
                    project_id: projectId,
                    version_number: currentVersion,
                    content: null,
                    storage_path: `documents/${versionBucketPath}`,
                    section_statuses: currentDoc.section_statuses,
                    title: currentDoc.title,
                    status: currentDoc.status,
                    change_summary: 'Saved via OnlyOffice',
                })

                console.log(`OnlyOffice callback: versioned as v${currentVersion}`)
            }
        }

        // ── Step 3: Download the updated DOCX from OnlyOffice ─────────────────
        const docxResponse = await fetch(docUrl)
        if (!docxResponse.ok) {
            throw new Error(`Failed to download DOCX from OnlyOffice: ${docxResponse.status}`)
        }
        const docxBytes = await docxResponse.arrayBuffer()

        // ── Step 4: Upload as new current.docx ────────────────────────────────
        const currentBucketPath = `${projectId}/${docId}/current.docx`
        const { error: uploadErr } = await supabaseAdmin.storage
            .from('documents')
            .upload(currentBucketPath, docxBytes, {
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                upsert: true,
            })

        if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

        // ── Step 5: Rotate document_key + update DB ────────────────────────────
        const newDocumentKey = `${docId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

        const { error: updateErr } = await supabaseAdmin
            .from('requirement_docs')
            .update({
                storage_path: `documents/${currentBucketPath}`,
                document_key: newDocumentKey,
                current_version: nextVersion,
                last_modified: new Date().toISOString(),
                content: null,
            })
            .eq('id', docId)
            .eq('project_id', projectId)

        if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`)

        console.log(`OnlyOffice callback: saved OK. New key=${newDocumentKey} version=${nextVersion}`)

        // OnlyOffice requires { error: 0 } to acknowledge success
        return new Response(JSON.stringify({ error: 0 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })

    } catch (err) {
        console.error('OnlyOffice callback error:', err)
        // Always return error:0 so OnlyOffice doesn't retry indefinitely
        return new Response(JSON.stringify({ error: 0 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
    }
})
