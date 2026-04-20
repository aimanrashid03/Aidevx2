import { useState } from 'react';
import { GitBranch, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';

interface Props {
    projectId: string;
    originalDocId: string;
    onClose: () => void;
}

export default function CreateCRDialog({ projectId, originalDocId, onClose }: Props) {
    const navigate = useNavigate();
    const { createChangeRequest, projects } = useProjects();
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const project = projects.find(p => p.id === projectId);
    const originalDoc = project?.requirementDocs.find(d => d.id === originalDocId);

    const handleCreate = async () => {
        if (!description.trim()) return;
        setCreating(true);
        setError(null);
        try {
            const crDocId = await createChangeRequest(projectId, originalDocId, description.trim());
            if (crDocId) {
                onClose();
                navigate(`/editor/${projectId}/${crDocId}`);
            } else {
                setError('Failed to create change request. Please try again.');
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-50)] border border-[var(--accent-200)] flex items-center justify-center">
                            <GitBranch size={16} className="text-[var(--accent-600)]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Create Change Request</h2>
                            {originalDoc && (
                                <p className="text-[11px] text-slate-500 truncate max-w-[260px]">{originalDoc.title}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                        <X size={16} />
                    </button>
                </div>

                <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
                    A new CR document will be created as a copy of the original. The original will be locked to prevent concurrent edits.
                </p>

                {/* Description input */}
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the reason for this change request…"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-400)] resize-none"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCreate();
                        if (e.key === 'Escape') onClose();
                    }}
                />

                {/* Error message */}
                {error && (
                    <p className="mt-3 text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!description.trim() || creating}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[var(--accent-600)] text-white text-sm font-bold rounded-lg hover:bg-[var(--accent-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {creating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Creating…
                            </>
                        ) : (
                            <>
                                <GitBranch size={14} />
                                Create CR
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
