/**
 * assess_coverage — Edge function that runs a lightweight RAG dry-run
 * against all BRS auto-generate sections to determine semantic coverage
 * quality. No LLM calls — just embedding + vector search.
 *
 * Returns JSON with per-section quality results and an overall score.
 * Result is cached in rag_coverage_assessments (upserted).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { getEmbeddingConfig, getRagConfig } from '../_shared/llmConfig.ts'
import {
    embedBatch,
    searchChunks,
    deduplicateChunks,
    assessContextQuality,
    getSources,
    type MatchedChunk,
} from '../_shared/ragHelper.ts'
import { BRS_SERVER_STRUCTURE } from '../_shared/brsStructure.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Quality level → numeric weight for overall_score computation. */
const QUALITY_WEIGHTS: Record<string, number> = {
    high: 1.0,
    medium: 0.66,
    low: 0.33,
    none: 0,
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const {
            projectId,
            docType = 'BRS',
        }: {
            projectId: string
            docType?: string
        } = await req.json()

        if (!projectId) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: projectId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const embeddingConfig = getEmbeddingConfig()
        const ragConfig = getRagConfig()

        if (!embeddingConfig.apiKey) {
            return new Response(
                JSON.stringify({ error: 'No embedding API key configured (set VOYAGE_API_KEY)' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        // Only assess auto-generate sections
        const generatableSections = BRS_SERVER_STRUCTURE.filter(s => s.autoGenerate)
        const totalSections = generatableSections.length

        // ── Phase 1: Batch-embed all section queries (2 API calls total) ────
        // Same dual-query strategy as auto_generate_document for consistency.
        const sectionMeta = generatableSections.map(section => {
            // Find parent section title
            const idx = BRS_SERVER_STRUCTURE.indexOf(section)
            let parentSection = ''
            for (let i = idx - 1; i >= 0; i--) {
                if (BRS_SERVER_STRUCTURE[i].level < section.level) {
                    parentSection = BRS_SERVER_STRUCTURE[i].title
                    break
                }
            }
            return {
                query1: `Context needed for ${docType} section: ${section.title}.`,
                query2: `${docType} ${parentSection} ${section.title} ${section.instructions.join(' ').slice(0, 800)}`,
            }
        })

        const [embeddings1, embeddings2] = await Promise.all([
            embedBatch(sectionMeta.map(s => s.query1), embeddingConfig),
            embedBatch(sectionMeta.map(s => s.query2), embeddingConfig),
        ])

        // ── Phase 2: Vector search + quality assessment per section ──────────
        const sectionResults = await Promise.all(
            generatableSections.map(async (section, idx) => {
                const [results1, results2] = await Promise.all([
                    searchChunks(embeddings1[idx], projectId, undefined, ragConfig, supabaseAdmin),
                    searchChunks(embeddings2[idx], projectId, undefined, ragConfig, supabaseAdmin),
                ])
                const chunks: MatchedChunk[] = deduplicateChunks([results1, results2])
                const quality = assessContextQuality(chunks)
                const avgSimilarity = chunks.length > 0
                    ? chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
                    : 0
                const topSources = getSources(chunks).slice(0, 3)

                return {
                    title: section.title,
                    quality,
                    chunkCount: chunks.length,
                    avgSimilarity: Math.round(avgSimilarity * 1000) / 1000,
                    topSources,
                }
            }),
        )

        // ── Phase 3: Compute overall score and summary ───────────────────────
        const coverageSummary = { high: 0, medium: 0, low: 0, none: 0, totalSections }
        let totalWeight = 0
        for (const s of sectionResults) {
            coverageSummary[s.quality as keyof typeof coverageSummary]++
            totalWeight += QUALITY_WEIGHTS[s.quality] ?? 0
        }
        const overallScore = totalSections > 0
            ? Math.round((totalWeight / totalSections) * 1000) / 1000
            : 0

        // ── Phase 4: Get current chunk count for staleness detection ─────────
        const { count: chunkCount } = await supabaseAdmin
            .from('document_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', projectId)

        // ── Phase 5: Upsert result ───────────────────────────────────────────
        const { error: upsertError } = await supabaseAdmin
            .from('rag_coverage_assessments')
            .upsert({
                project_id: projectId,
                doc_type: docType,
                sections: sectionResults,
                overall_score: overallScore,
                coverage_summary: coverageSummary,
                chunk_count_at_assessment: chunkCount ?? 0,
                created_at: new Date().toISOString(),
            }, { onConflict: 'project_id,doc_type' })

        if (upsertError) {
            console.error('Upsert error:', upsertError)
            return new Response(
                JSON.stringify({ error: `DB upsert failed: ${upsertError.message}` }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        return new Response(
            JSON.stringify({
                projectId,
                docType,
                sections: sectionResults,
                overallScore,
                coverageSummary,
                chunkCountAtAssessment: chunkCount ?? 0,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        console.error('assess_coverage error:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
