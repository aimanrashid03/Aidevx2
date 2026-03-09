import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Loader2, Copy, Check, MessageSquare, Zap, Send, Trash2, CornerDownLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

interface AIGeneratePanelProps {
    projectId: string
    /** Pre-fill the section title (set when user clicks sparkle in TOC) */
    prefillTitle?: string
    /** Called with plain text to paste at cursor in OO */
    onInsert?: (text: string) => void
}

export default function AIGeneratePanel({ projectId, prefillTitle, onInsert }: AIGeneratePanelProps) {
    const [tab, setTab] = useState<'generate' | 'chat'>('generate')

    // ── Generate tab state ──────────────────────────────────────────────────
    const [sectionTitle, setSectionTitle] = useState('')
    const [instructions, setInstructions] = useState('')
    const [generatedText, setGeneratedText] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [genError, setGenError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const genAbortRef = useRef<AbortController | null>(null)
    const genTextareaRef = useRef<HTMLTextAreaElement>(null)

    // ── Chat tab state ──────────────────────────────────────────────────────
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [isChatting, setIsChatting] = useState(false)
    const [chatError, setChatError] = useState<string | null>(null)
    const chatAbortRef = useRef<AbortController | null>(null)
    const chatBottomRef = useRef<HTMLDivElement>(null)
    const chatInputRef = useRef<HTMLTextAreaElement>(null)

    // Pre-fill section title when TOC sparkle is clicked
    useEffect(() => {
        if (prefillTitle) {
            setSectionTitle(prefillTitle)
            setTab('generate')
        }
    }, [prefillTitle])

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatHistory, isChatting])

    // ── Helpers ─────────────────────────────────────────────────────────────
    const getAuthHeaders = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY as string
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        }
    }, [])

    async function streamSSE(
        body: object,
        signal: AbortSignal,
        onToken: (token: string) => void,
    ) {
        const headers = await getAuthHeaders()
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate_section`,
            { method: 'POST', headers, body: JSON.stringify(body), signal }
        )
        if (!res.ok || !res.body) {
            const msg = await res.text().catch(() => res.statusText)
            throw new Error(msg || 'Request failed')
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const data = line.slice(6).trim()
                if (data === '[DONE]') return
                try {
                    const token: string = JSON.parse(data)?.choices?.[0]?.delta?.content ?? ''
                    if (token) onToken(token)
                } catch { /* ignore malformed */ }
            }
        }
    }

    // ── Generate ────────────────────────────────────────────────────────────
    const generate = useCallback(async () => {
        if (!sectionTitle.trim()) return
        genAbortRef.current?.abort()
        const ctrl = new AbortController()
        genAbortRef.current = ctrl

        setIsGenerating(true)
        setGeneratedText('')
        setGenError(null)
        setCopied(false)

        try {
            let acc = ''
            await streamSSE(
                { projectId, sectionTitle: sectionTitle.trim(), instructions: instructions.trim() || undefined },
                ctrl.signal,
                (token) => {
                    acc += token
                    setGeneratedText(acc)
                    if (genTextareaRef.current)
                        genTextareaRef.current.scrollTop = genTextareaRef.current.scrollHeight
                }
            )
        } catch (err) {
            if ((err as Error).name !== 'AbortError')
                setGenError((err as Error).message || 'Generation failed')
        } finally {
            setIsGenerating(false)
        }
    }, [sectionTitle, instructions, projectId])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            genTextareaRef.current?.select()
        }
    }

    const handleInsert = () => {
        if (!generatedText) return
        onInsert?.(generatedText)
    }

    // ── Chat ────────────────────────────────────────────────────────────────
    const sendChat = useCallback(async () => {
        const text = chatInput.trim()
        if (!text || isChatting) return
        setChatInput('')

        const userMsg: ChatMessage = { role: 'user', content: text }
        setChatHistory(prev => [...prev, userMsg])
        setChatError(null)

        chatAbortRef.current?.abort()
        const ctrl = new AbortController()
        chatAbortRef.current = ctrl

        setIsChatting(true)
        let assistantAcc = ''

        setChatHistory(prev => [...prev, { role: 'assistant', content: '' }])

        try {
            await streamSSE(
                {
                    projectId,
                    sectionTitle: text,
                    chatMode: true,
                    chatHistory: [...chatHistory, userMsg].slice(-10),
                },
                ctrl.signal,
                (token) => {
                    assistantAcc += token
                    setChatHistory(prev => {
                        const next = [...prev]
                        next[next.length - 1] = { role: 'assistant', content: assistantAcc }
                        return next
                    })
                }
            )
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setChatHistory(prev => prev.slice(0, -1)) // remove empty assistant msg
                setChatError((err as Error).message || 'Chat failed')
            }
        } finally {
            setIsChatting(false)
        }
    }, [chatInput, isChatting, chatHistory, projectId])

    const clearChat = () => {
        chatAbortRef.current?.abort()
        setChatHistory([])
        setChatError(null)
        setIsChatting(false)
    }

    const tabCls = (t: typeof tab) =>
        `flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium border-b-2 transition-colors cursor-pointer select-none ${
            tab === t
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
        }`

    return (
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10">
            {/* Header */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-200 shrink-0 bg-slate-900">
                <Sparkles size={13} className="text-violet-400" />
                <span className="text-[12px] font-semibold text-white">AI Assistant</span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 shrink-0">
                <button className={tabCls('generate')} onClick={() => setTab('generate')}>
                    <Zap size={11} /> Generate
                </button>
                <button className={tabCls('chat')} onClick={() => setTab('chat')}>
                    <MessageSquare size={11} /> Chat
                </button>
            </div>

            {/* ── GENERATE TAB ── */}
            {tab === 'generate' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex flex-col gap-2.5 p-3 border-b border-slate-100 shrink-0">
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                                Section title
                            </label>
                            <textarea
                                value={sectionTitle}
                                onChange={e => setSectionTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
                                placeholder="e.g. System Requirements, Risk Assessment…"
                                rows={2}
                                className="w-full resize-none text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                                Instructions <span className="font-normal normal-case">(optional)</span>
                            </label>
                            <textarea
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                                placeholder="e.g. Focus on scalability, use bullet points…"
                                rows={2}
                                className="w-full resize-none text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100"
                            />
                        </div>
                        <button
                            onClick={generate}
                            disabled={isGenerating || !sectionTitle.trim()}
                            className="flex items-center justify-center gap-1.5 py-1.5 rounded bg-violet-600 text-white text-[11px] font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                        >
                            {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                            {isGenerating ? 'Generating…' : 'Generate with RAG'}
                        </button>
                    </div>

                    {/* Output */}
                    <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">
                            Generated content
                        </label>
                        <textarea
                            ref={genTextareaRef}
                            value={generatedText}
                            onChange={e => setGeneratedText(e.target.value)}
                            readOnly={isGenerating}
                            placeholder={isGenerating ? 'Generating…' : 'Generated text will appear here'}
                            className="flex-1 resize-none text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100 leading-relaxed"
                        />
                        {genError && <p className="text-[11px] text-red-500 shrink-0">{genError}</p>}
                    </div>

                    {/* Footer */}
                    <div className="px-3 pb-3 flex gap-2 shrink-0 border-t border-slate-100 pt-2">
                        <button
                            onClick={generate}
                            disabled={isGenerating || !sectionTitle.trim()}
                            className="flex-1 text-[11px] py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            ↺ Regen
                        </button>
                        <button
                            onClick={handleCopy}
                            disabled={!generatedText || isGenerating}
                            className="flex items-center justify-center gap-1 px-3 text-[11px] py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            {copied ? <Check size={11} /> : <Copy size={11} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        {onInsert && (
                            <button
                                onClick={handleInsert}
                                disabled={!generatedText || isGenerating}
                                className="flex items-center justify-center gap-1 px-3 text-[11px] py-1.5 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                                title="Insert at cursor in document"
                            >
                                <CornerDownLeft size={11} />
                                Insert
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── CHAT TAB ── */}
            {tab === 'chat' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                        {chatHistory.length === 0 && !isChatting && (
                            <div className="flex-1 flex items-center justify-center text-center text-[11px] text-slate-400 px-4 py-10">
                                Ask anything — summarize, rewrite, explain a concept, or get help drafting content.
                            </div>
                        )}
                        {chatHistory.map((msg, i) => (
                            <div
                                key={i}
                                className={`text-[12px] leading-relaxed rounded-lg px-3 py-2 max-w-[90%] ${
                                    msg.role === 'user'
                                        ? 'self-end bg-violet-600 text-white rounded-br-sm'
                                        : 'self-start bg-slate-100 text-slate-700 rounded-bl-sm'
                                }`}
                            >
                                {msg.content || (msg.role === 'assistant' && isChatting && i === chatHistory.length - 1
                                    ? <span className="opacity-60">Thinking…</span>
                                    : null
                                )}
                            </div>
                        ))}
                        {chatError && <p className="text-[11px] text-red-500">{chatError}</p>}
                        <div ref={chatBottomRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-slate-200 p-2 flex gap-2 items-end shrink-0">
                        <textarea
                            ref={chatInputRef}
                            value={chatInput}
                            onChange={e => {
                                setChatInput(e.target.value)
                                e.target.style.height = '32px'
                                e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() }
                            }}
                            placeholder="Ask AI anything…"
                            rows={1}
                            className="flex-1 resize-none text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100 min-h-[32px] max-h-[80px]"
                        />
                        <div className="flex gap-1 shrink-0">
                            <button
                                onClick={clearChat}
                                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                title="Clear chat"
                            >
                                <Trash2 size={13} />
                            </button>
                            <button
                                onClick={sendChat}
                                disabled={!chatInput.trim() || isChatting}
                                className="p-1.5 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                            >
                                <Send size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    )
}
