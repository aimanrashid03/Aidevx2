/**
 * Structure-aware recursive character text splitter with overlap and metadata.
 *
 * Strategy:
 *   1. Pre-split on heading boundaries (markdown # or numbered 1.2.3 headings)
 *      keeping each heading+content block together with its heading in metadata.
 *   2. Within each block, detect table boundaries and keep tables intact.
 *   3. For remaining text, recursive separator fallback:
 *      \n\n → \n → ". " → " " → hard character split
 *
 * Overlap: last `chunkOverlap` characters of each chunk are prepended to the next.
 */

export interface Chunk {
    content: string
    metadata: {
        source: string         // full documentPath
        fileName: string       // basename of source
        chunkIndex: number
        sectionHeading?: string  // nearest heading above this chunk
    }
}

export interface ChunkOptions {
    chunkSize?: number     // target max chars per chunk (default 1600)
    chunkOverlap?: number  // overlap chars between chunks (default 200)
    minChunkSize?: number  // skip chunks shorter than this (default 80)
}

const SEPARATORS = ['\n\n', '\n', '. ', ' ']

// Heading patterns: markdown (#, ##, etc.) or numbered (1.0, 3.1.2, etc.)
const HEADING_RE = /(?=^#{1,4}\s+.+$|^(?:\d+\.)+\d*\s+[A-Z].+$)/m

/** Extract the heading text from the start of a block */
function extractHeading(block: string): string | undefined {
    const firstLine = block.split('\n')[0].trim()
    // Markdown heading
    const mdMatch = firstLine.match(/^#{1,4}\s+(.+)$/)
    if (mdMatch) return mdMatch[1].trim()
    // Numbered heading
    const numMatch = firstLine.match(/^(?:\d+\.)+\d*\s+(.+)$/)
    if (numMatch) return firstLine.trim()
    return undefined
}

/** Split text into heading-bounded sections */
function splitOnHeadings(text: string): { heading: string | undefined; content: string }[] {
    const parts = text.split(HEADING_RE).filter(s => s.trim().length > 0)
    return parts.map(part => ({
        heading: extractHeading(part),
        content: part,
    }))
}

/** Extract markdown table blocks (consecutive lines starting with |) */
function extractTables(text: string): { type: 'table' | 'text'; content: string }[] {
    const lines = text.split('\n')
    const segments: { type: 'table' | 'text'; content: string }[] = []
    let i = 0

    while (i < lines.length) {
        if (lines[i].trimStart().startsWith('|')) {
            // Collect consecutive table lines
            const tableLines: string[] = []
            while (i < lines.length && lines[i].trimStart().startsWith('|')) {
                tableLines.push(lines[i])
                i++
            }
            segments.push({ type: 'table', content: tableLines.join('\n') })
        } else {
            // Collect non-table lines
            const textLines: string[] = []
            while (i < lines.length && !lines[i].trimStart().startsWith('|')) {
                textLines.push(lines[i])
                i++
            }
            const text = textLines.join('\n').trim()
            if (text) segments.push({ type: 'text', content: text })
        }
    }
    return segments
}

/** Extract HTML table blocks */
function extractHtmlTables(text: string): { type: 'table' | 'text'; content: string }[] {
    const segments: { type: 'table' | 'text'; content: string }[] = []
    const tableRe = /<table[\s\S]*?<\/table>/gi
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = tableRe.exec(text)) !== null) {
        const before = text.slice(lastIndex, match.index).trim()
        if (before) segments.push({ type: 'text', content: before })
        segments.push({ type: 'table', content: match[0] })
        lastIndex = match.index + match[0].length
    }
    const after = text.slice(lastIndex).trim()
    if (after) segments.push({ type: 'text', content: after })
    return segments.length > 0 ? segments : [{ type: 'text', content: text }]
}

function splitText(text: string, separator: string): string[] {
    return text.split(separator).filter(s => s.trim().length > 0)
}

function mergeWithSeparator(pieces: string[], separator: string, maxSize: number): string[] {
    const chunks: string[] = []
    let current = ''
    for (const piece of pieces) {
        const candidate = current ? current + separator + piece : piece
        if (candidate.length <= maxSize) {
            current = candidate
        } else {
            if (current) chunks.push(current)
            current = piece
        }
    }
    if (current) chunks.push(current)
    return chunks
}

