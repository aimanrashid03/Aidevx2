/**
 * Template-based DOCX builder for auto-generate.
 * Loads the actual BRS.docx template via PizZip, locates each section
 * in the XML, and replaces placeholder/instruction content with
 * AI-generated OOXML — preserving all template formatting exactly.
 */

import PizZip from 'https://esm.sh/pizzip@3.1.7'
import type { ServerDocSection } from './brsStructure.ts'
import { markdownToOoxml, generateNumberingEntries, diagramOoxml } from './markdownToOoxml.ts'

// ── Types ───────────────────────────────────────────────────────────────────

export interface BodyElement {
    index: number
    xml: string
    tag: 'p' | 'tbl' | 'other'
    style?: string      // paragraph style (Heading1, Content, etc.)
    text: string         // plain text content
}

// ── XML parsing helpers ─────────────────────────────────────────────────────

/** Check if a character is a valid tag-name boundary (space, >, or /). */
function isTagBoundary(ch: string | undefined): boolean {
    return ch === ' ' || ch === '>' || ch === '/' || ch === undefined
}

/**
 * Find the next occurrence of an exact element open tag (e.g. <w:p or <w:tbl)
 * ensuring it doesn't match longer tag names like <w:pPr> or <w:pStyle>.
 */
function findExactTag(xml: string, tag: string, from: number): number {
    const needle = `<w:${tag}`
    let pos = from
    while (true) {
        pos = xml.indexOf(needle, pos)
        if (pos < 0) return -1
        const afterChar = xml[pos + needle.length]
        if (isTagBoundary(afterChar)) return pos
        pos += needle.length
    }
}

/** Extract all top-level <w:p> and <w:tbl> elements from <w:body>. */
export function parseBodyElements(bodyXml: string): BodyElement[] {
    const elements: BodyElement[] = []
    let i = 0
    let elementIndex = 0

    while (i < bodyXml.length) {
        // Skip over <w:sdt>...</w:sdt> blocks (e.g. Table of Contents)
        // These are structural wrappers, not content we need to parse
        const sdtIdx = bodyXml.indexOf('<w:sdt>', i)

        // Find next <w:p ...> or <w:tbl ...> (exact match, not <w:pPr> etc.)
        const pIdx = findExactTag(bodyXml, 'p', i)
        const tblIdx = findExactTag(bodyXml, 'tbl', i)

        // If SDT comes before the next p or tbl, skip over it entirely
        if (sdtIdx >= 0 && (pIdx < 0 || sdtIdx < pIdx) && (tblIdx < 0 || sdtIdx < tblIdx)) {
            const sdtEnd = bodyXml.indexOf('</w:sdt>', sdtIdx)
            if (sdtEnd >= 0) {
                // Preserve the SDT block as a single opaque element
                const sdtXml = bodyXml.substring(sdtIdx, sdtEnd + 8)
                elements.push({
                    index: elementIndex++,
                    xml: sdtXml,
                    tag: 'other',
                    text: '',
                })
                i = sdtEnd + 8
                continue
            }
        }

        const candidates = [
            { pos: pIdx, tag: 'p' as const },
            { pos: tblIdx, tag: 'tbl' as const },
        ].filter(c => c.pos >= 0).sort((a, b) => a.pos - b.pos)

        if (candidates.length === 0) break

        const { pos: startPos, tag } = candidates[0]

        // Check for self-closing tag: <w:p ... />
        const tagEnd = bodyXml.indexOf('>', startPos)
        if (tagEnd >= 0 && bodyXml[tagEnd - 1] === '/') {
            // Self-closing element — no content
            const xml = bodyXml.substring(startPos, tagEnd + 1)
            elements.push({
                index: elementIndex++,
                xml,
                tag,
                text: '',
            })
            i = tagEnd + 1
            continue
        }

        // Find the matching closing tag, handling nesting
        const closeTag = `</w:${tag}>`
        let depth = 1
        let searchFrom = startPos + tag.length + 3 // skip past "<w:p" or "<w:tbl"
        let endPos = -1

        while (depth > 0 && searchFrom < bodyXml.length) {
            const nextOpen = findExactTag(bodyXml, tag, searchFrom)
            const nextClose = bodyXml.indexOf(closeTag, searchFrom)

            if (nextClose < 0) break

            if (nextOpen >= 0 && nextOpen < nextClose) {
                depth++
                searchFrom = nextOpen + tag.length + 3
            } else {
                depth--
                if (depth === 0) {
                    endPos = nextClose + closeTag.length
                } else {
                    searchFrom = nextClose + closeTag.length
                }
            }
        }

        if (endPos < 0) break

        const xml = bodyXml.substring(startPos, endPos)

        // Extract style
        let style: string | undefined
        const styleMatch = xml.match(/<w:pStyle w:val="([^"]+)"/)
        if (styleMatch) style = styleMatch[1]

        // Extract plain text
        const textParts: string[] = []
        const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
        let tm: RegExpExecArray | null
        while ((tm = textRegex.exec(xml)) !== null) {
            textParts.push(tm[1])
        }
        const text = textParts.join('')

        elements.push({
            index: elementIndex++,
            xml,
            tag,
            style,
            text,
        })

        i = endPos
    }

    return elements
}

