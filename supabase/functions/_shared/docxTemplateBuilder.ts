/**
 * Template-based DOCX builder for auto-generate.
 * Loads the actual BRS.docx template via PizZip, locates each section
 * in the XML, and replaces placeholder/instruction content with
 * AI-generated OOXML — preserving all template formatting exactly.
 */

import PizZip from 'https://esm.sh/pizzip@3.1.7'
import type { ServerDocSection } from './brsStructure.ts'
import { markdownToOoxml, buildNumberingXml, diagramOoxml, ListIdAllocator } from './markdownToOoxml.ts'

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

// ── Header table scaler ─────────────────────────────────────────────────────

/**
 * Scale a header table to targetWidth and zero the negative tblInd bleed.
 * Uses exact-value string replacement for tblW (more reliable than regex on
 * large XML) and simple patterns for gridCol/tcW/tblInd.
 * Rounding drift absorbed into the last gridCol.
 */
function scaleHeaderTable(xml: string, targetWidth: number): string {
    // Extract current tblW value (digits only — tblW is always positive)
    const tblWMatch = xml.match(/\btblW\b[^>]*\bw:w="(\d+)"/)
    if (!tblWMatch) {
        console.error('[scaleHeaderTable] tblW not found in header XML')
        return xml
    }
    const currentWidth = parseInt(tblWMatch[1])
    if (currentWidth <= 0 || currentWidth === targetWidth) return xml
    const ratio = targetWidth / currentWidth
    console.log(`[scaleHeaderTable] currentWidth=${currentWidth} targetWidth=${targetWidth}`)

    // Scale tblW — simple exact-value string replace avoids regex backtracking
    // issues on large XML. Confirmed only one occurrence per header file.
    let result = xml.replace(`w:w="${currentWidth}" w:type="dxa"`, `w:w="${targetWidth}" w:type="dxa"`)
    // Verify the replacement landed
    if (result.includes(`w:w="${currentWidth}"`)) {
        // Fallback: attribute order might differ
        result = xml.replace(new RegExp(`(tblW[^>]*)w:w="${currentWidth}"`), `$1w:w="${targetWidth}"`)
    }
    console.log(`[scaleHeaderTable] tblW after: ${result.match(/tblW[^>]*w:w="(\d+)"/)?.[1]}`)

    // Scale <w:gridCol w:w="..."> — proportional, drift into last column
    const gridCols: number[] = []
    const gridColRe = /w:gridCol w:w="(\d+)"/g
    let gcm: RegExpExecArray | null
    while ((gcm = gridColRe.exec(result)) !== null) gridCols.push(parseInt(gcm[1]))
    if (gridCols.length > 0) {
        const scaled = gridCols.map(w => Math.round(w * ratio))
        const drift = targetWidth - scaled.reduce((a, b) => a + b, 0)
        scaled[scaled.length - 1] += drift
        let colIdx = 0
        result = result.replace(/w:gridCol w:w="(\d+)"/g, () => `w:gridCol w:w="${scaled[colIdx++]}"`)
        console.log(`[scaleHeaderTable] gridCols [${gridCols.join(',')}] → [${scaled.join(',')}]`)
    }

    // Scale <w:tcW w:w="..."> proportionally
    result = result.replace(/w:tcW w:w="(\d+)"/g,
        (_, w) => `w:tcW w:w="${Math.round(parseInt(w) * ratio)}"`)

    // Zero the tblInd negative bleed: replace the w:w value on the tblInd element.
    // The template has w:w="-606"; we set it to "0" so the table is flush with the body.
    result = result.replace(/(<w:tblInd\b[^>]*)w:w="-\d+"/, '$1w:w="0"')

    return result
}

// ── TOC field builder ───────────────────────────────────────────────────────

