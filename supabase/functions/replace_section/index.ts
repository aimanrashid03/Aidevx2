import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import PizZip from 'https://esm.sh/pizzip@3.1.7'
import type { ServerDocSection } from '../_shared/brsStructure.ts'
import {
    parseBodyElements,
    normalizeTitle,
    buildSectionMap,
    replaceContentRange,
} from '../_shared/docxTemplateBuilder.ts'
import { htmlToOoxml } from '../_shared/htmlToOoxml.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const token = req.headers.get('authorization')?.replace(/^bearer\s+/i, '') ?? ''
        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        const userId = payload.sub as string
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const {
            projectId,
            docId,
            sectionTitle,
            html,
            storagePath,
            currentDocumentKey,
        }: {
            projectId: string
            docId: string
            sectionTitle: string
            html: string
            storagePath: string
            currentDocumentKey: string
        } = await req.json()

        if (!projectId || !docId || !sectionTitle || !storagePath || !currentDocumentKey) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ── Stale key guard ───────────────────────────────────────────────────
        const { data: docRow, error: docErr } = await supabaseAdmin
            .from('requirement_docs')
            .select('document_key')
            .eq('id', docId)
            .single()

        if (docErr || !docRow) {
            return new Response(JSON.stringify({ error: 'Document not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (docRow.document_key !== currentDocumentKey) {
            return new Response(
                JSON.stringify({
                    error: 'Document has been modified. Save your changes in the editor first, then try again.',
                }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Download DOCX ─────────────────────────────────────────────────────
        const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
            .from('documents')
            .download(storagePath)

        if (downloadErr || !fileData) {
            return new Response(JSON.stringify({ error: 'Failed to download document' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const templateBytes = new Uint8Array(await fileData.arrayBuffer())

        // ── Parse DOCX XML ────────────────────────────────────────────────────
        const zip = new PizZip(templateBytes)
        const docXmlRaw = zip.file('word/document.xml')?.asText()
        if (!docXmlRaw) {
            return new Response(JSON.stringify({ error: 'Invalid document: missing word/document.xml' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const bodyMatch = docXmlRaw.match(/<w:body>([\s\S]*)<\/w:body>/)
        if (!bodyMatch) {
            return new Response(JSON.stringify({ error: 'Invalid document: missing <w:body>' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const bodyContent = bodyMatch[1]

        // Capture the final body-level <w:sectPr>
        const lastSectPrIdx = bodyContent.lastIndexOf('<w:sectPr ')
        let sectPrXml = ''
        let bodyWithoutSectPr = bodyContent

        if (lastSectPrIdx >= 0) {
            const lastSectPrEnd = bodyContent.indexOf('</w:sectPr>', lastSectPrIdx)
            if (lastSectPrEnd >= 0) {
                sectPrXml = bodyContent.substring(lastSectPrIdx, lastSectPrEnd + 11)
                bodyWithoutSectPr = bodyContent.substring(0, lastSectPrIdx) + bodyContent.substring(lastSectPrEnd + 11)
            }
        }

        let elements = parseBodyElements(bodyWithoutSectPr)

        // ── Build synthetic section structure for matching ─────────────────────
        const syntheticSection: ServerDocSection = {
            title: sectionTitle,
            level: 1,
            instructions: [],
            expectedFormat: 'text',
            autoGenerate: true,
        }

        const ranges = buildSectionMap(elements, [syntheticSection])

        if (ranges.length === 0) {
            // Try matching with normalized title to handle any prefix differences
            const normalizedTarget = normalizeTitle(sectionTitle)
            // buildSectionMap already normalizes — if nothing matched, section is not in doc
            return new Response(
                JSON.stringify({
                    error: `Section "${normalizedTarget}" not found in document. The section heading may have been renamed or removed.`,
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Convert HTML → OOXML and inject ─────────────────────────────────
        const ooxmlFragment = htmlToOoxml(html)
        elements = replaceContentRange(elements, ranges[0], ooxmlFragment)

        // ── Reassemble DOCX ───────────────────────────────────────────────────
        const newBodyContent = elements.map(el => el.xml).join('') + sectPrXml
        const newDocXml = docXmlRaw.replace(
            /<w:body>[\s\S]*<\/w:body>/,
            `<w:body>${newBodyContent}</w:body>`
        )

        zip.file('word/document.xml', newDocXml)

        const docxBytes = zip.generate({
            type: 'uint8array',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE',
        }) as Uint8Array

        // ── Re-upload to storage ──────────────────────────────────────────────
        const { error: uploadErr } = await supabaseAdmin.storage
            .from('documents')
            .upload(storagePath, docxBytes, {
                upsert: true,
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            })

        if (uploadErr) {
            return new Response(JSON.stringify({ error: 'Failed to save document' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── Rotate document key and update DB ─────────────────────────────────
        const newDocumentKey = `${docId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

        const { error: updateErr } = await supabaseAdmin
            .from('requirement_docs')
            .update({
                document_key: newDocumentKey,
                last_modified: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', docId)

        if (updateErr) {
            console.error('Failed to rotate document key:', updateErr)
            // Non-fatal — document was already saved, just return without key rotation
        }

        // ── Log activity ──────────────────────────────────────────────────────
        await supabaseAdmin.from('activity_log').insert({
            project_id: projectId,
            doc_id: docId,
            user_id: userId,
            action: 'section_replaced',
            details: { sectionTitle },
        }).then(({ error }: { error: unknown }) => { if (error) console.error('activity_log insert error:', error) })

        // ── Build public URL ──────────────────────────────────────────────────
        const { data: urlData } = supabaseAdmin.storage
            .from('documents')
            .getPublicUrl(storagePath)

        return new Response(
            JSON.stringify({
                success: true,
                newDocumentKey: newDocumentKey,
                publicUrl: urlData.publicUrl,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err) {
        console.error('replace_section error:', err)
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
