import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Plus, ArrowRight } from 'lucide-react';

export default function Dashboard() {
    const { projects } = useProjects();
    const { profile } = useAuth();
    const navigate = useNavigate();

    const displayName = profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'User';

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
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
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className="group relative p-5 border border-slate-200 rounded bg-white transition-all cursor-pointer hover:border-slate-400 hover:shadow-sm"
                        >
                            <div className="mb-4">
                                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-slate-900 transition-colors truncate">{project.name}</h3>
                                <p className="text-slate-600 text-sm line-clamp-2 h-10 leading-relaxed">
                                    {project.description || "No description provided."}
                                </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 text-slate-900 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-5px] group-hover:translate-x-0 font-bold uppercase tracking-wider text-[10px]">
                                    <span>View Details</span>
                                    <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
