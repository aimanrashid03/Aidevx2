import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import {
    ArrowLeft, FileText, File, Calendar, X,
    LayoutTemplate, ChevronRight, LayoutDashboard,
    CirclePlay, LibraryBig, Users, Sparkles, FileEdit, Check, Edit, FlaskConical, Activity,
    RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { useUserStories } from '../hooks/useUserStories';
import { useCoverageAssessment } from '../hooks/useCoverageAssessment';
import CoverageBreakdown from '../components/CoverageBreakdown';
import DashboardTab from '../components/project-tabs/DashboardTab';
import WorkspaceTab from '../components/project-tabs/WorkspaceTab';
import LibraryTab from '../components/project-tabs/LibraryTab';
import CollaboratorsTab from '../components/project-tabs/CollaboratorsTab';
import PrototypeTab from '../components/project-tabs/PrototypeTab';
import ActivityTab from '../components/project-tabs/ActivityTab';

const TEMPLATES = [
    { id: 'BRS', name: 'Business Requirement Spec (BRS)', desc: 'High-level business goals and scope.' },
    { id: 'URS', name: 'User Requirement Spec (URS)', desc: 'User needs and interaction flows.' },
    { id: 'SRS', name: 'Software Requirement Spec (SRS)', desc: 'Detailed functional and non-functional requirements.' },
    { id: 'SDS', name: 'Software Design Spec (SDS)', desc: 'Technical architecture and system design.' },
];

type TabKey = 'dashboard' | 'workspace' | 'library' | 'prototype' | 'collaborators' | 'activity';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'workspace', label: 'Workspace', icon: CirclePlay },
    { key: 'library', label: 'Library', icon: LibraryBig },
    { key: 'prototype', label: 'Prototype', icon: FlaskConical },
    { key: 'collaborators', label: 'Collaborators', icon: Users },
    { key: 'activity', label: 'Activity', icon: Activity },
];

