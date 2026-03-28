/**
 * Markdown → raw OOXML string converter.
 * Produces XML fragments (<w:p> and <w:tbl> elements) that use
 * the BRS template's own styles so formatting is inherited exactly.
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

/** Build a <w:r> element from a run fragment. */
function runXml(frag: RunFragment): string {
    let rPr = ''
    if (frag.bold || frag.italic) {
        rPr = '<w:rPr>'
        if (frag.bold) rPr += '<w:b/><w:bCs/>'
        if (frag.italic) rPr += '<w:i/><w:iCs/>'
        rPr += '</w:rPr>'
    }
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

/** Build a bullet list item paragraph. Uses numId=21 from template. */
function bulletXml(text: string): string {
    const runs = runsFromText(text)
    return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="21"/></w:numPr></w:pPr>${runs}</w:p>`
}

/** Build a numbered list item paragraph. Uses numId=5 from template. */
function numberedXml(text: string): string {
    const runs = runsFromText(text)
    return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>${runs}</w:p>`
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
        xml += `<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">${escapeXml(h)}</w:t></w:r>`
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

// ── Main converter ──────────────────────────────────────────────────────────

/**
 * Convert markdown text (LLM output) to raw OOXML string fragments
 * that use the BRS template's own styles.
 *
 * Handles: paragraphs, **bold**, *italic*, bullet lists (- or *),
 * numbered lists (1. 2.), markdown tables, and markdown headings (###).
 */
export function markdownToOoxml(markdown: string): string {
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

        // Bullet list item (- or *)
        if (/^\s*[-*]\s+/.test(line)) {
            const text = line.replace(/^\s*[-*]\s+/, '')
            parts.push(bulletXml(text))
            i++
            continue
        }

        // Numbered list item (1. 2. etc)
        if (/^\s*\d+\.\s+/.test(line)) {
            const text = line.replace(/^\s*\d+\.\s+/, '')
            parts.push(numberedXml(text))
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
                `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">${escapeXml(headingMatch[2])}</w:t></w:r></w:p>`
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
