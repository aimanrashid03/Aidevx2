import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Custom image block node.
 * Extends the basic image concept with `caption` and `storageKey` attrs.
 * Rendered via ImageBlockView which handles Supabase upload.
 */
export const ImageBlock = Node.create({
    name: 'imageBlock',

    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: el => el.getAttribute('src'),
                renderHTML: attrs => attrs.src ? { src: attrs.src } : {},
            },
            alt: {
                default: '',
                parseHTML: el => el.getAttribute('alt') || '',
                renderHTML: attrs => attrs.alt ? { alt: attrs.alt } : {},
            },
            caption: {
                default: '',
                parseHTML: el => el.getAttribute('data-caption') || '',
                renderHTML: attrs => attrs.caption ? { 'data-caption': attrs.caption } : {},
            },
            storageKey: {
                default: null,
                parseHTML: el => el.getAttribute('data-storage-key') || null,
                renderHTML: attrs => attrs.storageKey ? { 'data-storage-key': attrs.storageKey } : {},
            },
        }
    },

    parseHTML() {
        return [{ tag: 'img[data-image-block]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(HTMLAttributes, { 'data-image-block': '' })]
    },

})
