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
    return `You generate self-contained multi-page HTML admin dashboard prototypes. You MUST use the EXACT HTML structure, CSS, and JavaScript scaffold below — do NOT change the layout, colors, or styles. You only fill in the {{PLACEHOLDERS}}.

Output ONLY a complete HTML document starting with <!DOCTYPE html>. No markdown fences, no explanations.

=== SCAFFOLD (use this EXACTLY) ===
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>{{SYSTEM_NAME}} — Prototype</title>
<style>
:root{--ac50:#f5f3ff;--ac100:#ede9fe;--ac200:#ddd6fe;--ac500:#8b5cf6;--ac600:#7c3aed;--ac700:#6d28d9;--acring:#a78bfa;color-scheme:light}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;background:#f8f9fb}
.wrapper{display:flex;min-height:100vh}
/* Sidebar — light gray background like CORRAD */
.sidebar{width:256px;min-height:100vh;background:rgba(248,250,252,0.5);border-right:1px solid #e2e8f0;position:fixed;top:0;left:0;bottom:0;display:flex;flex-direction:column;z-index:30}
.sidebar-logo{padding:12px 16px;border-bottom:1px solid #e2e8f0;background:#fff}
.sidebar-logo h2{font-size:15px;font-weight:700;color:#0f172a}
.sidebar-logo p{font-size:11px;color:#94a3b8;margin-top:2px}
.sidebar-nav{flex:1;padding:12px;overflow-y:auto}
.nav-group-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;padding:0 12px;margin:16px 0 4px}
.nav-group-label:first-child{margin-top:0}
.nav-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;font-size:14px;color:#334155;cursor:pointer;transition:all 150ms;border:1px solid transparent;font-weight:500;text-decoration:none}
.nav-item:hover{background:var(--ac50)}
.nav-item.active{background:var(--ac50);border-color:var(--ac200);color:var(--ac700);font-weight:600}
.nav-item svg{width:16px;height:16px;flex-shrink:0}
.nav-item.active svg{color:var(--ac700)}
.nav-item:not(.active) svg{color:#94a3b8}
/* Header — 40px sticky white bar */
.main-area{margin-left:256px;flex:1;display:flex;flex-direction:column}
.header{height:40px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:20}
.page-title{font-size:1.45rem;font-weight:700;letter-spacing:-0.01em;background:linear-gradient(to right,var(--ac600),var(--ac500),var(--ac700));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header-right{display:flex;align-items:center;gap:8px}
.header-btn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:none;background:transparent;color:#64748b;cursor:pointer;transition:all 150ms;position:relative}
.header-btn:hover{background:var(--ac600);color:#fff}
.header-btn svg{width:16px;height:16px}
.avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--ac600),var(--ac500));color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600}
.badge-proto{font-size:11px;padding:2px 10px;border-radius:9999px;background:var(--ac50);color:var(--ac700);font-weight:500}
.notif-dot{position:absolute;top:4px;right:4px;width:7px;height:7px;background:#ef4444;border-radius:50%;border:2px solid #fff}
/* Content */
.content{flex:1;padding:16px;background:#fff}
.content-inner{max-width:1200px}
/* Cards */
.card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.05);overflow:hidden}
.card-header{padding:10px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:14px;color:#0f172a}
.card-body{padding:16px}
/* Stat cards */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px}
.stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
.stat-card .stat-top{display:flex;align-items:center;justify-content:space-between}
.stat-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center}
.stat-icon svg{width:14px;height:14px}
.stat-val{font-size:22px;font-weight:700;color:#0f172a;margin-top:8px}
.stat-label{font-size:12px;color:#64748b;margin-top:2px}
/* Tables */
table{width:100%;border-collapse:collapse}
thead th{background:#f8fafc;text-transform:uppercase;font-size:11px;font-weight:600;letter-spacing:0.05em;color:#64748b;padding:8px 16px;text-align:left}
tbody td{padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155}
tbody tr{transition:background 150ms}
tbody tr:hover{background:#f8fafc}
/* Badges */
.badge{display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:500}
.badge-active{background:#ecfdf5;color:#15803d}
.badge-draft{background:#fffbeb;color:#b45309}
.badge-inactive{background:#f1f5f9;color:#64748b}
.badge-cat{background:var(--ac50);color:var(--ac700)}
/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:all 150ms;border:none}
.btn-primary{background:#0f172a;color:#fff}.btn-primary:hover{background:#1e293b}
.btn-accent{background:var(--ac600);color:#fff}.btn-accent:hover{background:var(--ac700)}
.btn-secondary{background:#fff;border:1px solid #cbd5e1;color:#334155}.btn-secondary:hover{background:#f8fafc}
.btn-ghost{background:transparent;color:#64748b}.btn-ghost:hover{background:#f1f5f9}
.btn-danger{background:#dc2626;color:#fff}.btn-danger:hover{background:#b91c1c}
.btn-sm{padding:6px 12px;font-size:13px}
.btn-icon{width:32px;height:32px;padding:0;justify-content:center;border-radius:8px;background:transparent;border:none;color:#64748b;cursor:pointer}.btn-icon:hover{background:#f1f5f9}
.btn-icon svg{width:16px;height:16px}
/* Forms */
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:14px;font-weight:500;color:#334155;margin-bottom:4px}
.form-input,.form-select,.form-textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;font-size:14px;font-family:inherit;color:#0f172a;background:#fff;transition:all 150ms}
.form-input:focus,.form-select:focus,.form-textarea:focus{outline:none;border-color:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,0.2)}
.form-textarea{min-height:80px;resize:vertical}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
/* Tabs */
.tabs{display:inline-flex;background:rgba(226,232,240,0.6);border-radius:8px;padding:4px;margin-bottom:16px}
.tab{padding:6px 16px;border-radius:6px;font-size:14px;font-weight:500;color:#64748b;cursor:pointer;transition:all 150ms;border:none;background:transparent}
.tab.active{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
.tab:hover:not(.active){color:#334155}
/* Search */
.search-bar{display:flex;gap:8px;margin-bottom:16px;align-items:center}
.search-input{flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;font-size:14px;font-family:inherit}
.search-input:focus{outline:none;border-color:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,0.2)}
/* Pagination */
.pagination{display:flex;align-items:center;gap:4px;justify-content:flex-end;padding:12px 16px}
.page-btn{padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font-size:13px;font-weight:500;cursor:pointer;color:#334155;transition:all 150ms}
.page-btn:hover{background:#f8fafc}
.page-btn.active{background:var(--ac600);color:#fff;border-color:var(--ac600)}
.page-btn:disabled{opacity:0.5;cursor:not-allowed}
/* Grid helpers */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.mb-16{margin-bottom:16px}
.mb-12{margin-bottom:12px}
.mt-16{margin-top:16px}
.text-muted{color:#64748b;font-size:13px}
.text-mono{font-family:monospace;color:#64748b;font-size:13px}
/* Chart helpers */
.bar-chart{display:flex;flex-direction:column;gap:8px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-label{width:120px;font-size:13px;color:#334155;text-align:right;flex-shrink:0}
.bar-track{flex:1;height:24px;background:#f1f5f9;border-radius:6px;overflow:hidden}
.bar-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--ac500),var(--ac600));transition:width 300ms}
.bar-val{width:48px;font-size:13px;color:#64748b;flex-shrink:0}
.donut{width:120px;height:120px;border-radius:50%;position:relative}
.donut-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#0f172a}
/* Breadcrumb */
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:13px;color:#64748b;margin-bottom:12px}
.breadcrumb a{color:var(--ac600);text-decoration:none;cursor:pointer}
.breadcrumb span{color:#94a3b8}
</style>
</head>
<body>
<div class="wrapper">
  <aside class="sidebar">
    <div class="sidebar-logo">
      <h2>{{SYSTEM_NAME}}</h2>
      <p>{{SHORT_DESCRIPTION}}</p>
    </div>
    <nav class="sidebar-nav">
      {{NAV_ITEMS — use <div class="nav-group-label"> for groups, <a class="nav-item" data-page="key"> for items. First item gets class="nav-item active". Each item needs an inline SVG icon.}}
    </nav>
  </aside>
  <div class="main-area">
    <header class="header">
      <h1 class="page-title" id="page-title">Dashboard</h1>
      <div class="header-right">
        <span class="badge-proto">AI Prototype</span>
        <button class="header-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg><span class="notif-dot"></span></button>
        <div class="avatar">AD</div>
      </div>
    </header>
    <div class="content">
      <div class="content-inner" id="page-content">
        {{Initial page content — rendered by JavaScript on load}}
      </div>
    </div>
  </div>
</div>
<script>
const pageTitles = { {{key: 'Title', ...}} };
const pages = { {{key: renderFunction, ...}} };
function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.querySelector('[data-page="'+page+'"]');
  if (target) target.classList.add('active');
  document.getElementById('page-content').innerHTML = pages[page]();
  document.getElementById('page-title').textContent = pageTitles[page];
}
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', function(e) { e.preventDefault(); navigate(this.dataset.page); });
});
{{RENDER FUNCTIONS — one function per page, returning HTML strings using the CSS classes above}}
navigate('dashboard');
</script>
</body>
</html>
=== END SCAFFOLD ===

RULES FOR FILLING THE SCAFFOLD:
1. Keep ALL the CSS exactly as provided — do not modify, remove, or override any styles
2. Fill {{NAV_ITEMS}} with 5-8 sidebar links derived from the document content. Use simple inline SVG icons (24x24 viewBox, stroke-based). Group related items with .nav-group-label dividers
3. Fill {{RENDER FUNCTIONS}} with one JavaScript function per page. Each function returns an HTML string using the CSS classes defined above (.card, .stat-grid, .stat-card, table/thead/tbody, .badge-*, .btn-*, .form-*, .tabs, .tab, .bar-chart, etc.)
4. Use REAL entity names, field names, and business terms from the document
5. Dashboard page: 3-4 .stat-card items + a recent activity table in a .card + a .bar-chart
6. List pages: .search-bar + .card wrapping a full table (8-10 rows) with .badge status columns + .pagination
7. Form pages: .breadcrumb + .card with .form-grid containing .form-group items
8. Reports page: .grid-2 with .donut charts (use conic-gradient) + .bar-chart
9. Settings page: .tabs for switching sub-sections + form fields
10. Populate tables with realistic sample data — names, dates, IDs, statuses
11. Do NOT add any new CSS rules or override existing ones
12. Do NOT use dark backgrounds anywhere — the scaffold is light mode only`
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

    return `Fill the HTML scaffold from the system prompt for this system:

SYSTEM NAME: ${docTitle}
DOC TYPE: ${docType} (${fullType})

--- DOCUMENT CONTENT ---
${docText || 'No document content available. Generate a generic prototype based on the document title and type.'}
---${contextSection}

Instructions:
1. Set {{SYSTEM_NAME}} to a short system name derived from the document title
2. Create 5-8 sidebar nav items based on the key modules/entities in the document
3. Write a render function for each page with substantive content (tables with 8-10 rows, forms with real fields, stat cards with realistic numbers)
4. Use ONLY the CSS classes defined in the scaffold — do not add new styles
5. Use the exact entity names, field names, and terminology from the document
6. Output the complete HTML document — no explanations, no markdown fences`
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
