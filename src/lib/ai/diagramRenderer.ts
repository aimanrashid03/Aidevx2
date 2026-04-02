/**
 * Renders a Mermaid diagram code string to a base64 PNG data URI.
 * Uses the mermaid library (already in the bundle) to produce SVG,
 * then converts SVG → PNG via an offscreen canvas.
 */
export async function renderMermaidToBase64(code: string): Promise<string> {
    const mod = await import('mermaid')
    const mermaid = mod.default
    mermaid.initialize({ startOnLoad: false, theme: 'neutral' })

    // Create a unique element id for this render
    const id = `mermaid-render-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Render to SVG string
    const { svg } = await mermaid.render(id, code)

    // Convert SVG string → PNG via canvas
    return svgToPngBase64(svg)
}

/** Convert an SVG string to a base64 PNG data URI via an offscreen canvas */
async function svgToPngBase64(svg: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Parse SVG to determine dimensions
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
        const svgEl = svgDoc.querySelector('svg')
        if (!svgEl) { reject(new Error('No SVG element')); return }

        const widthAttr = svgEl.getAttribute('width')
        const heightAttr = svgEl.getAttribute('height')
        const viewBox = svgEl.getAttribute('viewBox')

        let width = widthAttr ? parseFloat(widthAttr) : 0
        let height = heightAttr ? parseFloat(heightAttr) : 0

        if ((!width || !height) && viewBox) {
            const parts = viewBox.split(/[\s,]+/)
            if (parts.length >= 4) {
                width = parseFloat(parts[2])
                height = parseFloat(parts[3])
            }
        }

        // Fallback dimensions
        if (!width) width = 800
        if (!height) height = 400

        // Scale up for higher resolution output
        const scale = 2
        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Cannot get canvas context')); return }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.scale(scale, scale)

        const img = new Image()
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height)
            URL.revokeObjectURL(url)
            resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = (e) => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load SVG image: ' + String(e)))
        }
        img.src = url
    })
}
