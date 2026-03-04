import type { JSONContent } from '@tiptap/core'
import type { DocSection } from '../../constants/urs_structure'
import { htmlStringToTiptapNodes } from './htmlStringToTiptapNodes'

export interface TiptapDocContent {
    __format: 'tiptap-v1'
    doc: JSONContent
}

/**
 * Converts a document structure array (DocSection[] | string[]) into the
 * initial TiptapDocContent for a brand-new document.
 *
 * Each section produces:
 *   - A sectionHeading node carrying the sectionId and templateTitle
 *   - Pre-seeded content blocks (tables or text) from the template definition
 *   - A blank paragraph to allow the user to start typing if the section is empty
 */
export function structureToTiptapDoc(
    structure: (string | DocSection)[]
): TiptapDocContent {
    const nodes: JSONContent[] = []

    structure.forEach((item, idx) => {
        const isString = typeof item === 'string'
        const title = isString ? item : item.title
        const level = isString ? 1 : Math.min(item.level, 3) as 1 | 2 | 3
        const content = isString ? [] : (item.content || [])
        const sectionId = `idx-${idx}`

        // Section heading
        nodes.push({
            type: 'sectionHeading',
            attrs: { level, sectionId, templateTitle: title },
            content: [{ type: 'text', text: title }],
        })

        let hasContent = false

        for (const block of content) {
            if (block.type === 'table') {
                nodes.push(tableBlockToTiptapNode(block as unknown as TableBlock, sectionId))
                hasContent = true
            } else if (block.type === 'text') {
                const html = (block.data as string) || ''
                if (html.trim()) {
                    const parsed = htmlStringToTiptapNodes(html)
                    nodes.push(...parsed)
                    hasContent = true
                }
            }
        }

        // Always leave a blank editable paragraph so the user can type
        nodes.push({ type: 'paragraph', content: [] })
        void hasContent // suppress unused warning
    })

    return {
        __format: 'tiptap-v1',
        doc: { type: 'doc', content: nodes },
    }
}

interface TableBlock {
    type: 'table'
    columns: string[]
    data?: string[][]
}

function tableBlockToTiptapNode(block: TableBlock, _sectionId: string): JSONContent {
    const columns = block.columns || []
    const data = block.data || []

    // Header row
    const headerRow: JSONContent = {
        type: 'tableRow',
        content: columns.map(col => ({
            type: 'tableHeader',
            attrs: {},
            content: [{ type: 'paragraph', content: col ? [{ type: 'text', text: col }] : [] }],
        })),
    }

    // Data rows — at least one empty row so the table is usable
    const rows = data.length > 0 ? data : [columns.map(() => '')]
    const dataRows: JSONContent[] = rows.map(row => ({
        type: 'tableRow',
        content: columns.map((_, i) => ({
            type: 'tableCell',
            attrs: {},
            content: [{ type: 'paragraph', content: row[i] ? [{ type: 'text', text: row[i] }] : [] }],
        })),
    }))

    return {
        type: 'table',
        content: [headerRow, ...dataRows],
    }
}