/** Normalize a section title for matching: strip leading numbers like "1.0 ", "3.2.1 " */
export function normalizeTitle(title: string): string {
    return title
        .replace(/^\d+(\.\d+)*\s+/, '')  // strip "1.0 ", "3.2.1 " prefixes
        .trim()
        .toUpperCase()
}

/** Check if an element is a heading (Heading1–Heading6). */
function headingLevel(element: BodyElement): number | null {
    if (!element.style) return null
    const match = element.style.match(/^Heading(\d)$/)
    return match ? parseInt(match[1]) : null
}

// ── Section mapping ─────────────────────────────────────────────────────────

export interface SectionRange {
    section: ServerDocSection
    headingIndex: number        // index in elements array
    contentStart: number        // first content element index (after heading)
    contentEnd: number          // exclusive end index
}

/**
 * Map each structure section to its element range in the template.
 * Matches by normalizing both template heading text and structure title.
 */
export function buildSectionMap(
    elements: BodyElement[],
    structure: ServerDocSection[],
): SectionRange[] {
    const ranges: SectionRange[] = []

    // Build a lookup of normalized title → section
    const titleToSection = new Map<string, ServerDocSection>()
    for (const s of structure) {
        titleToSection.set(normalizeTitle(s.title), s)
    }

    // Find all heading elements and match them to structure sections
    const headings: { index: number; level: number; normalizedText: string }[] = []
    for (const el of elements) {
        const lvl = headingLevel(el)
        if (lvl !== null && el.text.trim().length > 0) {
            headings.push({
                index: el.index,
                level: lvl,
                normalizedText: normalizeTitle(el.text),
            })
        }
    }

    // For each heading, try to match to a structure section
    for (let hi = 0; hi < headings.length; hi++) {
        const h = headings[hi]
        const section = titleToSection.get(h.normalizedText)
        if (!section) continue

        // Content starts after the heading
        const contentStart = h.index + 1

        // Content ends at the next heading of same or higher level, or end of elements
        let contentEnd = elements.length
        for (let nhi = hi + 1; nhi < headings.length; nhi++) {
            if (headings[nhi].level <= h.level) {
                contentEnd = headings[nhi].index
                break
            }
            // Also stop at next heading that matches a structure section
            const nextSection = titleToSection.get(headings[nhi].normalizedText)
            if (nextSection) {
                contentEnd = headings[nhi].index
                break
            }
        }

        ranges.push({
            section,
            headingIndex: h.index,
            contentStart,
            contentEnd,
        })
    }

    return ranges
}

// ── Template modification ───────────────────────────────────────────────────

/**
 * Replace the content range of a section with generated OOXML.
 * Returns a new elements array with the content elements replaced.
 */
export function replaceContentRange(
    elements: BodyElement[],
    range: SectionRange,
    ooxmlFragment: string,
): BodyElement[] {
    const before = elements.slice(0, range.contentStart)
    const after = elements.slice(range.contentEnd)

    // Create a single synthetic element containing the generated content
    const generatedElement: BodyElement = {
        index: range.contentStart,
        xml: ooxmlFragment,
        tag: 'other',
        text: '[generated]',
    }

    return [...before, generatedElement, ...after]
}

/**
 * Update title page: replace "TAJUK PROJEK" with actual project name.
 */
