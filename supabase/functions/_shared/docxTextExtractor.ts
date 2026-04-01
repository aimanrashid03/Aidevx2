/**
 * Extracts plain text from a DOCX file for use as LLM prompt context.
 * Uses PizZip to open the DOCX (which is a ZIP), reads word/document.xml,
 * and strips XML tags to produce clean plaintext.
 */

import PizZip from 'https://esm.sh/pizzip@3.1.7'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const MAX_CHARS = 8000

export function extractTextFromDocxBytes(docxBytes: Uint8Array): string {
    try {
        const zip = new PizZip(docxBytes)
        const xml = zip.file('word/document.xml')?.asText() ?? ''
        // Strip XML tags and collapse whitespace
        const text = xml
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '...' : text
    } catch {
        return ''
    }
}

export async function downloadAndExtractDocText(
    storagePath: string | null,
    jsonContent: Record<string, unknown> | null,
    supabaseClient: SupabaseClient,
): Promise<string> {
    // Prefer DOCX extraction (OnlyOffice docs)
    if (storagePath) {
        try {
            const { data, error } = await supabaseClient.storage
                .from('documents')
                .download(storagePath)
            if (!error && data) {
                const arrayBuffer = await data.arrayBuffer()
                const text = extractTextFromDocxBytes(new Uint8Array(arrayBuffer))
                if (text.length > 100) return text
            }
        } catch {
            // fall through to JSON content
        }
    }

    // Fallback: JSON content field (legacy/tiptap docs)
    if (jsonContent && Object.keys(jsonContent).length > 0) {
        const raw = JSON.stringify(jsonContent)
            .replace(/[{}"[\]]/g, ' ')
            .replace(/\\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        return raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) + '...' : raw
    }

    return ''
}
