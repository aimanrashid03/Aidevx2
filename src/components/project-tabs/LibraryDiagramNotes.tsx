import { useState } from 'react';
import { Plus, Edit, Trash2, Loader2, GitBranch, X, Check } from 'lucide-react';
import { useDiagramNotes, type DiagramNote } from '../../hooks/useDiagramNotes';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

type DiagramType = DiagramNote['diagramType'];

const TYPE_LABELS: Record<DiagramType, string> = {
    mermaid: 'Mermaid',
    drawio: 'Draw.io',
    freeform: 'Freeform',
};

const TYPE_COLORS: Record<DiagramType, string> = {
    mermaid: 'text-sky-700 bg-sky-50 border-sky-200',
    drawio: 'text-violet-700 bg-violet-50 border-violet-200',
    freeform: 'text-slate-600 bg-slate-100 border-slate-200',
};

interface InlineFormProps {
    initial?: Partial<DiagramNote>;
    onSave: (title: string, content: string, diagramType: DiagramType) => Promise<void>;
    onCancel: () => void;
}

function InlineForm({ initial, onSave, onCancel }: InlineFormProps) {
    const [title, setTitle] = useState(initial?.title || '');
    const [content, setContent] = useState(initial?.content || '');
    const [diagramType, setDiagramType] = useState<DiagramType>(initial?.diagramType || 'freeform');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            await onSave(title, content, diagramType);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
            <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                placeholder="Note title..."
                autoFocus
            />
            <div className="flex gap-2">
                {(['freeform', 'mermaid', 'drawio'] as DiagramType[]).map(type => (
                    <button
                        key={type}
                        onClick={() => setDiagramType(type)}
                        className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${diagramType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    >
                        {TYPE_LABELS[type]}
                    </button>
                ))}
            </div>
            <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full h-20 text-xs text-slate-700 border border-slate-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white font-mono"
                placeholder={diagramType === 'mermaid' ? 'graph TD\n  A --> B' : diagramType === 'drawio' ? 'Paste draw.io XML...' : 'Diagram notes...'}
            />
            <div className="flex items-center justify-end gap-2">
                <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save
                </button>
            </div>
        </div>
    );
}

interface Props {
    projectId: string;
}

export default function LibraryDiagramNotes({ projectId }: Props) {
    const { notes, loading, createNote, updateNote, deleteNote } = useDiagramNotes(projectId);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { dialog, confirm } = useConfirmDialog();

    const handleCreate = async (title: string, content: string, diagramType: DiagramType) => {
        await createNote(title, content, diagramType);
        setIsAdding(false);
    };

    const handleUpdate = async (id: string, title: string, content: string, diagramType: DiagramType) => {
        await updateNote(id, { title, content, diagramType });
        setEditingId(null);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const ok = await confirm({
            title: 'Delete Diagram Note',
            message: 'This will permanently delete this diagram note.',
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        await deleteNote(id);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Diagram Notes</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Store Mermaid, draw.io, or freeform diagram references</p>
                </div>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <Plus size={13} />
                    Add Note
                </button>
            </div>

            {isAdding && (
                <InlineForm
                    onSave={handleCreate}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
            ) : notes.length === 0 && !isAdding ? (
                <div className="border border-dashed border-slate-200 rounded flex flex-col items-center justify-center py-10 text-center bg-white">
                    <GitBranch size={24} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No diagram notes yet</p>
                    <p className="text-[11px] text-slate-400 mb-4 max-w-xs">Save Mermaid diagrams, draw.io XML, or general diagram references here</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                        Add First Note
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {notes.map(note => (
                        editingId === note.id ? (
                            <InlineForm
                                key={note.id}
                                initial={note}
                                onSave={(title, content, diagramType) => handleUpdate(note.id, title, content, diagramType)}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <div key={note.id} className="bg-white border border-slate-200 rounded p-3 group hover:border-slate-300 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <GitBranch size={14} className="text-slate-400 shrink-0" />
                                        <span className="text-xs font-bold text-slate-900 truncate">{note.title}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${TYPE_COLORS[note.diagramType]}`}>
                                            {TYPE_LABELS[note.diagramType]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button
                                            onClick={() => setEditingId(note.id)}
                                            className="p-1 text-slate-400 hover:text-slate-900 rounded border border-slate-200 hover:border-slate-300 transition-colors"
                                        >
                                            <Edit size={12} />
                                        </button>
                                        <button
                                            onClick={e => handleDelete(e, note.id)}
                                            className="p-1 text-slate-400 hover:text-red-600 rounded border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                                {note.content && (
                                    <pre className="mt-2 text-[11px] text-slate-600 font-mono bg-slate-50 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap border border-slate-100">
                                        {note.content}
                                    </pre>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1.5">
                                    {new Date(note.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* Close add form icon when scrolled away */}
            {isAdding && notes.length > 0 && (
                <button
                    onClick={() => setIsAdding(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
                >
                    <X size={11} /> Cancel add
                </button>
            )}
            {dialog}
        </div>
    );
}
