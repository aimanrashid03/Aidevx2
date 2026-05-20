/**
 * Markdown → raw OOXML string converter.
 * Produces XML fragments (<w:p> and <w:tbl> elements) that use
 * the BRS template's own styles so formatting is inherited exactly.
 *
 * Each distinct numbered list gets its own numId (allocated via ListIdAllocator)
 * so it restarts at 1 independently. Call buildNumberingXml() to get the
 * <w:abstractNum> + <w:num> blocks to inject into word/numbering.xml.
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

/** Build a <w:r> element from a run fragment. Always enforces Arial 11pt font. */
function runXml(frag: RunFragment): string {
    let rPr = '<w:rPr>'
    rPr += '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
    rPr += '<w:sz w:val="22"/><w:szCs w:val="22"/>'
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

// ── Markdown table parser ───────────────────────────────────────────────────

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } {
    // Split on '|', trim each cell. Drop ONLY the leading/trailing empty fragments
    // produced by the outer pipes — never filter interior cells so empty cells are kept.
    function parseCells(line: string): string[] {
        const parts = line.split('|').map(c => c.trim())
        if (parts[0] === '') parts.shift()
        if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()
        return parts
    }
    const headers = parseCells(lines[0])
    const rows: string[][] = []
    for (let i = 1; i < lines.length; i++) {
        if (/^\|[\s\-|:]+\|?$/.test(lines[i].trim())) continue
        const cells = parseCells(lines[i])
        if (cells.length > 0) {
            // Pad short rows and truncate over-long rows to match header count
            while (cells.length < headers.length) cells.push('')
            rows.push(cells.slice(0, headers.length))
        }
    }
    return { headers, rows }
}

// ── Table OOXML builders ────────────────────────────────────────────────────

/**
 * Render a single data row as a 2-column label/value block.
 * Used for wide tables (>4 columns) where a horizontal layout overflows the page.
 */
function verticalTableXml(headers: string[], row: string[]): string {
    const labelWidth = 3000
    const valueWidth = 6000

    let xml = '<w:tbl><w:tblPr>'
    xml += '<w:tblStyle w:val="TableGrid"/>'
    xml += `<w:tblW w:w="${labelWidth + valueWidth}" w:type="dxa"/>`
    xml += '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
    xml += '</w:tblPr>'
    xml += `<w:tblGrid><w:gridCol w:w="${labelWidth}"/><w:gridCol w:w="${valueWidth}"/></w:tblGrid>`

    for (let i = 0; i < headers.length; i++) {
        const label = headers[i]
        const value = row[i] || ''
        xml += '<w:tr>'
        xml += `<w:tc><w:tcPr><w:tcW w:w="${labelWidth}" w:type="dxa"/></w:tcPr>`
        xml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">${escapeXml(label)}</w:t></w:r></w:p></w:tc>`
        xml += `<w:tc><w:tcPr><w:tcW w:w="${valueWidth}" w:type="dxa"/></w:tcPr>`
        xml += `<w:p>${runsFromText(value)}</w:p></w:tc>`
        xml += '</w:tr>'
    }

    xml += '</w:tbl>'
    return xml
}

/**
 * Build a table from headers and rows using TableGrid style.
 * Tables with >4 columns render each row as a vertical label/value block
 * to avoid horizontal overflow on A4/Letter pages.
 */
function tableXml(headers: string[], rows: string[][]): string {
    if (headers.length > 4) {
        const blocks: string[] = rows.map(row => verticalTableXml(headers, row))
        return blocks.join('<w:p><w:pPr><w:pStyle w:val="Content"/></w:pPr></w:p>')
    }

    const colCount = headers.length
    const colWidth = Math.floor(9000 / colCount)

    let xml = '<w:tbl><w:tblPr>'
    xml += '<w:tblStyle w:val="TableGrid"/>'
    xml += `<w:tblW w:w="${colCount * colWidth}" w:type="dxa"/>`
    xml += '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
    xml += '</w:tblPr>'

    xml += '<w:tblGrid>'
    for (let i = 0; i < colCount; i++) {
        xml += `<w:gridCol w:w="${colWidth}"/>`
    }
    xml += '</w:tblGrid>'

    // Header row — bold black text, plain background (no fill)
    xml += '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
    for (const h of headers) {
        xml += `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/></w:tcPr>`
        xml += `<w:p><w:pPr><w:jc w:val="left"/></w:pPr>`
        xml += `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">${escapeXml(h)}</w:t></w:r>`
        xml += '</w:p></w:tc>'
    }
    xml += '</w:tr>'

    // Data rows — plain, no zebra striping
    for (const row of rows) {
        xml += '<w:tr>'
        for (let ci = 0; ci < colCount; ci++) {
            const cellText = row[ci] || ''
            xml += `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/></w:tcPr>`
            xml += `<w:p>${runsFromText(cellText)}</w:p></w:tc>`
        }
        xml += '</w:tr>'
    }

    xml += '</w:tbl>'
    return xml
}

