import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import {
    Bold, Italic, Strikethrough, Underline as UnderlineIcon,
    Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Undo, Redo
} from 'lucide-react'
import { useEffect } from 'react'

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null
    }

    const buttons = [
        {
            icon: <Bold size={16} />,
            title: 'Bold',
            action: () => editor.chain().focus().toggleBold().run(),
            isActive: editor.isActive('bold'),
        },
        {
            icon: <Italic size={16} />,
            title: 'Italic',
            action: () => editor.chain().focus().toggleItalic().run(),
            isActive: editor.isActive('italic'),
        },
        {
            icon: <UnderlineIcon size={16} />,
            title: 'Underline',
            action: () => editor.chain().focus().toggleUnderline().run(),
            isActive: editor.isActive('underline'),
        },
        {
            icon: <Strikethrough size={16} />,
            title: 'Strike',
            action: () => editor.chain().focus().toggleStrike().run(),
            isActive: editor.isActive('strike'),
        },
        { type: 'divider' },
        {
            icon: <Heading1 size={16} />,
            title: 'Heading 1',
            action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            isActive: editor.isActive('heading', { level: 1 }),
        },
        {
            icon: <Heading2 size={16} />,
            title: 'Heading 2',
            action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            isActive: editor.isActive('heading', { level: 2 }),
        },
        {
            icon: <Heading3 size={16} />,
            title: 'Heading 3',
            action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            isActive: editor.isActive('heading', { level: 3 }),
        },
        { type: 'divider' },
        {
            icon: <List size={16} />,
            title: 'Bullet List',
            action: () => editor.chain().focus().toggleBulletList().run(),
            isActive: editor.isActive('bulletList'),
        },
        {
            icon: <ListOrdered size={16} />,
            title: 'Ordered List',
            action: () => editor.chain().focus().toggleOrderedList().run(),
            isActive: editor.isActive('orderedList'),
        },
        {
            icon: <Quote size={16} />,
            title: 'Blockquote',
            action: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: editor.isActive('blockquote'),
        },
        // {
        //     icon: <Code size={16} />,
        //     title: 'Code Block',
        //     action: () => editor.chain().focus().toggleCodeBlock().run(),
        //     isActive: editor.isActive('codeBlock'),
        // },
        { type: 'divider' },
        {
            icon: <Undo size={16} />,
            title: 'Undo',
            action: () => editor.chain().focus().undo().run(),
            disabled: !editor.can().chain().focus().undo().run(),
        },
        {
            icon: <Redo size={16} />,
            title: 'Redo',
            action: () => editor.chain().focus().redo().run(),
            disabled: !editor.can().chain().focus().redo().run(),
        },
    ]

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 bg-white sticky top-0 z-10">
            {buttons.map((btn, index) => {
                if (btn.type === 'divider') {
                    return <div key={index} className="w-px h-6 bg-slate-200 mx-1 self-center" />
                }
                return (
                    <button
                        key={index}
                        onClick={btn.action}
                        disabled={btn.disabled}
                        className={`p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors ${btn.isActive ? 'bg-slate-100 text-slate-900 font-bold' : ''} ${btn.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title={btn.title}
                        type="button"
                    >
                        {btn.icon}
                    </button>
                )
            })}
        </div>
    )
}

const RichTextEditor = ({ content, onChange, placeholder = 'Start typing...', editable = true }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Underline,
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate prose-sm max-w-none focus:outline-none min-h-[120px] px-6 py-4',
            },
        },
    })

    // Update content if external content changes significantly (though risky with local state)
    // Generally Tiptap manages its own state, but if we switch sections (new content prop), we need to update
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if the content is truly different to avoid cursor jumping
            // A simple check is usually not enough for real-time collab, but for switching sections it's fine
            // We'll trust the parent to only change `content` when switching sections
            editor.commands.setContent(content)
        }
    }, [content, editor])

    return (
        <div className="bg-white flex flex-col h-full">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="flex-1" />
        </div>
    )
}

export default RichTextEditor
