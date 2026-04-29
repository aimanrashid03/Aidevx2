import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import type { Project } from '../../context/ProjectContext';

interface Props {
    project: Project;
    initialStep?: 'trash' | 'permanent';
    onMoveToTrash?: () => Promise<void>;
    onDeletePermanently: () => Promise<void>;
    onClose: () => void;
}

export default function DeleteProjectModal({
    project,
    initialStep = 'trash',
    onMoveToTrash,
    onDeletePermanently,
    onClose,
}: Props) {
    const isOwner = project.userRole === 'owner';
    const [step, setStep] = useState<'trash' | 'permanent'>(initialStep);
    const [confirmName, setConfirmName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleMoveToTrash = async () => {
        if (!onMoveToTrash) return;
        setLoading(true);
        setError('');
        try {
            await onMoveToTrash();
            onClose();
        } catch {
            setError('Failed to move project to Trash. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePermanently = async () => {
        if (confirmName !== project.name) return;
        setLoading(true);
        setError('');
        try {
            await onDeletePermanently();
            onClose();
        } catch {
            setError('Failed to permanently delete project. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-150">
                {step === 'trash' ? (
                    <>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="text-base font-semibold text-slate-900">Move to Trash?</h2>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-900">"{project.name}"</span> will be moved to Trash. You can restore it within 30 days.
                            </p>
                            {isOwner && (
                                <button
                                    onClick={() => setStep('permanent')}
                                    className="text-xs text-rose-500 hover:text-rose-700 font-medium hover:underline underline-offset-2 transition-colors"
                                >
                                    Delete permanently instead →
                                </button>
                            )}
                            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                        </div>

                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleMoveToTrash}
                                disabled={loading}
                                className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Moving…' : <><Trash2 size={14} /><span>Move to Trash</span></>}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="text-base font-semibold text-rose-700">Permanently delete project</h2>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100">
                                <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-rose-700 leading-relaxed">
                                    This action <strong>cannot be undone</strong>. All project data, documents, and members will be permanently deleted.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700">
                                    Type{' '}
                                    <span className="font-mono bg-slate-100 px-1 rounded text-slate-900 text-xs">
                                        {project.name}
                                    </span>{' '}
                                    to confirm
                                </label>
                                <input
                                    type="text"
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                                    placeholder={project.name}
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                        </div>

                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                            {onMoveToTrash ? (
                                <button
                                    type="button"
                                    onClick={() => setStep('trash')}
                                    disabled={loading}
                                    className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors disabled:opacity-50"
                                >
                                    ← Back
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleDeletePermanently}
                                disabled={loading || confirmName !== project.name}
                                className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Deleting…' : <><Trash2 size={14} /><span>Delete permanently</span></>}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
