import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, CircleDashed, Loader2, MessageSquare, RefreshCw, Sparkles } from 'lucide-react'
import type { DocHeading } from '../../lib/onlyoffice/extractSections'

interface SectionTOCProps {
    /** Headings parsed from the DOCX via extractSectionsFromDocx() */
    sections: DocHeading[]
    sectionStatuses: Record<string, 'drafting' | 'complete'>
    commentCounts: Record<string, number>
    onToggleStatus: (sectionId: string) => void
    onAutoGen?: (sectionId: string, sectionTitle: string) => void
    generatingSectionId?: string | null
    /** Called when the user clicks the manual refresh button */
    onRefresh?: () => void
}

/**
 * Left sidebar TOC driven by a flat list of DocHeading objects extracted from
 * the active DOCX file. Supports collapse/expand of H1 sections.
 */
export default function SectionTOC({
    sections,
    sectionStatuses,
    commentCounts,
    onToggleStatus,
    onAutoGen,
    generatingSectionId,
    onRefresh,
}: SectionTOCProps) {
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

    const toggleCollapse = (sectionId: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev)
            if (next.has(sectionId)) next.delete(sectionId)
            else next.add(sectionId)
            return next
        })
    }

    // Filter out H2/H3 entries whose parent H1 is collapsed
    const visibleSections = sections.filter((section, idx) => {
        if (section.level === 1) return true
        for (let i = idx - 1; i >= 0; i--) {
            if (sections[i].level === 1) {
                return !collapsedSections.has(sections[i].sectionId)
            }
        }
        return true
    })

    const getStatusIcon = (sectionId: string) => {
        const status = sectionStatuses[sectionId]
        if (status === 'complete') return <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
        if (status === 'drafting') return <CircleDashed size={11} className="text-amber-400 shrink-0" />
        return null
    }

    return (
        <nav className="flex flex-col h-full overflow-hidden">
            {/* Header row with refresh button */}
            <div className="flex items-center justify-between px-3 py-2 shrink-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Sections
                </p>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        title="Refresh section list"
                        className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <RefreshCw size={10} />
                    </button>
                )}
            </div>

            <div className="overflow-y-auto flex-1 pb-6">
                {sections.length === 0 && (
                    <p className="px-3 text-[11px] text-slate-400 italic">No headings found</p>
                )}
                {visibleSections.map(section => {
                    const commentCount = commentCounts[section.sectionId] ?? 0
                    const indent = (section.level - 1) * 10
                    const status = sectionStatuses[section.sectionId]
                    const isCollapsed = collapsedSections.has(section.sectionId)

                    return (
                        <div
                            key={section.sectionId}
                            style={{ paddingLeft: `${4 + indent}px` }}
                            className="w-full flex items-center gap-0.5 pr-1.5 hover:bg-slate-100 rounded group"
                        >
                            {/* Collapse/expand chevron for H1 sections */}
                            {section.level === 1 ? (
                                <button
                                    onClick={e => { e.stopPropagation(); toggleCollapse(section.sectionId) }}
                                    className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                                    title={isCollapsed ? 'Expand section' : 'Collapse section'}
                                >
                                    {isCollapsed
                                        ? <ChevronRight size={10} />
                                        : <ChevronDown size={10} />}
                                </button>
                            ) : (
                                <span className="shrink-0 w-[14px]" />
                            )}

                            {/* Section title — informational only (OO iframe manages scroll) */}
                            <span
                                title={section.title}
                                className="flex-1 min-w-0 py-1 text-[11px] text-slate-600 truncate select-none"
                            >
                                {section.title}
                            </span>

                            {/* AI generate button */}
                            {onAutoGen && (
                                generatingSectionId === section.sectionId ? (
                                    <span className="shrink-0 p-0.5 text-violet-400">
                                        <Loader2 size={10} className="animate-spin" />
                                    </span>
                                ) : (
                                    <button
                                        onClick={e => {
                                            e.stopPropagation()
                                            onAutoGen(section.sectionId, section.title)
                                        }}
                                        disabled={!!generatingSectionId}
                                        title={`Generate "${section.title}" with AI`}
                                        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-violet-100 text-violet-300 hover:text-violet-600 transition-all disabled:cursor-not-allowed"
                                    >
                                        <Sparkles size={10} />
                                    </button>
                                )
                            )}

                            {/* Status toggle — cycles: none → drafting → complete → none */}
                            <button
                                onClick={e => { e.stopPropagation(); onToggleStatus(section.sectionId) }}
                                title={`Status: ${status ?? 'none'} — click to cycle`}
                                className="shrink-0 p-0.5 rounded hover:bg-slate-100 transition-colors"
                            >
                                {getStatusIcon(section.sectionId) ?? (
                                    <span className="block w-[11px] h-[11px] rounded-full border border-slate-200 opacity-0 group-hover:opacity-60 transition-opacity" />
                                )}
                            </button>

                            {/* Comment count badge */}
                            {commentCount > 0 && (
                                <span className="flex items-center gap-0.5 text-slate-400 shrink-0">
                                    <MessageSquare size={10} />
                                    <span className="text-[10px]">{commentCount}</span>
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
        </nav>
    )
}
