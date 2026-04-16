import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SectionCoverage } from '../hooks/useCoverageAssessment'

interface Props {
    sections: SectionCoverage[]
    loading?: boolean
    compact?: boolean
    initialExpandAll?: boolean
}

const QUALITY_CONFIG = {
    high: {
        label: 'High',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    medium: {
        label: 'Medium',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-400',
    },
    low: {
        label: 'Low',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-400',
    },
    none: {
        label: 'No Data',
        badge: 'bg-slate-50 text-slate-400 border-slate-200',
        dot: 'bg-slate-300',
    },
} as const

/** Extract the top-level number prefix from a section title (e.g. "1.1 X" → "1.0"). */
function getGroupKey(title: string): string {
    const match = title.match(/^(\d+)\./)
    if (match) return `${match[1]}.0`
    return title
}

export default function CoverageBreakdown({ sections, loading = false, compact = false, initialExpandAll = false }: Props) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
        initialExpandAll
            ? new Set(sections.map(s => getGroupKey(s.title)))
            : new Set()
    )

    if (loading) {
        return (
            <div className="space-y-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
                ))}
            </div>
        )
    }

    if (sections.length === 0) {
        return (
            <p className="text-xs text-slate-400 py-2 text-center">
                No assessment data. Run an assessment to see coverage.
            </p>
        )
    }

    // ── Compact mode: just a stacked quality bar ──────────────────────────
    if (compact) {
        const total = sections.length
        const high = sections.filter(s => s.quality === 'high').length
        const medium = sections.filter(s => s.quality === 'medium').length
        const low = sections.filter(s => s.quality === 'low').length
        const none = sections.filter(s => s.quality === 'none').length

        return (
            <div className="space-y-2">
                {/* Stacked bar */}
                <div className="flex h-2 rounded-full overflow-hidden gap-px bg-slate-200">
                    {high > 0 && (
                        <div className="bg-emerald-500 transition-all" style={{ width: `${(high / total) * 100}%` }} />
                    )}
                    {medium > 0 && (
                        <div className="bg-amber-400 transition-all" style={{ width: `${(medium / total) * 100}%` }} />
                    )}
                    {low > 0 && (
                        <div className="bg-rose-400 transition-all" style={{ width: `${(low / total) * 100}%` }} />
                    )}
                    {none > 0 && (
                        <div className="bg-slate-200 transition-all" style={{ width: `${(none / total) * 100}%` }} />
                    )}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                    {high > 0 && <span><span className="font-bold text-emerald-600">{high}</span> high</span>}
                    {medium > 0 && <span><span className="font-bold text-amber-600">{medium}</span> medium</span>}
                    {low > 0 && <span><span className="font-bold text-rose-500">{low}</span> low</span>}
                    {none > 0 && <span><span className="font-bold text-slate-400">{none}</span> no data</span>}
                    <span className="ml-auto">{total} sections</span>
                </div>
            </div>
        )
    }

    // ── Full mode: grouped collapsible table ─────────────────────────────

    // Group sections by top-level parent
    type Group = { key: string; label: string; sections: SectionCoverage[] }
    const groupMap = new Map<string, Group>()
    for (const s of sections) {
        const key = getGroupKey(s.title)
        if (!groupMap.has(key)) {
            groupMap.set(key, { key, label: key, sections: [] })
        }
        groupMap.get(key)!.sections.push(s)
    }
    const groups = [...groupMap.values()]

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    return (
        <div className="divide-y divide-slate-100">
            {groups.map(group => {
                const isExpanded = expandedGroups.has(group.key)
                const groupHigh = group.sections.filter(s => s.quality === 'high').length
                const groupTotal = group.sections.length

                return (
                    <div key={group.key}>
                        {/* Group header */}
                        <button
                            onClick={() => toggleGroup(group.key)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                        >
                            {isExpanded
                                ? <ChevronDown size={13} className="text-slate-400 shrink-0" />
                                : <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            }
                            <span className="text-xs font-bold text-slate-700 flex-1">
                                Section {group.key}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {groupHigh}/{groupTotal} high coverage
                            </span>
                        </button>

                        {/* Section rows */}
                        {isExpanded && (
                            <div className="bg-slate-50/60">
                                {group.sections.map(s => {
                                    const cfg = QUALITY_CONFIG[s.quality]
                                    return (
                                        <div
                                            key={s.title}
                                            className="flex items-center gap-2 px-4 py-1.5 border-t border-slate-100 first:border-t-0"
                                        >
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                            <span
                                                className="text-[11px] text-slate-600 flex-1 truncate"
                                                title={s.title}
                                            >
                                                {s.title}
                                            </span>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${cfg.badge}`}>
                                                {cfg.label}
                                            </span>
                                            {s.chunkCount > 0 && (
                                                <span className="text-[10px] text-slate-400 shrink-0 w-12 text-right">
                                                    {s.chunkCount} chunk{s.chunkCount !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
