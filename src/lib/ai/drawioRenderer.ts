/**
 * Renders a draw.io XML (mxGraphModel format) string to a base64 PNG data URI.
 *
 * Uses draw.io's public viewer export API to convert XML → PNG.
 * Falls back to a transparent placeholder if the network request fails.
 */
export async function renderDrawioToBase64(xml: string): Promise<string> {
    // Encode the XML as base64 for the viewer API
    const encoded = encodeDrawio(xml)

    try {
        const url = `https://viewer.diagrams.net/export?format=png&xml=${encodeURIComponent(encoded)}`
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (!res.ok) throw new Error(`Draw.io viewer returned ${res.status}`)

        const blob = await res.blob()
        return await blobToBase64(blob)
    } catch {
        // If network fails, return a simple SVG placeholder rendered to PNG
        return renderPlaceholderPng(`Draw.io Diagram`)
    }
}

/** Base64-encode draw.io XML */
function encodeDrawio(xml: string): string {
    return btoa(unescape(encodeURIComponent(xml)))
}

/** Convert a Blob to a base64 data URI */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

/** Render a simple text placeholder as a PNG data URI */
function renderPlaceholderPng(label: string): string {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, 400, 200)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, 398, 198)
    ctx.fillStyle = '#64748b'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, 200, 95)
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('(Diagram — open in draw.io to view)', 200, 120)
    return canvas.toDataURL('image/png')
}
