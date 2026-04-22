/**
 * generate_prototype — Edge function that generates a self-contained multi-page HTML
 * UI prototype from a requirement document using the CORRAD design system.
 *
 * Architecture:
 *   1. [parallel] Extract document text + perform RAG retrieval
 *   2. LLM call — returns structured JSON (PrototypeModel), NOT full HTML
 *   3. Validate + assemble HTML server-side using CORRAD_SHELL_TEMPLATE
 *   4. Save assembled HTML to prototypes table; return via SSE complete event
 *
 * The LLM never sees or generates the shell (topbar/sidebar/JS helpers).
 * It only produces page body fragments + nav structure + modal contents as JSON.
 * This improves reliability, design fidelity, and token efficiency.
 *
 * Model: LLM_MODEL_PROTOTYPE env var (default: google/gemini-2.5-flash-preview via OpenRouter)
 *
 * SSE events:
 *   { type: 'progress', status: string }
 *   { type: 'complete', prototypeId: string, name: string, html: string, ... }
 *   { type: 'error', message: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import {
    getLlmConfigForFeature,
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
import {
    CORRAD_SYSTEM_PROMPT,
    CORRAD_SNIPPETS_COMPACT,
    CORRAD_SHELL_TEMPLATE,
    CORRAD_FORBIDDEN_CLASSES,
    CORRAD_ICON_MAP,
    PROTOTYPE_SYSTEM_PROMPT_EXTENSION,
} from '../_shared/corradDesign.ts'
import {
    parseLlmJson,
    validatePrototypeModel,
    stripForbiddenClasses,
    resolveIconPlaceholders,
    serializePages,
    serializePageTitles,
    renderNavItemsHtml,
    renderModalsHtml,
} from '../_shared/prototypeSchema.ts'
import type { PrototypeModel } from '../_shared/prototypeSchema.ts'

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

// ── LLM call ──────────────────────────────────────────────────────────────

async function callLlm(
    messages: Array<{ role: string; content: string }>,
    config: LlmConfig,
    temperature = 0.4,
    maxTokens = 14000,
): Promise<string> {
    const endpoint = buildLlmEndpoint(config)
    const headers = buildLlmHeaders(config)
    const body = buildLlmRequestBody(messages, config, { temperature, maxTokens, stream: false })

    const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`LLM request failed (${res.status}): ${errText.slice(0, 300)}`)
    }

    const json = await res.json()
    return parseLlmResponse(json, config.provider)
}

// ── System prompt (composed from corrad-design bundle) ────────────────────

function buildSystemPrompt(): string {
    return [
        CORRAD_SYSTEM_PROMPT,
        '',
        '## REFERENCE SNIPPETS',
        '',
        CORRAD_SNIPPETS_COMPACT,
        '',
        PROTOTYPE_SYSTEM_PROMPT_EXTENSION,
    ].join('\n')
}

// ── User prompt ───────────────────────────────────────────────────────────

function buildUserPrompt(
    docTitle: string,
    docType: string,
    docText: string,
    ragContext: string,
): string {
    const fullType = DOC_TYPE_FULL[docType] || docType
    const contextSection = ragContext.trim()
        ? `\n--- PROJECT CONTEXT ---\n${ragContext.slice(0, 12000)}\n---`
        : ''

    return `Generate a UI prototype for this system.

SYSTEM NAME: ${docTitle}
DOC TYPE: ${docType} (${fullType})

--- DOCUMENT CONTENT ---
${docText ? docText.slice(0, 30000) : 'No document content available. Generate a generic prototype based on the document title and type.'}
---${contextSection}

Return the JSON object described in the system prompt. No prose, no markdown fences.`
}

// ── HTML assembly ─────────────────────────────────────────────────────────

/**
 * Assemble the final HTML from a validated PrototypeModel.
 * Interpolates CORRAD_SHELL_TEMPLATE placeholders server-side.
 */
