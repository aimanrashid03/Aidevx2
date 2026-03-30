import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Clock, FileCheck, AlertCircle, Plus, LayoutTemplate, Trash2 } from 'lucide-react';
import type { Project } from '../../context/ProjectContext';

interface Props {
    project: Project;
    onNewDraft: () => void;
    onDeleteDoc: (e: React.MouseEvent, id: string) => void;
}

const getDocumentStatus = (lastModified: string) => {
    const daysSinceMod = (new Date().getTime() - new Date(lastModified).getTime()) / (1000 * 3600 * 24);
    if (daysSinceMod < 1) return { label: 'Active Draft', icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (daysSinceMod > 7) return { label: 'Ready for Review', icon: FileCheck, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return { label: 'Needs Attention', icon: AlertCircle, color: 'text-rose-700 bg-rose-50 border-rose-200' };
};

export default function WorkspaceTab({ project, onNewDraft, onDeleteDoc }: Props) {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <section>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Requirement Documents</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Structured templates for requirements engineering.</p>
                    </div>
                    <button
                        onClick={onNewDraft}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors shadow-sm text-xs font-bold"
                    >
                        <Plus size={14} />
                        New Draft
                    </button>
                </div>

                {project.requirementDocs && project.requirementDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {project.requirementDocs.map((doc, idx) => {
                            const status = getDocumentStatus(doc.lastModified);
                            const StatusIcon = status.icon;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => navigate(`/editor/${project.id}/${doc.id}`)}
                                    className="bg-white p-4 rounded border border-slate-200 hover:border-slate-800 hover:shadow-sm transition-all cursor-pointer group relative flex flex-col justify-between"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors group-hover:border-slate-900 shrink-0">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 group-hover:underline decoration-slate-400 underline-offset-2 break-words mr-8 min-w-0 pr-2 leading-tight mb-1">{doc.title}</div>
                                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                                    <Calendar size={10} className="text-slate-400" />
                                                    Updated {new Date(doc.lastModified).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <div className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold border flex items-center gap-1.5 ${status.color}`}>
                                            <StatusIcon size={12} />
                                            {status.label}
                                        </div>
                                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                            {doc.type}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => onDeleteDoc(e, doc.id)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded"
                                        title="Delete Document"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 rounded border border-slate-200 border-dashed">
                        <LayoutTemplate size={32} className="mx-auto text-slate-300 mb-3" />
                        <h3 className="text-sm font-bold text-slate-900 mb-1">No requirement documents</h3>
                        <p className="text-slate-500 text-sm mb-4">Start drafting your first structured requirements spec.</p>
                        <button
                            onClick={onNewDraft}
                            className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            Create New Draft
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
