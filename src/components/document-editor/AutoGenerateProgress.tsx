import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, XCircle, FileText, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useGenerationQueue } from '../../hooks/useGenerationQueue'

interface AutoGenerateProgressProps {
    projectId: string
    projectName: string
    docTitle: string
    docType: string
    selectedDocumentPaths?: string[]
    onComplete: (result: {
        docId: string
        storagePath: string
        documentKey: string
        publicUrl: string
    }) => void
    onCancel: () => void
    onFallbackEmpty: () => void
}

interface SectionStatus {
    title: string
    status: 'pending' | 'searching' | 'generating' | 'complete' | 'error'
    error?: string
}

type Phase = 'starting' | 'generating' | 'building' | 'complete' | 'error'

export default function AutoGenerateProgress({
    projectId,
    projectName,
    docTitle,
    docType,
    selectedDocumentPaths,
    onComplete,
    onCancel,
    onFallbackEmpty,
}: AutoGenerateProgressProps) {
    const [phase, setPhase] = useState<Phase>('starting')
    const [total, setTotal] = useState(0)
    const [completedCount, setCompletedCount] = useState(0)
    const [statusText, setStatusText] = useState('Starting generation...')
    const [sections, setSections] = useState<SectionStatus[]>([])
    const [fatalError, setFatalError] = useState<string | null>(null)
    const [pendingDocId, setPendingDocId] = useState<string | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const startedRef = useRef(false)
    // Stable refs for volatile props so useCallback doesn't depend on them.
    // Parent re-renders (real-time hooks) would otherwise recreate these on
    // every render, causing startGeneration to get a new identity, the effect
    // to re-run, and duplicate requests to fire.
    const onCompleteRef = useRef(onComplete)
    onCompleteRef.current = onComplete
    const selectedDocumentPathsRef = useRef(selectedDocumentPaths)
    selectedDocumentPathsRef.current = selectedDocumentPaths
    const projectNameRef = useRef(projectName)
    projectNameRef.current = projectName

    const { runningCount, position, registerJob, finishJob } = useGenerationQueue()
    const jobIdRef = useRef<string | null>(null)

    const startGeneration = useCallback(async () => {
        const controller = new AbortController()
        abortRef.current = controller
        let myJobId: string | null = null

        try {
            console.log('[AutoGen] Getting session...')
            const { data: { session } } = await supabase.auth.getSession()
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
            console.log('[AutoGen] Sending request to:', `${supabaseUrl}/functions/v1/auto_generate_document`)

            const response = await fetch(
                `${supabaseUrl}/functions/v1/auto_generate_document`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || anonKey}`,
                        'apikey': anonKey,
                    },
                    body: JSON.stringify({
                        projectId,
                        docType,
                        selectedDocumentPaths: selectedDocumentPathsRef.current,
                        projectName: projectNameRef.current,
                        docTitle,
                    }),
                    signal: controller.signal,
                },
            )

            console.log('[AutoGen] Response status:', response.status, 'has body:', !!response.body)
            if (!response.ok || !response.body) {
                if (response.status === 401) {
                    throw new Error('Session expired or invalid. Please log out and log back in, then try again.')
                }
                const text = await response.text()
                throw new Error(text || `Server error ${response.status}`)
            }

            setPhase('generating')

            // Register the queue row only once generation is genuinely underway.
            // Attempts aborted before this point (StrictMode throwaway mount,
            // dep-change re-runs) never reach here, so they create no row.
            myJobId = await registerJob(projectId, docType)
            jobIdRef.current = myJobId

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const jsonStr = line.slice(6).trim()
                    if (!jsonStr || jsonStr === '[DONE]') continue

                    try {
                        const event = JSON.parse(jsonStr)

                        if (event.type === 'progress') {
                            if (event.total) setTotal(event.total)
                            setStatusText(event.status)

                            // Support both English (new) and Malay (legacy local) status strings
                            const isSearching = event.status?.includes('Searching') || event.status?.includes('Mencari')
                            const isGenerating = event.status?.includes('Generating') || event.status?.includes('Menjana')
                            const isBuilding = event.status?.includes('Building DOCX') || event.status?.includes('Membina')

                            if (event.section && isSearching) {
                                setSections(prev => {
                                    const existing = prev.find(s => s.title === event.section)
                                    if (existing) {
                                        return prev.map(s => s.title === event.section ? { ...s, status: 'searching' } : s)
                                    }
                                    return [...prev, { title: event.section, status: 'searching' }]
                                })
                            } else if (event.section && isGenerating) {
                                setSections(prev => {
                                    const existing = prev.find(s => s.title === event.section)
                                    if (existing) {
                                        return prev.map(s => s.title === event.section ? { ...s, status: 'generating' } : s)
                                    }
                                    // Section not in list yet — add it directly as generating
                                    return [...prev, { title: event.section, status: 'generating' }]
                                })
                            } else if (isBuilding) {
                                setPhase('building')
                                setStatusText('Building DOCX document...')
                            }
                        } else if (event.type === 'started') {
                            setPendingDocId(event.docId)
                            if (event.total) setTotal(event.total)
                            sessionStorage.setItem('autoGenInProgress', JSON.stringify({
                                docId: event.docId, projectId, timestamp: Date.now(),
                            }))
                        } else if (event.type === 'section_complete') {
                            setCompletedCount(prev => prev + 1)
                            setSections(prev => {
                                // Ensure the section exists before marking complete (handles race condition
                                // where section_complete arrives before its progress events)
                                const exists = prev.some(s => s.title === event.section)
                                const base = exists ? prev : [...prev, { title: event.section, status: 'pending' as const }]
                                return base.map(s => s.title === event.section ? { ...s, status: 'complete' } : s)
                            })
                        } else if (event.type === 'section_error') {
                            setCompletedCount(prev => prev + 1)
                            setSections(prev => {
                                const exists = prev.some(s => s.title === event.section)
                                const base = exists ? prev : [...prev, { title: event.section, status: 'pending' as const }]
                                return base.map(s => s.title === event.section ? { ...s, status: 'error', error: event.error } : s)
                            })
                        } else if (event.type === 'complete') {
                            if (myJobId) finishJob(myJobId, 'complete')
                            sessionStorage.removeItem('autoGenInProgress')
                            setPhase('complete')
                            onCompleteRef.current({
                                docId: event.docId,
                                storagePath: event.storagePath,
                                documentKey: event.documentKey,
                                publicUrl: event.publicUrl,
                            })
                        } else if (event.type === 'error') {
                            if (myJobId) finishJob(myJobId, 'error')
                            sessionStorage.removeItem('autoGenInProgress')
                            setPhase('error')
                            setFatalError(event.message)
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                if (myJobId) finishJob(myJobId, 'error')
                return
            }
            if (myJobId) finishJob(myJobId, 'error')
            setPhase('error')
            setFatalError((err as Error).message || 'Connection failed')
        }
    }, [projectId, docType, docTitle, registerJob, finishJob])

    useEffect(() => {
        if (startedRef.current) return
        startedRef.current = true
        startGeneration()
        return () => {
            abortRef.current?.abort()
            // Reset so StrictMode remount (synchronous) can restart.
            // Safe because startGeneration is now stable — cleanup only fires
            // on StrictMode double-invoke or genuine unmount, never on parent re-render.
            startedRef.current = false
        }
    }, [startGeneration])

    // Polling fallback: if SSE drops while building, poll DB every 5s.
    // When the doc row appears with a storage_path the SSE complete was missed —
    // reconstruct the result and call onComplete. The `cancelled` flag prevents
    // this from double-firing if the SSE complete event arrives first.
    useEffect(() => {
        if (phase !== 'building' || !pendingDocId) return
        let cancelled = false

        const poll = async () => {
            if (cancelled) return
            const { data } = await supabase
                .from('requirement_docs')
                .select('id, storage_path, document_key')
                .eq('id', pendingDocId)
                .single()

            if (data?.storage_path && !cancelled) {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${data.storage_path.replace('documents/', '')}`
                cancelled = true
                if (jobIdRef.current) finishJob(jobIdRef.current, 'complete')
                sessionStorage.removeItem('autoGenInProgress')
                setPhase('complete')
                onCompleteRef.current({
                    docId: data.id,
                    storagePath: data.storage_path,
                    documentKey: data.document_key,
                    publicUrl,
                })
            } else if (!cancelled) {
                setTimeout(poll, 5000)
            }
        }

        const timer = setTimeout(poll, 5000)
        return () => { cancelled = true; clearTimeout(timer) }
    }, [phase, pendingDocId, finishJob])

    const handleCancel = () => {
        abortRef.current?.abort()
        onCancel()
    }

    // Progress is based on sections actually completed, not parallel section indices.
    // This prevents the bar from jumping around as concurrent sections report in.
    const progressPercent = phase === 'building' ? 95
        : phase === 'complete' ? 100
        : total > 0 ? Math.round((completedCount / total) * 100)
        : 0

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-2xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white mb-4" style={{ background: 'var(--accent-600)' }}>
                        <Sparkles size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Generating {docType} Document
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {projectName} &mdash; {docTitle}
                    </p>
                </div>

                {/* Queue status — only shown when others are also generating */}
                {runningCount > 1 && (
                    <div className="flex justify-center mb-6">
                        <div
                            className="inline-flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg border text-center"
                            style={{ borderColor: 'var(--accent-200)', background: 'var(--accent-50)' }}
                        >
                            <span className="text-xs font-medium" style={{ color: 'var(--accent-700)' }}>
                                {runningCount} generations running across the team
                                {position ? ` · you are #${position}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                Larger queue means slower generation.
                            </span>
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span>{statusText}</span>
                        <span>{total > 0 ? `${completedCount} / ${total}` : ''}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--accent-600)] rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Section list */}
                <div className="bg-white border border-slate-200 rounded-lg max-h-80 overflow-y-auto mb-6">
                    {sections.length === 0 && phase === 'starting' && (
                        <div className="p-6 text-center text-sm text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                            Preparing generation...
                        </div>
                    )}
                    {sections.map((s) => (
                        <div
                            key={s.title}
                            className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 ${
                                s.status === 'searching' || s.status === 'generating' ? 'bg-slate-50' : ''
                            }`}
                        >
                            {s.status === 'complete' && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
                            {s.status === 'error' && <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />}
                            {(s.status === 'searching' || s.status === 'generating') && (
                                <Loader2 size={16} className="text-[var(--accent-600)] animate-spin flex-shrink-0" />
                            )}
                            {s.status === 'pending' && <FileText size={16} className="text-slate-300 flex-shrink-0" />}

                            <span className={`text-sm flex-1 ${
                                s.status === 'complete' ? 'text-slate-600' :
                                s.status === 'error' ? 'text-amber-700' :
                                (s.status === 'searching' || s.status === 'generating') ? 'text-slate-900 font-medium' :
                                'text-slate-400'
                            }`}>
                                {s.title}
                            </span>

                            {s.status === 'searching' && (
                                <span className="text-[10px] text-slate-400">Searching...</span>
                            )}
                            {s.status === 'generating' && (
                                <span className="text-[10px] text-slate-900 font-medium">Generating...</span>
                            )}
                            {s.status === 'error' && (
                                <span className="text-[10px] text-amber-500" title={s.error}>Failed</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Error state */}
                {phase === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Generation failed</p>
                                <p className="text-xs text-red-600 mt-1">{fatalError}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-center gap-3">
                    {phase === 'error' ? (
                        <>
                            <button
                                onClick={() => {
                                    startedRef.current = false
                                    setPhase('starting')
                                    setSections([])
                                    setCompletedCount(0)
                                    setTotal(0)
                                    setFatalError(null)
                                    startGeneration()
                                }}
                                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-800 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onFallbackEmpty}
                                className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded hover:bg-slate-50 transition-colors"
                            >
                                Use Blank Template
                            </button>
                        </>
                    ) : phase !== 'complete' ? (
                        <button
                            onClick={handleCancel}
                            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
