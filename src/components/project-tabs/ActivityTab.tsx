import { useState, useRef, useEffect } from 'react';
import {
    Loader2, Activity, Filter, Sparkles, MessageSquare,
    UserPlus, UserMinus, FileText, Upload, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useActivityLog, type ActivityEntry } from '../../hooks/useActivityLog';

// ─── Types ──────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'ai' | 'comments' | 'members' | 'documents';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All Activity' },
    { key: 'ai', label: 'AI' },
    { key: 'comments', label: 'Comments' },
    { key: 'members', label: 'Members' },
    { key: 'documents', label: 'Documents' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesFilter(entry: ActivityEntry, filter: FilterKey): boolean {
    if (filter === 'all') return true;
    if (filter === 'ai') return entry.action.startsWith('section_') || entry.action === 'doc_created';
    if (filter === 'comments') return entry.action.startsWith('comment_');
    if (filter === 'members') return entry.action.startsWith('member_');
    if (filter === 'documents') return entry.action === 'doc_restored' || entry.action === 'doc_created' || entry.action.startsWith('file_');
    return true;
}

function describeAction(entry: ActivityEntry, count?: number): string {
    const d = entry.details;
    const n = count && count > 1 ? ` (×${count})` : '';
    switch (entry.action) {
        case 'doc_created':
            return `created document "${d.docTitle ?? 'Untitled'}" (${d.docType ?? ''})`;
        case 'doc_restored':
            return `restored document to v${d.fromVersion ?? '?'}`;
        case 'section_generated':
            return count && count > 1
                ? `generated ${count} sections via ${d.source === 'auto_gen' ? 'auto-generate' : 'AI panel'}`
                : `generated "${d.sectionTitle ?? 'section'}" via ${d.source === 'auto_gen' ? 'auto-generate' : 'AI panel'}`;
        case 'section_replaced':
            return `replaced "${d.sectionTitle ?? 'section'}" in document${n}`;
        case 'member_invited':
            return `invited ${d.memberEmail ?? 'user'} as ${d.role ?? 'member'}`;
        case 'member_removed':
            return `removed ${d.memberEmail ?? 'user'}`;
        case 'comment_added':
            return `added a comment${n}`;
        case 'comment_resolved':
            return `resolved a comment${n}`;
        case 'file_uploaded':
            return `uploaded "${d.fileName ?? 'file'}"`;
        case 'file_deleted':
            return `deleted "${d.fileName ?? 'file'}"`;
        default:
            return entry.action.replace(/_/g, ' ');
    }
}

function ActionIcon({ action }: { action: string }) {
    const cls = 'shrink-0';
    if (action.startsWith('section_') || action === 'doc_created') return <Sparkles size={11} className={cls} />;
    if (action === 'comment_added' || action === 'comment_resolved') return <MessageSquare size={11} className={cls} />;
    if (action === 'member_invited') return <UserPlus size={11} className={cls} />;
    if (action === 'member_removed') return <UserMinus size={11} className={cls} />;
    if (action === 'doc_restored') return <FileText size={11} className={cls} />;
    if (action === 'file_uploaded') return <Upload size={11} className={cls} />;
    if (action === 'file_deleted') return <Trash2 size={11} className={cls} />;
    return <Activity size={11} className={cls} />;
}

function actionDotColor(action: string): string {
    if (action.startsWith('section_') || action === 'doc_created') return 'bg-[var(--accent-500)]';
    if (action.startsWith('comment_')) return 'bg-amber-400';
    if (action.startsWith('member_')) return 'bg-emerald-400';
    if (action.startsWith('doc_')) return 'bg-sky-400';
    if (action.startsWith('file_')) return 'bg-slate-400';
    return 'bg-slate-300';
}

function actionIconColor(action: string): string {
    if (action.startsWith('section_') || action === 'doc_created') return 'text-[var(--accent-600)]';
    if (action.startsWith('comment_')) return 'text-amber-500';
    if (action.startsWith('member_')) return 'text-emerald-600';
    if (action.startsWith('doc_')) return 'text-sky-600';
    if (action.startsWith('file_')) return 'text-slate-500';
    return 'text-slate-400';
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function dayLabel(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ─── Collapse consecutive same-user same-action-prefix entries ───────────────

interface EntryGroup {
    entries: ActivityEntry[];
    label: string;
    collapsed: boolean; // whether detail list is hidden (starts true if >1)
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    projectId: string;
}

export default function ActivityTab({ projectId }: Props) {
    const { entries, loading } = useActivityLog(projectId);
    const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(['all']));
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Track expand/collapse per group key (first entry id)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Close filter dropdown on outside click
    useEffect(() => {
        if (!filterOpen) return;
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node))
                setFilterOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [filterOpen]);

    const toggleFilter = (key: FilterKey) => {
        setActiveFilters(prev => {
            const next = new Set(prev);
            if (key === 'all') return new Set(['all']);
            next.delete('all');
            if (next.has(key)) {
                next.delete(key);
                if (next.size === 0) return new Set(['all']);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const isFiltered = !activeFilters.has('all');
    const activeFilterCount = isFiltered ? activeFilters.size : 0;

    const filtered = entries.filter(e =>
        activeFilters.has('all') || [...activeFilters].some(f => matchesFilter(e, f))
    );

    // Group by day
    const dayGroups: { label: string; groups: EntryGroup[] }[] = [];
    for (const entry of filtered) {
        const label = dayLabel(entry.createdAt);
        const last = dayGroups[dayGroups.length - 1];
        if (last && last.label === label) {
            // add to existing day
            const consecutiveGroups = last.groups;
            const prefix = entry.action.split('_')[0];
            const lastGroup = consecutiveGroups[consecutiveGroups.length - 1];
            if (
                lastGroup &&
                lastGroup.entries[0].userId === entry.userId &&
                lastGroup.entries[0].action.split('_')[0] === prefix
            ) {
                lastGroup.entries.push(entry);
                lastGroup.label = describeAction(entry, lastGroup.entries.length);
                lastGroup.collapsed = true;
            } else {
                consecutiveGroups.push({ entries: [entry], label: describeAction(entry), collapsed: false });
            }
        } else {
            dayGroups.push({ label, groups: [{ entries: [entry], label: describeAction(entry), collapsed: false }] });
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Activity</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Recent actions by you and your collaborators</p>
                </div>

                {/* Filter button */}
                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setFilterOpen(v => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                            isFiltered
                                ? 'bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-200)]'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <Filter size={11} />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-[var(--accent-600)] text-white text-[9px] flex items-center justify-center font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    {filterOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 w-44 py-1">
                            {FILTERS.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => toggleFilter(f.key)}
                                    className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] transition-colors ${
                                        activeFilters.has(f.key)
                                            ? 'bg-[var(--accent-50)] text-[var(--accent-700)] font-bold'
                                            : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {f.label}
                                    {activeFilters.has(f.key) && (
                                        <span className="w-3 h-3 rounded-full bg-[var(--accent-600)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded flex flex-col items-center justify-center py-12 text-center bg-white">
                    <Activity size={24} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No activity yet</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                        Actions like generating sections, inviting members, and commenting will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {dayGroups.map((day) => (
                        <div key={day.label}>
                            {/* Day header */}
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                                {day.label}
                            </div>

                            {/* Timeline */}
                            <div className="relative pl-5 border-l-2 border-slate-200 space-y-0">
                                {day.groups.map((group) => {
                                    const key = group.entries[0].id;
                                    const isExpanded = expandedGroups.has(key);
                                    const isCollapsible = group.entries.length > 1;
                                    const entry = group.entries[0];

                                    return (
                                        <div key={key} className="relative py-1.5">
                                            {/* Timeline dot */}
                                            <div className={`absolute -left-[1.625rem] top-[1.1rem] w-2.5 h-2.5 rounded-full border-2 border-white flex items-center justify-center ${actionDotColor(entry.action)}`}>
                                                <div className={`${actionIconColor(entry.action)}`} style={{ transform: 'scale(0.7)' }}>
                                                    <ActionIcon action={entry.action} />
                                                </div>
                                            </div>

                                            {/* Entry row */}
                                            <div className="flex items-start justify-between gap-2 min-w-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] text-slate-800 leading-snug">
                                                        <span className="font-bold">{entry.userName}</span>
                                                        {' '}
                                                        <span className="text-slate-600">{group.label}</span>
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] text-slate-400">{timeAgo(entry.createdAt)}</span>
                                                    {isCollapsible && (
                                                        <button
                                                            onClick={() => setExpandedGroups(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(key)) next.delete(key);
                                                                else next.add(key);
                                                                return next;
                                                            })}
                                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            {isExpanded
                                                                ? <ChevronDown size={12} />
                                                                : <ChevronRight size={12} />
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded detail entries */}
                                            {isCollapsible && isExpanded && (
                                                <div className="mt-1 ml-1 space-y-0.5 border-l border-slate-100 pl-3">
                                                    {group.entries.map((e) => (
                                                        <p key={e.id} className="text-[11px] text-slate-500 leading-snug flex items-center justify-between gap-2">
                                                            <span className="truncate">{describeAction(e)}</span>
                                                            <span className="text-[10px] text-slate-300 shrink-0">{timeAgo(e.createdAt)}</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
