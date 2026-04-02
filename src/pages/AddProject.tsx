import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import { Save, ArrowLeft, Upload, File, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractText } from '../lib/extractText';

export default function AddProject() {
    const navigate = useNavigate();
    const { addProject } = useProjects();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        notes: '',
        documents: [] as File[],
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFormData(prev => ({ ...prev, documents: [...prev.documents, ...newFiles] }));
        }
    };

    const removeFile = (index: number) => {
        setFormData(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !user) return;
        try {
            setLoading(true);
            const projectId = await addProject({
                name: formData.name,
                description: formData.description,
                notes: formData.notes,
            });
            if (!projectId) throw new Error('Failed to create project');

            if (formData.documents.length > 0) {
                const embeddingPromises: Promise<void>[] = [];

                await Promise.all(formData.documents.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const filePath = `${projectId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('project-files').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: docRow, error: metaError } = await supabase.from('project_documents').insert({
                        project_id: projectId,
                        file_name: file.name,
                        file_path: filePath,
                        file_size: file.size,
                        mime_type: file.type,
                        embedding_status: 'processing',
                    }).select('id').single();
                    if (metaError) throw metaError;

                    // Fire-and-forget: extract text and embed without blocking navigation
                    embeddingPromises.push(
                        extractText(file).then(async (content) => {
                            if (content.trim().length > 0) {
                                await supabase.functions.invoke('embed_document', {
                                    body: { projectId, documentPath: filePath, content, documentId: docRow.id },
                                });
                            } else {
                                await supabase.from('project_documents')
                                    .update({ embedding_status: 'processed' })
                                    .eq('id', docRow.id);
                            }
                        }).catch(err => console.error('Embedding failed for', file.name, err))
                    );
                }));

                // Don't await embeddingPromises — navigate immediately, indexing runs in background
                void embeddingPromises;
            }
            navigate('/dashboard');
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-4">
            {/* Back + title */}
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-slate-500 hover:text-slate-900 mb-3 transition-colors text-xs font-medium"
                >
                    <ArrowLeft size={13} className="mr-1.5" />
                    Back
                </button>
                <h1 className="page-title">New Project</h1>
                <p className="text-slate-500 mt-1 text-sm">Create a new project workspace to organize your requirements.</p>
            </div>

            {/* Form card */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-5">
                        {/* Project Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">
                                Project Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                placeholder="e.g. Mobile Banking App"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 h-24 resize-none"
                                placeholder="Brief description of the project goals and context..."
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Project Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 h-32 resize-none"
                                placeholder="Additional context, key stakeholder info, or rough ideas..."
                            />
                        </div>

                        {/* File upload */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">Supporting Documents</label>
                            <div
                                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-5 bg-slate-50 transition-colors hover:border-[var(--accent-400)] hover:bg-[var(--accent-50)]"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-9 h-9 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center mb-2">
                                    <Upload size={16} className="text-slate-500" />
                                </div>
                                <p className="text-xs font-bold text-slate-900 mb-0.5">Click to upload files</p>
                                <p className="text-[10px] text-slate-400 mb-2">PDF, DOCX, PNG up to 10MB</p>
                                <span className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">Browse</span>
                                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            </div>

                            {formData.documents.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                    {formData.documents.map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <File size={13} className="text-slate-400 flex-shrink-0" />
                                                <span className="text-xs text-slate-700 truncate font-medium">{doc.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            disabled={loading}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing…' : (<><Save size={15} /><span>Create Project</span></>)}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