export default function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { projects, loading, updateProject, deleteRequirementDoc, refreshProjects } = useProjects();

    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') as TabKey | null;
    const [activeTab, setActiveTab] = useState<TabKey>(
        initialTab && TABS.some(t => t.key === initialTab) ? initialTab : 'dashboard'
    );

    const handleTabChange = (key: TabKey) => {
        setActiveTab(key);
        setSearchParams({ tab: key }, { replace: true });
    };
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', notes: '' });

    const { dialog, notificationBanner, confirm, notify } = useConfirmDialog();

    const project = projects.find(p => p.id === projectId);

    const { stories } = useUserStories(project?.id || '');
    const indexedFiles = project?.documents?.filter(d => d.embeddingStatus === 'processed').length || 0;
    const indexedStories = stories.filter(s => s.embeddingStatus === 'processed').length;
    const totalIndexed = indexedFiles + indexedStories;

    const currentChunkCount = indexedFiles + indexedStories;
    const { assessment: coverageAssessment, assessing: coverageAssessing, isStale: coverageIsStale, runAssessment: runCoverageAssessment, refetch: refetchCoverage } =
        useCoverageAssessment(project?.id || '', 'BRS', currentChunkCount);

    // Legacy fallback: still used for "no indexed content" warning when no assessment yet
    const ragReadiness = totalIndexed === 0 ? 'none' : totalIndexed < 5 ? 'limited' : 'ready';

    const handleEditClick = () => {
        if (project) {
            setEditForm({ name: project.name, description: project.description || '', notes: project.notes || '' });
            setIsEditing(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!project || !editForm.name) return;
        try {
            await updateProject(project.id, editForm);
            setIsEditing(false);
        } catch {
            notify({ message: 'Failed to update project details.', variant: 'error' });
        }
    };

    const handleDeleteRequirement = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!project) return;
        const ok = await confirm({
            title: 'Delete Document',
            message: 'Are you sure you want to delete this requirement document? This action cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (ok) {
            try {
                await deleteRequirementDoc(id, project.id);
            } catch {
                notify({ message: 'Failed to delete requirement document.', variant: 'error' });
            }
        }
    };

    const handleCreateDocument = (templateId: string) => {
        if (templateId === 'BRS') {
            setSelectedTemplate('BRS');
            refetchCoverage(); // sync with any assessment run in DashboardTab
            return;
        }
        navigate(`/editor/${projectId}/${templateId}`);
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="w-7 h-7 border-4 border-slate-200 border-t-[var(--accent-600)] rounded-full animate-spin" />
            </div>
        );
    }

    if (!project) {
        return <div className="p-8 text-slate-500">Project not found</div>;
    }

    const tabBadge = (key: TabKey): number | undefined => {
        if (key === 'workspace') return project.requirementDocs?.length || undefined;
        if (key === 'library') return project.documents?.length || undefined;
        return undefined;
    };

    return (
        <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4 relative pb-10">
            {/* Back */}
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-slate-500 hover:text-slate-900 transition-colors text-xs font-medium"
            >
                <ArrowLeft size={12} className="mr-1.5" />
                Back to Dashboard
            </button>

            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                {isEditing ? (
                    <div className="flex-1 mr-4 space-y-3">
                        <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="Project Name"
                        />
                        <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full h-16 rounded-lg border border-slate-300 p-2 text-sm text-slate-700 shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
                            placeholder="Project Description..."
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSaveEdit} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm hover:bg-slate-800">
                                <Check size={14} /> Save
                            </button>
                            <button onClick={() => setIsEditing(false)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-slate-200 border border-slate-200">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="page-title">{project.name}</h1>
                            <button onClick={handleEditClick} className="text-slate-400 hover:text-slate-900 transition-colors mt-1" title="Edit Project">
                                <Edit size={15} />
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] md:text-xs text-slate-500 font-medium leading-none mb-2">
                            <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <FileText size={12} />
                                <span>{project.requirementDocs?.length || 0} Drafts</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <File size={12} />
                                <span>{project.documents?.length || 0} Files</span>
                            </div>
                        </div>
                        {project.description && (
                            <p className="text-slate-600 text-xs leading-relaxed max-w-3xl mt-1.5">
                                {project.description}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const badge = tabBadge(tab.key);
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`pb-3 px-1 text-sm font-semibold transition-colors relative flex items-center gap-2 whitespace-nowrap ${
                                active
                                    ? 'text-[var(--accent-700)] before:absolute before:bottom-0 before:left-0 before:w-full before:h-0.5 before:bg-[var(--accent-600)]'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon size={15} className={active ? 'text-[var(--accent-700)]' : 'text-slate-400'} />
                            {tab.label}
                            {badge !== undefined && badge > 0 && (
                                <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-medium ml-0.5">
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'dashboard' && (
                    <DashboardTab
                        project={project}
                        onNewDraft={() => setIsCreateModalOpen(true)}
                        onGoToLibrary={() => handleTabChange('library')}
                        onGoToCollaborators={() => handleTabChange('collaborators')}
                        isEditing={isEditing}
                        editForm={editForm}
                        onEditFormChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
                        onEditClick={handleEditClick}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={() => setIsEditing(false)}
                        indexedStories={indexedStories}
                        totalStories={stories.length}
                    />
                )}
                {activeTab === 'workspace' && (
                    <WorkspaceTab
                        project={project}
                        onNewDraft={() => setIsCreateModalOpen(true)}
                        onDeleteDoc={handleDeleteRequirement}
                    />
                )}
                {activeTab === 'library' && (
                    <LibraryTab
                        project={project}
                        onFilesChanged={refreshProjects}
                    />
                )}
                {activeTab === 'prototype' && (
                    <PrototypeTab project={project} />
                )}
                {activeTab === 'collaborators' && (
                    <CollaboratorsTab projectId={project.id} />
                )}
                {activeTab === 'activity' && (
                    <ActivityTab projectId={project.id} />
                )}
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
                                {TEMPLATES.map((template) => {
                                    const disabled = template.id === 'SRS' || template.id === 'SDS';
                                    return (
                                        <button
                                            key={template.id}
                                            onClick={() => !disabled && handleCreateDocument(template.id)}
                                            disabled={disabled}
                                            className={`w-full flex items-center gap-4 p-3 rounded border text-left group transition-all ${
                                                disabled
                                                    ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                                    : 'border-slate-200 hover:border-[var(--accent-600)] hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded flex items-center justify-center border transition-colors ${
                                                disabled
                                                    ? 'bg-slate-100 text-slate-300 border-slate-100'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-[var(--accent-600)] group-hover:text-white group-hover:border-[var(--accent-600)]'
                                            }`}>
                                                <LayoutTemplate size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`text-sm font-bold ${disabled ? 'text-slate-400' : 'text-slate-900 group-hover:text-black'}`}>{template.name}</h3>
                                                        {disabled && (
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wide">Coming Soon</span>
                                                        )}
                                                    </div>
                                                    {!disabled && <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-900" />}
                                                </div>
                                                <p className={`text-xs mt-0.5 ${disabled ? 'text-slate-400' : 'text-slate-500'}`}>{template.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BRS Sub-Modal */}
            {selectedTemplate === 'BRS' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create BRS Document</h2>
                                <p className="text-xs text-slate-500 mt-1">Choose how to start your Business Requirement Specification.</p>
                            </div>
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <button
                                onClick={async () => {
                                    const poorCoverage = coverageAssessment && coverageAssessment.overallScore < 0.3;
                                    if (ragReadiness === 'none' || poorCoverage) {
                                        const msg = ragReadiness === 'none'
                                            ? 'No files or user stories have been indexed yet. The AI-generated BRS may contain generic placeholder content. Consider uploading and indexing project files first.'
                                            : `Your knowledge base covers only ${Math.round(coverageAssessment!.overallScore * 100)}% of BRS sections. The generated document may have limited content. Consider uploading more relevant project files.`;
                                        const ok = await confirm({
                                            title: ragReadiness === 'none' ? 'No Indexed Content' : 'Low Coverage Warning',
                                            message: msg,
                                            confirmLabel: 'Generate Anyway',
                                            variant: 'danger',
                                        });
                                        if (!ok) return;
                                    }
                                    setSelectedTemplate(null);
                                    setIsCreateModalOpen(false);
                                    navigate(`/editor/${projectId}/BRS?autoGenerate=true`);
                                }}
                                className="w-full flex items-start gap-4 p-4 rounded-lg border-2 bg-[var(--accent-50)] hover:bg-[var(--accent-100)] transition-all text-left group"
                                style={{ borderColor: 'var(--accent-600)' }}
                            >
                                <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center flex-shrink-0 mt-0.5"
                                     style={{ background: 'var(--accent-600)' }}>
                                    <Sparkles size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">Auto-Generate with AI</h3>
                                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                                              style={{ background: 'var(--accent-600)' }}>RECOMMENDED</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        AI will analyse your uploaded project files and automatically generate all BRS sections. This process takes about 2–5 minutes.
                                    </p>
                                </div>
                            </button>

                            {/* Semantic AI Readiness Meter */}
                            <div className="px-4 py-3 rounded border border-slate-200 bg-slate-50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">AI Readiness</span>
                                    {coverageAssessment ? (
                                        <div className="flex items-center gap-2">
                                            {coverageIsStale && (
                                                <span className="text-[10px] text-amber-600 font-medium">Stale</span>
                                            )}
                                            <span className="text-[11px] text-slate-500">
                                                {coverageAssessment.coverageSummary.high + coverageAssessment.coverageSummary.medium}/{coverageAssessment.coverageSummary.totalSections} sections covered
                                            </span>
                                            <button
                                                onClick={runCoverageAssessment}
                                                disabled={coverageAssessing}
                                                className="text-[10px] text-[var(--accent-600)] hover:opacity-80 disabled:opacity-40 flex items-center gap-0.5 transition-opacity"
                                            >
                                                <RefreshCw size={10} className={coverageAssessing ? 'animate-spin' : ''} />
                                                {coverageIsStale ? 'Refresh' : 'Re-run'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-500">
                                                {totalIndexed} material{totalIndexed !== 1 ? 's' : ''} indexed
                                            </span>
                                            <button
                                                onClick={runCoverageAssessment}
                                                disabled={coverageAssessing}
                                                className="text-[10px] text-[var(--accent-600)] hover:opacity-80 disabled:opacity-40 flex items-center gap-0.5 transition-opacity"
                                            >
                                                <RefreshCw size={10} className={coverageAssessing ? 'animate-spin' : ''} />
                                                {coverageAssessing ? 'Checking...' : 'Check Coverage'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {coverageAssessment ? (
                                    <>
                                        {/* Semantic coverage bar */}
                                        <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    coverageAssessment.overallScore >= 0.66 ? 'bg-emerald-500' :
                                                    coverageAssessment.overallScore >= 0.33 ? 'bg-amber-400' :
                                                    'bg-rose-400'
                                                }`}
                                                style={{ width: `${Math.round(coverageAssessment.overallScore * 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-slate-400">
                                                {Math.round(coverageAssessment.overallScore * 100)}% semantic coverage
                                            </span>
                                            <span className={
                                                coverageAssessment.overallScore >= 0.66 ? 'text-emerald-600 font-bold' :
                                                coverageAssessment.overallScore >= 0.33 ? 'text-amber-600 font-bold' :
                                                'text-rose-500 font-bold'
                                            }>
                                                {coverageAssessment.overallScore >= 0.66 ? 'Good' :
                                                 coverageAssessment.overallScore >= 0.33 ? 'Partial' : 'Low'}
                                            </span>
                                        </div>
                                        {/* Compact section breakdown */}
                                        <CoverageBreakdown sections={coverageAssessment.sections} compact />
                                    </>
                                ) : (
                                    <>
                                        {/* Legacy count-based bar (fallback when no assessment yet) */}
                                        <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    totalIndexed === 0 ? 'bg-rose-400' :
                                                    totalIndexed < 5 ? 'bg-amber-400' :
                                                    'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min((totalIndexed / 5) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-slate-400">
                                                {indexedFiles} file{indexedFiles !== 1 ? 's' : ''} · {indexedStories} user stor{indexedStories !== 1 ? 'ies' : 'y'} indexed
                                            </span>
                                            <span className={totalIndexed >= 5 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                                                {totalIndexed >= 5 ? 'Ready' : 'Need more'}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTemplate(null);
                                    setIsCreateModalOpen(false);
                                    navigate(`/editor/${projectId}/BRS`);
                                }}
                                className="w-full flex items-start gap-4 p-4 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-slate-200">
                                    <FileEdit size={18} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-black">Start from Blank Template</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Open a blank BRS template and fill in the content manually, or use the AI panel to generate specific sections.
                                    </p>
                                </div>
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {dialog}
            {notificationBanner}
        </div>
    );
}