function recursiveSplit(text: string, separators: string[], chunkSize: number): string[] {
    if (text.length <= chunkSize) return [text]

    const [separator, ...rest] = separators
    if (!separator) {
        const pieces: string[] = []
        for (let i = 0; i < text.length; i += chunkSize) {
            pieces.push(text.slice(i, i + chunkSize))
        }
        return pieces
    }

    const pieces = splitText(text, separator)
    const merged = mergeWithSeparator(pieces, separator, chunkSize)

    const result: string[] = []
    for (const piece of merged) {
        if (piece.length > chunkSize) {
            result.push(...recursiveSplit(piece, rest, chunkSize))
        } else {
            result.push(piece)
        }
    }
    return result
}

/** Split a table block row-by-row if it exceeds maxSize, keeping header prepended */
function splitLargeTable(tableContent: string, maxSize: number): string[] {
    const lines = tableContent.split('\n')
    // First line is header row, second (if separator like |---|) is separator
    const headerLines: string[] = []
    let bodyStart = 0
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (/^[\s|:\-]+$/.test(lines[i].replace(/\|/g, '').trim()) || i === 0) {
            headerLines.push(lines[i])
            bodyStart = i + 1
        } else break
    }
    const header = headerLines.join('\n')
    const bodyLines = lines.slice(bodyStart)

    const chunks: string[] = []
    let current = header
    for (const row of bodyLines) {
        const candidate = current + '\n' + row
        if (candidate.length <= maxSize) {
            current = candidate
        } else {
            chunks.push(current)
            current = header + '\n' + row
        }
    }
    if (current && current !== header) chunks.push(current)
    return chunks.length > 0 ? chunks : [tableContent]
}

export function chunkText(
    text: string,
    documentPath: string,
    opts: ChunkOptions = {},
): Chunk[] {
    const chunkSize = opts.chunkSize ?? 1600
    const chunkOverlap = opts.chunkOverlap ?? 200
    const minChunkSize = opts.minChunkSize ?? 80

    const fileName = documentPath.split('/').pop() ?? documentPath

    // ── Step 1: Split on heading boundaries ───────────────────────────────
    const headingSections = splitOnHeadings(text.trim())

    const rawChunks: { content: string; heading: string | undefined }[] = []

    for (const section of headingSections) {
        const { heading, content } = section

        // ── Step 2: Within each section, extract table blocks ─────────────
        const hasHtmlTables = /<table/i.test(content)
        const segments = hasHtmlTables
            ? extractHtmlTables(content)
            : extractTables(content)

        for (const segment of segments) {
            if (segment.type === 'table') {
                const tableContent = segment.content.trim()
                if (tableContent.length <= chunkSize * 2) {
                    // Keep whole table as one chunk
                    rawChunks.push({ content: tableContent, heading })
                } else {
                    // Split large tables row by row
                    for (const part of splitLargeTable(tableContent, chunkSize)) {
                        rawChunks.push({ content: part, heading })
                    }
                }
            } else {
                // ── Step 3: Recursively split text segments ────────────────
                if (segment.content.length <= chunkSize) {
                    rawChunks.push({ content: segment.content, heading })
                } else {
                    for (const piece of recursiveSplit(segment.content, SEPARATORS, chunkSize)) {
                        rawChunks.push({ content: piece, heading })
                    }
                }
            }
        }
    }

    // ── Step 4: Apply overlap ──────────────────────────────────────────────
    const overlapped: { content: string; heading: string | undefined }[] = []
    let previousTail = ''
    for (const chunk of rawChunks) {
        const withOverlap = previousTail ? previousTail + ' ' + chunk.content : chunk.content
        overlapped.push({ content: withOverlap.trim(), heading: chunk.heading })
        previousTail = chunk.content.length > chunkOverlap
            ? chunk.content.slice(-chunkOverlap).trimStart()
            : chunk.content
    }

    // ── Step 5: Filter, deduplicate, build metadata ────────────────────────
    const result: Chunk[] = []
    let chunkIndex = 0
    let lastContent = ''
    for (const { content, heading } of overlapped) {
        const trimmed = content.trim()
        if (trimmed.length < minChunkSize) continue
        if (trimmed === lastContent) continue
        lastContent = trimmed
        result.push({
            content: trimmed,
            metadata: {
                source: documentPath,
                fileName,
                chunkIndex,
                ...(heading ? { sectionHeading: heading } : {}),
            },
        })
        chunkIndex++
    }

    return result
}
