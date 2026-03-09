/**
 * Recursive character text splitter with overlap and metadata.
 *
 * Strategy (hierarchical fallback):
 *   1. Split on \n\n (paragraph boundary)
 *   2. If chunk still > chunkSize, split on \n (line boundary)
 *   3. If still > chunkSize, split on ". " (sentence boundary)
 *   4. If still > chunkSize, split on " " (word boundary)
 *
 * Overlap: last `chunkOverlap` characters of each chunk are prepended to the next,
 * maintaining context continuity across chunk boundaries.
 */

export interface Chunk {
    content: string
    metadata: {
        source: string    // full documentPath
        fileName: string  // basename of source
        chunkIndex: number
    }
}

export interface ChunkOptions {
    chunkSize?: number     // target max chars per chunk (default 800)
    chunkOverlap?: number  // overlap chars between chunks (default 100)
    minChunkSize?: number  // skip chunks shorter than this (default 50)
}

const SEPARATORS = ['\n\n', '\n', '. ', ' ']

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
        // No more separators — hard split by character
        const pieces: string[] = []
        for (let i = 0; i < text.length; i += chunkSize) {
            pieces.push(text.slice(i, i + chunkSize))
        }
        return pieces
    }

    const pieces = splitText(text, separator)
    const merged = mergeWithSeparator(pieces, separator, chunkSize)

    // Any pieces that are still too large get recursively split
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

export function chunkText(
    text: string,
    documentPath: string,
    opts: ChunkOptions = {},
): Chunk[] {
    const chunkSize = opts.chunkSize ?? 800
    const chunkOverlap = opts.chunkOverlap ?? 100
    const minChunkSize = opts.minChunkSize ?? 50

    const fileName = documentPath.split('/').pop() ?? documentPath

    // Split into raw chunks
    const rawChunks = recursiveSplit(text.trim(), SEPARATORS, chunkSize)

    // Apply overlap: prepend tail of previous chunk
    const overlapped: string[] = []
    let previousTail = ''
    for (const chunk of rawChunks) {
        const withOverlap = previousTail ? previousTail + ' ' + chunk : chunk
        overlapped.push(withOverlap.trim())
        // Capture the tail for the next chunk
        previousTail = chunk.length > chunkOverlap
            ? chunk.slice(-chunkOverlap).trimStart()
            : chunk
    }

    // Filter, deduplicate consecutive duplicates, and build metadata
    const result: Chunk[] = []
    let chunkIndex = 0
    let lastContent = ''
    for (const content of overlapped) {
        const trimmed = content.trim()
        if (trimmed.length < minChunkSize) continue
        if (trimmed === lastContent) continue  // skip exact duplicates from overlap edge cases
        lastContent = trimmed
        result.push({
            content: trimmed,
            metadata: { source: documentPath, fileName, chunkIndex },
        })
        chunkIndex++
    }

    return result
}
