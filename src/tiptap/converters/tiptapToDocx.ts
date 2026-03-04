import {
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    ShadingType,
    HeadingLevel,
    ImageRun,
} from 'docx'
import type { JSONContent } from '@tiptap/core'

const FONT = 'Arial'
const BODY_SIZE = 20    // 10pt in half-points
const H1_SIZE = 32      // 16pt
const H2_SIZE = 26      // 13pt
const H3_SIZE = 22      // 11pt
const TABLE_BODY_SIZE = 18   // 9pt

interface TextRunOpts {
    bold?: boolean
    italics?: boolean
    underline?: { type: 'single' }
    strike?: boolean
}

/**
 * Converts a Tiptap document JSONContent into docx Paragraph and Table nodes.
 * Async because mermaid rendering and image fetching are async.
 * Used by docxBuilder when the document is in the new tiptap-v1 format.
 */
export async function tiptapJsonToDocxChildren(doc: JSONContent): Promise<(Paragraph | Table)[]> {
    const out: (Paragraph | Table)[] = []
    for (const node of doc.content || []) {
        await convertNode(node, out)
    }
    return out
}

async function convertNode(node: JSONContent, out: (Paragraph | Table)[]): Promise<void> {
    switch (node.type) {
        case 'sectionHeading':
            out.push(buildHeading(node))
            break

        case 'heading':
            out.push(buildHeading(node))
            break

        case 'paragraph':
            out.push(buildParagraph(node))
            break

        case 'bulletList':
            for (const item of node.content || []) {
                out.push(...buildListItem(item, 'bullet'))
            }
            break

        case 'orderedList':
            for (const item of node.content || []) {
                out.push(...buildListItem(item, 'ordered'))
            }
            break

        case 'blockquote':
            for (const child of node.content || []) {
                const p = buildParagraph(child)
                out.push(new Paragraph({
                    ...p,
                    indent: { left: 720 },
                    border: {
                        left: { style: 'single' as any, size: 6, color: '999999', space: 10 },
                    },
                }))
            }
            break

        case 'table':
            out.push(buildTable(node))
            out.push(new Paragraph({ spacing: { after: 200 } }))
            break

        case 'hardBreak':
            out.push(new Paragraph({ children: [new TextRun({ break: 1, font: FONT, size: BODY_SIZE })] }))
            break

        case 'mermaidDiagram':
            await buildMermaidNode(node, out)
            break

        case 'imageBlock':
            await buildImageNode(node, out)
            break
    }
}

// ─── Mermaid → docx ──────────────────────────────────────────────────────────

