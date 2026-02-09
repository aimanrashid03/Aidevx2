import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { ArrowLeft, FileText, File, Calendar, Plus, X, LayoutTemplate, ChevronRight } from 'lucide-react';


const TEMPLATES = [
    { id: 'BRS', name: 'Business Requirement Spec', desc: 'High-level business goals and scope.' },
    { id: 'URS', name: 'User Requirement Spec', desc: 'User needs and interaction flows.' },
    { id: 'SRS', name: 'Software Requirement Spec', desc: 'Detailed functional and non-functional requirements.' },
    { id: 'SDS', name: 'Software Design Spec', desc: 'Technical architecture and system design.' },
];

export default function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { projects } = useProjects();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return <div className="p-8">Project not found</div>;
    }

    const handleCreateDocument = (templateId: string) => {
        navigate(`/editor/${projectId}/${templateId}`);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto font-sans relative">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors text-sm font-medium"
            >
                <ArrowLeft size={14} className="mr-2" />
                Back to Dashboard
            </button>

            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-medium uppercase tracking-wide">
                        <div className="flex items-center gap-1.5 align-middle">
                            <Calendar size={12} className="mb-0.5" />
                            <span>Created on {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
                >
                    <Plus size={16} />
                    <span>Create Document</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                            <FileText size={16} className="text-slate-400" />
                            Description
                        </h2>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                            {project.description || "No description provided."}
                        </p>
                    </section>

                    <section className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Project Notes</h2>
                        {project.notes ? (
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 whitespace-pre-wrap text-sm">
                                {project.notes}
                            </div>
                        ) : (
                            <p className="text-slate-400 italic text-sm">No notes added to this project.</p>
                        )}
                    </section>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Requirement Documents Section */}
                    <section className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Requirement Documents</h2>
                        {project.requirementDocs && project.requirementDocs.length > 0 ? (
                            <div className="space-y-2">
                                {project.requirementDocs.map((doc, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => navigate(`/editor/${project.id}/${doc.id}`)}
                                        className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-all cursor-pointer group"
                                    >
                                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-slate-200 text-slate-400 group-hover:text-slate-900 group-hover:border-slate-400">
                                            <FileText size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-slate-900 font-bold truncate group-hover:underline decoration-slate-400 underline-offset-2">{doc.title}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{doc.type} • {new Date(doc.lastModified).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded border border-slate-200 border-dashed">
                                <p className="text-slate-400 text-xs mb-2">No requirements defined.</p>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="text-xs font-bold text-slate-900 hover:underline"
                                >
                                    Start a document
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Supporting Documents</h2>
                        {project.documents && project.documents.length > 0 ? (
                            <div className="space-y-2">
                                {project.documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group">
                                        <div className="w-6 h-6 rounded bg-white flex items-center justify-center border border-slate-200 text-slate-400 group-hover:text-slate-900 group-hover:border-slate-400">
                                            <File size={12} />
                                        </div>
                                        <span className="text-sm text-slate-700 truncate font-medium group-hover:text-slate-900">{doc}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded border border-slate-200 border-dashed">
                                <p className="text-slate-400 text-xs">No files uploaded.</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Create Document Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create Document</h2>
                                <p className="text-xs text-slate-500 mt-1">Select a document type to initialize your requirement document.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="space-y-3">
                                {TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleCreateDocument(template.id)}
                                        className="w-full flex items-center gap-4 p-3 rounded border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                            <LayoutTemplate size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-black">{template.name}</h3>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-900" />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">{template.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