function assembleHtml(model: PrototypeModel): string {
    const firstPageKey = model.pages[0]?.key ?? 'dashboard'

    // Resolve icon placeholders in page HTML before serialization
    const resolvedPages = model.pages.map(p => ({
        ...p,
        html: resolveIconPlaceholders(p.html, CORRAD_ICON_MAP),
    }))

    // Resolve icon placeholders in modal HTML
    const resolvedModals = model.modals.map(m => ({
        ...m,
        html: resolveIconPlaceholders(m.html, CORRAD_ICON_MAP),
    }))

    const navItemsHtml = renderNavItemsHtml(model.navGroups, CORRAD_ICON_MAP)
    const modalsHtml = renderModalsHtml(resolvedModals)
    const pagesJs = serializePages(resolvedPages)
    const pageTitlesJs = serializePageTitles(resolvedPages)

    return CORRAD_SHELL_TEMPLATE
        .replace(/\{\{SYSTEM_NAME\}\}/g, escapeHtml(model.systemName))
        .replace(/\{\{SHORT_DESCRIPTION\}\}/g, escapeHtml(model.shortDescription ?? ''))
        .replace('{{NAV_ITEMS_HTML}}', navItemsHtml)
        .replace('{{MODALS_HTML}}', modalsHtml)
        .replace('{{PAGES_JS}}', pagesJs)
        .replace('{{PAGE_TITLES_JS}}', pageTitlesJs)
        .replace(/\{\{INITIAL_PAGE_KEY\}\}/g, firstPageKey)
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// ── Main handler ──────────────────────────────────────────────────────────

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

        // Decode JWT payload to get userId (signature already verified by gateway)
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

        const llmConfig = getLlmConfigForFeature('prototype')
        const embeddingConfig = getEmbeddingConfig()
        const ragConfig = getRagConfig()

        if (!llmConfig.apiKey) {
            throw new Error('No LLM API key configured')
        }

        // ── SSE stream setup ─────────────────────────────────────────────
        const encoder = new TextEncoder()
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
        const writer = writable.getWriter()

        function sendEvent(data: Record<string, unknown>) {
            writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)).catch(() => {})
        }

        function sendHeartbeat() {
            writer.write(encoder.encode(': keep-alive\n\n')).catch(() => {})
        }

        // ── Background pipeline ──────────────────────────────────────────
        ;(async () => {
            const heartbeat = setInterval(sendHeartbeat, 20_000)

            try {
                // Phase 1: Extract document content + RAG in parallel
                sendEvent({ type: 'progress', status: 'Extracting document content and searching project context...' })

                const { data: docRow } = await supabaseAdmin
                    .from('requirement_docs')
                    .select('storage_path, content')
                    .eq('id', docId)
                    .eq('project_id', projectId)
                    .single()

                const [docText, ragResult] = await Promise.all([
                    downloadAndExtractDocText(
                        docRow?.storage_path ?? null,
                        docRow?.content ?? null,
                        supabaseAdmin,
                    ),
                    performRag(
                        `UI prototype for ${docTitle}`,
                        `${docType} user interface screens and workflows`,
                        '',
                        docType,
                        projectId,
                        selectedDocumentPaths,
                        embeddingConfig,
                        ragConfig,
                        supabaseAdmin,
                    ).catch(() => ({ contextText: '' })),
                ])

                const ragContext = ragResult.contextText ?? ''

                // Phase 2: LLM generation (JSON output)
                sendEvent({ type: 'progress', status: 'Generating prototype structure (this may take a moment)...' })

                const messages = [
                    { role: 'system', content: buildSystemPrompt() },
                    { role: 'user', content: buildUserPrompt(docTitle, docType, docText, ragContext) },
                ]

                const rawJson = await callLlm(messages, llmConfig, 0.4, 32000)

                // Phase 3: Parse + validate JSON
                sendEvent({ type: 'progress', status: 'Assembling prototype...' })

                const model = parseLlmJson(rawJson)
                validatePrototypeModel(model)

                // Strip any forbidden classes the LLM may have slipped in
                for (const page of model.pages) {
                    page.html = stripForbiddenClasses(page.html, CORRAD_FORBIDDEN_CLASSES)
                }
                for (const modal of model.modals) {
                    modal.html = stripForbiddenClasses(modal.html, CORRAD_FORBIDDEN_CLASSES)
                }

                // Phase 4: Assemble HTML from model + shell template
                const html = assembleHtml(model)

                if (!html || html.length < 500) {
                    throw new Error('Assembled prototype HTML is unexpectedly short')
                }

                // Phase 5: Save to DB (html + model jsonb)
                sendEvent({ type: 'progress', status: 'Saving prototype to workspace...' })
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
                        model,
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
                    model,
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
