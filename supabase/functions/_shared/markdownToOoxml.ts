/**
 * Markdown → raw OOXML string converter.
 * Produces XML fragments (<w:p> and <w:tbl> elements) that use
 * the BRS template's own styles so formatting is inherited exactly.
 *
 * Supports per-section numId assignment so each section's numbered list
 * restarts at 1 independently. Call generateNumberingEntries() to get
 * the <w:abstractNum> + <w:num> blocks to inject into word/numbering.xml.
 */

// ── XML helpers ─────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ── Inline markdown parsing ─────────────────────────────────────────────────

interface RunFragment {
    text: string
    bold?: boolean
    italic?: boolean
}

/** Parse **bold** and *italic* inline markdown into run fragments. */
function parseInlineMarkdown(text: string): RunFragment[] {
    const fragments: RunFragment[] = []
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
        if (match[2]) {
            fragments.push({ text: match[2], bold: true })
        } else if (match[3]) {
            fragments.push({ text: match[3], italic: true })
        } else if (match[4]) {
            fragments.push({ text: match[4] })
        }
    }
    if (fragments.length === 0 && text.length > 0) {
        fragments.push({ text })
    }
    return fragments
}

// ── OOXML element builders ──────────────────────────────────────────────────

/** Build a <w:r> element from a run fragment. Always enforces Arial font. */
function runXml(frag: RunFragment): string {
    let rPr = '<w:rPr>'
    rPr += '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
    rPr += '<w:sz w:val="20"/><w:szCs w:val="20"/>'
    if (frag.bold) rPr += '<w:b/><w:bCs/>'
    if (frag.italic) rPr += '<w:i/><w:iCs/>'
    rPr += '</w:rPr>'
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(frag.text)}</w:t></w:r>`
}

/** Build runs XML from a text string with inline markdown. */
function runsFromText(text: string): string {
    return parseInlineMarkdown(text).map(runXml).join('')
}

/** Build a paragraph with Content style. */
function paragraphXml(text: string, style = 'Content'): string {
    const runs = runsFromText(text)
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${runs}</w:p>`
}

/**
 * Compute indent level (0-3) from leading whitespace.
 * Each 2 spaces = +1 level.
 */
function getIndentLevel(line: string): number {
    const spaces = (line.match(/^(\s*)/) ?? ['', ''])[1].length
    return Math.min(Math.floor(spaces / 2), 3)
}

/** Build a bullet list item paragraph. Uses the provided numId and ilvl for nesting. */
function bulletXml(text: string, ilvl: number, numId: number): string {
    const runs = runsFromText(text)
    const indent = 720 + ilvl * 360
    return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr><w:ind w:left="${indent}" w:hanging="360"/></w:pPr>${runs}</w:p>`
}

/** Build a numbered list item paragraph. Uses the provided numId and ilvl for nesting. */
function numberedXml(text: string, ilvl: number, numId: number): string {
    const runs = runsFromText(text)
    const indent = 720 + ilvl * 360
    return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr><w:ind w:left="${indent}" w:hanging="360"/></w:pPr>${runs}</w:p>`
}

/** Build a table from headers and rows using TableGrid style. */
function tableXml(headers: string[], rows: string[][]): string {
    const colCount = headers.length
    const colWidth = Math.floor(9000 / colCount)

    // Table properties
    let xml = '<w:tbl><w:tblPr>'
    xml += '<w:tblStyle w:val="TableGrid"/>'
    xml += `<w:tblW w:w="${colCount * colWidth}" w:type="dxa"/>`
    xml += '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
    xml += '</w:tblPr>'

    // Grid columns
    xml += '<w:tblGrid>'
    for (let i = 0; i < colCount; i++) {
        xml += `<w:gridCol w:w="${colWidth}"/>`
    }
    xml += '</w:tblGrid>'

    // Header row
    xml += '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
    for (const h of headers) {
        xml += `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="2D3748"/></w:tcPr>`
        xml += `<w:p><w:pPr><w:jc w:val="left"/></w:pPr>`
        xml += `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">${escapeXml(h)}</w:t></w:r>`
        xml += '</w:p></w:tc>'
    }
    xml += '</w:tr>'

    // Data rows
    for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri]
        const fill = ri % 2 === 1 ? ' <w:shd w:val="clear" w:color="auto" w:fill="F7FAFC"/>' : ''
        xml += '<w:tr>'
        for (let ci = 0; ci < colCount; ci++) {
            const cellText = row[ci] || ''
            xml += `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/>${fill}</w:tcPr>`
            xml += `<w:p>${runsFromText(cellText)}</w:p></w:tc>`
        }
        xml += '</w:tr>'
    }

    xml += '</w:tbl>'
    return xml
}

