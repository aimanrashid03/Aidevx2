import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Informational queue for full-document auto-generation.
 *
 * Tracks how many auto-generations are running across the team so the
 * progress UI can show the user their position. This is purely for
 * visibility — nothing is blocked or throttled here; vLLM processes
 * every job immediately (just slower under load).
 *
 * Frontend-owned lifecycle: registerJob() inserts a `running` row,
 * finishJob() flips it to a terminal status.
 */

interface RunningJob {
    id: string
    created_at: string
}

interface UseGenerationQueueResult {
    /** Count of auto-generations currently running across all users. */
    runningCount: number
    /** 1-based position of the active job, or null if not yet ranked. */
    position: number | null
    /** Insert a `running` row; returns its id (or null on failure). */
    registerJob: (projectId: string, docType: string) => Promise<string | null>
    /** Flip a job row to a terminal status. Idempotent. */
    finishJob: (jobId: string, status: 'complete' | 'error') => Promise<void>
}

// Running rows older than this are treated as stale (crashed/closed browser)
// and excluded from counts. A full BRS auto-generation finishes in minutes.
const STALE_WINDOW_MS = 20 * 60 * 1000

export function useGenerationQueue(): UseGenerationQueueResult {
    const [runningJobs, setRunningJobs] = useState<RunningJob[]>([])
    const [activeJobId, setActiveJobId] = useState<string | null>(null)

    const fetchRunning = useCallback(async () => {
        const cutoff = new Date(Date.now() - STALE_WINDOW_MS).toISOString()
        const { data, error } = await supabase
            .from('generation_jobs')
            .select('id, created_at')
            .eq('status', 'running')
            .gt('created_at', cutoff)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('useGenerationQueue fetchRunning error:', error)
            return
        }
        setRunningJobs((data as RunningJob[]) ?? [])
    }, [])

    // Initial load + live refresh on any change to the table.
    useEffect(() => {
        fetchRunning()

        const channel = supabase
            .channel('generation-jobs-queue')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'generation_jobs' },
                () => fetchRunning(),
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchRunning])

    const registerJob = useCallback(async (projectId: string, docType: string) => {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId) {
            console.error('useGenerationQueue registerJob: no authenticated user')
            return null
        }

        const { data, error } = await supabase
            .from('generation_jobs')
            .insert({ project_id: projectId, user_id: userId, doc_type: docType, status: 'running' })
            .select('id')
            .single()

        if (error || !data) {
            console.error('useGenerationQueue registerJob error:', error)
            return null
        }

        setActiveJobId(data.id)
        fetchRunning()
        return data.id as string
    }, [fetchRunning])

    const finishJob = useCallback(async (jobId: string, status: 'complete' | 'error') => {
        if (!jobId) return
        setActiveJobId(prev => (prev === jobId ? null : prev))

        const { error } = await supabase
            .from('generation_jobs')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', jobId)

        if (error) console.error('useGenerationQueue finishJob error:', error)
    }, [])

    // findIndex returns -1 when the active job isn't in the fetched list yet;
    // (-1 + 1) = 0, and `0 || null` yields null — "not yet ranked".
    const position = activeJobId
        ? (runningJobs.findIndex(j => j.id === activeJobId) + 1) || null
        : null

    return { runningCount: runningJobs.length, position, registerJob, finishJob }
}
