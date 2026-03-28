/**
 * Shared prompt construction for section generation.
 * Used by both `generate_section` (HTML output) and `auto_generate_document` (markdown output).
 */

export interface SectionContext {
    instructions?: string[]
    expectedFormat?: 'text' | 'table' | 'mixed' | 'diagram'
    tableSchemas?: { columns: string[]; exampleData?: string[][] }[]
    parentSection?: string | null
    siblingTitles?: string[]
    diagramHint?: string | null
}

interface PromptResult {
    messages: { role: string; content: string }[]
}

/** Build the guidance block from section context. */
function buildGuidanceBlock(sectionContext?: SectionContext): string {
    const lines: string[] = []
    if (sectionContext?.instructions?.length) {
        lines.push('TEMPLATE GUIDANCE:')
        sectionContext.instructions.forEach(inst => lines.push(`  - ${inst}`))
    }
    if (sectionContext?.parentSection) {
        lines.push(`PARENT SECTION: ${sectionContext.parentSection}`)
    }
    if (sectionContext?.siblingTitles?.length) {
        lines.push(`RELATED SECTIONS: ${sectionContext.siblingTitles.slice(0, 5).join(', ')}`)
    }
    return lines.length > 0 ? '\n' + lines.join('\n') + '\n' : ''
}

/** Build the outline block for cross-section awareness. */
function buildOutlineBlock(documentOutline?: string[], sectionTitle?: string): string {
    if (!documentOutline?.length) return ''
    return `\nDOCUMENT OUTLINE (for cross-section awareness):\n${documentOutline.map(s => `  - ${s}`).join('\n')}\n\nYou are writing: "${sectionTitle}"\nDo not duplicate content belonging in other sections. Reference other sections where appropriate (e.g. "as described in Section 3.1").\n`
}

/**
 * Build prompts for auto-generate mode (markdown/plain text output).
 * The LLM produces markdown that gets converted to DOCX nodes server-side.
 */
export function buildAutoGeneratePrompt(
    docType: string,
    sectionTitle: string,
    sectionContext: SectionContext | undefined,
    contextText: string,
    documentOutline?: string[],
    fewShotExample?: string,
): PromptResult {
    const guidanceBlock = buildGuidanceBlock(sectionContext)
    const outlineBlock = buildOutlineBlock(documentOutline, sectionTitle)
    const expectedFormat = sectionContext?.expectedFormat || 'text'

    let formatRules: string
    if (expectedFormat === 'table' || sectionContext?.tableSchemas?.length) {
        const schema = sectionContext?.tableSchemas?.[0]
        const columnList = schema?.columns?.join(', ') || 'appropriate columns'
        formatRules = `OUTPUT FORMAT RULES:
- Output content as markdown text
- For tables, use markdown table syntax: | Header1 | Header2 |
- Use EXACTLY these column headers where applicable: ${columnList}
- Populate table rows using facts from the Project Context
- If context is insufficient, add rows with [placeholder] values
- Use **bold** for emphasis, bullet lists with - prefix, numbered lists with 1. prefix
- Do NOT use HTML tags`
    } else {
        formatRules = `OUTPUT FORMAT RULES:
- Output content as plain markdown text
- Use **bold** for emphasis, *italic* for secondary emphasis
- Use bullet lists with - prefix, numbered lists with 1. prefix
- Use markdown tables (| col1 | col2 |) where tabular data is appropriate
- Do NOT use HTML tags
- Do NOT include the section title/heading in your output (it will be added automatically)`
    }

    const fewShot = fewShotExample ? `\nEXAMPLE OUTPUT STYLE (adapt format but use project context):\n${fewShotExample}\n` : ''

    const systemPrompt = `You are an expert technical writer drafting a ${docType} requirements document in formal Malay (Bahasa Malaysia) for a Malaysian government project.
Your task is to write the content for the section titled "${sectionTitle}".
${guidanceBlock}
${outlineBlock}
${formatRules}

RULES:
- Follow the template guidance above precisely — it defines what this section should contain
- Write in formal Malay (Bahasa Malaysia) using standard government document tone
- Use the Project Context as your primary source of truth
- Do not hallucinate information outside of the context; infer standard technical practices where necessary
- If the context is insufficient, provide standard template text with [placeholder] values
- Every statement must be traceable to the project context or marked as [TBD]
- Return ONLY the content for this section (no heading)
${fewShot}`

    const userPrompt = `Section: ${sectionTitle}

--- PROJECT CONTEXT (from uploaded documents) ---
${contextText}
-------------------------------------------------`

    return {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    }
}
