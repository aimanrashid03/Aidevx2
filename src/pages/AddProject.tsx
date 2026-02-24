import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import { Save, ArrowLeft, Upload, File, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
        documents: [] as File[], // Store actual File objects
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents, ...newFiles]
            }));
        }
    };

    const removeFile = (index: number) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !user) return;

        try {
            setLoading(true);

            // 1. Create Project
            const projectId = await addProject({
                name: formData.name,
                description: formData.description,
                notes: formData.notes
            });

            if (!projectId) {
                throw new Error('Failed to create project');
            }

            // 2. Upload Files
            if (formData.documents.length > 0) {
                const uploadPromises = formData.documents.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${projectId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = fileName;

                    // Upload to Storage
                    const { error: uploadError } = await supabase.storage
                        .from('project-files')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    // Save Metadata
                    const { error: metaError } = await supabase
                        .from('project_documents')
                        .insert({
                            project_id: projectId,
                            file_name: file.name,
                            file_path: filePath,
                            file_size: file.size,
                            mime_type: file.type
                        });

                    if (metaError) throw metaError;
                });

                await Promise.all(uploadPromises);
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
        <div className="p-6 max-w-3xl mx-auto font-sans">
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-slate-500 hover:text-slate-900 mb-3 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={14} className="mr-2" />
                    Back
                </button>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Project</h1>
                <p className="text-slate-500 mt-1 text-sm">Create a new project workspace to organize your requirements.</p>
            </div>

            <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Project Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors text-sm"
                            placeholder="e.g. Mobile Banking App"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors h-24 resize-none text-sm"
                            placeholder="Brief description of the project goals and context..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Project Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors h-32 resize-none text-sm"
                            placeholder="Additional context, key stakeholder info, or rough ideas..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Supporting Documents</label>
                        <div
                            className="border border-dashed border-slate-300 rounded p-6 flex flex-col items-center justify-center cursor-pointer hover:border-slate-900 hover:bg-slate-50 transition-all"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                <Upload size={16} className="text-slate-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-900">Click to upload files</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, PNG up to 10MB</p>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        {formData.documents.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {formData.documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <File size={14} className="text-slate-500 flex-shrink-0" />
                                            <span className="text-sm text-slate-700 truncate font-medium">{doc.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(idx)}
                                            className="text-slate-400 hover:text-red-600 p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            disabled={loading}
                            className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded font-medium transition-colors text-sm disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">Processing...</span>
                            ) : (
                                <>
                                    <Save size={16} />
                                    <span>Create Project</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