// ── Markdown table parser ───────────────────────────────────────────────────

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } {
    const headers = lines[0].split('|').map(c => c.trim()).filter(Boolean)
    const rows: string[][] = []
    for (let i = 1; i < lines.length; i++) {
        // Skip separator rows (|---|---|)
        if (/^\|[\s\-|:]+\|?$/.test(lines[i].trim())) continue
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean)
        if (cells.length > 0) rows.push(cells)
    }
    return { headers, rows }
}

// ── Numbering definitions for injection ─────────────────────────────────────

/**
 * Generate the <w:abstractNum> and <w:num> OOXML blocks needed for
 * per-section numbered + bullet lists. Inject these before </w:numbering>
 * in word/numbering.xml.
 *
 * Each section gets its own <w:num> instances so its lists restart at 1.
 *
 * @param sectionCount   Number of auto-generate sections
 * @param baseNumId      Starting numId (use a value > any existing numId in the template)
 * @param baseAbstractId Starting abstractNumId (same caution applies)
 */
export function generateNumberingEntries(
    sectionCount: number,
    baseNumId: number,
    baseAbstractId: number,
): string {
    const parts: string[] = []

    // Abstract definition for decimal numbered lists (levels 0-3)
    // level 0: 1. 2. 3.   level 1: a) b) c)   level 2: i. ii. iii.   level 3: 1. 2. 3.
    parts.push(`<w:abstractNum w:abstractNumId="${baseAbstractId}" w15:restartNumberingAfterBreak="0" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">`)
    parts.push(`<w:multiLevelType w:val="multilevel"/>`)
    for (const [ilvl, fmt, tmpl] of [
        [0, 'decimal', '%1.'],
        [1, 'lowerLetter', '%2)'],
        [2, 'lowerRoman', '%3.'],
        [3, 'decimal', '%4.'],
    ] as [number, string, string][]) {
        const left = 720 + ilvl * 360
        parts.push(
            `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/>` +
            `<w:lvlText w:val="${tmpl}"/><w:lvlJc w:val="left"/>` +
            `<w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr>` +
            `<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>` +
            `</w:lvl>`
        )
    }
    parts.push(`</w:abstractNum>`)

    // Abstract definition for bullet lists (levels 0-3)
    // level 0: •   level 1: ○   level 2: ▪   level 3: –
    const bulletChars = ['\u2022', '\u25CB', '\u25AA', '\u2013']
    const bulletFonts = ['Symbol', 'Courier New', 'Symbol', 'Courier New']
    parts.push(`<w:abstractNum w:abstractNumId="${baseAbstractId + 1}" w15:restartNumberingAfterBreak="0" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">`)
    parts.push(`<w:multiLevelType w:val="multilevel"/>`)
    for (let ilvl = 0; ilvl < 4; ilvl++) {
        const left = 720 + ilvl * 360
        const font = bulletFonts[ilvl]
        const char = escapeXml(bulletChars[ilvl])
        parts.push(
            `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="bullet"/>` +
            `<w:lvlText w:val="${char}"/><w:lvlJc w:val="left"/>` +
            `<w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr>` +
            `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>` +
            `</w:lvl>`
        )
    }
    parts.push(`</w:abstractNum>`)

    // Per-section <w:num> instances — each pair references the abstract defs above
    // so each section's numbered list restarts at 1 independently.
    for (let s = 0; s < sectionCount; s++) {
        const numberedId = baseNumId + s * 2
        const bulletId = baseNumId + s * 2 + 1
        parts.push(`<w:num w:numId="${numberedId}"><w:abstractNumId w:val="${baseAbstractId}"/></w:num>`)
        parts.push(`<w:num w:numId="${bulletId}"><w:abstractNumId w:val="${baseAbstractId + 1}"/></w:num>`)
    }

    return parts.join('\n')
}

// ── Diagram image OOXML ────────────────────────────────────────────────────

