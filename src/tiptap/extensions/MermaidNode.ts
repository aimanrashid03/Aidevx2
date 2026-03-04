import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Atom node for Mermaid diagrams.
 * Stores `code` (mermaid source) and `caption` attrs.
 * Rendered via MermaidView React node view (SVG + double-click to edit).
 */
export const MermaidNode = Node.create({
    name: 'mermaidDiagram',

    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            code: {
                default: 'graph LR\n  A --> B',
                parseHTML: el => el.getAttribute('data-code') || '',
                renderHTML: attrs => ({ 'data-code': attrs.code }),
            },
            caption: {
                default: '',
                parseHTML: el => el.getAttribute('data-caption') || '',
                renderHTML: attrs => attrs.caption ? { 'data-caption': attrs.caption } : {},
            },
        }
    },

    parseHTML() {
        return [{ tag: 'div[data-mermaid]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid': '' })]
    },

})
