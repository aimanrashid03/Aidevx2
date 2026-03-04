import type { JSONContent } from '@tiptap/core'
import type { TiptapDocContent } from './ursStructureToTiptap'
import { htmlStringToTiptapNodes } from './htmlStringToTiptapNodes'

/**
 * Fetches a DOCX file, converts it to Tiptap JSON using mammoth, and
 * post-processes heading nodes into sectionHeading nodes so the TOC sidebar
 * and AI generation work correctly.
 *
 * Uses the same dynamic import pattern as MermaidView.tsx so mammoth is
 * only loaded when a new URS document is created.
 */
export async function docxToTiptapDoc(docxUrl: string): Promise<TiptapDocContent> {
    const response = await fetch(docxUrl)
    if (!response.ok) throw new Error(`Failed to fetch template: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()

    // Lazy-load mammoth — avoids bundling it until needed
    const mammoth = (await import('mammoth')).default
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer })

    // Parse HTML → Tiptap nodes (uses the enhanced converter with table support)
    const rawNodes = htmlStringToTiptapNodes(html)

    // Post-process: replace 'heading' nodes with 'sectionHeading' nodes.
    // Uses the same idx-{n} scheme as structureToTiptapDoc so SectionTOC,
    // handleAutoGen, and comment counts all work identically.
    let sectionIdx = 0
    const processedNodes: JSONContent[] = []

    for (const node of rawNodes) {
        if (node.type === 'heading') {
            const title = extractText(node)
            processedNodes.push({
                type: 'sectionHeading',
                attrs: {
                    level: Math.min((node.attrs?.level as number) ?? 1, 3) as 1 | 2 | 3,
                    sectionId: `idx-${sectionIdx++}`,
                    templateTitle: title,
                },
                content: node.content ?? [],
            })
            // Blank paragraph after each heading so the user can always position
            // the cursor here (same behaviour as structureToTiptapDoc)
            processedNodes.push({ type: 'paragraph', content: [] })
        } else {
            processedNodes.push(node)
        }
    }

    return {
        __format: 'tiptap-v1',
        doc: { type: 'doc', content: processedNodes },
    }
}

function extractText(node: JSONContent): string {
    if (node.type === 'text') return node.text ?? ''
    return (node.content ?? []).map(extractText).join('')
}
