/**
 * HTML → raw OOXML string converter.
 * Handles the restricted HTML subset that `generate_section` instructs the AI to produce:
 *   <p>, <ul>, <ol>, <li>, <h3>, <table>, <thead>, <tbody>, <tr>, <th>, <td>,
 *   <strong>, <em>, <br>, <img src="data:image/png;base64,...">
 *
 * Produces XML fragments (<w:p> and <w:tbl> elements) using the BRS template's
 * own styles so formatting is inherited exactly — mirrors markdownToOoxml.ts patterns.
 */

// ── XML helpers ──────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ── Inline markup helpers ─────────────────────────────────────────────────────

interface RunFragment {
    text: string
    bold?: boolean
    italic?: boolean
}

/** Strip inner HTML tags and return plain text (for simple inline tag removal). */
function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, '')
}

/**
 * Parse inline HTML (<strong>, <em>, text) into run fragments.
 * Handles nested <strong><em>text</em></strong> correctly.
 */
function parseInlineHtml(html: string): RunFragment[] {
    const fragments: RunFragment[] = []

    // Replace <br> with a newline sentinel we can handle below
    const normalized = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')

    // Simple state machine for <strong> and <em>
    const regex = /<strong>([\s\S]*?)<\/strong>|<em>([\s\S]*?)<\/em>|<b>([\s\S]*?)<\/b>|<i>([\s\S]*?)<\/i>|([^<]+)/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(normalized)) !== null) {
        if (match[1] !== undefined) {
            // <strong> — may contain <em> inside
            const inner = match[1].replace(/<em>([\s\S]*?)<\/em>/gi, '$1') // flatten nested em
            fragments.push({ text: stripTags(inner), bold: true })
        } else if (match[2] !== undefined) {
            fragments.push({ text: stripTags(match[2]), italic: true })
        } else if (match[3] !== undefined) {
            fragments.push({ text: stripTags(match[3]), bold: true })
        } else if (match[4] !== undefined) {
            fragments.push({ text: stripTags(match[4]), italic: true })
        } else if (match[5] !== undefined) {
            fragments.push({ text: match[5] })
        }
    }

    if (fragments.length === 0 && normalized.length > 0) {
        fragments.push({ text: stripTags(normalized) })
    }
    return fragments
}

// ── OOXML element builders ───────────────────────────────────────────────────

function runXml(frag: RunFragment): string {
    let rPr = '<w:rPr>'
    rPr += '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
    rPr += '<w:sz w:val="20"/><w:szCs w:val="20"/>'
    if (frag.bold) rPr += '<w:b/><w:bCs/>'
    if (frag.italic) rPr += '<w:i/><w:iCs/>'
    rPr += '</w:rPr>'
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(frag.text)}</w:t></w:r>`
}

function runsFromInlineHtml(html: string): string {
    return parseInlineHtml(html).map(runXml).join('')
}

function paragraphXml(innerHtml: string, style = 'Content'): string {
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${runsFromInlineHtml(innerHtml)}</w:p>`
}