// ── List id allocator ────────────────────────────────────────────────────────

/**
 * Allocator passed into markdownToOoxml so it can claim fresh numIds for each
 * distinct list. docxTemplateBuilder creates one shared allocator per document,
 * starting above the template's highest existing numId.
 */
export interface ListIdAllocator {
    allocNumbered(): number
    allocBullet(): number
}

// ── Numbering definitions for injection ─────────────────────────────────────

/**
 * Build the <w:abstractNum> and <w:num> OOXML needed for the lists allocated
 * during content generation.
 *
 * Returns two strings so the caller can insert abstractXml after the last
 * </w:abstractNum> in numbering.xml and numXml before </w:numbering>,
 * satisfying the OOXML schema (all abstractNum must precede all num).
 */
export function buildNumberingXml(
    numberedIds: number[],
    bulletIds: number[],
    absDecimalId: number,
    absBulletId: number,
): { abstractXml: string; numXml: string } {
    const abstractParts: string[] = []

    // Decimal numbered lists: 1.  a)  i.  1.
    abstractParts.push(`<w:abstractNum w:abstractNumId="${absDecimalId}" w15:restartNumberingAfterBreak="0" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">`)
    abstractParts.push(`<w:multiLevelType w:val="multilevel"/>`)
    for (const [ilvl, fmt, tmpl] of [
        [0, 'decimal', '%1.'],
        [1, 'lowerLetter', '%2)'],
        [2, 'lowerRoman', '%3.'],
        [3, 'decimal', '%4.'],
    ] as [number, string, string][]) {
        const left = 720 + ilvl * 360
        abstractParts.push(
            `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/>` +
            `<w:lvlText w:val="${tmpl}"/><w:lvlJc w:val="left"/>` +
            `<w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr>` +
            `<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>` +
            `</w:lvl>`
        )
    }
    abstractParts.push(`</w:abstractNum>`)

    // Bullet lists using Word-standard Symbol/Wingdings PUA glyphs so they
    // render as real bullets (not squares) in all Word/LibreOffice versions.
    //  = bullet in Symbol font,  = filled square in Wingdings.
    const bulletDefs = [
        { char: '', font: 'Symbol' },      // filled round bullet
        { char: 'o',      font: 'Courier New' },  // open circle
        { char: '', font: 'Wingdings' },    // filled square
        { char: '', font: 'Symbol' },       // filled round bullet
    ]
    abstractParts.push(`<w:abstractNum w:abstractNumId="${absBulletId}" w15:restartNumberingAfterBreak="0" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">`)
    abstractParts.push(`<w:multiLevelType w:val="multilevel"/>`)
    for (let ilvl = 0; ilvl < 4; ilvl++) {
        const left = 720 + ilvl * 360
        const { char, font } = bulletDefs[ilvl]
        abstractParts.push(
            `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="bullet"/>` +
            `<w:lvlText w:val="${char}"/><w:lvlJc w:val="left"/>` +
            `<w:pPr><w:ind w:left="${left}" w:hanging="360"/></w:pPr>` +
            `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>` +
            `</w:lvl>`
        )
    }
    abstractParts.push(`</w:abstractNum>`)

    // One <w:num> per allocated id — each is an independent instance so it
    // restarts at 1. Numbered ids → decimal abstract; bullet ids → bullet abstract.
    // <w:lvlOverride><w:startOverride w:val="1"/> on every level forces renderers
    // (OnlyOffice, Word) to restart the counter at 1 for each list instance.
    // Without this, all <w:num> entries sharing the same abstractNum are treated
    // as one continuous counter across the whole document.
    const lvlOverrides = [0, 1, 2, 3]
        .map(i => `<w:lvlOverride w:ilvl="${i}"><w:startOverride w:val="1"/></w:lvlOverride>`)
        .join('')
    const numParts: string[] = []
    for (const id of numberedIds) {
        numParts.push(`<w:num w:numId="${id}"><w:abstractNumId w:val="${absDecimalId}"/>${lvlOverrides}</w:num>`)
    }
    for (const id of bulletIds) {
        numParts.push(`<w:num w:numId="${id}"><w:abstractNumId w:val="${absBulletId}"/>${lvlOverrides}</w:num>`)
    }

    return {
        abstractXml: abstractParts.join('\n'),
        numXml: numParts.join('\n'),
    }
}

