import type { JSONContent } from '@tiptap/core'

/**
 * Converts an HTML string (from Tiptap's getHTML() or AI generation) into
 * an array of Tiptap JSONContent nodes suitable for insertContent / setContent.
 *
 * Uses the browser's DOMParser so this must run in a browser context.
 */
export function htmlStringToTiptapNodes(html: string): JSONContent[] {
    if (!html || !html.trim()) {
        return [{ type: 'paragraph', content: [] }]
    }

    const container = document.createElement('div')
    container.innerHTML = html

    const nodes: JSONContent[] = []
    walkChildren(container, nodes)

    return nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [] }]
}

function walkChildren(parent: Element, out: JSONContent[]): void {
    for (const child of Array.from(parent.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = (child.textContent || '').trim()
            if (text) {
                out.push({ type: 'paragraph', content: [{ type: 'text', text }] })
            }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            const node = convertElement(child as HTMLElement)
            if (node) {
                if (Array.isArray(node)) {
                    out.push(...node)
                } else {
                    out.push(node)
                }
            }
        }
    }
}

function convertElement(el: HTMLElement): JSONContent | JSONContent[] | null {
    const tag = el.tagName.toUpperCase()

    switch (tag) {
        case 'P':
        case 'DIV':
            return {
                type: 'paragraph',
                content: extractInlineContent(el),
            }

        case 'H1':
            return { type: 'heading', attrs: { level: 1 }, content: extractInlineContent(el) }
        case 'H2':
            return { type: 'heading', attrs: { level: 2 }, content: extractInlineContent(el) }
        case 'H3':
            return { type: 'heading', attrs: { level: 3 }, content: extractInlineContent(el) }

        case 'UL': {
            const items: JSONContent[] = []
            el.querySelectorAll(':scope > li').forEach(li => {
                items.push({
                    type: 'listItem',
                    content: [{ type: 'paragraph', content: extractInlineContent(li as HTMLElement) }],
                })
            })
            return { type: 'bulletList', content: items }
        }

        case 'OL': {
            const items: JSONContent[] = []
            el.querySelectorAll(':scope > li').forEach(li => {
                items.push({
                    type: 'listItem',
                    content: [{ type: 'paragraph', content: extractInlineContent(li as HTMLElement) }],
                })
            })
            return { type: 'orderedList', content: items }
        }

        case 'BLOCKQUOTE': {
            const inner: JSONContent[] = []
            walkChildren(el, inner)
            return {
                type: 'blockquote',
                content: inner.length > 0 ? inner : [{ type: 'paragraph', content: [] }],
            }
        }

        case 'TABLE': {
            const rows: JSONContent[] = []
            el.querySelectorAll(
                ':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr'
            ).forEach(tr => {
                const cells: JSONContent[] = []
                tr.querySelectorAll(':scope > th, :scope > td').forEach(cell => {
                    const c = cell as HTMLElement
                    const colspan = parseInt(c.getAttribute('colspan') || '1', 10)
                    const rowspan = parseInt(c.getAttribute('rowspan') || '1', 10)
                    cells.push({
                        type: c.tagName.toUpperCase() === 'TH' ? 'tableHeader' : 'tableCell',
                        attrs: { colspan, rowspan },
                        content: [{ type: 'paragraph', content: extractInlineContent(c) }],
                    })
                })
                if (cells.length > 0) rows.push({ type: 'tableRow', content: cells })
            })
            return rows.length > 0 ? { type: 'table', content: rows } : null
        }

        case 'BR':
            return null // handled inline

        default:
            // Treat unknown block elements as paragraphs
            if (isBlockElement(tag)) {
                return { type: 'paragraph', content: extractInlineContent(el) }
            }
            return null
    }
}

function isBlockElement(tag: string): boolean {
    return ['SECTION', 'ARTICLE', 'ASIDE', 'MAIN', 'HEADER', 'FOOTER', 'NAV',
        'FIGURE', 'FIGCAPTION', 'PRE'].includes(tag)
}

/**
 * Extract inline text content with marks (bold, italic, underline, strike).
 */
function extractInlineContent(el: HTMLElement): JSONContent[] {
    const runs: JSONContent[] = []
    extractInlineNodes(el, runs, {})
    return runs
}

interface Marks {
    bold?: true
    italic?: true
    underline?: true
    strike?: true
}

function extractInlineNodes(node: Node, out: JSONContent[], marks: Marks): void {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        if (text) {
            const markList: { type: string }[] = []
            if (marks.bold) markList.push({ type: 'bold' })
            if (marks.italic) markList.push({ type: 'italic' })
            if (marks.underline) markList.push({ type: 'underline' })
            if (marks.strike) markList.push({ type: 'strike' })

            out.push({
                type: 'text',
                text,
                ...(markList.length > 0 ? { marks: markList } : {}),
            })
        }
        return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as HTMLElement
    const tag = el.tagName.toUpperCase()

    const childMarks: Marks = { ...marks }

    switch (tag) {
        case 'B':
        case 'STRONG':
            childMarks.bold = true
            break
        case 'I':
        case 'EM':
            childMarks.italic = true
            break
        case 'U':
            childMarks.underline = true
            break
        case 'S':
        case 'DEL':
        case 'STRIKE':
            childMarks.strike = true
            break
        case 'BR':
            out.push({ type: 'hardBreak' })
            return
        case 'A': {
            const href = el.getAttribute('href') || ''
            const linkText = el.textContent || href
            if (href && linkText) {
                out.push({
                    type: 'text',
                    text: linkText,
                    marks: [{ type: 'link', attrs: { href, target: '_blank' } }],
                })
            }
            return
        }
    }

    // Skip block elements nested inside inline context
    if (isBlockElement(tag)) return

    for (const child of Array.from(el.childNodes)) {
        extractInlineNodes(child, out, childMarks)
    }
}
