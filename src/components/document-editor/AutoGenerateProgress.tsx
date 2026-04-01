import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, XCircle, FileText, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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
    const [current, setCurrent] = useState(0)
    const [total, setTotal] = useState(0)
    const [, setCurrentSection] = useState('')
    const [statusText, setStatusText] = useState('Memulakan proses penjanaan...')
    const [sections, setSections] = useState<SectionStatus[]>([])
    const [fatalError, setFatalError] = useState<string | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const startedRef = useRef(false)

    const startGeneration = useCallback(async () => {
        if (startedRef.current) return
        startedRef.current = true

        const controller = new AbortController()
        abortRef.current = controller

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
                        selectedDocumentPaths,
                        projectName,
                        docTitle,
                    }),
                    signal: controller.signal,
                },
            )

            console.log('[AutoGen] Response status:', response.status, 'has body:', !!response.body)
            if (!response.ok || !response.body) {
                const text = await response.text()
                throw new Error(text || `Server error ${response.status}`)
            }

            setPhase('generating')

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
                            setCurrent(event.current)
                            setTotal(event.total)
                            setCurrentSection(event.section)
                            setStatusText(event.status)

                            if (event.section && event.status?.includes('Mencari')) {
                                setSections(prev => {
                                    const existing = prev.find(s => s.title === event.section)
                                    if (existing) {
                                        return prev.map(s => s.title === event.section ? { ...s, status: 'searching' } : s)
                                    }
                                    return [...prev, { title: event.section, status: 'searching' }]
                                })
                            } else if (event.section && event.status?.includes('Menjana')) {
                                setSections(prev =>
                                    prev.map(s => s.title === event.section ? { ...s, status: 'generating' } : s)
                                )
                            } else if (event.status?.includes('DOCX')) {
                                setPhase('building')
                                setStatusText('Membina dokumen DOCX...')
                            }
                        } else if (event.type === 'section_complete') {
                            setSections(prev =>
                                prev.map(s => s.title === event.section ? { ...s, status: 'complete' } : s)
                            )
                        } else if (event.type === 'section_error') {
                            setSections(prev =>
                                prev.map(s => s.title === event.section ? { ...s, status: 'error', error: event.error } : s)
                            )
                        } else if (event.type === 'complete') {
                            setPhase('complete')
                            onComplete({
                                docId: event.docId,
                                storagePath: event.storagePath,
                                documentKey: event.documentKey,
                                publicUrl: event.publicUrl,
                            })
                        } else if (event.type === 'error') {
                            setPhase('error')
                            setFatalError(event.message)
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') return
            setPhase('error')
            setFatalError((err as Error).message || 'Connection failed')
        }
    }, [projectId, docType, selectedDocumentPaths, projectName, docTitle, onComplete])

    useEffect(() => {
        // Reset startedRef on each effect invocation so React StrictMode
        // double-fire (mount → cleanup → re-mount) works correctly.
        startedRef.current = false
        startGeneration()
        return () => {
            abortRef.current?.abort()
        }
    }, [startGeneration])

    const handleCancel = () => {
        abortRef.current?.abort()
        onCancel()
    }

    const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-2xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white mb-4" style={{ background: 'var(--accent-600)' }}>
                        <Sparkles size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Menjana Dokumen BRS
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {projectName} &mdash; {docTitle}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span>{statusText}</span>
                        <span>{total > 0 ? `${current} / ${total}` : ''}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--accent-600)] rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${phase === 'building' ? 95 : phase === 'complete' ? 100 : progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Section list */}
                <div className="bg-white border border-slate-200 rounded-lg max-h-80 overflow-y-auto mb-6">
                    {sections.length === 0 && phase === 'starting' && (
                        <div className="p-6 text-center text-sm text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                            Menyediakan proses penjanaan...
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
                                <span className="text-[10px] text-slate-400">Mencari...</span>
                            )}
                            {s.status === 'generating' && (
                                <span className="text-[10px] text-slate-900 font-medium">Menjana...</span>
                            )}
                            {s.status === 'error' && (
                                <span className="text-[10px] text-amber-500" title={s.error}>Gagal</span>
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
                                <p className="text-sm font-medium text-red-800">Penjanaan gagal</p>
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
                                    setCurrent(0)
                                    setTotal(0)
                                    setFatalError(null)
                                    startGeneration()
                                }}
                                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-800 transition-colors"
                            >
                                Cuba Semula
                            </button>
                            <button
                                onClick={onFallbackEmpty}
                                className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded hover:bg-slate-50 transition-colors"
                            >
                                Guna Templat Kosong
                            </button>
                        </>
                    ) : phase !== 'complete' ? (
                        <button
                            onClick={handleCancel}
                            className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
