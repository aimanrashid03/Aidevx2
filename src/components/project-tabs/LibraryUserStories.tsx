import { useState } from 'react';
import {
    Plus, X, ChevronDown, ChevronUp, CheckCircle2,
    Loader2, BookOpen, Edit, Trash2
} from 'lucide-react';
import { useUserStories, type UserStory } from '../../hooks/useUserStories';
import EmbeddingStatusBadge from '../EmbeddingStatusBadge';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { USER_STORY_TEMPLATE } from '../../constants/userStoryTemplate';

function completionPercent(responses: Record<string, string>): number {
    const filled = USER_STORY_TEMPLATE.filter(q => responses[q.id]?.trim().length > 0).length;
    return Math.round((filled / USER_STORY_TEMPLATE.length) * 100);
}

function getPreviewLines(responses: Record<string, string>): { title: string; text: string }[] {
    const lines: { title: string; text: string }[] = [];
    for (const section of USER_STORY_TEMPLATE) {
        const answer = responses[section.id]?.trim();
        if (answer) {
            lines.push({ title: section.title, text: answer.replace(/\s+/g, ' ') });
        }
    }
    return lines;
}

interface StoryModalProps {
    story: Partial<UserStory> | null;
    onClose: () => void;
    onSave: (title: string, responses: Record<string, string>) => Promise<void>;
}

function StoryModal({ story, onClose, onSave }: StoryModalProps) {
    const [title, setTitle] = useState(story?.title || 'User Stories');
    const [responses, setResponses] = useState<Record<string, string>>(story?.responses || {});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
        Object.fromEntries(USER_STORY_TEMPLATE.map(q => [q.id, true]))
    );
    const [saving, setSaving] = useState(false);

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(title, responses);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const filled = USER_STORY_TEMPLATE.filter(q => responses[q.id]?.trim().length > 0).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">User Stories Template</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">{filled} of {USER_STORY_TEMPLATE.length} sections completed</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-slate-100 shrink-0">
                    <div
                        className="h-full bg-[var(--accent-600)] transition-all duration-300"
                        style={{ width: `${(filled / USER_STORY_TEMPLATE.length) * 100}%` }}
                    />
                </div>

                {/* Title */}
                <div className="px-5 py-3 border-b border-slate-100 shrink-0">
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full text-sm font-bold text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                        placeholder="Entry title..."
                    />
                </div>

                {/* Form sections */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {USER_STORY_TEMPLATE.map(section => (
                        <div key={section.id} className="border border-slate-200 rounded overflow-hidden">
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                            >
                                <div className="flex items-center gap-2">
                                    {responses[section.id]?.trim().length > 0 ? (
                                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                                    )}
                                    <span className="text-xs font-bold text-slate-900">{section.title}</span>
                                </div>
                                {expandedSections[section.id] ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                            </button>
                            {expandedSections[section.id] && (
                                <div className="px-3 pb-3 pt-2 space-y-2">
                                    <div className="space-y-1">
                                        {section.prompts.map((prompt, i) => (
                                            <p key={i} className="text-[11px] text-slate-500 flex gap-1.5">
                                                <span className="text-slate-300 shrink-0 mt-px">•</span>
                                                {prompt}
                                            </p>
                                        ))}
                                    </div>
                                    <textarea
                                        value={responses[section.id] || ''}
                                        onChange={e => setResponses(prev => ({ ...prev, [section.id]: e.target.value }))}
                                        className="w-full h-24 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 mt-1"
                                        placeholder="Your answer..."
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                    <button onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-900">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                        Save User Story
                    </button>
                </div>
            </div>
        </div>
    );
}

interface Props {
    projectId: string;
}

export default function LibraryUserStories({ projectId }: Props) {
    const { stories, loading, createStory, updateStory, deleteStory, embedStory } = useUserStories(projectId);
    const [panelStory, setPanelStory] = useState<Partial<UserStory> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { dialog, notificationBanner, confirm, notify } = useConfirmDialog();

    const openNew = () => {
        setPanelStory(null);
        setIsModalOpen(true);
    };

    const openEdit = (story: UserStory) => {
        setPanelStory(story);
        setIsModalOpen(true);
    };

    const handleSave = async (title: string, responses: Record<string, string>) => {
        let story: UserStory | null = null;
        if (panelStory?.id) {
            await updateStory(panelStory.id, { title, responses });
            story = { ...(panelStory as UserStory), title, responses };
        } else {
            story = await createStory(title, responses);
        }
        // Auto-index after save
        if (story) {
            try {
                await embedStory(story);
            } catch {
                // Silent — badge will show failed state
            }
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const ok = await confirm({
            title: 'Delete User Story',
            message: 'This will permanently delete this user story and remove it from the AI knowledge base.',
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        await deleteStory(id);
    };

    const handleEmbed = async (e: React.MouseEvent, story: UserStory) => {
        e.stopPropagation();
        try {
            await embedStory(story);
        } catch {
            notify({ message: 'Failed to index user story.', variant: 'error' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">User Stories</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Answer template questions to give AI deeper project context</p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <Plus size={13} />
                    New User Story
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
            ) : stories.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded flex flex-col items-center justify-center py-10 text-center bg-white">
                    <BookOpen size={24} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No user stories yet</p>
                    <p className="text-[11px] text-slate-400 mb-4 max-w-xs">Fill in the template to help AI better understand your project context</p>
                    <button
                        onClick={openNew}
                        className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                        Fill User Stories
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {stories.map(story => {
                        const pct = completionPercent(story.responses);
                        const preview = getPreviewLines(story.responses);
                        return (
                            <div
                                key={story.id}
                                className="bg-white border border-slate-200 rounded p-3 hover:border-slate-300 transition-colors group overflow-hidden"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                        <BookOpen size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-slate-900 truncate">{story.title}</p>
                                            <EmbeddingStatusBadge status={story.embeddingStatus} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex-1 h-1 bg-slate-100 rounded overflow-hidden max-w-[80px]">
                                                <div className="h-full bg-[var(--accent-500)] rounded transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">{pct}% complete</span>
                                            <span className="text-[10px] text-slate-400">{new Date(story.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {story.embeddingStatus !== 'processed' && story.embeddingStatus !== 'processing' && (
                                            <button
                                                onClick={e => handleEmbed(e, story)}
                                                className="p-1.5 text-slate-400 hover:text-[var(--accent-600)] border border-slate-200 rounded hover:border-[var(--accent-200)] hover:bg-[var(--accent-50)] transition-colors"
                                                title="Index to AI"
                                            >
                                                <Loader2 size={13} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEdit(story)}
                                            className="p-1.5 text-slate-400 hover:text-slate-900 border border-slate-200 rounded hover:border-slate-300 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit size={13} />
                                        </button>
                                        <button
                                            onClick={e => handleDelete(e, story.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 border border-slate-200 rounded hover:border-rose-200 hover:bg-rose-50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                                {/* Brief preview of answers */}
                                {preview.length > 0 && (
                                    <div className="mt-2 ml-12 space-y-0.5">
                                        {preview.map((line, i) => (
                                            <p key={i} className="text-[11px] text-slate-500 truncate">
                                                <span className="font-bold text-slate-400">{line.title}:</span>{' '}
                                                {line.text}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <StoryModal
                    story={panelStory}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}

            {dialog}
            {notificationBanner}
        </div>
    );
}
