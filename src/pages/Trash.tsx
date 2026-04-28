import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Clock, Archive } from 'lucide-react';
import { useProjects, type Project } from '../context/ProjectContext';
import DeleteProjectModal from '../components/dashboard/DeleteProjectModal';

function getDaysRemaining(deletedAt: string): number {
    const deleted = new Date(deletedAt).getTime();
    const daysSinceDeleted = Math.floor((Date.now() - deleted) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysSinceDeleted);
}

function getRelativeTime(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export default function Trash() {
    const { fetchTrashedProjects, restoreProject, permanentlyDeleteProject } = useProjects();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetchTrashedProjects()
            .then(setProjects)
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRestore = async (project: Project) => {
        setRestoringId(project.id);
        try {
            await restoreProject(project.id);
            setProjects(prev => prev.filter(p => p.id !== project.id));
        } finally {
            setRestoringId(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!projectToDelete) return;
        await permanentlyDeleteProject(projectToDelete.id);
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    };

    return (
        <div className="mx-auto max-w-4xl p-3 md:p-4 space-y-4">
            <div>
                <h1 className="page-title">Trash</h1>
                <p className="text-sm text-slate-500 mt-0.5">Projects are permanently deleted after 30 days.</p>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 rounded-lg bg-white border border-slate-200 shadow-sm animate-pulse" />
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-slate-200 border-dashed shadow-sm">
                    <div className="mx-auto w-10 h-10 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <Trash2 size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Trash is empty</h3>
                    <p className="text-slate-500 mt-1 text-sm">
                        Deleted projects appear here for 30 days before being permanently removed.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                    {projects.map((project) => {
                        const daysRemaining = project.deletedAt ? getDaysRemaining(project.deletedAt) : 30;
                        const isUrgent = daysRemaining <= 7;
                        const canRestore = project.userRole === 'owner' || project.userRole === 'editor';
                        const canDeleteForever = project.userRole === 'owner';
                        const isRestoring = restoringId === project.id;

                        return (
                            <div key={project.id} className="flex items-center gap-4 px-4 py-3.5">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-sm font-semibold text-slate-900 truncate">{project.name}</h3>
                                        {project.archivedAt && (
                                            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                                                <Archive size={9} />
                                                Archived
                                            </span>
                                        )}
                                    </div>
                                    {project.description && (
                                        <p className="text-xs text-slate-500 truncate mb-1">{project.description}</p>
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Clock size={11} />
                                        <span>
                                            {project.deletedAt
                                                ? `Deleted ${getRelativeTime(project.deletedAt)}`
                                                : 'Recently deleted'}
                                        </span>
                                        <span>·</span>
                                        <span className={isUrgent ? 'text-rose-500 font-semibold' : ''}>
                                            {daysRemaining === 0
                                                ? 'Expires today'
                                                : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {canRestore && (
                                        <button
                                            onClick={() => void handleRestore(project)}
                                            disabled={isRestoring}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <RotateCcw size={13} className={isRestoring ? 'animate-spin' : ''} />
                                            {isRestoring ? 'Restoring…' : 'Restore'}
                                        </button>
                                    )}
                                    {canDeleteForever && (
                                        <button
                                            onClick={() => setProjectToDelete(project)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors shadow-sm"
                                        >
                                            <Trash2 size={13} />
                                            Delete forever
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {projectToDelete && (
                <DeleteProjectModal
                    project={projectToDelete}
                    initialStep="permanent"
                    onDeletePermanently={handlePermanentDelete}
                    onClose={() => setProjectToDelete(null)}
                />
            )}
        </div>
    );
}
