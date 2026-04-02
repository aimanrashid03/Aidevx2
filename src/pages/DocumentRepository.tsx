import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { FileText, File, FolderOpen, ArrowRight, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DocumentRepository() {
    const { projects } = useProjects();
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState<string | null>(null);

    const handleDownload = async (filePath: string) => {
        try {
            setDownloading(filePath);
            const { data, error } = await supabase.storage.from('project-files').createSignedUrl(filePath, 60);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="mx-auto max-w-7xl p-3 md:p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                    <h1 className="page-title">Document Repository</h1>
                    <p className="text-slate-500 mt-1 text-sm">Centralized view of all project documents and requirements.</p>
                </div>
            </div>

            <div className="space-y-6">
                {projects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        {/* Project header */}
                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                                 style={{ background: 'var(--accent-600)' }}>
                                <FolderOpen size={12} />
                            </div>
                            <h2 className="text-sm font-semibold text-slate-900 flex-1">{project.name}</h2>
                            <button
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="text-xs font-medium text-slate-500 hover:text-[var(--accent-700)] flex items-center gap-1 transition-colors"
                            >
                                View Project <ArrowRight size={12} />
                            </button>
                        </div>

                        {/* Requirement Docs */}
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Requirement Documents</h3>
                            {project.requirementDocs && project.requirementDocs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {project.requirementDocs.map((doc, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => navigate(`/editor/${project.id}/${doc.id}`)}
                                            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-[var(--accent-200)] hover:bg-[var(--accent-50)] transition-all cursor-pointer group shadow-sm"
                                        >
                                            <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:bg-[var(--accent-600)] group-hover:text-white group-hover:border-[var(--accent-600)] flex-shrink-0 transition-colors">
                                                <FileText size={13} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-900 truncate group-hover:underline decoration-slate-400 underline-offset-2">{doc.title}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide font-medium">{doc.type} · {new Date(doc.lastModified).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No requirement documents created.</p>
                            )}
                        </div>

                        {/* Supporting Files */}
                        <div className="p-4 bg-slate-50/50">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Supporting Files</h3>
                            {project.documents && project.documents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                    {project.documents.map((doc, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleDownload(doc.path)}
                                            className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                                        >
                                            <div className="flex-shrink-0">
                                                {downloading === doc.path ? (
                                                    <Loader2 size={12} className="animate-spin text-[var(--accent-600)]" />
                                                ) : (
                                                    <File size={12} className="text-slate-400" />
                                                )}
                                            </div>
                                            <span className="truncate font-medium flex-1">{doc.name}</span>
                                            <Download size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No supporting files uploaded.</p>
                            )}
                        </div>
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed shadow-sm">
                        <FolderOpen size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-500">No projects yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">Create a project to see your documents here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