function listItemXml(innerHtml: string): string {
    return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>${runsFromInlineHtml(innerHtml)}</w:p>`
}

function headingXml(innerHtml: string, level: number): string {
    const style = `Heading${Math.min(level, 6)}`
    const runs = parseInlineHtml(innerHtml).map(f => {
        let rPr = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/></w:rPr>'
        return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(f.text)}</w:t></w:r>`
    }).join('')
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${runs}</w:p>`
}

function tableXml(headers: string[], rows: string[][]): string {
    const colCount = Math.max(headers.length, 1)
    const colWidth = Math.floor(9000 / colCount)

    let xml = '<w:tbl><w:tblPr>'
    xml += '<w:tblStyle w:val="TableGrid"/>'
    xml += `<w:tblW w:w="${colCount * colWidth}" w:type="dxa"/>`
    xml += '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
    xml += '</w:tblPr>'

    xml += '<w:tblGrid>'
    for (let i = 0; i < colCount; i++) xml += `<w:gridCol w:w="${colWidth}"/>`
    xml += '</w:tblGrid>'

    // Header row
    if (headers.length > 0) {
        xml += '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
        for (const h of headers) {
            xml += `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="2D3748"/></w:tcPr>`
            xml += `<w:p><w:pPr><w:jc w:val="left"/></w:pPr>`
            xml += `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">${escapeXml(stripTags(h))}</w:t></w:r>`
            xml += '</w:p></w:tc>'
        }
        xml += '</w:tr>'
    }

    // Data rows
    for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri]
        const fill = ri % 2 === 1 ? `<w:shd w:val="clear" w:color="auto" w:fill="F7FAFC"/>` : ''
        xml += '<w:tr>'
        for (let ci = 0; ci < colCount; ci++) {
            const cellHtml = row[ci] || ''
            xml += `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/>${fill}</w:tcPr>`
            xml += `<w:p>${runsFromInlineHtml(cellHtml)}</w:p></w:tc>`
        }
        xml += '</w:tr>'
    }

    xml += '</w:tbl>'
    xml += '<w:p><w:pPr><w:pStyle w:val="Content"/></w:pPr></w:p>'
    return xml
}

// ── Simple HTML tokenizer ─────────────────────────────────────────────────────

type HtmlToken =
    | { type: 'open'; tag: string; attrs: string }
    | { type: 'close'; tag: string }
    | { type: 'selfclose'; tag: string; attrs: string }
    | { type: 'text'; value: string }

function tokenizeHtml(html: string): HtmlToken[] {
    const tokens: HtmlToken[] = []
    const tagRe = /<\s*(\/?)([a-z][a-z0-9]*)\s*([^>]*?)(\/?)>/gi
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = tagRe.exec(html)) !== null) {
        if (match.index > lastIndex) {
            const text = html.slice(lastIndex, match.index)
            if (text) tokens.push({ type: 'text', value: text })
        }
        const isClose = match[1] === '/'
        const tag = match[2].toLowerCase()
        const attrs = match[3].trim()
        const isSelfClose = match[4] === '/'

        if (isClose) {
            tokens.push({ type: 'close', tag })
        } else if (isSelfClose || ['br', 'img', 'hr'].includes(tag)) {
            tokens.push({ type: 'selfclose', tag, attrs })
        } else {
            tokens.push({ type: 'open', tag, attrs })
        }
        lastIndex = tagRe.lastIndex
    }
    if (lastIndex < html.length) {
        const text = html.slice(lastIndex)
        if (text) tokens.push({ type: 'text', value: text })
    }
    return tokens
}

/** Extract attribute value from attrs string: src="..." or src='...' */
function getAttr(attrs: string, name: string): string {
    const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')
    const m = attrs.match(re)
    return m ? m[1] : ''
}

// ── Main converter ────────────────────────────────────────────────────────────

/**
 * Convert AI-generated HTML (restricted tag set from generate_section) to raw OOXML.
 *
 * Handles: <p>, <ul>, <ol>, <li>, <h1>-<h6>, <table>, <thead>, <tbody>, <tr>, <th>, <td>,
 * <strong>, <em>, <b>, <i>, <br>, <img src="data:..."> (base64 inlined as paragraph placeholder).
 */
