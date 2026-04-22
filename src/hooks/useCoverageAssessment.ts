import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface SectionCoverage {
    title: string
    quality: 'none' | 'low' | 'medium' | 'high'
    chunkCount: number
    avgSimilarity: number
    topSources: string[]
}

export interface CoverageAssessment {
    projectId: string
    docType: string
    sections: SectionCoverage[]
    overallScore: number
    coverageSummary: {
        high: number
        medium: number
        low: number
        none: number
        totalSections: number
    }
    chunkCountAtAssessment: number
    createdAt: string
}

interface UseCoverageAssessmentResult {
    assessment: CoverageAssessment | null
    loading: boolean
    assessing: boolean
    assessmentError: string | null
    isStale: boolean
    runAssessment: () => Promise<void>
    refetch: () => Promise<void>
}

/**
 * Fetches the cached semantic coverage assessment for a project from DB.
 * Exposes runAssessment() to invoke the assess_coverage edge function and
 * refresh the cached result.
 *
 * @param projectId  Target project
 * @param docType    Doc type to assess (default 'BRS')
 * @param currentChunkCount  Current total indexed chunk count — used for
 *                           staleness detection. Pass 0 if unknown.
 */
export function useCoverageAssessment(
    projectId: string,
    docType = 'BRS',
    currentChunkCount = 0,
): UseCoverageAssessmentResult {
    const [assessment, setAssessment] = useState<CoverageAssessment | null>(null)
    const [loading, setLoading] = useState(true)
    const [assessing, setAssessing] = useState(false)
    const [assessmentError, setAssessmentError] = useState<string | null>(null)

    const fetchAssessment = useCallback(async () => {
        if (!projectId) { setLoading(false); return }
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('rag_coverage_assessments')
                .select('*')
                .eq('project_id', projectId)
                .eq('doc_type', docType)
                .maybeSingle()

            if (error) { console.error('fetchAssessment error:', error); return }
            if (!data) { setAssessment(null); return }

            setAssessment({
                projectId: data.project_id,
                docType: data.doc_type,
                sections: data.sections ?? [],
                overallScore: data.overall_score ?? 0,
                coverageSummary: data.coverage_summary ?? { high: 0, medium: 0, low: 0, none: 0, totalSections: 0 },
                chunkCountAtAssessment: data.chunk_count_at_assessment ?? 0,
                createdAt: data.created_at,
            })
        } finally {
            setLoading(false)
        }
    }, [projectId, docType])

    useEffect(() => {
        fetchAssessment()
    }, [fetchAssessment])

    // Auto-refresh whenever the cached assessment row is updated in the DB.
    // Fires after any ingestion source (files, stories, description, notes)
    // completes its fire-and-forget assess_coverage call.
    useEffect(() => {
        if (!projectId) return

        const channel = supabase
            .channel(`coverage-${projectId}-${docType}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rag_coverage_assessments',
                    filter: `project_id=eq.${projectId}`,
                },
                (payload) => {
                    // Only react to the doc_type this hook instance cares about
                    const row = (payload.new ?? payload.old) as { doc_type?: string } | null
                    if (row?.doc_type && row.doc_type !== docType) return
                    fetchAssessment()
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [projectId, docType, fetchAssessment])

    const runAssessment = useCallback(async () => {
        if (!projectId || assessing) return
        setAssessing(true)
        setAssessmentError(null)
        try {
            const { data, error } = await supabase.functions.invoke('assess_coverage', {
                body: { projectId, docType },
            })
            // supabase-js wraps HTTP errors in `error`; also catch explicit error body
            if (error) throw error
            if (data?.error) throw new Error(data.error)
            await fetchAssessment()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Assessment failed — check console for details'
            console.error('runAssessment error:', err)
            setAssessmentError(msg)
        } finally {
            setAssessing(false)
        }
    }, [projectId, docType, assessing, fetchAssessment])

    // Stale if we have an assessment but the chunk count has changed since then.
    // Allow a small delta (±2) to avoid flickering on minor changes.
    const isStale = assessment !== null
        && currentChunkCount > 0
        && Math.abs(currentChunkCount - assessment.chunkCountAtAssessment) > 2

    return { assessment, loading, assessing, assessmentError, isStale, runAssessment, refetch: fetchAssessment }
}
