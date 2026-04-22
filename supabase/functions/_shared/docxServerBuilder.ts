/**
 * Server-side DOCX builder for auto-generate.
 * Converts markdown text to docx library nodes and assembles a full DOCX document.
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    ShadingType,
    PageBreak,
    BorderStyle,
    ImageRun,
} from 'https://esm.sh/docx@9.6.0'

import type { ServerDocSection } from './brsStructure.ts'
import type { DiagramImage } from './docxTemplateBuilder.ts'

// ── Styling constants ────────────────────────────────────────────────────────

const FONT = 'Arial'
const BODY_SIZE = 20      // 10pt
const H1_SIZE = 28        // 14pt
const H2_SIZE = 24        // 12pt
const H3_SIZE = 22        // 11pt
const H4_SIZE = 20        // 10pt
const TABLE_SIZE = 18     // 9pt

const HEADING_MAP: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
}

const SIZE_MAP: Record<number, number> = { 1: H1_SIZE, 2: H2_SIZE, 3: H3_SIZE, 4: H4_SIZE }

// ── Markdown → DOCX nodes ────────────────────────────────────────────────────

interface InlineSegment {
    text: string
    bold?: boolean
    italic?: boolean
}

/** Parse inline markdown (**bold**, *italic*) into segments. */
function parseInline(line: string): InlineSegment[] {
    const segments: InlineSegment[] = []
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(line)) !== null) {
        if (match[2]) {
            segments.push({ text: match[2], bold: true })
        } else if (match[3]) {
            segments.push({ text: match[3], italic: true })
        } else if (match[4]) {
            segments.push({ text: match[4] })
        }
    }
    if (segments.length === 0 && line.length > 0) {
        segments.push({ text: line })
    }
    return segments
}

/** Convert inline segments to TextRun array. */
function segmentsToRuns(segments: InlineSegment[], size = BODY_SIZE): TextRun[] {
    return segments.map(s => new TextRun({
        text: s.text,
        bold: s.bold,
        italics: s.italic,
        font: FONT,
        size,
    }))
}

/** Parse a markdown table block into header and data rows. */
function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } {
    const headers = lines[0].split('|').map(c => c.trim()).filter(Boolean)
    const rows: string[][] = []
    for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean)
        if (cells.length > 0) rows.push(cells)
    }
    return { headers, rows }
}

/** Build a docx Table from parsed markdown table data. */
function buildTable(headers: string[], rows: string[][]): Table {
    const colCount = headers.length
    const colWidth = Math.floor(9000 / colCount)

    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map(h => new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: '2d3748' },
            children: [new Paragraph({
                children: [new TextRun({ text: h, bold: true, font: FONT, size: TABLE_SIZE, color: 'ffffff' })],
                spacing: { before: 40, after: 40 },
            })],
        })),
    })

    const dataRows = rows.map((row, ri) => new TableRow({
        children: Array.from({ length: colCount }, (_, ci) => {
            const cellText = row[ci] || ''
            return new TableCell({
                width: { size: colWidth, type: WidthType.DXA },
                shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: 'f7fafc' } : undefined,
                children: [new Paragraph({
                    children: segmentsToRuns(parseInline(cellText), TABLE_SIZE),
                    spacing: { before: 30, after: 30 },
                })],
            })
        }),
    }))

    return new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [headerRow, ...dataRows],
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e0' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e0' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e0' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e0' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e0' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e0' },
        },
    })
}

/**
 * Convert markdown text to an array of docx elements (Paragraph, Table).
 * Handles: paragraphs, **bold**, *italic*, bullet lists, numbered lists, markdown tables.
 */
