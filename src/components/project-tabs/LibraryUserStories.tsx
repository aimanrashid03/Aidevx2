import { useState } from 'react';
import {
    Plus, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
    Loader2, Clock, BookOpen, Edit, Trash2, Cpu
} from 'lucide-react';
import { useUserStories, type UserStory } from '../../hooks/useUserStories';

const USER_STORY_TEMPLATE = [
    {
        id: 'q1',
        title: 'System Overview',
        prompts: [
            'What is the system name and purpose?',
            'What are the expected outcomes after implementing this system?',
        ],
    },
    {
        id: 'q2',
        title: 'Users & Roles',
        prompts: [
            'Who will be using this system? (List all user types: Admin, Staff, Manager, etc.)',
            'What is the role/responsibility of each user type?',
            'What are the current issues or challenges faced without this system?',
            'How do these problems impact productivity, accuracy, or cost?',
        ],
    },
    {
        id: 'q3',
        title: 'Modules & Features',
        prompts: [
            'What are the main modules or features of the system?',
            'What is the purpose of each module?',
            'Which users will use each module?',
        ],
    },
    {
        id: 'q4',
        title: 'Current Workflow (AS-IS)',
        prompts: [
            'What is the current workflow or process?',
            'Where do delays, errors, or inefficiencies usually occur?',
        ],
    },
    {
        id: 'q5',
        title: 'Proposed Workflow (TO-BE)',
        prompts: [
            'How should the process work after the system is implemented?',
            'What steps will be automated or improved?',
        ],
    },
    {
        id: 'q6',
        title: 'User Actions & Permissions',
        prompts: [
            'What actions can each user perform in the system?',
            'Are there any actions that require approval or verification?',
        ],
    },
    {
        id: 'q7',
        title: 'Validations',
        prompts: [
            'What validations are required in the system?',
            'What input fields are mandatory?',
        ],
    },
];

function completionPercent(responses: Record<string, string>): number {
    const filled = USER_STORY_TEMPLATE.filter(q => responses[q.id]?.trim().length > 0).length;
    return Math.round((filled / USER_STORY_TEMPLATE.length) * 100);
}

function EmbeddingBadge({ status }: { status: string }) {
    if (status === 'processed') return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 size={10} /> Indexed
        </span>
    );
    if (status === 'processing') return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <Loader2 size={10} className="animate-spin" /> Processing
        </span>
    );
    if (status === 'failed') return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            <AlertCircle size={10} /> Failed
        </span>
    );
    return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            <Clock size={10} /> Not Indexed
        </span>
    );
}

interface SlideOverProps {
    story: Partial<UserStory> | null;
    onClose: () => void;
    onSave: (title: string, responses: Record<string, string>) => Promise<void>;
}

function SlideOver({ story, onClose, onSave }: SlideOverProps) {
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
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-slate-900/40 z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
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
                        className="h-full bg-slate-900 transition-all duration-300"
                        style={{ width: `${(filled / USER_STORY_TEMPLATE.length) * 100}%` }}
                    />
                </div>

                {/* Title */}
                <div className="px-5 py-3 border-b border-slate-100 shrink-0">
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full text-sm font-bold text-slate-900 border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                                        className="w-full h-24 border border-slate-200 rounded p-2 text-xs text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-slate-900 mt-1"
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
        </>
    );
}

interface Props {
    projectId: string;
}

export default function LibraryUserStories({ projectId }: Props) {
    const { stories, loading, createStory, updateStory, deleteStory, embedStory } = useUserStories(projectId);
    const [panelStory, setPanelStory] = useState<Partial<UserStory> | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const openNew = () => {
        setPanelStory(null);
        setIsPanelOpen(true);
    };

    const openEdit = (story: UserStory) => {
        setPanelStory(story);
        setIsPanelOpen(true);
    };

    const handleSave = async (title: string, responses: Record<string, string>) => {
        if (panelStory?.id) {
            await updateStory(panelStory.id, { title, responses });
        } else {
            await createStory(title, responses);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Delete this user story?')) return;
        await deleteStory(id);
    };

    const handleEmbed = async (e: React.MouseEvent, story: UserStory) => {
        e.stopPropagation();
        try {
            await embedStory(story);
        } catch {
            alert('Failed to index user story.');
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
                        return (
                            <div
                                key={story.id}
                                className="bg-white border border-slate-200 rounded p-3 flex items-center gap-3 hover:border-slate-300 transition-colors group"
                            >
                                <div className="w-9 h-9 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                    <BookOpen size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-slate-900 truncate">{story.title}</p>
                                        <EmbeddingBadge status={story.embeddingStatus} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex-1 h-1 bg-slate-100 rounded overflow-hidden max-w-[80px]">
                                            <div className="h-full bg-slate-400 rounded transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">{pct}% complete</span>
                                        <span className="text-[10px] text-slate-400">{new Date(story.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {story.embeddingStatus !== 'processed' && story.embeddingStatus !== 'processing' && (
                                        <button
                                            onClick={e => handleEmbed(e, story)}
                                            className="p-1.5 text-slate-400 hover:text-purple-600 border border-slate-200 rounded hover:border-purple-200 hover:bg-purple-50 transition-colors"
                                            title="Index to AI"
                                        >
                                            <Cpu size={13} />
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
                                        className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded hover:border-red-200 hover:bg-red-50 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isPanelOpen && (
                <SlideOver
                    story={panelStory}
                    onClose={() => setIsPanelOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
