import { useState } from 'react';
import { Loader2, Activity, Filter } from 'lucide-react';
import { useActivityLog, type ActivityEntry } from '../../hooks/useActivityLog';

type FilterKey = 'all' | 'ai' | 'comments' | 'members' | 'documents';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'ai', label: 'AI Activity' },
    { key: 'comments', label: 'Comments' },
    { key: 'members', label: 'Members' },
    { key: 'documents', label: 'Documents' },
];

function matchesFilter(entry: ActivityEntry, filter: FilterKey): boolean {
    if (filter === 'all') return true;
    if (filter === 'ai') return entry.action.startsWith('section_') || entry.action === 'doc_created';
    if (filter === 'comments') return entry.action.startsWith('comment_');
    if (filter === 'members') return entry.action.startsWith('member_');
    if (filter === 'documents') return entry.action === 'doc_restored' || entry.action === 'doc_created';
    return true;
}

function describeAction(entry: ActivityEntry): string {
    const d = entry.details;
    switch (entry.action) {
        case 'doc_created':
            return `created document "${d.docTitle ?? 'Untitled'}" (${d.docType ?? ''})`
        case 'doc_restored':
            return `restored document to v${d.fromVersion ?? '?'}`
        case 'section_generated':
            return `generated "${d.sectionTitle ?? 'section'}" via ${d.source === 'auto_gen' ? 'auto-generate' : 'AI panel'}`
        case 'section_replaced':
            return `replaced "${d.sectionTitle ?? 'section'}" in document`
        case 'member_invited':
            return `invited ${d.memberEmail ?? 'user'} as ${d.role ?? 'member'}`
        case 'member_removed':
            return `removed ${d.memberEmail ?? 'user'}`
        case 'comment_added':
            return `added a comment`
        case 'comment_resolved':
            return `resolved a comment`
        case 'file_uploaded':
            return `uploaded "${d.fileName ?? 'file'}"`
        case 'file_deleted':
            return `deleted "${d.fileName ?? 'file'}"`
        default:
            return entry.action.replace(/_/g, ' ')
    }
}

function actionIcon(action: string): string {
    if (action.startsWith('section_') || action === 'doc_created') return 'AI'
    if (action.startsWith('comment_')) return 'CO'
    if (action.startsWith('member_')) return 'ME'
    if (action.startsWith('doc_')) return 'DO'
    if (action.startsWith('file_')) return 'FI'
    return '??'
}

function actionColor(action: string): string {
    if (action.startsWith('section_') || action === 'doc_created')
        return 'bg-[var(--accent-100)] text-[var(--accent-700)]'
    if (action.startsWith('comment_'))
        return 'bg-amber-100 text-amber-700'
    if (action.startsWith('member_'))
        return 'bg-emerald-100 text-emerald-700'
    if (action.startsWith('doc_'))
        return 'bg-sky-100 text-sky-700'
    if (action.startsWith('file_'))
        return 'bg-slate-100 text-slate-600'
    return 'bg-slate-100 text-slate-600'
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
}

function initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

interface Props {
    projectId: string;
}

export default function ActivityTab({ projectId }: Props) {
    const { entries, loading } = useActivityLog(projectId);
    const [filter, setFilter] = useState<FilterKey>('all');

    const filtered = entries.filter(e => matchesFilter(e, filter));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Activity</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Recent actions by you and your collaborators</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                    <Filter size={11} className="text-slate-400" />
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-2 py-1 rounded border font-bold transition-colors ${
                                filter === f.key
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

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
                <div className="space-y-1">
                    {filtered.map(entry => (
                        <div key={entry.id} className="flex items-start gap-3 bg-white border border-slate-100 rounded p-3 hover:border-slate-200 transition-colors">
                            {/* Action type badge */}
                            <span className={`shrink-0 w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold ${actionColor(entry.action)}`}>
                                {actionIcon(entry.action)}
                            </span>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-slate-800 leading-snug">
                                    <span className="font-bold">{entry.userName}</span>
                                    {' '}
                                    {describeAction(entry)}
                                </p>
                            </div>
                            {/* Timestamp + avatar */}
                            <div className="shrink-0 flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">{timeAgo(entry.createdAt)}</span>
                                <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                                    {initials(entry.userName)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
