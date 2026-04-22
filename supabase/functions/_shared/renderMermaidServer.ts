/**
 * Server-side Mermaid → PNG renderer for Deno edge functions.
 * Uses kroki.io (primary) and mermaid.ink (fallback) since Deno has no DOM/canvas.
 */

const KNOWN_DIAGRAM_TYPES = [
    'flowchart', 'graph', 'erDiagram', 'sequenceDiagram',
    'classDiagram', 'stateDiagram', 'gantt', 'pie', 'mindmap',
]

/**
 * Strip wrapping fences/tags and validate that the code starts with a known Mermaid type.
 * Discards any LLM prose preamble before the first diagram type declaration.
 * Returns cleaned code or null if no valid diagram type found.
 */
export function sanitizeMermaidCode(raw: string): string | null {
    let code = raw.trim()

    // Strip markdown fences (with or without language tag)
    code = code.replace(/^```(?:mermaid)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')

    // Strip HTML pre/code tags
    code = code.replace(/^<pre[^>]*>\s*/i, '').replace(/\s*<\/pre>\s*$/i, '')
    code = code.replace(/^<code[^>]*>\s*/i, '').replace(/\s*<\/code>\s*$/i, '')

    code = code.trim()
    if (!code) return null

    // Find the first line that starts with a known diagram type declaration.
    // This discards any LLM prose preamble before the actual Mermaid code.
    const lines = code.split('\n')
    const startIdx = lines.findIndex(line => {
        const trimmed = line.trim().toLowerCase()
        return KNOWN_DIAGRAM_TYPES.some(t => trimmed.startsWith(t.toLowerCase()))
    })

    if (startIdx === -1) return null

    // Also strip trailing prose: find the last non-blank line after the diagram start
    // that is part of the diagram (not an explanation). Mermaid lines are typically
    // indented or start with diagram syntax; prose tends to appear after a blank line
    // following diagram content. We keep everything from startIdx onward and let
    // the rendering API handle any trailing noise.
    const diagram = lines.slice(startIdx).join('\n').trim()
    if (!diagram) return null

    return diagram
}

/**
 * Parse PNG IHDR chunk to extract width and height.
 * PNG structure: 8-byte signature, then IHDR chunk at offset 8.
 * IHDR data starts at offset 16: 4 bytes width + 4 bytes height (big-endian).
 */
function parsePngDimensions(data: Uint8Array): { width: number; height: number } {
    if (data.length < 24) return { width: 800, height: 600 }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    const width = view.getUint32(16, false)  // big-endian
    const height = view.getUint32(20, false)
    return { width, height }
}

/**
 * Fix common LLM-generated Mermaid syntax issues before sending to rendering APIs.
 * Operates on already-sanitized code (first line is a valid diagram type declaration).
 */
export function fixCommonMermaidIssues(code: string): string {
    const lines = code.split('\n')

    // 1. Normalize "graph TD/LR/TB/BT/RL" → "flowchart TD/LR/…"
    //    kroki.io handles both but flowchart is more reliable with newer Mermaid syntax
    lines[0] = lines[0].replace(/^graph\s+(TD|LR|TB|BT|RL)/i, (_, dir) => `flowchart ${dir.toUpperCase()}`)

    // 2. Remove :::className style annotations (LLM sometimes adds Mermaid style classes)
    const fixed = lines.map(line => line.replace(/:::[\w-]+/g, ''))

    // 3. Strip HTML entities that kroki.io may reject in label text
    const decoded = fixed.map(line =>
        line
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
    )

    // 4. Strip parentheses from subgraph labels — Mermaid's parser rejects
    //    "subgraph ID[Label (with parens)]" with a token error on the "(" char.
    //    e.g. subgraph AS-IS[Proses Semasa (AS-IS)] → subgraph AS-IS[Proses Semasa AS-IS]
    const noSubgraphParens = decoded.map(line =>
        line.replace(
            /^(\s*subgraph\s+\S+\[)([^\]]*)\]/,
            (_, prefix, label) => `${prefix}${label.replace(/[()]/g, '')}]`,
        )
    )

    // 5. Strip parentheses inside regular node square-bracket labels.
    //    e.g. A[Pengecasan EV (Jika Perlu)] → A[Pengecasan EV Jika Perlu]
    //    The parser treats "(" inside [...] as starting a new shape definition.
    //    Only targets [...] that actually contain parens; leaves (text) and ([stadium]) untouched.
    const noNodeParens = noSubgraphParens.map(line =>
        line.replace(/\[([^\]]*[()][^\]]*)\]/g, (_, label) => `[${label.replace(/[()]/g, '')}]`)
    )

    return noNodeParens.join('\n')
}

const RENDER_TIMEOUT_MS = 8_000
const RENDER_RETRY_DELAY_MS = 1_500

/** One attempt against a single rendering API. Returns PNG bytes or null. */
async function attemptFetch(
    url: string,
    init: RequestInit,
    signal?: AbortSignal,
): Promise<Uint8Array | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS)
    const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal

    try {
        const res = await fetch(url, { ...init, signal: combinedSignal })
        clearTimeout(timeout)

        if (res.ok) {
            const buf = await res.arrayBuffer()
            return new Uint8Array(buf)
        }

        // Read body — kroki.io puts the Mermaid parse error here
        const body = await res.text().catch(() => '')
        console.warn(`[renderMermaid] ${url} returned ${res.status}: ${body.slice(0, 300)}`)
        return null
    } catch (e) {
        clearTimeout(timeout)
        console.warn(`[renderMermaid] ${url} threw:`, (e as Error).message)
        return null
    }
}

/**
 * Render Mermaid code to PNG via kroki.io (primary) or mermaid.ink (fallback).
 * Each API gets 2 attempts (1 retry after RENDER_RETRY_DELAY_MS).
 * Returns PNG bytes + dimensions, or null if all attempts fail.
 */
export async function renderMermaidToPng(
    mermaidCode: string,
    signal?: AbortSignal,
): Promise<{ pngBytes: Uint8Array; width: number; height: number } | null> {
    const fixedCode = fixCommonMermaidIssues(mermaidCode)
    const codePreview = fixedCode.slice(0, 200).replace(/\n/g, '↵')
    console.log(`[renderMermaid] Rendering: ${codePreview}`)

    const krokiInit: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: fixedCode,
    }

    // Primary: kroki.io — 2 attempts
    for (let attempt = 1; attempt <= 2; attempt++) {
        if (signal?.aborted) return null
        if (attempt > 1) {
            await new Promise(r => setTimeout(r, RENDER_RETRY_DELAY_MS))
        }
        const bytes = await attemptFetch('https://kroki.io/mermaid/png', krokiInit, signal)
        if (bytes) {
            console.log(`[renderMermaid] kroki.io succeeded (attempt ${attempt})`)
            return { pngBytes: bytes, ...parsePngDimensions(bytes) }
        }
    }

    // Fallback: mermaid.ink — 2 attempts
    // btoa() only handles Latin-1; encode as UTF-8 bytes first to support BM labels
    const utf8Bytes = new TextEncoder().encode(fixedCode)
    const encoded = btoa(String.fromCharCode(...utf8Bytes))
    const inkUrl = `https://mermaid.ink/img/${encoded}`

    for (let attempt = 1; attempt <= 2; attempt++) {
        if (signal?.aborted) return null
        if (attempt > 1) {
            await new Promise(r => setTimeout(r, RENDER_RETRY_DELAY_MS))
        }
        const bytes = await attemptFetch(inkUrl, {}, signal)
        if (bytes) {
            console.log(`[renderMermaid] mermaid.ink succeeded (attempt ${attempt})`)
            return { pngBytes: bytes, ...parsePngDimensions(bytes) }
        }
    }

    console.warn(`[renderMermaid] All 4 attempts failed. Code preview: ${codePreview}`)
    return null
}
