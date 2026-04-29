import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useProjects, type Project } from '../../context/ProjectContext';

interface Props {
    project: Project;
    onClose: () => void;
}

export default function EditProjectModal({ project, onClose }: Props) {
    const { updateProject } = useProjects();

    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description ?? '');
    const [notes, setNotes] = useState(project.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        setError('');
        try {
            await updateProject(project.id, {
                name: name.trim(),
                description,
                notes,
            });
            onClose();
        } catch {
            setError('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="text-base font-semibold text-slate-900">Edit project details</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-4">
                        {/* Project Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">
                                Project Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                placeholder="e.g. Mobile Banking App"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 h-24 resize-none"
                                placeholder="Brief description of the project goals and context..."
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Project Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 h-24 resize-none"
                                placeholder="Additional context, key stakeholder info, or rough ideas..."
                            />
                        </div>

                        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving…' : <><Save size={15} /><span>Save changes</span></>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