/** Build a complex TOC field paragraph for SENARAI RAJAH / SENARAI JADUAL index pages. */
function tocFieldXml(seqType: 'Rajah' | 'Jadual'): string {
    const label = seqType === 'Rajah' ? 'Rajah' : 'Jadual'
    return (
        `<w:p><w:pPr><w:pStyle w:val="Content"/></w:pPr>` +
        `<w:r><w:rPr/><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>` +
        `<w:r><w:instrText xml:space="preserve"> TOC \\h \\z \\c "${seqType}" </w:instrText></w:r>` +
        `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
        `<w:r><w:t xml:space="preserve">(Senarai ${label} akan dikemas kini apabila dokumen dibuka)</w:t></w:r>` +
        `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
        `</w:p>`
    )
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

    // Parse numbering.xml once to find the highest existing numId and abstractNumId
    // so our injected ids are guaranteed not to collide with template definitions.
    const numberingXmlRaw = zip.file('word/numbering.xml')?.asText() ?? ''
    let maxNumId = 0
    let maxAbstractId = 0
    const numIdRe = /<w:num w:numId="(\d+)"/g
    const absIdRe = /<w:abstractNum w:abstractNumId="(\d+)"/g
    let _m: RegExpExecArray | null
    while ((_m = numIdRe.exec(numberingXmlRaw)) !== null) maxNumId = Math.max(maxNumId, parseInt(_m[1]))
    while ((_m = absIdRe.exec(numberingXmlRaw)) !== null) maxAbstractId = Math.max(maxAbstractId, parseInt(_m[1]))

    // Shared allocator — each distinct numbered list gets its own numId starting
    // above the template's highest. One bullet numId is allocated per section.
    let nextNumId = maxNumId + 1
    const numberedIds: number[] = []
    const bulletIds: number[] = []
    const allocator: ListIdAllocator = {
        allocNumbered() { const id = nextNumId++; numberedIds.push(id); return id },
        allocBullet()   { const id = nextNumId++; bulletIds.push(id); return id },
    }

    // Generate content for all sections first (this populates numberedIds/bulletIds)
    // then inject numbering definitions — required ordering: content loop must run
    // before we know which numIds were actually allocated.
    for (const range of sortedRanges) {
        const markdown = generatedContent.get(range.section.title)
        if (!markdown) continue
        const ooxmlFragment = markdownToOoxml(markdown, allocator)
        elements = replaceContentRange(elements, range, ooxmlFragment)
    }

    // Inject numbering definitions with schema-correct ordering:
    //   abstractXml → after the last </w:abstractNum> (all abstractNum before num)
    //   numXml      → before </w:numbering>
    if (numberingXmlRaw && (numberedIds.length > 0 || bulletIds.length > 0)) {
        try {
            const absDecimalId = maxAbstractId + 1
            const absBulletId  = maxAbstractId + 2
            const { abstractXml, numXml } = buildNumberingXml(numberedIds, bulletIds, absDecimalId, absBulletId)

            let updated = numberingXmlRaw
            const CLOSE_ABSTRACT = '</w:abstractNum>'
            const lastAbsEnd = updated.lastIndexOf(CLOSE_ABSTRACT)
            if (lastAbsEnd >= 0) {
                const insertPos = lastAbsEnd + CLOSE_ABSTRACT.length
                updated = updated.slice(0, insertPos) + '\n' + abstractXml + updated.slice(insertPos)
            } else {
                // No existing abstractNums — insert before first <w:num> or at end
                const firstNum = updated.indexOf('<w:num ')
                updated = firstNum >= 0
                    ? updated.slice(0, firstNum) + abstractXml + '\n' + updated.slice(firstNum)
                    : updated.replace('</w:numbering>', abstractXml + '\n</w:numbering>')
            }
            // <w:num> blocks must precede <w:numIdMacAtCleanup> (CT_Numbering
            // schema: num* then numIdMacAtCleanup?). Inserting before
            // </w:numbering> would place them after numIdMacAtCleanup, making
            // the file schema-invalid — Word then silently drops the numbering.
            const cleanupIdx = updated.indexOf('<w:numIdMacAtCleanup')
            if (cleanupIdx >= 0) {
                updated = updated.slice(0, cleanupIdx) + numXml + '\n' + updated.slice(cleanupIdx)
            } else {
                updated = updated.replace('</w:numbering>', numXml + '\n</w:numbering>')
            }
            zip.file('word/numbering.xml', updated)
        } catch (e) {
            console.error('[numbering] injection failed:', (e as Error).message)
        }
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
            const sectionDef = structure.find(s => s.title === sectionTitle)
            const captionDesc = sectionDef?.diagramHint ?? sectionTitle
            const diagXml = diagramOoxml(relId, img.width, img.height, captionDesc, docPrId)

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

    // Inject TOC field paragraphs immediately after the SENARAI RAJAH and
    // SENARAI JADUAL headings. Done after all content and diagram injection
    // to avoid index-shift complications — we search the live elements array.
    for (const { title, seqType } of [
        { title: 'SENARAI RAJAH',  seqType: 'Rajah'  as const },
        { title: 'SENARAI JADUAL', seqType: 'Jadual' as const },
    ]) {
        const normTitle = normalizeTitle(title)
        const headingIdx = elements.findIndex(
            el => headingLevel(el) !== null && normalizeTitle(el.text) === normTitle
        )
        if (headingIdx >= 0) {
            const tocEl: BodyElement = {
                index: headingIdx + 1,
                xml: tocFieldXml(seqType),
                tag: 'other',
                text: '',
            }
            elements = [
                ...elements.slice(0, headingIdx + 1),
                tocEl,
                ...elements.slice(headingIdx + 1),
            ]
        }
    }

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
