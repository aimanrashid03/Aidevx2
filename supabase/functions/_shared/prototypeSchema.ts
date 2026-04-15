/**
 * prototypeSchema.ts
 *
 * TypeScript interfaces, validators, and serializers for the PrototypeModel
 * that the LLM returns as JSON. The edge function uses these to validate LLM
 * output and assemble the final HTML before saving to the DB.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type PageType =
  | 'dashboard'
  | 'list'
  | 'detail'
  | 'form'
  | 'analytics'
  | 'audit'
  | 'settings'
  | 'empty'

export interface NavItem {
  key: string
  title: string
  icon: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface PrototypePage {
  key: string
  title: string
  type: PageType
  html: string
}

export interface PrototypeModal {
  id: string
  html: string
}

export interface PrototypeModel {
  systemName: string
  shortDescription: string
  navGroups: NavGroup[]
  pages: PrototypePage[]
  modals: PrototypeModal[]
}

// ── JSON parsing ──────────────────────────────────────────────────────────

/**
 * Parse raw LLM output into a PrototypeModel.
 *
 * Tries three strategies in order:
 *  1. Standard JSON parse (clean output)
 *  2. Repaired JSON parse (fix bare newlines/control chars in strings)
 *  3. Hybrid format: STRUCTURE: {json} line + ---PAGE:key--- / ---END_PAGE--- blocks
 *
 * The hybrid format is the primary format instructed in the prompt — it avoids
 * embedding large HTML fragments inside JSON strings, eliminating all JSON
 * encoding issues (unescaped quotes, newlines, etc.).
 */
export function parseLlmJson(raw: string): PrototypeModel {
  // Strategy 1 & 2: standard + repaired JSON (handles LLM ignoring format instructions)
  try {
    return parseJsonStrategies(raw)
  } catch (_) {
    // fall through to hybrid
  }

  // Strategy 3: hybrid format
  return parseHybridFormat(raw)
}