// ── SEQ caption builder ─────────────────────────────────────────────────────

/**
 * Build a Word caption paragraph using an auto-numbered SEQ field.
 * type = 'Rajah' (figure) or 'Jadual' (table).
 * settings.xml updateFields=true ensures numbers refresh on first open.
 */
function seqCaptionXml(type: 'Rajah' | 'Jadual', desc: string): string {
    const descPart = desc ? `: ${desc}` : ''
    const rPr = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
    return (
        `<w:p><w:pPr><w:pStyle w:val="Caption"/><w:jc w:val="center"/></w:pPr>` +
        `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(type)} </w:t></w:r>` +
        `<w:fldSimple w:instr=" SEQ ${type} \\* ARABIC ">` +
        `<w:r>${rPr}<w:t>1</w:t></w:r></w:fldSimple>` +
        `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(descPart)}</w:t></w:r>` +
        `</w:p>`
    )
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

    const captionParagraph = seqCaptionXml('Rajah', caption)

    return imgParagraph + captionParagraph
}

// ── Main converter ──────────────────────────────────────────────────────────

/**
 * Convert markdown text (LLM output) to raw OOXML string fragments
 * that use the BRS template's own styles.
 *
 * @param markdown   LLM-generated markdown content
 * @param allocator  ListIdAllocator from docxTemplateBuilder — allocates a
 *                   fresh numId for each distinct numbered list encountered
 *                   (resets on paragraph/heading/table boundaries) and one
 *                   bullet numId per markdownToOoxml call.
 *
 * Handles: paragraphs, **bold**, *italic*, bullet lists (- or *),
 * numbered lists (1. 2.), indented/nested lists, markdown tables, and ### headings.
 */
export function markdownToOoxml(
    markdown: string,
    allocator: ListIdAllocator,
): string {
    const parts: string[] = []
    const lines = markdown.split('\n')
    let i = 0

    // curNumberedId: numId for the current numbered list run; null = no active list.
    // Reset to null when a non-list element is emitted, triggering a fresh id on
    // the next numbered item so that list restarts at 1.
    // sectionBulletId: single bullet numId for this entire markdown block. Bullets
    // don't have visible numbers so sharing one id across the section is fine.
    let curNumberedId: number | null = null
    let sectionBulletId: number | null = null

    while (i < lines.length) {
        const line = lines[i].trimEnd()

        // Skip empty lines — do NOT reset list trackers (blank lines within a
        // list are normal markdown loose-list syntax, list continues)
        if (line.trim() === '') {
            i++
            continue
        }

        // Markdown table (starts with |) — resets numbered list tracker
        if (line.trim().startsWith('|')) {
            curNumberedId = null
            const tableLines: string[] = []
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i].trim())
                i++
            }
            if (tableLines.length >= 2) {
                const { headers, rows } = parseMarkdownTable(tableLines)
                if (headers.length > 0) {
                    const captionDesc = headers.slice(0, 3).join(' / ')
                    parts.push(seqCaptionXml('Jadual', captionDesc))
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
            if (sectionBulletId === null) {
                sectionBulletId = allocator.allocBullet()
            }
            parts.push(bulletXml(text, ilvl, sectionBulletId))
            i++
            continue
        }

        // Numbered list item (1. 2. etc) — allocates a fresh numId when the
        // previous list was interrupted by a non-list element
        if (/^\s*\d+\.\s+/.test(line)) {
            const ilvl = getIndentLevel(line)
            const text = line.replace(/^\s*\d+\.\s+/, '')
            if (curNumberedId === null) {
                curNumberedId = allocator.allocNumbered()
            }
            parts.push(numberedXml(text, ilvl, curNumberedId))
            i++
            continue
        }

        // Markdown heading (### etc) — resets numbered list tracker so next
        // numbered list after a heading starts fresh at 1
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
        if (headingMatch) {
            curNumberedId = null
            const level = Math.min(headingMatch[1].length, 6)
            const headingStyle = `Heading${level}`
            parts.push(
                `<w:p><w:pPr><w:pStyle w:val="${headingStyle}"/></w:pPr>` +
                `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">${escapeXml(headingMatch[2])}</w:t></w:r></w:p>`
            )
            i++
            continue
        }

        // Regular paragraph — resets numbered list tracker
        curNumberedId = null
        parts.push(paragraphXml(line))
        i++
    }

    return parts.join('')
}