export function markdownToDocxNodes(markdown: string): (Paragraph | Table)[] {
    const nodes: (Paragraph | Table)[] = []
    const lines = markdown.split('\n')
    let i = 0

    while (i < lines.length) {
        const line = lines[i].trimEnd()

        // Skip empty lines
        if (line.trim() === '') {
            i++
            continue
        }

        // Markdown table (starts with |)
        if (line.trim().startsWith('|')) {
            const tableLines: string[] = []
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                const tl = lines[i].trim()
                // skip separator lines like |---|---|
                if (!/^\|[\s-|:]+\|?$/.test(tl)) {
                    tableLines.push(tl)
                }
                i++
            }
            if (tableLines.length >= 1) {
                const { headers, rows } = parseMarkdownTable(tableLines)
                if (headers.length > 0) {
                    nodes.push(buildTable(headers, rows))
                    nodes.push(new Paragraph({ spacing: { after: 200 } }))
                }
            }
            continue
        }

        // Bullet list item (- or *) — preserves indent level for nesting
        if (/^\s*[-*]\s+/.test(line)) {
            const spaces = (line.match(/^(\s*)/) ?? ['', ''])[1].length
            const level = Math.min(Math.floor(spaces / 2), 3)
            const text = line.replace(/^\s*[-*]\s+/, '')
            nodes.push(new Paragraph({
                children: segmentsToRuns(parseInline(text)),
                numbering: { reference: 'auto-bullet', level },
                spacing: { before: 60, after: 60 },
            }))
            i++
            continue
        }

        // Numbered list item (1. 2. etc) — preserves indent level for nesting
        if (/^\s*\d+\.\s+/.test(line)) {
            const spaces = (line.match(/^(\s*)/) ?? ['', ''])[1].length
            const level = Math.min(Math.floor(spaces / 2), 3)
            const text = line.replace(/^\s*\d+\.\s+/, '')
            nodes.push(new Paragraph({
                children: segmentsToRuns(parseInline(text)),
                numbering: { reference: 'auto-number', level },
                spacing: { before: 60, after: 60 },
            }))
            i++
            continue
        }

        // Markdown heading (### etc) — sub-headings within generated content
        const headingMatch = line.match(/^(#{1,4})\s+(.+)/)
        if (headingMatch) {
            const level = Math.min(headingMatch[1].length, 4) as 1 | 2 | 3 | 4
            nodes.push(new Paragraph({
                heading: HEADING_MAP[level],
                children: [new TextRun({
                    text: headingMatch[2],
                    bold: true,
                    font: FONT,
                    size: SIZE_MAP[level],
                })],
                spacing: { before: 240, after: 120 },
            }))
            i++
            continue
        }

        // Regular paragraph
        nodes.push(new Paragraph({
            children: segmentsToRuns(parseInline(line)),
            spacing: { before: 100, after: 100 },
        }))
        i++
    }

    return nodes
}

// ── Title page builder ───────────────────────────────────────────────────────

function buildTitlePage(projectName: string, docTitle: string): Paragraph[] {
    return [
        new Paragraph({ spacing: { before: 4000 } }),
        new Paragraph({
            children: [new TextRun({
                text: projectName,
                bold: true,
                font: FONT,
                size: 48,
                color: '1a1a1a',
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        new Paragraph({
            children: [new TextRun({
                text: docTitle,
                bold: true,
                font: FONT,
                size: 36,
                color: '4a5568',
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            children: [new TextRun({
                text: 'Spesifikasi Keperluan Bisnes (BRS)',
                font: FONT,
                size: 28,
                color: '718096',
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
        }),
        new Paragraph({
            children: [new TextRun({
                text: `Tarikh: ${new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                font: FONT,
                size: BODY_SIZE,
                color: '718096',
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({ children: [new PageBreak()] }),
    ]
}

// ── Full DOCX assembly ──────────────────────────────────────────────────────

/**
 * Build a complete auto-generated DOCX document.
 *
 * @param projectName - Project name for the title page
 * @param docTitle - Document title
 * @param structure - BRS section structure
 * @param generatedContent - Map of section title → generated markdown content
 * @param diagramImages - Map of section title → rendered PNG diagram data (optional)
 * @returns Blob of the DOCX file
 */
export async function buildAutoGeneratedDocx(
    projectName: string,
    docTitle: string,
    structure: ServerDocSection[],
    generatedContent: Map<string, string>,
    diagramImages?: Map<string, DiagramImage>,
): Promise<Blob> {
    const children: (Paragraph | Table)[] = []

    // Title page
    children.push(...buildTitlePage(projectName, docTitle))

    // Sections
    for (const section of structure) {
        // Section heading
        const level = Math.min(section.level, 4) as 1 | 2 | 3 | 4
        children.push(new Paragraph({
            heading: HEADING_MAP[level],
            children: [new TextRun({
                text: section.title,
                bold: true,
                font: FONT,
                size: SIZE_MAP[level],
            })],
            spacing: { before: level === 1 ? 400 : 240, after: 120 },
        }))

        // Section content
        const content = generatedContent.get(section.title)
        if (content) {
            const docxNodes = markdownToDocxNodes(content)
            children.push(...docxNodes)
        }

        // Diagram image (after text content)
        const diagImg = diagramImages?.get(section.title)
        if (diagImg) {
            const maxWidthPt = 480
            const scale = Math.min(1, maxWidthPt / diagImg.width)
            const imgWidth = Math.round(diagImg.width * scale)
            const imgHeight = Math.round(diagImg.height * scale)
            children.push(new Paragraph({
                children: [new ImageRun({
                    data: diagImg.pngBytes,
                    transformation: { width: imgWidth, height: imgHeight },
                    type: 'png',
                })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 160, after: 80 },
            }))
            children.push(new Paragraph({
                children: [new TextRun({
                    text: `Rajah: ${section.title}`,
                    font: FONT,
                    size: TABLE_SIZE,
                    italics: true,
                    color: '4a5568',
                })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
            }))
        }

        if (!content && !section.autoGenerate) {
            // Placeholder for non-generated sections
            children.push(new Paragraph({
                children: [new TextRun({
                    text: section.instructions[0] || '[Bahagian ini perlu diisi secara manual]',
                    font: FONT,
                    size: BODY_SIZE,
                    color: '999999',
                    italics: true,
                })],
                spacing: { before: 100, after: 100 },
            }))
        }

        // Add spacing between sections
        children.push(new Paragraph({ spacing: { after: 200 } }))
    }

    const doc = new Document({
        numbering: {
            config: [
                {
                    reference: 'auto-number',
                    levels: [
                        { level: 0, format: 'decimal' as const, text: '%1.', alignment: AlignmentType.START },
                        { level: 1, format: 'lowerLetter' as const, text: '%2)', alignment: AlignmentType.START },
                        { level: 2, format: 'lowerRoman' as const, text: '%3.', alignment: AlignmentType.START },
                        { level: 3, format: 'decimal' as const, text: '%4.', alignment: AlignmentType.START },
                    ],
                },
                {
                    reference: 'auto-bullet',
                    levels: [
                        { level: 0, format: 'bullet' as const, text: '\u2022', alignment: AlignmentType.START },
                        { level: 1, format: 'bullet' as const, text: '\u25CB', alignment: AlignmentType.START },
                        { level: 2, format: 'bullet' as const, text: '\u25AA', alignment: AlignmentType.START },
                        { level: 3, format: 'bullet' as const, text: '\u2013', alignment: AlignmentType.START },
                    ],
                },
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                    size: { width: 12240, height: 15840, orientation: 'portrait' as const },
                },
            },
            children,
        }],
    })

    return await Packer.toBlob(doc)
}
