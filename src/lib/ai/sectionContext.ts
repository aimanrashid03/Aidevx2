import { DOC_STRUCTURES } from '../../constants/docs'

export interface TableSchema {
    columns: string[]
    exampleData?: string[][]
}

export interface SectionContext {
    instructions: string[]
    expectedFormat: 'text' | 'table' | 'mixed' | 'diagram'
    tableSchemas: TableSchema[]
    parentSection: string | null
    siblingTitles: string[]
    diagramHint: string | null
}

/** Strip numbered prefix — "3.1.2 Feature List" → "Feature List" */
function stripNumberedPrefix(title: string): string {
    return title.replace(/^[\d.]+\s+/, '').trim()
}

/** Normalize for comparison: lowercase, strip numbers, strip special chars */
function normalize(title: string): string {
    return stripNumberedPrefix(title).toLowerCase().replace(/[<>\\]/g, '').trim()
}

/** Simple fuzzy match score — higher = better */
function matchScore(a: string, b: string): number {
    const na = normalize(a)
    const nb = normalize(b)
    if (na === nb) return 3
    if (na.includes(nb) || nb.includes(na)) return 2
    // Partial word overlap
    const wordsA = na.split(/\s+/)
    const wordsB = nb.split(/\s+/)
    const overlap = wordsA.filter(w => wordsB.includes(w) && w.length > 2).length
    return overlap > 0 ? 1 : 0
}

/** Infer expected format from content entries */
function inferFormat(content: Record<string, unknown>[], diagramHint: string | null): 'text' | 'table' | 'mixed' | 'diagram' {
    if (diagramHint) return 'diagram'
    const hasTable = content.some(c => c.type === 'table')
    const hasText = content.some(c => c.type === 'text')
    if (hasTable && hasText) return 'mixed'
    if (hasTable) return 'table'
    return 'text'
}

/** Extract diagram hint from text content */
function extractDiagramHint(content: Record<string, unknown>[]): string | null {
    for (const c of content) {
        if (c.type === 'text' && typeof c.data === 'string') {
            const text = c.data.toLowerCase()
            if (text.includes('mermaid') || text.includes('```')) return 'mermaid flowchart'
            if (text.includes('diagram') && text.includes('process')) return 'business process diagram'
            if (text.includes('diagram')) return 'diagram'
        }
    }
    return null
}

/** Extract table schemas from content entries */
function extractTableSchemas(content: Record<string, unknown>[]): TableSchema[] {
    return content
        .filter(c => c.type === 'table')
        .map(c => ({
            columns: (c.columns as string[]) ?? [],
            exampleData: (c.data as string[][] | undefined) ?? undefined,
        }))
        .filter(s => s.columns.length > 0)
}

/**
 * Get template context for a given section title in a given doc type.
 * Returns null if no matching section found.
 */
export function getSectionContext(docType: string, sectionTitle: string): SectionContext | null {
    const structure = DOC_STRUCTURES[docType]
    if (!structure || structure.length === 0) return null

    const sections = structure

    // Find best-matching section
    let bestIdx = -1
    let bestScore = 0
    sections.forEach((section, idx) => {
        const score = matchScore(section.title, sectionTitle)
        if (score > bestScore) {
            bestScore = score
            bestIdx = idx
        }
    })

    if (bestIdx < 0 || bestScore === 0) return null

    const section = sections[bestIdx]

    // Find parent section (nearest H1 above)
    let parentSection: string | null = null
    for (let i = bestIdx - 1; i >= 0; i--) {
        if (sections[i].level < section.level) {
            parentSection = sections[i].title
            break
        }
        if (sections[i].level === 1 && section.level > 1) {
            parentSection = sections[i].title
            break
        }
    }

    // Collect sibling titles (same level, nearby)
    const siblingTitles = sections
        .filter((s, i) => i !== bestIdx && s.level === section.level)
        .slice(0, 6)
        .map(s => s.title)

    const diagramHint = extractDiagramHint(section.content)
    const tableSchemas = extractTableSchemas(section.content)
    const expectedFormat = inferFormat(section.content, diagramHint)

    return {
        instructions: section.instructions,
        expectedFormat,
        tableSchemas,
        parentSection,
        siblingTitles,
        diagramHint,
    }
}
