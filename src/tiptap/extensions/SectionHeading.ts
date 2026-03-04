import Heading from '@tiptap/extension-heading'

/**
 * SectionHeading extends the built-in Heading node to carry sectionId and
 * templateTitle attributes. These are used by the TOC, comment anchoring,
 * and section status tracking throughout DocumentEditor.
 */
export const SectionHeading = Heading.extend({
    name: 'sectionHeading',

    addAttributes() {
        return {
            ...this.parent?.(),
            sectionId: {
                default: null,
                parseHTML: el => el.getAttribute('data-section-id'),
                renderHTML: attrs =>
                    attrs.sectionId ? { 'data-section-id': attrs.sectionId } : {},
            },
            templateTitle: {
                default: null,
                parseHTML: el => el.getAttribute('data-template-title'),
                renderHTML: attrs =>
                    attrs.templateTitle
                        ? { 'data-template-title': attrs.templateTitle }
                        : {},
            },
        }
    },

    parseHTML() {
        return [
            { tag: 'h1[data-section-id]', attrs: { level: 1 } },
            { tag: 'h2[data-section-id]', attrs: { level: 2 } },
            { tag: 'h3[data-section-id]', attrs: { level: 3 } },
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        const level = node.attrs.level as 1 | 2 | 3
        return [`h${level}`, HTMLAttributes, 0]
    },
})
