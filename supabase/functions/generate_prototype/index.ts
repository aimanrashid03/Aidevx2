/**
 * generate_prototype — Edge function that generates a self-contained HTML UI prototype
 * from a requirement document using Claude Haiku.
 *
 * Pipeline:
 *  1. Extract document content (DOCX from storage or JSON content field)
 *  2. Optional RAG context from embedded project documents
 *  3. Non-streaming Claude Haiku call (prototype HTML is complete before preview)
 *  4. Save to prototypes table, return via SSE complete event
 *
 * SSE events:
 *  { type: 'progress', status: string }
 *  { type: 'complete', prototypeId: string, name: string, html: string }
 *  { type: 'error', message: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import {
    getLlmConfig,
    getEmbeddingConfig,
    getRagConfig,
    buildLlmHeaders,
    buildLlmEndpoint,
    buildLlmRequestBody,
    parseLlmResponse,
} from '../_shared/llmConfig.ts'
import type { LlmConfig } from '../_shared/llmConfig.ts'
import { performRag } from '../_shared/ragHelper.ts'
import { downloadAndExtractDocText } from '../_shared/docxTextExtractor.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DOC_TYPE_FULL: Record<string, string> = {
    BRS: 'Business Requirement Specification',
    URS: 'User Requirement Specification',
    SRS: 'Software Requirement Specification',
    SDS: 'Software Design Specification',
}

async function callLlm(
    messages: { role: string; content: string }[],
    llmConfig: LlmConfig,
    temperature = 0.4,
    maxTokens = 7000,
): Promise<string> {
    const res = await fetch(buildLlmEndpoint(llmConfig), {
        method: 'POST',
        headers: buildLlmHeaders(llmConfig),
        body: JSON.stringify(buildLlmRequestBody(messages, llmConfig, {
            temperature,
            maxTokens,
            stream: false,
        })),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`LLM error (${res.status}): ${err}`)
    }

    const data = await res.json()
    return parseLlmResponse(data, llmConfig.provider)
}

function buildSystemPrompt(): string {
    return `You are a UI/UX prototype generator. Given a requirement document, you create a single self-contained HTML file that demonstrates how the described system's user interface might look.

DESIGN STYLE (inspired by CORRAD admin dashboard — https://github.com/mfauzzury/corrad-laravel):
- Dark gradient sidebar: background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%); width: 220px
- White/light content area with clean card components
- Accent color: purple/violet gradients (#7c3aed → #6d28d9)
- Card style: background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 20px
- KPI widget style: gradient background with white text
- Typography: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; base font-size: 14px
- Top bar: white background, 60px height, subtle bottom border, flex layout
- Table style: clean, no outer border, alternating row colors (#f8fafc for odd rows), header background #f1f5f9
- Form inputs: border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px
- Badges/tags: small pill shapes with color-coded backgrounds
- Sidebar nav items: padding 10px 16px, hover: background rgba(255,255,255,0.1), active: background rgba(124,58,237,0.3)

OUTPUT RULES:
- Output a COMPLETE, valid HTML5 document starting with <!DOCTYPE html>
- ALL CSS must be inline in a <style> tag inside <head> — no external stylesheets, no CDN links
- Minimal vanilla JavaScript is allowed only for tab switching or sidebar toggle — keep it simple
- Layout: fixed sidebar (220px) + main content area using CSS flex or absolute positioning
- Top bar must include: system name (bold), a "Prototype" pill badge, and a user avatar placeholder
- Sidebar must include: logo/system name at top, navigation items derived from the document's sections/modules
- Content area must include relevant UI elements based on document type:
  - BRS: KPI summary cards, objectives table, stakeholders list, scope overview, timeline/milestones
  - URS: Dashboard with metrics, user management table, request/approval forms, status badges
  - SRS: Requirements table with ID/description/priority/status columns, use case list, interface mockups
  - SDS: Architecture layers diagram (CSS divs), component list, API endpoints table, database schema summary
- Use realistic sample data derived from the document content (entity names, module names, business terms)
- Include a small "AI-Generated Prototype" badge in the top-right corner of the top bar
- Keep the prototype focused — 2-3 main screens/views is enough
- Do NOT include placeholder comments like "<!-- Add more here -->" or TODO notes
- Output ONLY the complete HTML document — no markdown fences, no explanations before or after`
}

function buildUserPrompt(
    docTitle: string,
    docType: string,
    docText: string,
    ragContext: string,
): string {
    const fullType = DOC_TYPE_FULL[docType] || docType
    const contextSection = ragContext.trim()
        ? `\n--- PROJECT CONTEXT ---\n${ragContext}\n---`
        : ''

    return `Generate a UI prototype for the following system:

DOCUMENT: ${docTitle}
TYPE: ${docType} (${fullType})

--- DOCUMENT CONTENT ---
${docText || 'No document content available. Generate a generic prototype based on the document title and type.'}
---${contextSection}

Create a realistic-looking admin dashboard prototype that demonstrates the key screens and workflows described in this ${docType} document. Use entity names, module names, and business terms from the document content. The design must follow the CORRAD-inspired style described in the system prompt.`
}

/** Ensure the LLM output is a complete HTML document */
function sanitizeHtml(raw: string): string {
    const trimmed = raw.trim()
    // Strip markdown code fences if the LLM wrapped the output
    const withoutFences = trimmed
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
    if (withoutFences.toLowerCase().startsWith('<!doctype')) return withoutFences
    // Wrap in a minimal document if incomplete
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${withoutFences}</body></html>`
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const {
            projectId,
            docId,
            docTitle,
            docType,
            selectedDocumentPaths,
        }: {
            projectId: string
            docId: string
            docTitle: string
            docType: string
            selectedDocumentPaths?: string[]
        } = await req.json()

        if (!projectId || !docId || !docTitle || !docType) {
            throw new Error('Missing required fields: projectId, docId, docTitle, docType')
        }

        // The API gateway already validates the JWT signature before the function runs,
        // so decoding the payload directly is safe and avoids an extra round-trip.
        const authHeader = req.headers.get('authorization') ?? ''
        const token = authHeader.replace(/^bearer\s+/i, '')
        let userId: string | null = null
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
            userId = payload.sub ?? null
        } catch { /* invalid token */ }
        if (!userId) throw new Error('Unauthorized')

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const llmConfig = getLlmConfig()
        const embeddingConfig = getEmbeddingConfig()
        const ragConfig = getRagConfig()

        if (!llmConfig.apiKey) {
            throw new Error('No LLM API key configured')
        }

        // ── SSE stream setup ────────────────────────────────────────────────
        const encoder = new TextEncoder()
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
        const writer = writable.getWriter()

        function sendEvent(data: Record<string, unknown>) {
            writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)).catch(() => {})
        }

        function sendHeartbeat() {
            writer.write(encoder.encode(': keep-alive\n\n')).catch(() => {})
        }

        // ── Background pipeline ──────────────────────────────────────────────
        ;(async () => {
            const heartbeat = setInterval(sendHeartbeat, 20_000)

            try {
                // Phase 1: Extract document content
                sendEvent({ type: 'progress', status: 'Extracting document content...' })

                const { data: docRow } = await supabaseAdmin
                    .from('requirement_docs')
                    .select('storage_path, content')
                    .eq('id', docId)
                    .eq('project_id', projectId)
                    .single()

                const docText = await downloadAndExtractDocText(
                    docRow?.storage_path ?? null,
                    docRow?.content ?? null,
                    supabaseAdmin,
                )

                // Phase 2: RAG context
                sendEvent({ type: 'progress', status: 'Searching project context...' })

                let ragContext = ''
                try {
                    const ragResult = await performRag(
                        `UI prototype for ${docTitle}`,
                        `${docType} user interface screens and workflows`,
                        '',
                        docType,
                        projectId,
                        selectedDocumentPaths,
                        embeddingConfig,
                        ragConfig,
                        supabaseAdmin,
                    )
                    // Cap RAG context to ~4000 chars to preserve token budget
                    ragContext = ragResult.contextText.slice(0, 4000)
                } catch {
                    // RAG is optional — proceed without it
                }

                // Phase 3: LLM generation
                sendEvent({ type: 'progress', status: 'Generating UI prototype...' })

                const messages = [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: buildUserPrompt(docTitle, docType, docText, ragContext) },
                ]

                const rawHtml = await callLlm(messages, llmConfig, 0.4, 7000)
                const html = sanitizeHtml(rawHtml)

                if (!html || html.length < 100) {
                    throw new Error('LLM returned empty or invalid prototype HTML')
                }

                // Phase 4: Save to DB
                const prototypeName = `${docTitle} Prototype`
                const { data: inserted, error: insertError } = await supabaseAdmin
                    .from('prototypes')
                    .insert({
                        project_id: projectId,
                        source_doc_id: docId,
                        source_doc_title: docTitle,
                        source_doc_type: docType,
                        name: prototypeName,
                        html,
                        created_by: userId,
                    })
                    .select('id')
                    .single()

                if (insertError) throw new Error(`Failed to save prototype: ${insertError.message}`)

                sendEvent({
                    type: 'complete',
                    prototypeId: inserted.id,
                    name: prototypeName,
                    html,
                    sourceDocId: docId,
                    sourceDocTitle: docTitle,
                    sourceDocType: docType,
                    createdAt: new Date().toISOString(),
                })
            } catch (err) {
                sendEvent({ type: 'error', message: err instanceof Error ? err.message : String(err) })
            } finally {
                clearInterval(heartbeat)
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
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
