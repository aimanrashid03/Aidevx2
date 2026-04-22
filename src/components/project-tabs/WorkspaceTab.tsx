import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Clock, FileCheck, AlertCircle, Plus, LayoutTemplate,
    Trash2, Lock, Unlock, GitBranch, ChevronRight, Upload, RefreshCw,
} from 'lucide-react';
import type { Project, RequirementDoc } from '../../context/ProjectContext';
import { useProjects } from '../../context/ProjectContext';
import CreateCRDialog from '../CreateCRDialog';

interface Props {
    project: Project;
    onNewDraft: () => void;
    onImportDoc: () => void;
    onDeleteDoc: (e: React.MouseEvent, id: string) => void;
    onRefresh?: () => void;
}

// ─── Doc type colours ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    BRS: { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200', icon: 'text-violet-400' },
    URS: { bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200',    icon: 'text-sky-400'    },
    SRS: { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  icon: 'text-amber-400'  },
    SDS: { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',icon: 'text-emerald-400' },
};
const fallbackType = { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: 'text-slate-400' };

// ─── Status helper ────────────────────────────────────────────────────────────

function docStatus(lastModified: string) {
    const days = (Date.now() - new Date(lastModified).getTime()) / 86_400_000;
    if (days < 1) return { label: 'Active',      Icon: Clock,       cls: 'text-amber-600 bg-amber-50 border-amber-200'   };
    if (days > 7) return { label: 'For Review',  Icon: FileCheck,   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return            { label: 'Needs Work',   Icon: AlertCircle, cls: 'text-rose-600 bg-rose-50 border-rose-200'       };
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function DocCard({
    doc,
    project,
    onDelete,
    onCreateCR,
    isChild = false,
}: {
    doc: RequirementDoc;
    project: Project;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onCreateCR: (docId: string) => void;
    isChild?: boolean;
}) {
    const navigate = useNavigate();
    const { lockDocument, unlockDocument } = useProjects();
    const tc = TYPE_COLORS[doc.type] ?? fallbackType;
    const { label: statusLabel, Icon: StatusIcon, cls: statusCls } = docStatus(doc.lastModified);
    const updatedDate = new Date(doc.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isOwner = project.userRole === 'owner';
    const canEdit = project.userRole !== 'viewer';

    const handleLockToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (doc.lockedBy) {
            await unlockDocument(doc.id, project.id);
        } else {
            await lockDocument(doc.id, project.id);
        }
    };

    return (
        <div
            onClick={() => navigate(`/editor/${project.id}/${doc.id}`)}
            className={`relative flex flex-col bg-white border rounded-xl cursor-pointer group transition-all hover:shadow-md hover:border-[var(--accent-300)] ${
                isChild
                    ? 'border-[var(--accent-200)] bg-[var(--accent-50)]/20'
                    : doc.lockedBy
                        ? 'border-amber-200'
                        : 'border-slate-200'
            }`}
        >
            {/* Card top: type icon + actions */}
            <div className="flex items-start justify-between px-3 pt-3 pb-2">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${tc.bg} ${tc.border}`}>
                    {isChild
                        ? <GitBranch size={14} className={tc.text} />
                        : <FileText size={14} className={tc.text} />
                    }
                </div>

                {/* Top-right: lock toggle (owner) + delete */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {isOwner && (
                        <button
                            onClick={handleLockToggle}
                            title={doc.lockedBy ? 'Unlock document' : 'Lock document'}
                            className={`p-1.5 rounded-lg transition-colors ${
                                doc.lockedBy
                                    ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100'
                            }`}
                        >
                            {doc.lockedBy ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                    )}
                    <button
                        onClick={(e) => onDelete(e, doc.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Title + badges */}
            <div className="px-3 pb-2 flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-[var(--accent-700)] transition-colors mb-1.5">
                    {doc.title}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                    {/* Type badge */}
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${tc.bg} ${tc.text} ${tc.border}`}>
                        {doc.type}
                    </span>
                    {/* CR badge */}
                    {doc.crNumber != null && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold border border-[var(--accent-200)] bg-[var(--accent-50)] text-[var(--accent-700)]">
                            <GitBranch size={9} />
                            CR-{doc.crNumber}
                        </span>
                    )}
                    {/* Lock badge */}
                    {doc.lockedBy && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-700">
                            <Lock size={9} />
                            Locked
                        </span>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2.5 border-t border-slate-100 flex items-end justify-between gap-2">
                {/* Status + meta */}
                <div className="flex flex-col gap-0.5 min-w-0">
                    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border w-fit ${statusCls}`}>
                        <StatusIcon size={10} />
                        {statusLabel}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                        {doc.lastEditedByName ? `${doc.lastEditedByName} · ` : ''}{updatedDate}
                    </div>
                </div>

                {/* Create CR — always visible for root docs, editors/owners */}
                {!doc.parentDocId && canEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCreateCR(doc.id); }}
                        title="Create Change Request"
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-[var(--accent-600)] bg-[var(--accent-50)] hover:bg-[var(--accent-100)] border border-[var(--accent-200)] rounded-lg transition-colors shrink-0 self-end"
                    >
                        <GitBranch size={10} />
                        CR
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export default function WorkspaceTab({ project, onNewDraft, onImportDoc, onDeleteDoc, onRefresh }: Props) {
    const [crTargetDocId, setCrTargetDocId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
    };

    const rootDocs = project.requirementDocs.filter(d => !d.parentDocId);
    const crDocsByParent: Record<string, RequirementDoc[]> = {};
    for (const doc of project.requirementDocs) {
        if (doc.parentDocId) {
            if (!crDocsByParent[doc.parentDocId]) crDocsByParent[doc.parentDocId] = [];
            crDocsByParent[doc.parentDocId].push(doc);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Requirement Documents</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Structured templates for requirements engineering.</p>
                </div>
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            title="Refresh documents"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    )}
                    <button
                        onClick={onImportDoc}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors text-xs font-bold"
                    >
                        <Upload size={13} />
                        Import
                    </button>
                    <button
                        onClick={onNewDraft}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold"
                    >
                        <Plus size={13} />
                        New Draft
                    </button>
                </div>
            </div>

            {project.requirementDocs && project.requirementDocs.length > 0 ? (
                <div className="space-y-5">
                    {/* All root docs in one 3-column grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rootDocs.map((doc) => (
                            <DocCard
                                key={doc.id}
                                doc={doc}
                                project={project}
                                onDelete={onDeleteDoc}
                                onCreateCR={setCrTargetDocId}
                            />
                        ))}
                    </div>

                    {/* CR children grouped per parent */}
                    {rootDocs.map((doc) => crDocsByParent[doc.id]?.length > 0 && (
                        <div key={`cr-${doc.id}`} className="ml-4 border-l-2 border-[var(--accent-200)] pl-4 space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                <ChevronRight size={10} />
                                Change Requests for <span className="text-slate-500">{doc.title}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {crDocsByParent[doc.id].map((crDoc) => (
                                    <DocCard
                                        key={crDoc.id}
                                        doc={crDoc}
                                        project={project}
                                        onDelete={onDeleteDoc}
                                        onCreateCR={setCrTargetDocId}
                                        isChild
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <LayoutTemplate size={28} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-900 mb-1">No requirement documents</h3>
                    <p className="text-slate-500 text-[12px] mb-4">Start drafting your first structured requirements spec.</p>
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={onImportDoc}
                            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:border-slate-400 hover:bg-white transition-colors"
                        >
                            <span className="flex items-center gap-1.5"><Upload size={13} /> Import Document</span>
                        </button>
                        <button
                            onClick={onNewDraft}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                        >
                            Create New Draft
                        </button>
                    </div>
                </div>
            )}

            {crTargetDocId && (
                <CreateCRDialog
                    projectId={project.id}
                    originalDocId={crTargetDocId}
                    onClose={() => setCrTargetDocId(null)}
                />
            )}
        </div>
    );
}
