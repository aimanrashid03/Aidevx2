import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, File, Users, Plus, Upload, BookOpen, UserPlus,
    Clock, FileCheck, AlertCircle, CheckCircle2, Circle,
    Calendar, Edit, Check, X, Crown, LibraryBig, RefreshCw,
    AlertTriangle, LayoutList
} from 'lucide-react';
import type { Project } from '../../context/ProjectContext';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useDiagramNotes } from '../../hooks/useDiagramNotes';
import { useCoverageAssessment } from '../../hooks/useCoverageAssessment';
import CoverageBreakdown from '../CoverageBreakdown';
import EmbeddingStatusBadge from '../EmbeddingStatusBadge';

interface Props {
    project: Project;
    onNewDraft: () => void;
    onGoToLibrary: () => void;
    onGoToCollaborators: () => void;
    isEditing: boolean;
    editForm: { name: string; description: string; notes: string };
    onEditFormChange: (field: 'notes', value: string) => void;
    onEditClick: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    indexedStories: number;
    totalStories: number;
}

const getDocumentStatus = (lastModified: string) => {
    const daysSinceMod = (new Date().getTime() - new Date(lastModified).getTime()) / (1000 * 3600 * 24);
    if (daysSinceMod < 1) return { label: 'Active Draft', icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (daysSinceMod > 7) return { label: 'Ready for Review', icon: FileCheck, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return { label: 'Needs Attention', icon: AlertCircle, color: 'text-rose-700 bg-rose-50 border-rose-200' };
};

const DOC_TYPE_COLORS: Record<string, string> = {
    BRS: 'bg-blue-50 text-blue-700 border-blue-200',
    URS: 'bg-violet-50 text-violet-700 border-violet-200',
    SRS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SDS: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface HealthItem {
    label: string;
    done: boolean;
}

export default function DashboardTab({
    project,
    onNewDraft,
    onGoToLibrary,
    onGoToCollaborators,
    isEditing,
    editForm,
    onEditFormChange,
    onEditClick,
    onSaveEdit,
    onCancelEdit,
    indexedStories,
    totalStories,
}: Props) {
    const navigate = useNavigate();
    const { members } = useProjectMembers(project.id);
    const { notes: diagramNotes } = useDiagramNotes(project.id);
    const [coverageModalOpen, setCoverageModalOpen] = useState(false);

    const docCount = project.requirementDocs?.length || 0;
    const fileCount = project.documents?.length || 0;
    const memberCount = project.memberCount || 0;

    const indexedFiles = project.documents?.filter(d => d.embeddingStatus === 'processed').length || 0;
    const diagramCount = diagramNotes.length;

    // Current chunk count (files + stories) for staleness detection
    const currentChunkCount = indexedFiles + indexedStories;

    const { assessment, loading: coverageLoading, assessing, assessmentError, isStale, runAssessment } =
        useCoverageAssessment(project.id, 'BRS', currentChunkCount);

    const owner = members.find(m => m.role === 'owner');
    const collaborators = members.filter(m => m.role !== 'owner');

    const docsByType = (project.requirementDocs || []).reduce<Record<string, number>>((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
    }, {});

    const healthItems: HealthItem[] = [
        { label: 'Requirement documents created', done: docCount > 0 },
        { label: 'Reference files uploaded', done: fileCount > 0 },
        { label: 'Files indexed for AI', done: indexedFiles > 0 },
        { label: 'Collaborators invited', done: memberCount > 1 },
    ];
    const checklistScore = healthItems.filter(h => h.done).length / 4;
    // Blend checklist (40%) + semantic coverage (60%) when assessment exists
    const blendedScore = assessment
        ? Math.round((checklistScore * 0.4 + assessment.overallScore * 0.6) * 100)
        : Math.round(checklistScore * 100);

    // Recent activity: combine docs + files sorted by date
    type ActivityItem = { label: string; date: string; type: 'doc' | 'file'; id?: string };
    const activity: ActivityItem[] = [
        ...(project.requirementDocs || []).map(d => ({
            label: d.title,
            date: d.lastModified,
            type: 'doc' as const,
            id: d.id,
        })),
        ...(project.documents || []).map(f => ({
            label: f.name,
            date: '',
            type: 'file' as const,
        })),
    ]
        .filter(a => a.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-5">
            {/* Row 1: Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Documents stat */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-500">
                            <FileText size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Documents</p>
                            <p className="text-xl font-extrabold text-slate-900 leading-none">{docCount}</p>
                        </div>
                    </div>
                    {docCount > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(docsByType).map(([type, count]) => (
                                <span key={type} className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${DOC_TYPE_COLORS[type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    {count} {type}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Library stat */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-500">
                            <LibraryBig size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Library</p>
                            <p className="text-xl font-extrabold text-slate-900 leading-none">{fileCount + totalStories + diagramCount}</p>
                        </div>
                    </div>
                    <div className="space-y-0.5 text-[11px] text-slate-500">
                        <div>
                            <span className="font-bold text-emerald-600">{indexedFiles}</span>/{fileCount} file{fileCount !== 1 ? 's' : ''} indexed
                        </div>
                        <div>
                            <span className="font-bold text-emerald-600">{indexedStories}</span>/{totalStories} user stor{totalStories !== 1 ? 'ies' : 'y'} indexed
                        </div>
                        <div>
                            <span className="font-bold text-slate-600">{diagramCount}</span> diagram note{diagramCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* Collaborators stat */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-500">
                            <Users size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Collaborators</p>
                            <p className="text-xl font-extrabold text-slate-900 leading-none">{memberCount}</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-[11px]">
                        {owner && (
                            <div className="flex items-center gap-1.5">
                                <Crown size={10} className="text-amber-500 shrink-0" />
                                <span className="font-bold text-slate-700 truncate">{owner.fullName || owner.email}</span>
                                <span className="text-slate-400 shrink-0">Owner</span>
                            </div>
                        )}
                        {collaborators.slice(0, 2).map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 text-slate-500">
                                <div className="w-2 h-2 rounded-full bg-slate-200 shrink-0" />
                                <span className="truncate">{m.fullName || m.email}</span>
                                <span className={`ml-auto shrink-0 capitalize px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    m.role === 'editor' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>{m.role}</span>
                            </div>
                        ))}
                        {collaborators.length > 2 && (
                            <span className="text-slate-400">+{collaborators.length - 2} more</span>
                        )}
                        {collaborators.length === 0 && !owner && (
                            <span className="text-slate-400">No members yet</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Documents + Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Documents */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Requirement Documents</h3>
                        <button
                            onClick={onNewDraft}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                        >
                            <Plus size={11} /> New Draft
                        </button>
                    </div>
                    {(project.requirementDocs || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                            <FileText size={24} className="text-slate-200 mb-2" />
                            <p className="text-xs font-bold text-slate-400 mb-1">No documents yet</p>
                            <button
                                onClick={onNewDraft}
                                className="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                            >
                                Create First Draft
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {(project.requirementDocs || []).slice(0, 5).map(doc => {
                                const status = getDocumentStatus(doc.lastModified);
                                const StatusIcon = status.icon;
                                return (
                                    <div
                                        key={doc.id}
                                        onClick={() => navigate(`/editor/${project.id}/${doc.id}`)}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                                    >
                                        <div className="w-7 h-7 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-[var(--accent-600)] group-hover:text-white group-hover:border-[var(--accent-600)] transition-colors">
                                            <FileText size={13} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate group-hover:underline">{doc.title}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Calendar size={9} className="text-slate-400" />
                                                <span className="text-[10px] text-slate-400">{new Date(doc.lastModified).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium flex items-center gap-1 ${status.color}`}>
                                                <StatusIcon size={10} />
                                                {status.label}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${DOC_TYPE_COLORS[doc.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {doc.type}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {(project.requirementDocs?.length || 0) > 5 && (
                                <div className="px-3 py-2 text-center">
                                    <span className="text-[11px] text-slate-400">+ {(project.requirementDocs?.length || 0) - 5} more</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Project Health */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Project Health</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                blendedScore >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                blendedScore >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                'text-rose-700 bg-rose-50 border-rose-200'
                            }`}>
                                {blendedScore}%
                            </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded overflow-hidden">
                            <div
                                className={`h-full rounded transition-all ${blendedScore >= 80 ? 'bg-emerald-500' : blendedScore >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${blendedScore}%` }}
                            />
                        </div>
                    </div>
                    {/* Checklist */}
                    <div className="divide-y divide-slate-100">
                        {healthItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                                {item.done ? (
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                ) : (
                                    <Circle size={14} className="text-slate-300 shrink-0" />
                                )}
                                <span className={`text-xs ${item.done ? 'text-slate-700' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* AI Coverage section */}
                    <div className="border-t border-slate-100">
                        <div className="px-3 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Coverage (BRS)</span>
                                {isStale && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                                        <AlertTriangle size={10} /> Stale
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5">
                                {assessment && (
                                    <button
                                        onClick={() => setCoverageModalOpen(true)}
                                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border border-[var(--accent-200)] bg-[var(--accent-50)] text-[var(--accent-700)] hover:bg-[var(--accent-100)] transition-colors"
                                    >
                                        <LayoutList size={11} />
                                        View Details
                                    </button>
                                )}
                                <button
                                    onClick={runAssessment}
                                    disabled={assessing || coverageLoading}
                                    className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-600)] hover:opacity-80 disabled:opacity-40 transition-opacity"
                                >
                                    <RefreshCw size={10} className={assessing ? 'animate-spin' : ''} />
                                    {assessment ? (isStale ? 'Refresh' : 'Re-run') : 'Run Assessment'}
                                </button>
                            </div>
                        </div>

                        {/* Summary or loading state */}
                        {!assessment && !assessing && !coverageLoading && (
                            <p className="px-3 pb-3 text-[10px] text-slate-400">
                                Run an assessment to see which BRS sections your documents cover.
                            </p>
                        )}
                        {assessing && (
                            <p className="px-3 pb-3 text-[10px] text-slate-500 animate-pulse">
                                Analysing your knowledge base...
                            </p>
                        )}
                        {assessment && !assessing && (
                            <div className="px-3 pb-3 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                    <span>
                                        <span className={`font-bold ${
                                            assessment.overallScore >= 0.66 ? 'text-emerald-600' :
                                            assessment.overallScore >= 0.33 ? 'text-amber-600' :
                                            'text-rose-500'
                                        }`}>
                                            {Math.round(assessment.overallScore * 100)}%
                                        </span>
                                        {' '}overall coverage
                                    </span>
                                    <span>
                                        {assessment.coverageSummary.high + assessment.coverageSummary.medium}/{assessment.coverageSummary.totalSections} sections
                                    </span>
                                </div>
                                <CoverageBreakdown sections={assessment.sections} compact />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={onNewDraft}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                        <Plus size={13} /> New Draft
                    </button>
                    <button
                        onClick={onGoToLibrary}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                        <Upload size={13} /> Upload Files
                    </button>
                    <button
                        onClick={onGoToLibrary}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                        <BookOpen size={13} /> Fill User Stories
                    </button>
                    <button
                        onClick={onGoToCollaborators}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                        <UserPlus size={13} /> Invite Collaborator
                    </button>
                </div>
            </div>

            {/* Internal Notes */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Internal Notes</h3>
                        <EmbeddingStatusBadge status={project.notes_embedding_status ?? 'pending'} />
                    </div>
                    {!isEditing && (
                        <button
                            onClick={onEditClick}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                        >
                            <Edit size={11} /> Edit
                        </button>
                    )}
                </div>
                <div className="p-4">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editForm.notes}
                                onChange={(e) => onEditFormChange('notes', e.target.value)}
                                className="w-full h-24 border border-slate-300 rounded-lg p-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 resize-none"
                                placeholder="Enter internal project notes..."
                            />
                            <div className="flex gap-2">
                                <button onClick={onSaveEdit} className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition-colors">
                                    <Check size={12} /> Save
                                </button>
                                <button onClick={onCancelEdit} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-slate-200 transition-colors">
                                    <X size={12} /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : project.notes ? (
                        <div className="text-slate-700 whitespace-pre-wrap text-[13px] leading-relaxed">{project.notes}</div>
                    ) : (
                        <p className="text-slate-400 italic text-[13px]">No internal notes. Click Edit to add some.</p>
                    )}
                </div>
            </div>

            {/* AI Coverage Modal */}
            {coverageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
                        {/* Modal header */}
                        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">AI Coverage — BRS</h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">Section-by-section knowledge base coverage</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                                <button
                                    onClick={runAssessment}
                                    disabled={assessing}
                                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded border border-[var(--accent-200)] text-[var(--accent-700)] bg-[var(--accent-50)] hover:bg-[var(--accent-100)] disabled:opacity-40 transition-colors"
                                >
                                    <RefreshCw size={12} className={assessing ? 'animate-spin' : ''} />
                                    {assessing ? 'Running…' : assessment ? (isStale ? 'Refresh' : 'Re-run') : 'Run Assessment'}
                                </button>
                                <button
                                    onClick={() => setCoverageModalOpen(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Score summary bar */}
                        {assessment && !assessing && (
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 shrink-0 flex items-center gap-6">
                                <div className="shrink-0">
                                    <span className={`text-2xl font-extrabold leading-none ${
                                        assessment.overallScore >= 0.66 ? 'text-emerald-600' :
                                        assessment.overallScore >= 0.33 ? 'text-amber-600' :
                                        'text-rose-500'
                                    }`}>{Math.round(assessment.overallScore * 100)}%</span>
                                    <span className="text-[11px] text-slate-400 ml-1.5">overall</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CoverageBreakdown sections={assessment.sections} compact />
                                </div>
                            </div>
                        )}

                        {/* Section breakdown */}
                        <div className="overflow-y-auto flex-1">
                            {assessmentError && (
                                <div className="mx-5 mt-4 px-3 py-2.5 rounded border border-rose-200 bg-rose-50 text-xs text-rose-700 flex items-start gap-2">
                                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                    <span><span className="font-bold">Assessment failed:</span> {assessmentError}</span>
                                </div>
                            )}
                            {assessing && (
                                <p className="px-5 py-6 text-sm text-slate-500 animate-pulse text-center">
                                    Analysing your knowledge base…
                                </p>
                            )}
                            {!assessment && !assessing && !assessmentError && (
                                <p className="px-5 py-6 text-sm text-slate-400 text-center">
                                    Run an assessment to see which BRS sections your documents cover.
                                </p>
                            )}
                            {assessment && !assessing && (
                                <CoverageBreakdown sections={assessment.sections} initialExpandAll />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {activity.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Recent Activity</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {activity.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                                <div className="w-6 h-6 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                    {item.type === 'doc' ? <FileText size={12} /> : <File size={12} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-700 truncate font-medium">{item.label}</p>
                                </div>
                                {item.date && (
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                        {new Date(item.date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
