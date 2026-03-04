import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, Copy, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface AIGeneratePanelProps {
    sectionTitle: string
    projectId: string
    onClose: () => void
}

/**
 * Slide-in panel that streams AI-generated content for a specific section.
 *
 * Because OnlyOffice manages its own document state inside an iframe, we cannot
 * insert text programmatically from the parent page. Instead, the user reviews
 * the generated text here and copies it to clipboard, then pastes (Ctrl+V) into
 * the OnlyOffice editor at the desired position.
 */
export default function AIGeneratePanel({ sectionTitle, projectId, onClose }: AIGeneratePanelProps) {
    const [generatedText, setGeneratedText] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Start generation immediately on mount
    useEffect(() => {
        generate()
        return () => { abortRef.current?.abort() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const generate = async () => {
        setIsGenerating(true)
        setGeneratedText('')
        setError(null)
        setCopied(false)

        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const accessToken = session?.access_token
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

            const response = await fetch(`${supabaseUrl}/functions/v1/generate_section`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken ?? supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({ projectId, sectionTitle }),
            })

            if (!response.ok || !response.body) {
                const errText = await response.text()
                throw new Error(errText || 'Generation failed')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const data = line.slice(6).trim()
                    if (data === '[DONE]') break

                    try {
                        const parsed = JSON.parse(data)
                        const token: string = parsed?.choices?.[0]?.delta?.content ?? ''
                        if (!token) continue
                        setGeneratedText(prev => prev + token)
                        // Auto-scroll textarea to bottom
                        if (textareaRef.current) {
                            textareaRef.current.scrollTop = textareaRef.current.scrollHeight
                        }
                    } catch {
                        // Ignore malformed SSE lines
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') return
            setError((err as Error).message || 'Failed to generate content')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback — select all text in the textarea
            textareaRef.current?.select()
        }
    }

    return (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-violet-500" />
                    <span className="text-[12px] font-semibold text-slate-700">AI Generate</span>
                </div>
                <button onClick={onClose} className="p-0.5 hover:bg-slate-100 rounded text-slate-400">
                    <X size={14} />
                </button>
            </div>

            {/* Section label */}
            <div className="px-3 py-2 border-b border-slate-100 shrink-0">
                <p className="text-[11px] text-slate-500 leading-snug">
                    <span className="font-medium text-slate-700">Section:</span> {sectionTitle}
                </p>
            </div>

            {/* Generated text area */}
            <div className="flex-1 p-3 overflow-hidden flex flex-col gap-2">
                <textarea
                    ref={textareaRef}
                    value={generatedText}
                    onChange={e => setGeneratedText(e.target.value)}
                    readOnly={isGenerating}
                    className="flex-1 resize-none text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100 font-mono leading-relaxed"
                    placeholder={isGenerating ? 'Generating…' : 'Generated content will appear here'}
                />

                {isGenerating && (
                    <div className="flex items-center gap-1.5 text-violet-500 shrink-0">
                        <Loader2 size={11} className="animate-spin" />
                        <span className="text-[11px]">Generating…</span>
                    </div>
                )}

                {error && (
                    <p className="text-[11px] text-red-500 shrink-0">{error}</p>
                )}
            </div>

            {/* Footer actions */}
            <div className="px-3 pb-3 flex flex-col gap-2 shrink-0">
                {/* Copy hint */}
                <p className="text-[10px] text-slate-400 text-center leading-tight">
                    Copy the content below, then paste (Ctrl+V) into OnlyOffice at the desired position.
                </p>

                <div className="flex gap-2">
                    <button
                        onClick={generate}
                        disabled={isGenerating}
                        className="flex-1 text-[11px] py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        Regenerate
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={!generatedText || isGenerating}
                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
        </aside>
    )
}