export function htmlToOoxml(html: string): string {
    if (!html || !html.trim()) return ''

    const tokens = tokenizeHtml(html.trim())
    const parts: string[] = []

    // State
    let inThead = false
    let inTh = false
    let inTd = false
    let inListItem = false
    let inParagraph = false
    let inHeading = false
    let headingLevel = 1

    // Collectors
    let tableHeaders: string[] = []
    let tableRows: string[][] = []
    let currentRow: string[] = []
    let currentCellHtml = ''
    let currentListItemHtml = ''
    let currentParagraphHtml = ''
    let currentHeadingHtml = ''

    // Inline HTML accumulator for non-block contexts
    let inlineAccum = ''

    for (const tok of tokens) {
        if (tok.type === 'open') {
            const tag = tok.tag

            // Block-level: table
            if (tag === 'table') {
                tableHeaders = []
                tableRows = []
            } else if (tag === 'thead') {
                inThead = true
            } else if (tag === 'tr') {
                currentRow = []
            } else if (tag === 'th') {
                inTh = true
                currentCellHtml = ''
            } else if (tag === 'td') {
                inTd = true
                currentCellHtml = ''
            }

            // Block-level: lists
            else if (tag === 'li') {
                inListItem = true
                currentListItemHtml = ''
            }

            // Block-level: paragraphs
            else if (tag === 'p') {
                inParagraph = true
                currentParagraphHtml = ''
            }

            // Block-level: headings
            else if (/^h[1-6]$/.test(tag)) {
                inHeading = true
                headingLevel = parseInt(tag[1])
                currentHeadingHtml = ''
            }

            // Inline elements — accumulate as raw HTML in parent collector
            else if (tag === 'strong' || tag === 'b') {
                appendToCurrentContext('<strong>')
            } else if (tag === 'em' || tag === 'i') {
                appendToCurrentContext('<em>')
            }

        } else if (tok.type === 'close') {
            const tag = tok.tag

            if (tag === 'table') {
                parts.push(tableXml(tableHeaders, tableRows))
                inThead = false
            } else if (tag === 'thead') {
                inThead = false
            } else if (tag === 'tr') {
                if (inThead) {
                    tableHeaders = currentRow.slice()
                } else {
                    tableRows.push(currentRow.slice())
                }
                currentRow = []
            } else if (tag === 'th') {
                currentRow.push(currentCellHtml)
                inTh = false
                currentCellHtml = ''
            } else if (tag === 'td') {
                currentRow.push(currentCellHtml)
                inTd = false
                currentCellHtml = ''
            } else if (tag === 'li') {
                parts.push(listItemXml(currentListItemHtml))
                inListItem = false
                currentListItemHtml = ''
            } else if (tag === 'p') {
                if (currentParagraphHtml.trim()) {
                    parts.push(paragraphXml(currentParagraphHtml))
                }
                inParagraph = false
                currentParagraphHtml = ''
            } else if (/^h[1-6]$/.test(tag)) {
                if (currentHeadingHtml.trim()) {
                    parts.push(headingXml(currentHeadingHtml, headingLevel))
                }
                inHeading = false
                currentHeadingHtml = ''
            } else if (tag === 'strong' || tag === 'b') {
                appendToCurrentContext('</strong>')
            } else if (tag === 'em' || tag === 'i') {
                appendToCurrentContext('</em>')
            }

        } else if (tok.type === 'selfclose') {
            if (tok.tag === 'br') {
                appendToCurrentContext('\n')
            } else if (tok.tag === 'img') {
                // Base64 images are treated as a placeholder paragraph
                // (full inline image injection requires relationship IDs tied to a DOCX context)
                const src = getAttr(tok.attrs, 'src')
                const alt = getAttr(tok.attrs, 'alt') || 'Diagram'
                if (src.startsWith('data:')) {
                    // Emit a placeholder content paragraph — insertion via cursor handles actual images
                    parts.push(paragraphXml(`[${escapeXml(alt)}]`))
                }
            }
        } else if (tok.type === 'text') {
            appendToCurrentContext(tok.value)
        }
    }

    // Flush any trailing plain text not wrapped in tags
    const trailing = inlineAccum.trim()
    if (trailing) parts.push(paragraphXml(trailing))

    return parts.join('')

    /** Append content to whichever context is currently active. */
    function appendToCurrentContext(content: string): void {
        if (inTh || inTd) {
            currentCellHtml += content
        } else if (inListItem) {
            currentListItemHtml += content
        } else if (inParagraph) {
            currentParagraphHtml += content
        } else if (inHeading) {
            currentHeadingHtml += content
        } else {
            inlineAccum += content
        }
    }
}