function updateTitlePage(elements: BodyElement[], projectName: string, _docTitle: string): BodyElement[] {
    return elements.map(el => {
        if (el.index < 20) {
            // Replace TAJUK PROJEK placeholder
            let xml = el.xml
            if (xml.includes('TAJUK PROJEK')) {
                xml = xml.replace(/TAJUK PROJEK/g, escapeXml(projectName))
            }
            // Replace XXXXX in title page metadata (if any)
            if (el.tag === 'tbl' && el.index < 20) {
                // Don't replace XXXXX in metadata table — those are manual fields
            }
            return { ...el, xml }
        }
        return el
    })
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ── Main builder ────────────────────────────────────────────────────────────

/** Rendered diagram image data for embedding into DOCX. */
export interface DiagramImage {
    pngBytes: Uint8Array
    width: number   // pixels
    height: number  // pixels
}

/**
 * Build a DOCX from the BRS template by injecting generated content
 * into the template's section content regions.
 *
 * @param templateBytes - Raw bytes of the BRS.docx template
 * @param projectName - Project name (replaces TAJUK PROJEK on title page)
 * @param docTitle - Document title
 * @param structure - BRS section structure
 * @param generatedContent - Map of section title → generated markdown content
 * @param diagramImages - Map of section title → rendered PNG diagram data (optional)
 * @returns Uint8Array of the modified DOCX
 */
export async function buildFromTemplate(
    templateBytes: Uint8Array,
    projectName: string,
    docTitle: string,
    structure: ServerDocSection[],
    generatedContent: Map<string, string>,
    diagramImages?: Map<string, DiagramImage>,
): Promise<Uint8Array> {
    // Load template as ZIP
    const zip = new PizZip(templateBytes)

    // Read document.xml
    const docXmlRaw = zip.file('word/document.xml')?.asText()
    if (!docXmlRaw) throw new Error('Template missing word/document.xml')

    // Extract <w:body> content
    const bodyMatch = docXmlRaw.match(/<w:body>([\s\S]*)<\/w:body>/)
    if (!bodyMatch) throw new Error('Template missing <w:body>')

    const bodyContent = bodyMatch[1]

    // Capture the LAST standalone <w:sectPr> at the end of <w:body>.
    // Documents may have multiple sectPr (inside paragraphs for section breaks),
    // but only the final one after the last </w:p> or </w:tbl> is the body-level sectPr.
    const lastSectPrIdx = bodyContent.lastIndexOf('<w:sectPr ')
    let sectPrXml = ''
    let bodyWithoutSectPr = bodyContent

    if (lastSectPrIdx >= 0) {
        const lastSectPrEnd = bodyContent.indexOf('</w:sectPr>', lastSectPrIdx)
        if (lastSectPrEnd >= 0) {
            sectPrXml = bodyContent.substring(lastSectPrIdx, lastSectPrEnd + 11)
            bodyWithoutSectPr = bodyContent.substring(0, lastSectPrIdx) + bodyContent.substring(lastSectPrEnd + 11)
        }
    }

    // Parse body elements
    let elements = parseBodyElements(bodyWithoutSectPr)

    // Build section map
    const sectionRanges = buildSectionMap(elements, structure)

    // Process sections in reverse order (so indices remain valid)
    const sortedRanges = [...sectionRanges]
        .filter(r => r.section.autoGenerate)
        .sort((a, b) => b.contentStart - a.contentStart)

    // Assign each section a unique numId pair so numbered lists restart at 1
    // per section. Start at 100 to avoid colliding with template numIds.
    const NUM_ID_BASE = 100
    const ABSTRACT_ID_BASE = 50

    // Inject numbering definitions into word/numbering.xml before processing
    try {
        const numberingXml = zip.file('word/numbering.xml')?.asText()
        if (numberingXml) {
            const entries = generateNumberingEntries(sortedRanges.length, NUM_ID_BASE, ABSTRACT_ID_BASE)
            const updated = numberingXml.replace('</w:numbering>', entries + '\n</w:numbering>')
            zip.file('word/numbering.xml', updated)
        }
    } catch {
        // Non-fatal: fall back to default numId=5 behaviour
    }

    for (let idx = 0; idx < sortedRanges.length; idx++) {
        const range = sortedRanges[idx]
        const markdown = generatedContent.get(range.section.title)
        if (!markdown) continue

        const numberedNumId = NUM_ID_BASE + idx * 2
        const bulletNumId = NUM_ID_BASE + idx * 2 + 1
        const ooxmlFragment = markdownToOoxml(markdown, numberedNumId, bulletNumId)
        elements = replaceContentRange(elements, range, ooxmlFragment)
    }

    // ── Inject diagram images ──────────────────────────────────────────────
    if (diagramImages && diagramImages.size > 0) {
        // Read existing relationships to determine next available rId
        const relsPath = 'word/_rels/document.xml.rels'
        let relsXml = zip.file(relsPath)?.asText() ?? ''
        const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'

        // Find the highest existing rId number
        let maxRId = 0
        const rIdRegex = /Id="rId(\d+)"/g
        let rIdMatch: RegExpExecArray | null
        while ((rIdMatch = rIdRegex.exec(relsXml)) !== null) {
            maxRId = Math.max(maxRId, parseInt(rIdMatch[1]))
        }

        let diagramCounter = 0
        const DOC_PR_ID_BASE = 1000 // high base to avoid conflicts with template

        // Build a title→element-index lookup for appending diagram OOXML
        const titleToLastContentIndex = new Map<string, number>()
        for (const range of sectionRanges) {
            if (range.section.autoGenerate) {
                // After replacement, content is a single synthetic element at contentStart
                titleToLastContentIndex.set(range.section.title, range.contentStart)
            }
        }

        for (const [sectionTitle, img] of diagramImages) {
            diagramCounter++
            const relId = `rId${maxRId + diagramCounter}`
            const mediaFileName = `diagram_${diagramCounter}.png`

            // 1. Add PNG to word/media/
            zip.file(`word/media/${mediaFileName}`, img.pngBytes)

            // 2. Add relationship entry
            const relEntry = `<Relationship Id="${relId}" Type="${IMAGE_REL_TYPE}" Target="media/${mediaFileName}"/>`
            relsXml = relsXml.replace('</Relationships>', relEntry + '\n</Relationships>')

            // 3. Generate diagram OOXML and append to the section's content
            const docPrId = DOC_PR_ID_BASE + diagramCounter
            const caption = `Rajah: ${sectionTitle}`
            const diagXml = diagramOoxml(relId, img.width, img.height, caption, docPrId)

            const contentIdx = titleToLastContentIndex.get(sectionTitle)
            if (contentIdx !== undefined) {
                const el = elements[contentIdx]
                if (el) {
                    elements[contentIdx] = { ...el, xml: el.xml + diagXml }
                }
            }
        }

        // Write updated relationships
        zip.file(relsPath, relsXml)

        // Ensure [Content_Types].xml has PNG default
        const ctPath = '[Content_Types].xml'
        let ctXml = zip.file(ctPath)?.asText() ?? ''
        if (ctXml && !ctXml.includes('Extension="png"')) {
            ctXml = ctXml.replace(
                '</Types>',
                '<Default Extension="png" ContentType="image/png"/>\n</Types>'
            )
            zip.file(ctPath, ctXml)
        }
    }

    // Update title page
    elements = updateTitlePage(elements, projectName, docTitle)

    // Ensure portrait orientation in the body-level sectPr
    if (sectPrXml) {
        // Remove any existing <w:pgSz> that might have landscape orientation
        // and replace with explicit portrait dimensions (A4: 11906 x 16838 twips)
        if (sectPrXml.includes('w:orient="landscape"')) {
            sectPrXml = sectPrXml.replace(/<w:pgSz[^/]*\/>/,
                '<w:pgSz w:w="11906" w:h="16838"/>')
        }
    }

    // Reassemble body XML
    const newBodyContent = elements.map(el => el.xml).join('') + sectPrXml
    const newDocXml = docXmlRaw.replace(
        /<w:body>[\s\S]*<\/w:body>/,
        `<w:body>${newBodyContent}</w:body>`
    )

    // Write back to ZIP
    zip.file('word/document.xml', newDocXml)

    // Update settings.xml to force TOC rebuild on open
    const settingsXml = zip.file('word/settings.xml')?.asText()
    if (settingsXml && !settingsXml.includes('w:updateFields')) {
        const updatedSettings = settingsXml.replace(
            '</w:settings>',
            '<w:updateFields w:val="true"/></w:settings>'
        )
        zip.file('word/settings.xml', updatedSettings)
    }

    // Generate output
    const output = zip.generate({
        type: 'uint8array',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
    })

    return output as Uint8Array
}
