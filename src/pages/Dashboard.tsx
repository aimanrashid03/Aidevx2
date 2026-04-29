import { useState, useMemo } from 'react';
import { useProjects, type Project } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, ArrowRight, Paperclip, Check, Archive } from 'lucide-react';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import StatCardsRow from '../components/dashboard/StatCardsRow';
import DashboardTabs, { type DashboardTab } from '../components/dashboard/DashboardTabs';
import DashboardFilters, { type SortOrder } from '../components/dashboard/DashboardFilters';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import AdminViewBanner from '../components/dashboard/AdminViewBanner';
import ProjectCardMenu from '../components/dashboard/ProjectCardMenu';
import EditProjectModal from '../components/dashboard/EditProjectModal';
import DuplicateProjectModal from '../components/dashboard/DuplicateProjectModal';
import DeleteProjectModal from '../components/dashboard/DeleteProjectModal';
import UndoToast from '../components/UndoToast';

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

function formatRelativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const sec = Math.max(1, Math.floor(ms / 1000));
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(mo / 12)}y ago`;
}

export default function Dashboard() {
    const { projects, loading, archiveProject, unarchiveProject, softDeleteProject, permanentlyDeleteProject, restoreProject } = useProjects();
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const navigate = useNavigate();
    const { dialog, notificationBanner, confirm, notify } = useConfirmDialog();

    // Filter / sort state
    const [activeTab, setActiveTab] = useState<DashboardTab>('mine');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortOrder>('recent');
    const [showArchived, setShowArchived] = useState(false);

    // Modal targets
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDuplicate, setProjectToDuplicate] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [undoState, setUndoState] = useState<{ id: string; name: string } | null>(null);

    // Exclude soft-deleted; include archived only when toggle is on
    const visibleProjects = useMemo(() => {
        const active = projects.filter(p => p.deletedAt === null);
        return showArchived ? active : active.filter(p => p.archivedAt === null);
    }, [projects, showArchived]);

    // Bucket: owner → mine, real member (editor/viewer) → shared, admin-only-visible → admin
    const buckets = useMemo(() => ({
        mine: visibleProjects.filter(p => p.userRole === 'owner'),
        shared: visibleProjects.filter(p => p.userRole !== 'owner' && !p.isAdminView),
        admin: visibleProjects.filter(p => p.isAdminView),
    }), [visibleProjects]);

    // Apply search + sort within the active tab
    const displayList = useMemo(() => {
        let list: Project[] = buckets[activeTab] ?? [];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q));
        }
        return [...list].sort((a, b) =>
            sort === 'name'
                ? a.name.localeCompare(b.name)
                : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }, [buckets, activeTab, search, sort]);

    // Archive handlers
    const handleArchive = async (project: Project) => {
        const ok = await confirm({
            title: 'Archive project',
            message: `"${project.name}" will be hidden from your dashboard. Toggle "Archived" in the filters to find it again.`,
            confirmLabel: 'Archive',
            variant: 'default',
        });
        if (!ok) return;
        try {
            await archiveProject(project.id);
            notify({ message: `"${project.name}" archived.`, variant: 'success' });
        } catch {
            notify({ message: 'Failed to archive project.', variant: 'error' });
        }
    };

    const handleUnarchive = async (project: Project) => {
        try {
            await unarchiveProject(project.id);
            notify({ message: `"${project.name}" restored to dashboard.`, variant: 'success' });
        } catch {
            notify({ message: 'Failed to restore project.', variant: 'error' });
        }
    };

    // Soft-delete: called by DeleteProjectModal's onMoveToTrash
    const handleSoftDelete = async () => {
        if (!projectToDelete) return;
        const { id, name } = projectToDelete;
        await softDeleteProject(id);
        setUndoState({ id, name });
    };

    // Permanent delete: called by DeleteProjectModal's onDeletePermanently
    const handlePermanentDelete = async () => {
        if (!projectToDelete) return;
        await permanentlyDeleteProject(projectToDelete.id);
    };

    // Undo soft-delete: called by UndoToast
    const handleUndoDelete = async () => {
        if (!undoState) return;
        const { id, name } = undoState;
        try {
            await restoreProject(id);
            notify({ message: `"${name}" restored.`, variant: 'success' });
        } catch {
            notify({ message: 'Failed to restore project.', variant: 'error' });
        }
    };

    return (
        <div className="mx-auto max-w-7xl p-3 md:p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Projects</h1>
                    <p className="text-xs text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">{buckets.mine.length}</span> owned
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="font-medium text-slate-700">{buckets.shared.length}</span> shared with you
                        {isAdmin && (
                            <>
                                <span className="mx-1.5 text-slate-300">·</span>
                                <span className="font-medium text-slate-700">{buckets.admin.length}</span> visible as admin
                            </>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/projects/new')}
                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
                >
                    <Plus size={15} />
                    <span>New Project</span>
                </button>
            </div>

            {/* Loading skeleton */}
            {loading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 rounded-lg bg-white border border-slate-200 shadow-sm animate-pulse" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                                <div className="h-1 bg-slate-200" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    <div className="h-3 bg-slate-100 rounded w-3/4 mt-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : visibleProjects.length === 0 && !showArchived ? (
                /* Global empty state — no active projects */
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed shadow-sm">
                    <div className="mx-auto w-10 h-10 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <FileText size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">No projects yet</h3>
                    <p className="text-slate-500 mt-1 mb-6 text-sm">Create your first project to get started.</p>
                    <button
                        onClick={() => navigate('/projects/new')}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
                    >
                        Create Project
                    </button>
                </div>
            ) : (
                <>
                    {/* Stat cards — count against non-archived, non-deleted projects */}
                    <StatCardsRow
                        total={projects.filter(p => p.deletedAt === null && p.archivedAt === null).length}
                        owned={projects.filter(p => p.deletedAt === null && p.archivedAt === null && p.userRole === 'owner').length}
                        shared={projects.filter(p => p.deletedAt === null && p.archivedAt === null && p.userRole !== 'owner' && !p.isAdminView).length}
                        adminView={isAdmin ? projects.filter(p => p.deletedAt === null && p.archivedAt === null && p.isAdminView).length : undefined}
                    />

                    {/* Tabs + Filters */}
                    <div className="border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <DashboardTabs
                                activeTab={activeTab}
                                mineCount={buckets.mine.length}
                                sharedCount={buckets.shared.length}
                                adminCount={isAdmin ? buckets.admin.length : undefined}
                                onChange={(tab) => { setActiveTab(tab); setSearch(''); }}
                            />
                            <div className="pb-2">
                                <DashboardFilters
                                    search={search}
                                    sort={sort}
                                    onSearchChange={setSearch}
                                    onSortChange={setSort}
                                    showArchived={showArchived}
                                    onShowArchivedChange={setShowArchived}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Admin read-only banner */}
                    {activeTab === 'admin' && <AdminViewBanner />}

                    {/* Project grid or tab-level empty state */}
                    {displayList.length === 0 ? (
                        <DashboardEmptyState activeTab={activeTab} search={search} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayList.map((project) => {
                                const reqDocs = project.requirementDocs || [];
                                const typeStatus: Record<string, 'draft' | 'final'> = {};
                                reqDocs.forEach(d => {
                                    if (DOC_TYPES.includes(d.type as typeof DOC_TYPES[number])) {
                                        if (!typeStatus[d.type] || d.status === 'final') {
                                            typeStatus[d.type] = d.status as 'draft' | 'final';
                                        }
                                    }
                                });
                                const fileCount = project.documents?.length || 0;
                                const otherMembers = Math.max(0, (project.memberCount ?? 0) - 1);
                                const isArchived = project.archivedAt !== null;
                                const canManage = !project.isAdminView && (project.userRole === 'owner' || project.userRole === 'editor');

                                return (
                                    <div
                                        key={project.id}
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        className={`group relative rounded-lg bg-white border border-slate-200 transition-all cursor-pointer hover:border-slate-300 hover:shadow-md overflow-hidden shadow-sm ${
                                            isArchived ? 'opacity-70' : ''
                                        }`}
                                    >
                                        {/* Accent bar */}
                                        <div
                                            className="h-1 opacity-50 group-hover:opacity-80 transition-opacity"
                                            style={{ background: 'var(--accent-500)' }}
                                        />

                                        <div className="p-4">
                                            {/* Card header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-sm font-bold text-slate-900 truncate mb-0.5">
                                                        {project.name}
                                                    </h3>
                                                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                                                        {project.description || 'No description yet'}
                                                    </p>
                                                </div>

                                                {/* Right-side badges + menu */}
                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                    {/* Archived badge — click to unarchive */}
                                                    {isArchived && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); void handleUnarchive(project); }}
                                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors"
                                                            title="Click to unarchive"
                                                        >
                                                            <Archive size={9} />
                                                            Archived
                                                        </button>
                                                    )}
                                                    {/* Role badge — color-coded per role */}
                                                    {project.isAdminView ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                                                            Admin view
                                                        </span>
                                                    ) : project.userRole === 'editor' ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                                                            Editor
                                                        </span>
                                                    ) : project.userRole === 'viewer' ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                                                            Viewer
                                                        </span>
                                                    ) : null}
                                                    {/* 3-dot menu (owner + editor only) */}
                                                    {canManage && (
                                                        <ProjectCardMenu
                                                            isArchived={isArchived}
                                                            onEdit={() => setProjectToEdit(project)}
                                                            onDuplicate={() => setProjectToDuplicate(project)}
                                                            onArchive={isArchived
                                                                ? () => void handleUnarchive(project)
                                                                : () => void handleArchive(project)
                                                            }
                                                            showDelete
                                                            onDelete={() => setProjectToDelete(project)}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Doc type status dots */}
                                            <div className="mb-3">
                                                <div className="flex items-center gap-3">
                                                    {DOC_TYPES.map((type) => {
                                                        const status = typeStatus[type];
                                                        const colors = DOC_TYPE_COLORS[type];
                                                        return (
                                                            <div
                                                                key={type}
                                                                className="flex flex-col items-center gap-1"
                                                                title={status ? `${type}: ${status}` : `${type}: not started`}
                                                            >
                                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                                                                    status === 'final'
                                                                        ? `${colors.fill} border-transparent`
                                                                        : status === 'draft'
                                                                            ? `bg-white ${colors.border}`
                                                                            : 'bg-slate-50 border-slate-200'
                                                                }`}>
                                                                    {status === 'final' && (
                                                                        <Check size={12} className="text-white" strokeWidth={3} />
                                                                    )}
                                                                    {status === 'draft' && (
                                                                        <span className={`w-2 h-2 rounded-full ${colors.fill} opacity-60`} />
                                                                    )}
                                                                </div>
                                                                <span className={`text-[10px] font-bold tracking-wide ${status ? colors.text : 'text-slate-300'}`}>
                                                                    {type}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {fileCount > 0 && (
                                                        <div
                                                            className="flex flex-col items-center gap-1 ml-auto"
                                                            title={`${fileCount} reference file${fileCount > 1 ? 's' : ''}`}
                                                        >
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                                                                <Paperclip size={11} className="text-slate-400" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 tracking-wide">
                                                                {fileCount}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card footer */}
                                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                                {/* Left: avatar + two-line stack (OWNER on top, name + collaborators below) */}
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {project.ownerName && (
                                                        <>
                                                            <div
                                                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                                                style={{ background: 'var(--accent-600)' }}
                                                            >
                                                                {getInitials(project.ownerName)}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span
                                                                    className="text-[10px] font-bold uppercase tracking-wider leading-none mb-0.5"
                                                                    style={{ color: 'var(--accent-500)' }}
                                                                >
                                                                    Owner
                                                                </span>
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className="text-[12px] text-slate-900 font-semibold truncate">
                                                                        {project.ownerName.split(' ')[0]}
                                                                    </span>
                                                                    {otherMembers > 0 && (
                                                                        <span
                                                                            className="text-[11px] font-semibold whitespace-nowrap"
                                                                            style={{ color: 'var(--accent-600)' }}
                                                                        >
                                                                            +{otherMembers} collaborator{otherMembers > 1 ? 's' : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                {/* Right: Open hover on top, timestamp below */}
                                                <div className="flex flex-col items-end shrink-0 gap-0.5">
                                                    <div className="flex items-center gap-1 text-slate-900 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0 font-bold uppercase tracking-wider text-[10px]">
                                                        Open
                                                        <ArrowRight size={12} />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {formatRelativeTime(project.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            {projectToEdit && (
                <EditProjectModal
                    project={projectToEdit}
                    onClose={() => setProjectToEdit(null)}
                />
            )}
            {projectToDuplicate && (
                <DuplicateProjectModal
                    project={projectToDuplicate}
                    onClose={() => setProjectToDuplicate(null)}
                />
            )}

            {projectToDelete && (
                <DeleteProjectModal
                    project={projectToDelete}
                    onMoveToTrash={handleSoftDelete}
                    onDeletePermanently={handlePermanentDelete}
                    onClose={() => setProjectToDelete(null)}
                />
            )}

            {undoState && (
                <UndoToast
                    message={`"${undoState.name}" moved to Trash.`}
                    onUndo={() => { void handleUndoDelete(); }}
                    onClose={() => setUndoState(null)}
                />
            )}

            {/* Confirm dialog + notification banner from useConfirmDialog */}
            {dialog}
            {notificationBanner}
        </div>
    );
}
