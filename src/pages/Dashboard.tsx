import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, ArrowRight, Paperclip, Check } from 'lucide-react';

const DOC_TYPES = ['BRS', 'URS', 'SRS', 'SDS'] as const;

const DOC_TYPE_COLORS: Record<string, { fill: string; border: string; text: string }> = {
    BRS: { fill: 'bg-violet-500', border: 'border-violet-300', text: 'text-violet-600' },
    URS: { fill: 'bg-sky-500', border: 'border-sky-300', text: 'text-sky-600' },
    SRS: { fill: 'bg-amber-500', border: 'border-amber-300', text: 'text-amber-600' },
    SDS: { fill: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-600' },
};

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Dashboard() {
    const { projects } = useProjects();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const displayName = profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'User';

    return (
        <div className="px-6 py-6 font-sans">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back, {displayName}!</h1>
                    <p className="text-slate-500 mt-1 text-sm">All your projects, in one place.</p>
                </div>
                <button
                    onClick={() => navigate('/projects/new')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
                >
                    <Plus size={16} />
                    <span>New Project</span>
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded border border-slate-200 border-dashed">
                    <div className="mx-auto w-10 h-10 bg-slate-50 rounded flex items-center justify-center text-slate-400 mb-3">
                        <FileText size={20} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">No projects yet</h3>
                    <p className="text-slate-500 mt-1 mb-6 text-sm">Create your first project to get started.</p>
                    <button
                        onClick={() => navigate('/projects/new')}
                        className="px-4 py-2 bg-slate-100 text-slate-900 rounded hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-200"
                    >
                        Create Project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => {
                        const reqDocs = project.requirementDocs || [];
                        // Build a map: type -> status ('final' | 'draft')
                        const typeStatus: Record<string, 'draft' | 'final'> = {};
                        reqDocs.forEach(d => {
                            if (DOC_TYPES.includes(d.type as typeof DOC_TYPES[number])) {
                                // If multiple docs of same type, prioritize showing 'final'
                                if (!typeStatus[d.type] || d.status === 'final') {
                                    typeStatus[d.type] = d.status as 'draft' | 'final';
                                }
                            }
                        });
                        const fileCount = project.documents?.length || 0;
                        const otherMembers = Math.max(0, (project.memberCount ?? 0) - 1);

                        return (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="group relative rounded-lg bg-white border border-slate-200 transition-all cursor-pointer hover:border-slate-300 hover:shadow-md overflow-hidden"
                            >
                                {/* Purple accent bar */}
                                <div className="h-1 bg-purple-500 opacity-40 group-hover:opacity-70 transition-opacity" />

                                <div className="p-5">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base font-bold text-slate-900 truncate mb-0.5">{project.name}</h3>
                                            <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                                                {project.description || "No description yet"}
                                            </p>
                                        </div>
                                        {project.userRole && project.userRole !== 'owner' && (
                                            <span className="shrink-0 ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                                                {project.userRole}
                                            </span>
                                        )}
                                    </div>

                                    {/* Segmented dots — always show all 4 slots */}
                                    <div className="mb-3">
                                        <div className="flex items-center gap-3">
                                            {DOC_TYPES.map((type) => {
                                                const status = typeStatus[type]; // undefined | 'draft' | 'final'
                                                const colors = DOC_TYPE_COLORS[type];
                                                return (
                                                    <div key={type} className="flex flex-col items-center gap-1" title={status ? `${type}: ${status}` : `${type}: not started`}>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                                                            status === 'final'
                                                                ? `${colors.fill} border-transparent`
                                                                : status === 'draft'
                                                                    ? `bg-white ${colors.border}`
                                                                    : 'bg-slate-50 border-slate-200'
                                                        }`}>
                                                            {status === 'final' && <Check size={12} className="text-white" strokeWidth={3} />}
                                                            {status === 'draft' && <span className={`w-2 h-2 rounded-full ${colors.fill} opacity-60`} />}
                                                        </div>
                                                        <span className={`text-[9px] font-bold tracking-wide ${
                                                            status ? colors.text : 'text-slate-300'
                                                        }`}>{type}</span>
                                                    </div>
                                                );
                                            })}

                                            {/* File count — tucked at the end */}
                                            {fileCount > 0 && (
                                                <div className="flex flex-col items-center gap-1 ml-auto" title={`${fileCount} reference file${fileCount > 1 ? 's' : ''}`}>
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                                                        <Paperclip size={11} className="text-slate-400" />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 tracking-wide">{fileCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer: Owner + members + action */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {/* Owner avatar + label */}
                                            {project.ownerName && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">
                                                            {getInitials(project.ownerName)}
                                                        </div>
                                                        <span className="text-[8px] font-bold text-purple-500 uppercase tracking-wider mt-0.5">Owner</span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-600 font-medium leading-tight">{project.ownerName.split(' ')[0]}</span>
                                                </div>
                                            )}
                                            {/* Other members */}
                                            {otherMembers > 0 && (
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    +{otherMembers} member{otherMembers > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 text-slate-900 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0 font-bold uppercase tracking-wider text-[10px]">
                                            Open
                                            <ArrowRight size={12} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
