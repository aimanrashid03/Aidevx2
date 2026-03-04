import type { JSONContent } from '@tiptap/core'
import type { DocSection } from '../../constants/urs_structure'
import { htmlStringToTiptapNodes } from './htmlStringToTiptapNodes'
import type { TiptapDocContent } from './ursStructureToTiptap'

/**
 * Returns true if the content object is in the old block-based format
 * (Record<number, Block[]>) rather than the new Tiptap JSON format.
 */
export function isLegacyContent(content: unknown): content is Record<number, unknown[]> {
    if (!content || typeof content !== 'object') return false
    // New format always has __format marker
    if ('__format' in (content as object)) return false
    // Legacy format has numeric string keys
    return true
}

interface LegacyTableBlock {
    type: 'table'
    columns: string[]
    data?: string[][]
}

interface LegacyTextBlock {
    type: 'text'
    data?: string
}

type LegacyBlock = LegacyTableBlock | LegacyTextBlock | Record<string, unknown>

/**
 * Migrates a legacy document (Record<number, Block[]>) to TiptapDocContent.
 *
 * This does NOT auto-save — the caller should show a migration banner
 * and let the user save explicitly to persist the new format.
 */
export function migrateToTiptap(
    legacyContent: Record<number, unknown[]>,
    structure: (string | DocSection)[]
): TiptapDocContent {
    const nodes: JSONContent[] = []

    structure.forEach((item, idx) => {
        const isString = typeof item === 'string'
        const title = isString ? item : item.title
        const level = isString ? 1 : Math.min(item.level, 3) as 1 | 2 | 3
        const sectionId = `idx-${idx}`

        // Section heading
        nodes.push({
            type: 'sectionHeading',
            attrs: { level, sectionId, templateTitle: title },
            content: [{ type: 'text', text: title }],
        })

        const blocks = (legacyContent[idx] || []) as LegacyBlock[]

        if (blocks.length === 0) {
            nodes.push({ type: 'paragraph', content: [] })
        } else {
            let hadContent = false
            for (const block of blocks) {
                if (block.type === 'text') {
                    const html = ((block as LegacyTextBlock).data) || ''
                    if (html.trim()) {
                        const parsed = htmlStringToTiptapNodes(html)
                        nodes.push(...parsed)
                        hadContent = true
                    }
                } else if (block.type === 'table') {
                    const tb = block as LegacyTableBlock
                    nodes.push(legacyTableToTiptapNode(tb))
                    hadContent = true
                }
            }
            if (!hadContent) {
                nodes.push({ type: 'paragraph', content: [] })
            }
        }
    })

    return {
        __format: 'tiptap-v1',
        doc: { type: 'doc', content: nodes },
    }
}

function legacyTableToTiptapNode(block: LegacyTableBlock): JSONContent {
    const columns = block.columns || []
    const data = block.data || []

    const headerRow: JSONContent = {
        type: 'tableRow',
        content: columns.map(col => ({
            type: 'tableHeader',
            attrs: {},
            content: [{ type: 'paragraph', content: col ? [{ type: 'text', text: col }] : [] }],
        })),
    }

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

/**
 * Migrate sectionStatuses from Record<number, status> to Record<string, status>
 * where string is "idx-{number}".
 */
export function migrateSectionStatuses(
    old: Record<number, 'drafting' | 'complete'>
): Record<string, 'drafting' | 'complete'> {
    const result: Record<string, 'drafting' | 'complete'> = {}
    Object.entries(old).forEach(([idx, status]) => {
        result[`idx-${idx}`] = status
    })
    return result
}