/** 1 inch = 914400 EMU. Max diagram width = ~15 cm ≈ 5400000 EMU. */
const MAX_WIDTH_EMU = 5_400_000

/**
 * Convert pixel dimensions to EMU, scaling to fit within MAX_WIDTH_EMU.
 * Assumes 96 DPI source (1 px = 9525 EMU).
 */
function pixelsToEmu(widthPx: number, heightPx: number): { cx: number; cy: number } {
    const PX_TO_EMU = 9525
    let cx = widthPx * PX_TO_EMU
    let cy = heightPx * PX_TO_EMU

    if (cx > MAX_WIDTH_EMU) {
        const scale = MAX_WIDTH_EMU / cx
        cx = MAX_WIDTH_EMU
        cy = Math.round(cy * scale)
    }
    return { cx, cy }
}

/**
 * Generate OOXML for an inline image with a centered caption below.
 * The image is referenced by a relationship ID that must exist in
 * word/_rels/document.xml.rels and point to a file in word/media/.
 *
 * @param imageRelId   Relationship ID (e.g. "rIdDiag1")
 * @param widthPx      Source image width in pixels
 * @param heightPx     Source image height in pixels
 * @param caption      Caption text below the image
 * @param docPrId      Unique document property ID for the drawing
 */
export function diagramOoxml(
    imageRelId: string,
    widthPx: number,
    heightPx: number,
    caption: string,
    docPrId: number,
): string {
    const { cx, cy } = pixelsToEmu(widthPx, heightPx)

    // Image paragraph (centered)
    const imgParagraph = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPrId}" name="Diagram ${docPrId}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="diagram_${docPrId}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${imageRelId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`

    // Caption paragraph (centered, italic, smaller font)
    const captionParagraph = `<w:p><w:pPr><w:pStyle w:val="Content"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:i/><w:iCs/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(caption)}</w:t></w:r></w:p>`

    return imgParagraph + captionParagraph
}

// ── Main converter ──────────────────────────────────────────────────────────

/**
 * Convert markdown text (LLM output) to raw OOXML string fragments
 * that use the BRS template's own styles.
 *
 * @param markdown       LLM-generated markdown content
 * @param numberedNumId  numId for numbered lists (should be unique per section to restart at 1)
 * @param bulletNumId    numId for bullet lists (should be unique per section)
 *
 * Defaults to 5/5 (legacy behaviour) when called without arguments.
 *
 * Handles: paragraphs, **bold**, *italic*, bullet lists (- or *),
 * numbered lists (1. 2.), indented/nested lists, markdown tables, and ### headings.
 */
export function markdownToOoxml(
    markdown: string,
    numberedNumId = 5,
    bulletNumId = 5,
): string {
    const parts: string[] = []
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
                tableLines.push(lines[i].trim())
                i++
            }
            if (tableLines.length >= 2) {
                const { headers, rows } = parseMarkdownTable(tableLines)
                if (headers.length > 0) {
                    parts.push(tableXml(headers, rows))
                    // Add spacing paragraph after table
                    parts.push('<w:p><w:pPr><w:pStyle w:val="Content"/></w:pPr></w:p>')
                }
            }
            continue
        }

        // Bullet list item (- or *) — preserves indent level for nesting
        if (/^\s*[-*]\s+/.test(line)) {
            const ilvl = getIndentLevel(line)
            const text = line.replace(/^\s*[-*]\s+/, '')
            parts.push(bulletXml(text, ilvl, bulletNumId))
            i++
            continue
        }

        // Numbered list item (1. 2. etc) — preserves indent level for nesting
        if (/^\s*\d+\.\s+/.test(line)) {
            const ilvl = getIndentLevel(line)
            const text = line.replace(/^\s*\d+\.\s+/, '')
            parts.push(numberedXml(text, ilvl, numberedNumId))
            i++
            continue
        }

        // Markdown heading (### etc) — sub-headings within generated content
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
        if (headingMatch) {
            const level = Math.min(headingMatch[1].length, 6)
            const headingStyle = `Heading${level}`
            parts.push(
                `<w:p><w:pPr><w:pStyle w:val="${headingStyle}"/></w:pPr>` +
                `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">${escapeXml(headingMatch[2])}</w:t></w:r></w:p>`
            )
            i++
            continue
        }

        // Regular paragraph
        parts.push(paragraphXml(line))
        i++
    }

    return parts.join('')
}