function parseJsonStrategies(raw: string): PrototypeModel {
  // Strip markdown fences
  let cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Extract first { ... } block via brace matching
  const firstBrace = cleaned.indexOf('{')
  if (firstBrace === -1) throw new Error('no JSON object found')
  let depth = 0, end = -1
  for (let i = firstBrace; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++
    else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  const jsonStr = end !== -1 ? cleaned.slice(firstBrace, end + 1) : cleaned.slice(firstBrace)

  // Attempt 1: direct parse
  try {
    const parsed = JSON.parse(jsonStr)
    validatePrototypeModel(parsed)
    return parsed
  } catch (_) { /* fall through */ }

  // Attempt 2: repair control characters then parse
  const fixed = repairJsonControlChars(jsonStr)
  const parsed = JSON.parse(fixed)
  validatePrototypeModel(parsed)
  return parsed
}

/**
 * Parse the hybrid output format:
 *   STRUCTURE:{...json without page html...}
 *   ---PAGE:key---
 *   <html>
 *   ---END_PAGE---
 */
function parseHybridFormat(raw: string): PrototypeModel {
  // Extract STRUCTURE: line — find the marker and grab everything until end of line
  const structureIdx = raw.indexOf('STRUCTURE:')
  if (structureIdx === -1) throw new Error('LLM output missing STRUCTURE: marker and is not valid JSON')

  const afterMarker = raw.slice(structureIdx + 'STRUCTURE:'.length)
  // Find the first { and extract to its matching }
  const firstBrace = afterMarker.indexOf('{')
  if (firstBrace === -1) throw new Error('No JSON object found after STRUCTURE:')
  let depth = 0, end = -1
  for (let i = firstBrace; i < afterMarker.length; i++) {
    if (afterMarker[i] === '{') depth++
    else if (afterMarker[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  const structureJsonStr = end !== -1
    ? afterMarker.slice(firstBrace, end + 1)
    : afterMarker.slice(firstBrace)

  // Parse structure JSON (may need control-char repair for modal html)
  let structure: Record<string, unknown>
  try {
    structure = JSON.parse(structureJsonStr)
  } catch (_) {
    structure = JSON.parse(repairJsonControlChars(structureJsonStr))
  }

  // Extract ---PAGE:key--- / ---END_PAGE--- blocks
  const pageHtmlMap: Record<string, string> = {}
  const pagePattern = /---PAGE:([^\s-]+)---\r?\n([\s\S]*?)---END_PAGE---/g
  let m: RegExpExecArray | null
  while ((m = pagePattern.exec(raw)) !== null) {
    pageHtmlMap[m[1].trim()] = m[2].trim()
  }

  // Build pages array — merge HTML from blocks into structure
  const structurePages = (structure.pages as Array<Record<string, unknown>>) ?? []
  const pages: PrototypePage[] = structurePages.map(p => ({
    key: String(p.key ?? ''),
    title: String(p.title ?? ''),
    type: (p.type as PageType) ?? 'list',
    html: pageHtmlMap[String(p.key ?? '')] ??
      `<div class="p-6 text-slate-500 text-sm">Page content not generated.</div>`,
  }))

  if (pages.length === 0) throw new Error('STRUCTURE JSON has no pages')

  const model: PrototypeModel = {
    systemName: String(structure.systemName ?? 'System'),
    shortDescription: String(structure.shortDescription ?? ''),
    navGroups: (structure.navGroups as NavGroup[]) ?? [],
    pages,
    modals: (structure.modals as PrototypeModal[]) ?? [],
  }

  validatePrototypeModel(model)
  return model
}

// ── JSON repair ───────────────────────────────────────────────────────────

/**
 * Scan a JSON string character by character and escape any bare control
 * characters (newlines, tabs, carriage returns) that appear inside string
 * values. This is the most reliable fix for LLM output where the model
 * embeds literal newlines inside HTML fragments in JSON strings.
 */
function repairJsonControlChars(s: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]

    if (escaped) {
      result += ch
      escaped = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }

    if (inString) {
      if (ch === '\n')      { result += '\\n';  continue }
      if (ch === '\r')      { result += '\\r';  continue }
      if (ch === '\t')      { result += '\\t';  continue }
      if (ch.charCodeAt(0) < 0x20) { result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`; continue }
    }

    result += ch
  }

  return result
}

// ── Validation ────────────────────────────────────────────────────────────

export function validatePrototypeModel(model: unknown): asserts model is PrototypeModel {
  if (!model || typeof model !== 'object') throw new Error('Model is not an object')
  const m = model as Record<string, unknown>

  if (typeof m.systemName !== 'string' || !m.systemName.trim()) {
    throw new Error('model.systemName must be a non-empty string')
  }
  if (typeof m.shortDescription !== 'string') {
    m.shortDescription = ''
  }
  if (!Array.isArray(m.navGroups)) throw new Error('model.navGroups must be an array')
  if (!Array.isArray(m.pages)) throw new Error('model.pages must be an array')
  if (m.pages.length === 0) throw new Error('model.pages must have at least one page')
  if (!Array.isArray(m.modals)) m.modals = []

  for (const group of m.navGroups as unknown[]) {
    const g = group as Record<string, unknown>
    if (typeof g.label !== 'string') throw new Error('navGroup.label must be a string')
    if (!Array.isArray(g.items)) throw new Error('navGroup.items must be an array')
    for (const item of g.items as unknown[]) {
      const it = item as Record<string, unknown>
      if (typeof it.key !== 'string') throw new Error('navItem.key must be a string')
      if (typeof it.title !== 'string') throw new Error('navItem.title must be a string')
      if (typeof it.icon !== 'string') it.icon = ''
    }
  }

  for (const page of m.pages as unknown[]) {
    const p = page as Record<string, unknown>
    if (typeof p.key !== 'string') throw new Error('page.key must be a string')
    if (typeof p.title !== 'string') throw new Error('page.title must be a string')
    if (typeof p.html !== 'string') throw new Error('page.html must be a string')
    if (typeof p.type !== 'string') p.type = 'list'
  }

  for (const modal of m.modals as unknown[]) {
    const md = modal as Record<string, unknown>
    if (typeof md.id !== 'string') throw new Error('modal.id must be a string')
    if (typeof md.html !== 'string') throw new Error('modal.html must be a string')
  }
}

// ── HTML stripping ────────────────────────────────────────────────────────

/**
 * Remove any forbidden Tailwind classes from an HTML string.
 * Used as a post-processing safety net — the prompt already instructs the LLM
 * not to use them.
 */
export function stripForbiddenClasses(html: string, forbidden: string[]): string {
  let result = html
  for (const cls of forbidden) {
    // Match the class as a whole word inside class="..." attributes
    const escaped = cls.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    result = result.replace(new RegExp(`(?<=class="[^"]*?)\\b${escaped}\\b(?=[^"]*?")`, 'g'), '')
  }
  return result
}

// ── Serialization helpers ─────────────────────────────────────────────────

/**
 * Serialize pages into a JS object literal suitable for window.__pages.
 * Each page becomes: key: () => `<html fragment>`
 *
 * Backticks and ${ inside the HTML are escaped so they survive being embedded
 * in a JS template literal.
 */
export function serializePages(pages: PrototypePage[]): string {
  const entries = pages.map(p => {
    const escaped = p.html
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${')
    return `  ${JSON.stringify(p.key)}: function() { return \`${escaped}\`; }`
  })
  return `{\n${entries.join(',\n')}\n}`
}

/**
 * Serialize page titles into a JS object literal for window.__pageTitles.
 * { 'dashboard': 'Dashboard', ... }
 */
export function serializePageTitles(pages: PrototypePage[]): string {
  const entries = pages.map(p => `  ${JSON.stringify(p.key)}: ${JSON.stringify(p.title)}`)
  return `{\n${entries.join(',\n')}\n}`
}

/**
 * Render sidebar nav items HTML from navGroups.
 * Uses data-nav-key attribute so navigate() can toggle active state.
 */
export function renderNavItemsHtml(navGroups: NavGroup[]): string {
  const parts: string[] = []
  for (const group of navGroups) {
    parts.push(
      `<p class="mb-1 mt-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">${escapeHtml(group.label)}</p>`
    )
    for (const item of group.items) {
      parts.push(`
<div class="mb-0.5">
  <a href="#" data-nav-key="${escapeHtml(item.key)}"
    onclick="navigate('${escapeHtml(item.key)}'); return false;"
    class="flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-slate-900 transition-all hover:bg-violet-50">
    ${item.icon || defaultIcon()}
    <span class="flex-1">${escapeHtml(item.title)}</span>
  </a>
</div>`.trim())
    }
  }
  return parts.join('\n')
}

/**
 * Concatenate modal HTML fragments.
 * Each modal's html is expected to already be wrapped in a
 * <div id="..." class="hidden fixed inset-0 ..."> container.
 */
export function renderModalsHtml(modals: PrototypeModal[]): string {
  return modals.map(m => m.html).join('\n')
}

// ── Internal helpers ──────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function defaultIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
}
