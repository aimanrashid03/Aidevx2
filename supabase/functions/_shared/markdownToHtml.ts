/**
 * markdownToHtml — converts the restricted markdown subset output by
 * auto_generate_document's LLM into HTML suitable for storage in
 * section_content.html and rendering in the AI panel.
 *
 * Handles ONLY what promptBuilder.ts allows the LLM to output:
 *   - **bold** / *italic* inline formatting
 *   - Numbered lists: "1. item"
 *   - Markdown tables: | col | col |
 *   - Blank-line-separated paragraphs
 *   - No headings (prompt says no heading in output)
 *   - No bullet points (prompt explicitly forbids them)
 *   - No images, no code blocks, no links
 */

function applyInline(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

function isTableSeparator(line: string): boolean {
    return /^\|[\s\-|:]+\|$/.test(line.trim())
}

function isTableRow(line: string): boolean {
    return line.trim().startsWith('|') && line.trim().endsWith('|')
}

function parseTableRow(line: string, tag: 'th' | 'td'): string {
    const cells = line.trim().slice(1, -1).split('|')
    return '<tr>' + cells.map(c => `<${tag}>${applyInline(c.trim())}</${tag}>`).join('') + '</tr>'
}

function isOrderedListItem(line: string): boolean {
    return /^\d+\.\s/.test(line)
}

function extractListItemText(line: string): string {
    return line.replace(/^\d+\.\s+/, '')
}

export function markdownToHtml(md: string): string {
    const lines = md.split('\n')
    const out: string[] = []

    type State = 'idle' | 'para' | 'list' | 'table'
    let state: State = 'idle'
    let paraLines: string[] = []
    let tableLines: string[] = []

    function flushPara() {
        if (paraLines.length > 0) {
            out.push(`<p>${applyInline(paraLines.join(' '))}</p>`)
            paraLines = []
        }
    }

    function flushList(items: string[]) {
        if (items.length > 0) {
            out.push('<ol>' + items.map(t => `<li>${applyInline(t)}</li>`).join('') + '</ol>')
        }
    }

    function flushTable() {
        if (tableLines.length === 0) return
        const headerRow = tableLines[0]
        const bodyRows = tableLines.slice(2) // skip separator at index 1
        out.push('<table>')
        out.push('<thead>' + parseTableRow(headerRow, 'th') + '</thead>')
        if (bodyRows.length > 0) {
            out.push('<tbody>' + bodyRows.map(r => parseTableRow(r, 'td')).join('') + '</tbody>')
        }
        out.push('</table>')
        tableLines = []
    }

    let listItems: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Blank line — flush current block
        if (trimmed === '') {
            if (state === 'para') { flushPara(); state = 'idle' }
            if (state === 'list') { flushList(listItems); listItems = []; state = 'idle' }
            if (state === 'table') { flushTable(); state = 'idle' }
            continue
        }

        // Table row
        if (isTableRow(trimmed)) {
            if (state === 'para') { flushPara(); state = 'idle' }
            if (state === 'list') { flushList(listItems); listItems = []; state = 'idle' }
            if (!isTableSeparator(trimmed)) {
                tableLines.push(trimmed)
            }
            state = 'table'
            continue
        }

        // If we were in a table but this line isn't a table row — flush
        if (state === 'table') {
            flushTable()
            state = 'idle'
        }

        // Ordered list item
        if (isOrderedListItem(trimmed)) {
            if (state === 'para') { flushPara(); state = 'idle' }
            listItems.push(extractListItemText(trimmed))
            state = 'list'
            continue
        }

        // If we were in a list but this line isn't a list item — flush
        if (state === 'list') {
            flushList(listItems)
            listItems = []
            state = 'idle'
        }

        // Regular paragraph text — accumulate
        paraLines.push(trimmed)
        state = 'para'
    }

    // Flush any remaining state
    if (state === 'para') flushPara()
    if (state === 'list') flushList(listItems)
    if (state === 'table') flushTable()

    return out.join('\n')
}