async function buildMermaidNode(node: JSONContent, out: (Paragraph | Table)[]): Promise<void> {
    const code = (node.attrs?.code as string) || ''
    const caption = (node.attrs?.caption as string) || ''

    try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })
        const id = `docx-mermaid-${Date.now()}`
        const { svg } = await mermaid.render(id, code)
        const pngBytes = await svgToPngBytes(svg, 700, 400)
        if (!pngBytes) throw new Error('canvas unavailable')

        out.push(new Paragraph({
            children: [new ImageRun({ data: pngBytes, transformation: { width: 480, height: 270 }, type: 'png' })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 80 },
        }))
    } catch {
        out.push(new Paragraph({
            children: [new TextRun({
                text: `[Diagram: ${code.split('\n')[0]}]`,
                font: FONT, size: BODY_SIZE, italics: true, color: '888888',
            })],
            spacing: { after: 120 },
        }))
    }

    if (caption) {
        out.push(new Paragraph({
            children: [new TextRun({ text: caption, font: FONT, size: 16, italics: true, color: '64748b' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }))
    }
}

// ─── Image → docx ────────────────────────────────────────────────────────────

async function buildImageNode(node: JSONContent, out: (Paragraph | Table)[]): Promise<void> {
    const src = node.attrs?.src as string | null
    const caption = (node.attrs?.caption as string) || ''
    const alt = (node.attrs?.alt as string) || 'figure'

    if (src) {
        try {
            const bytes = await fetchImageBytes(src)
            const extRaw = src.split('?')[0].split('.').pop()?.toLowerCase() ?? 'png'
            const imgType = (extRaw === 'jpeg' ? 'jpg' : extRaw) as 'png' | 'jpg' | 'gif' | 'bmp'

            out.push(new Paragraph({
                children: [new ImageRun({ data: bytes, transformation: { width: 480, height: 320 }, type: imgType })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 160, after: 80 },
            }))
        } catch {
            out.push(new Paragraph({
                children: [new TextRun({ text: `[Image: ${alt}]`, font: FONT, size: BODY_SIZE, italics: true, color: '888888' })],
                spacing: { after: 120 },
            }))
        }
    } else {
        out.push(new Paragraph({
            children: [new TextRun({ text: `[Image placeholder]`, font: FONT, size: BODY_SIZE, italics: true, color: '888888' })],
            spacing: { after: 120 },
        }))
    }

    if (caption) {
        out.push(new Paragraph({
            children: [new TextRun({ text: caption, font: FONT, size: 16, italics: true, color: '64748b' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }))
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function svgToPngBytes(svg: string, width: number, height: number): Promise<Uint8Array | null> {
    return new Promise(resolve => {
        try {
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) { resolve(null); return }

            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(svgBlob)
            const img = new Image()

            img.onload = () => {
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, width, height)
                ctx.drawImage(img, 0, 0, width, height)
                URL.revokeObjectURL(url)
                canvas.toBlob(blob => {
                    if (!blob) { resolve(null); return }
                    blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
                }, 'image/png')
            }
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
            img.src = url
        } catch {
            resolve(null)
        }
    })
}

async function fetchImageBytes(src: string): Promise<Uint8Array> {
    const response = await fetch(src)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return new Uint8Array(await response.arrayBuffer())
}

function buildHeading(node: JSONContent): Paragraph {
    const level = (node.attrs?.level as number) || 1
    const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
    }
    // Size is embedded in HeadingLevel styles from docx; kept here for reference
    void ({ 1: H1_SIZE, 2: H2_SIZE, 3: H3_SIZE } as Record<number, number>)

    const runs = extractTextRuns(node, { bold: true })

    return new Paragraph({
        children: runs.length > 0 ? runs : [new TextRun({ text: '', font: FONT })],
        heading: headingMap[level] || HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 160 },
    })
}

function buildParagraph(node: JSONContent): Paragraph {
    const runs = extractTextRuns(node, {})
    return new Paragraph({
        children: runs.length > 0
            ? runs
            : [new TextRun({ text: '', font: FONT, size: BODY_SIZE })],
        spacing: { after: 120 },
    })
}

function buildListItem(item: JSONContent, kind: 'bullet' | 'ordered'): Paragraph[] {
    const out: Paragraph[] = []
    for (const child of item.content || []) {
        const runs = extractTextRuns(child, {})
        out.push(new Paragraph({
            children: runs,
            ...(kind === 'bullet'
                ? { bullet: { level: 0 } }
                : { indent: { left: 720 } }),
            spacing: { after: 60 },
        }))
    }
    return out
}

function buildTable(node: JSONContent): Table {
    const rows = node.content || []
    const colCount = (rows[0]?.content || []).length || 1
    const colWidth = Math.floor(9000 / colCount)

    const tableRows: TableRow[] = rows.map((row, rowIdx) => {
        const isHeader = rowIdx === 0
        return new TableRow({
            tableHeader: isHeader,
            children: (row.content || []).map(cell => {
                const runs = extractTextRuns(cell, isHeader ? { bold: true } : {})
                return new TableCell({
                    children: [new Paragraph({
                        children: runs.length > 0 ? runs : [new TextRun({ text: '', font: FONT, size: TABLE_BODY_SIZE })],
                        spacing: { before: 40, after: 40 },
                        alignment: isHeader ? AlignmentType.LEFT : AlignmentType.LEFT,
                    })],
                    width: { size: colWidth, type: WidthType.DXA },
                    shading: isHeader
                        ? { type: ShadingType.SOLID, color: '2d2d2d', fill: '2d2d2d' }
                        : rowIdx % 2 === 0
                            ? undefined
                            : { type: ShadingType.SOLID, color: 'f8f8f8', fill: 'f8f8f8' },
                })
            }),
        })
    })

    return new Table({
        rows: tableRows,
        width: { size: 9000, type: WidthType.DXA },
    })
}

/**
 * Recursively extract TextRun objects from a Tiptap node tree.
 */
function extractTextRuns(node: JSONContent, inheritedOpts: TextRunOpts): TextRun[] {
    const runs: TextRun[] = []

    if (node.type === 'text') {
        const marks = node.marks || []
        const opts: TextRunOpts = { ...inheritedOpts }
        for (const mark of marks) {
            if (mark.type === 'bold') opts.bold = true
            if (mark.type === 'italic') opts.italics = true
            if (mark.type === 'underline') opts.underline = { type: 'single' }
            if (mark.type === 'strike') opts.strike = true
        }
        const text = (node.text as string) || ''
        if (text) {
            runs.push(new TextRun({
                text,
                bold: opts.bold,
                italics: opts.italics,
                underline: opts.underline,
                strike: opts.strike,
                font: FONT,
                size: BODY_SIZE,
                color: inheritedOpts.bold ? undefined : '1a1a1a',
            }))
        }
        return runs
    }

    if (node.type === 'hardBreak') {
        runs.push(new TextRun({ break: 1, font: FONT, size: BODY_SIZE }))
        return runs
    }

    for (const child of node.content || []) {
        runs.push(...extractTextRuns(child, inheritedOpts))
    }

    return runs
}
