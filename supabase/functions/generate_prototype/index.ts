/**
 * generate_prototype — Edge function that generates a self-contained multi-page HTML
 * UI prototype from a requirement document using Claude Haiku.
 *
 * Generates 5-8 navigable pages with CORRAD light-mode design system styling,
 * client-side routing, and realistic sample data derived from the document.
 *
 * Pipeline:
 *  1. Extract document content (DOCX from storage or JSON content field)
 *  2. Optional RAG context from embedded project documents
 *  3. Non-streaming Claude Haiku call (max 16k tokens for multi-page output)
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
    return `You are a UI/UX prototype generator. Given a requirement document, you create a self-contained multi-page HTML file that demonstrates how the described system's user interface would look across multiple screens.

DESIGN SYSTEM — CORRAD Admin Dashboard (light mode, exact replication):
Match the CORRAD design language as closely as possible. This is a LIGHT MODE design — no dark backgrounds anywhere.

COLOR PALETTE:
- Accent (violet): --accent-50: #f5f3ff; --accent-100: #ede9fe; --accent-200: #ddd6fe; --accent-500: #8b5cf6; --accent-600: #7c3aed; --accent-700: #6d28d9; --accent-ring: #a78bfa
- Neutral base: slate palette exclusively — bg: #f8fafc (page), white (cards/sidebar), text: #0f172a (primary), #64748b (muted), #94a3b8 (placeholder)
- Status: success: bg #ecfdf5 text #15803d; warning: bg #fffbeb text #b45309; error: bg #fef2f2 text #b91c1c; info: bg #eff6ff text #1d4ed8

LAYOUT:
- Sidebar: width 256px, background WHITE, border-right: 1px solid #e2e8f0, position fixed, full height
- Sidebar logo area: padding 16px, system name in bold, small tagline text in slate-400
- Sidebar nav items: padding 8px 12px, border-radius 8px, font-size 14px, color #334155
  - Hover: background #f5f3ff (accent-50)
  - Active: background #f5f3ff, border-left: 3px solid #7c3aed, color #7c3aed, font-weight 600
  - Icon: 16x16 inline SVG before label
- Sidebar section dividers: 1px solid #e2e8f0 with section labels in uppercase text-xs text-slate-400 tracking-wider
- Top bar: height 40px, background white, border-bottom: 1px solid #e2e8f0, sticky top, flex center between
  - Left: page title with gradient text (background: linear-gradient(to right, #7c3aed, #8b5cf6, #6d28d9); -webkit-background-clip: text; color: transparent), font-size 1.45rem, font-weight 700, tracking tight
  - Right: notification bell icon, user avatar circle (32px, bg accent-100, initials), "AI Prototype" pill badge
- Content area: margin-left 256px, padding 16px, background #f8fafc

COMPONENTS:
- Cards: background white, border: 1px solid #e2e8f0, border-radius 8px, box-shadow: 0 1px 2px rgba(0,0,0,0.05), padding 0 (header has own padding)
  - Card header: padding 10px 16px, border-bottom: 1px solid #f1f5f9, flex between center, font-weight 600 text-sm
  - Card body: padding 16px
- Stat/KPI cards: same card base but with colored left border (4px solid accent), icon in accent-50 circle
- Tables: inside cards, no outer border
  - Header: background #f8fafc, text-transform uppercase, font-size 11px, font-weight 600, letter-spacing 0.05em, color #64748b, padding 8px 16px
  - Rows: border-bottom: 1px solid #f1f5f9, padding 12px 16px, hover: background #f8fafc, transition 150ms
  - Action buttons: 32x32 rounded-lg, hover bg-slate-100, icon only
- Buttons:
  - Primary: background #0f172a (slate-900), color white, border-radius 8px, padding 8px 16px, font-size 14px, font-weight 500, hover: #1e293b
  - Secondary: background white, border: 1px solid #cbd5e1, color #334155, hover: bg #f8fafc
  - Accent: background #7c3aed, color white, hover: #6d28d9
  - Ghost: no border/bg, color #64748b, hover: bg #f1f5f9
  - Destructive: background #dc2626, color white, hover: #b91c1c
- Badges: border-radius 9999px, padding 2px 10px, font-size 12px, font-weight 500
  - Published/Active: bg #ecfdf5 text #15803d
  - Draft/Pending: bg #fffbeb text #b45309
  - Archived/Inactive: bg #f1f5f9 text #64748b
  - Category: bg #f5f3ff text #6d28d9
- Form inputs: width 100%, border: 1px solid #cbd5e1, border-radius 8px, padding 8px 12px, font-size 14px
  - Focus: border-color #94a3b8, outline none, box-shadow: 0 0 0 3px rgba(148,163,184,0.2)
  - Label: font-size 14px, font-weight 500, color #334155, margin-bottom 4px
- Tabs (pill style): container bg #e2e8f0/60, border-radius 8px, padding 4px
  - Active: bg white, color #0f172a, box-shadow: 0 1px 2px rgba(0,0,0,0.05), border-radius 6px
  - Inactive: color #64748b, hover color #334155
- Pagination: rounded-lg border border-slate-300 bg white, disabled: opacity 50%
- Modals: overlay bg rgba(15,23,42,0.5) backdrop-blur-sm, content: white bg, border-radius 8px, shadow-2xl, max-width 28rem
- Toasts: gradient backgrounds (success: emerald-200 to emerald-100, error: rose-200 to rose-100)

TYPOGRAPHY:
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Base: 14px, line-height 1.5, color #0f172a
- Page title: .page-title class — gradient text as described above, 1.45rem, font-weight 700
- Section headings: 18px font-weight 600 color #0f172a
- Card headings: 14px font-weight 600
- Muted: color #64748b
- Table headers: 11px uppercase tracking-wider #64748b
- Monospace (for IDs/codes): font-family monospace, color #64748b

MULTI-PAGE ARCHITECTURE:
You MUST generate multiple navigable pages (5-8 pages minimum) with client-side routing. Each sidebar nav item navigates to a different page/view. Implementation:
- Create a JavaScript object mapping route keys to page content functions
- Each sidebar nav item has a data-page attribute; clicking sets the active page
- The content area re-renders based on the selected page
- Sidebar highlights the active nav item
- On initial load, show the Dashboard/Overview page
- Use this pattern:
  \`\`\`
  <script>
  const pages = { dashboard: renderDashboard, users: renderUsers, ... };
  function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-page="'+page+'"]').classList.add('active');
    document.getElementById('page-content').innerHTML = pages[page]();
    document.querySelector('.page-title').textContent = pageTitles[page];
  }
  </script>
  \`\`\`

PAGES TO GENERATE (adapt names/content from the document):
1. **Dashboard/Overview** — stat cards (3-4 KPI metrics from the document), recent activity table, quick action buttons, summary chart placeholder (CSS-only bar chart or progress bars)
2. **Primary Entity List** — full data table with search bar, filter dropdowns, column headers, sample rows (8-10), status badges, action buttons (view/edit/delete), pagination
3. **Primary Entity Detail/Form** — form layout with sections, text inputs, select dropdowns, textareas, toggle switches, save/cancel buttons, breadcrumb navigation
4. **Secondary Entity List** — another data table for a related entity from the document
5. **Reports/Analytics** — CSS-only charts (horizontal bar charts using div widths, donut charts using conic-gradient), summary statistics, date range filter
6. **Settings/Configuration** — tabbed settings form (General, Notifications, Security tabs), profile section with avatar placeholder
- For BRS: add Objectives page, Stakeholders page, Scope & Milestones page
- For URS: add User Management page, Requests/Approvals page, Role Permissions page
- For SRS: add Requirements Matrix page, Use Cases page, Interface Specs page
- For SDS: add Architecture Overview page, API Documentation page, Database Schema page

OUTPUT RULES:
- Output a COMPLETE, valid HTML5 document starting with <!DOCTYPE html>
- Include <meta name="color-scheme" content="light"> in head
- ALL CSS in a single <style> tag in <head> — no external stylesheets, no CDN links, no imports
- JavaScript for page navigation, sidebar toggle, tab switching, dropdown menus — keep it vanilla
- SVG icons inline (simple 16x16 or 20x20 path-based icons for nav items, actions, stats)
- Use realistic sample data derived from the document content — real entity names, module names, business terminology, field names
- Every page must have substantive content — no empty states or "coming soon" placeholders
- Do NOT include comments like "<!-- more items -->" or TODO notes
- Do NOT use any dark mode styles — everything must be light mode
- Output ONLY the HTML document — no markdown fences, no explanations before or after`
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

    return `Generate a multi-page UI prototype for the following system:

DOCUMENT: ${docTitle}
TYPE: ${docType} (${fullType})

--- DOCUMENT CONTENT ---
${docText || 'No document content available. Generate a generic prototype based on the document title and type.'}
---${contextSection}

Create a realistic, production-quality multi-page admin dashboard prototype based on this ${docType} document.

REQUIREMENTS:
1. Extract ALL key entities, modules, features, and workflows from the document content
2. Create 5-8 navigable pages with sidebar navigation — each page must have full, substantive content
3. Use the EXACT entity names, field names, module names, and business terms from the document
4. Populate tables with 8-10 realistic sample rows using domain-appropriate data
5. Dashboard page should have 3-4 KPI stat cards with numbers that make sense for this domain
6. Include forms with fields that match the actual data requirements described in the document
7. Follow the CORRAD light-mode design system EXACTLY as specified in the system prompt
8. Every interactive element (nav items, tabs, buttons) must work via JavaScript
9. The prototype should look like a real, polished admin application — not a wireframe`
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
                    // Cap RAG context to ~6000 chars — need more context for multi-page generation
                    ragContext = ragResult.contextText.slice(0, 6000)
                } catch {
                    // RAG is optional — proceed without it
                }

                // Phase 3: LLM generation
                sendEvent({ type: 'progress', status: 'Generating multi-page UI prototype (this may take a moment)...' })

                const messages = [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: buildUserPrompt(docTitle, docType, docText, ragContext) },
                ]

                const rawHtml = await callLlm(messages, llmConfig, 0.4, 16000)
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
