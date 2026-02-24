import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { FileText, File, FolderOpen, ArrowRight, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DocumentRepository() {
    const { projects } = useProjects();
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState<string | null>(null);

    const handleDownload = async (filePath: string) => {
        try {
            setDownloading(filePath);
            const { data, error } = await supabase.storage
                .from('project-files')
                .createSignedUrl(filePath, 60);

            if (error) throw error;

            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <div className="mb-6 border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Repository</h1>
                <p className="text-slate-500 mt-1 text-sm">Centralized view of all project documents and requirements.</p>
            </div>

            <div className="space-y-8">
                {projects.map((project) => (
                    <div key={project.id} className="scroll-mt-24">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center">
                                <FolderOpen size={12} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900">{project.name}</h2>
                            <button
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors ml-auto uppercase tracking-wider"
                            >
                                View Project <ArrowRight size={12} />
                            </button>
                        </div>

                        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                            {/* Requirement Docs */}
                            <div className="p-4 border-b border-slate-100 last:border-0">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Requirement Documents</h3>
                                {project.requirementDocs && project.requirementDocs.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {project.requirementDocs.map((doc, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => navigate(`/editor/${project.id}/${doc.id}`)}
                                                className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200 hover:border-slate-400 hover:bg-white transition-all cursor-pointer group"
                                            >
                                                <div className="w-6 h-6 rounded bg-white flex items-center justify-center border border-slate-200 text-slate-400 group-hover:text-slate-900 group-hover:border-slate-400 flex-shrink-0">
                                                    <FileText size={12} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 truncate group-hover:underline decoration-slate-400 underline-offset-2">{doc.title}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide font-medium">{doc.type} • {new Date(doc.lastModified).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic">No requirement documents created.</div>
                                )}
                            </div>

                            {/* Uploaded Docs */}
                            <div className="p-4 bg-slate-50/50">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Supporting Files</h3>
                                {project.documents && project.documents.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {project.documents.map((doc, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleDownload(doc.path)}
                                                className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 text-xs text-slate-700 hover:border-slate-300 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex-shrink-0">
                                                    {downloading === doc.path ? (
                                                        <div className="animate-spin h-3 w-3 border-2 border-slate-400 border-t-slate-900 rounded-full"></div>
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
                                    <div className="text-xs text-slate-400 italic">No supporting files uploaded.</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
