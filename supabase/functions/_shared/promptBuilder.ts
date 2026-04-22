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
 * Build prompts for diagram generation in auto-generate mode.
 * The LLM produces raw Mermaid syntax (no wrapping tags).
 */
export function buildDiagramPrompt(
    docType: string,
    sectionTitle: string,
    diagramType: 'flowchart' | 'erDiagram' | 'sequenceDiagram',
    diagramHint: string,
    contextText: string,
    documentOutline?: string[],
    fewShotExample?: string,
): PromptResult {
    const outlineBlock = buildOutlineBlock(documentOutline, sectionTitle)

    const diagramTypeGuide: Record<string, string> = {
        flowchart: `Use "flowchart TD" (top-down) or "flowchart LR" (left-right).
ALLOWED node shapes: A[Rectangle], B{Diamond}, C([Stadium]), D((Circle)).
Edges: A --> B, A -->|label| B.
CRITICAL RULES for flowchart:
- Node labels MUST NOT contain ( or ) characters — write "Jika Perlu" not "(Jika Perlu)"
- Do NOT use subgraph blocks
- Do NOT add style/classDef declarations
- Do NOT add comments (%% ...)
- Keep labels short: max 5 words per node`,
        erDiagram: `Use "erDiagram" — the FIRST LINE must be exactly the word: erDiagram
Entity block: ENTITY_NAME { datatype attribute_name }
Relationship: ENTITY1 ||--o{ ENTITY2 : "label"
Cardinality symbols: ||=exactly one, o|=zero or one, }|=one or more, }o=zero or more.
CRITICAL RULES for erDiagram:
- Entity names must be UPPERCASE with no spaces — use underscores: NAMA_ENTITI
- Attribute names must be lowercase with no spaces: nama_atribut
- Relationship labels must be quoted: : "mengandungi"
- Do NOT add style or any other blocks after the relationships`,
        sequenceDiagram: `Use "sequenceDiagram".
Participants: participant A as Nama.
Messages: A->>B: mesej, B-->>A: respons.
Notes: Note over A,B: teks.`,
    }

    const systemPrompt = `You are an expert technical writer creating a Mermaid diagram for a ${docType} requirements document section titled "${sectionTitle}".
${outlineBlock}
DIAGRAM TYPE: ${diagramType}
${diagramTypeGuide[diagramType] || ''}

DIAGRAM GOAL: ${diagramHint}

OUTPUT RULES:
- Output ONLY valid Mermaid syntax — no markdown fences, no \`\`\`, no <pre> tags, no explanation text before or after
- The VERY FIRST LINE of your response must be the diagram type declaration (e.g. "flowchart TD", "erDiagram")
- Use Bahasa Malaysia for all labels and text in the diagram
- Keep the diagram focused: 5–12 nodes for flowcharts, 3–7 entities for ER diagrams
${fewShotExample ? `\nEXAMPLE — follow this exact syntax style but use project-specific content:\n${fewShotExample}\n` : ''}`

    const userPrompt = `Section: ${sectionTitle}

--- PROJECT CONTEXT (from uploaded documents) ---
${contextText}
-------------------------------------------------

Generate the Mermaid diagram now.`

    return {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    }
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
- Use **bold** for emphasis
- Use numbered lists (1. 2. 3.) for sequential steps and traceable requirements
- Use bullet lists (- item) for non-sequential features, characteristics, or descriptions
- For nested details, indent sub-items with 2 spaces (e.g. "  1. sub-item" or "  - sub-item")
- Do NOT use HTML tags
- Do NOT include the section title/heading in your output — it is already in the document template`
    } else {
        formatRules = `OUTPUT FORMAT RULES:
- Output content as plain markdown text
- Use **bold** for emphasis, *italic* for secondary emphasis
- Use numbered lists (1. 2. 3.) for sequential steps and traceable requirements
- Use bullet lists (- item) for non-sequential features, characteristics, or descriptions
- For nested details, indent sub-items with 2 spaces (e.g. "  1. sub-item" or "  - sub-item")
- Use markdown tables (| col1 | col2 |) where tabular data is appropriate
- Do NOT use HTML tags
- Do NOT include the section title/heading in your output — it is already in the document template`
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
