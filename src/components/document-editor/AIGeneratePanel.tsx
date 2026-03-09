import { useState, useRef, useEffect, useCallback } from 'react'
import {
    Sparkles, Loader2, Copy, Check, MessageSquare, Zap, Send,
    Trash2, CornerDownLeft, ChevronDown, ChevronRight, FileText, Code,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string  // HTML string for assistant, plain text for user
}

interface ProjectDocument {
    id: string
    name: string
    file_path: string
}

interface AIGeneratePanelProps {
    projectId: string
    /** Pre-fill the section title (set when user clicks sparkle in TOC) */
    prefillTitle?: string
    /** Called with HTML to paste at cursor in OO */
    onInsert?: (html: string) => void
}

// Minimal HTML sanitiser — keep only safe formatting tags
function sanitizeHtml(html: string): string {
    const allowed = new Set([
        'p', 'ul', 'ol', 'li', 'h3', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'strong', 'em', 'br',
    ])
    // Use DOMParser to strip disallowed tags while keeping their text content
    const doc = new DOMParser().parseFromString(html, 'text/html')
    function clean(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
        if (node.nodeType !== Node.ELEMENT_NODE) return ''
        const el = node as Element
        const tag = el.tagName.toLowerCase()
        const children = Array.from(el.childNodes).map(clean).join('')
        if (!allowed.has(tag)) return children
        return `<${tag}>${children}</${tag}>`
    }
    return Array.from(doc.body.childNodes).map(clean).join('')
}

export default function AIGeneratePanel({ projectId, prefillTitle, onInsert }: AIGeneratePanelProps) {
    const [tab, setTab] = useState<'generate' | 'chat'>('generate')

    // ── Generate tab state ──────────────────────────────────────────────────
    const [sectionTitle, setSectionTitle] = useState('')
    const [instructions, setInstructions] = useState('')
    const [generatedHtml, setGeneratedHtml] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [genError, setGenError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [viewSource, setViewSource] = useState(false)
    const [genSources, setGenSources] = useState<string[]>([])
    const genAbortRef = useRef<AbortController | null>(null)

    // ── Document selector state ─────────────────────────────────────────────
    const [projectDocs, setProjectDocs] = useState<ProjectDocument[]>([])
    const [selectedDocPaths, setSelectedDocPaths] = useState<Set<string>>(new Set())
    const [docsExpanded, setDocsExpanded] = useState(false)

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

    // Load project documents for the context selector
    useEffect(() => {
        if (!projectId) return
        supabase
            .from('project_documents')
            .select('id, name, file_path')
            .eq('project_id', projectId)
            .then(({ data }) => {
                if (data) setProjectDocs(data as ProjectDocument[])
            })
    }, [projectId])

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
        onSources?: (sources: string[]) => void,
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
            if (done) {
                // Flush any remaining data in the buffer
                if (buf.trim()) {
                    const line = buf.trim()
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim()
                        if (data !== '[DONE]') {
                            try {
                                const parsed = JSON.parse(data)
                                if (parsed?.type === 'sources') {
                                    onSources?.(parsed.sources ?? [])
                                } else {
                                    const token: string = parsed?.choices?.[0]?.delta?.content ?? ''
                                    if (token) onToken(token)
                                }
                            } catch { /* ignore malformed */ }
                        }
                    }
                }
                break
            }
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const data = line.slice(6).trim()
                if (data === '[DONE]') return
                try {
                    const parsed = JSON.parse(data)
                    // Custom sources event
                    if (parsed?.type === 'sources') {
                        onSources?.(parsed.sources ?? [])
                        continue
                    }
                    const token: string = parsed?.choices?.[0]?.delta?.content ?? ''
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
        setGeneratedHtml('')
        setGenError(null)
        setCopied(false)
        setGenSources([])
        setViewSource(false)

        const selectedPaths = selectedDocPaths.size > 0
            ? projectDocs
                .filter(d => selectedDocPaths.has(d.id))
                .map(d => d.file_path)
            : undefined

        try {
            let acc = ''
            await streamSSE(
                {
                    projectId,
                    sectionTitle: sectionTitle.trim(),
                    instructions: instructions.trim() || undefined,
                    selectedDocumentPaths: selectedPaths,
                },
                ctrl.signal,
                (token) => {
                    acc += token
                    setGeneratedHtml(acc)
                },
                (sources) => setGenSources(sources),
            )
        } catch (err) {
            if ((err as Error).name !== 'AbortError')
                setGenError((err as Error).message || 'Generation failed')
        } finally {
            setIsGenerating(false)
        }
    }, [sectionTitle, instructions, projectId, selectedDocPaths, projectDocs])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedHtml)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch { /* ignore */ }
    }

    const handleInsert = () => {
        if (!generatedHtml) return
        onInsert?.(sanitizeHtml(generatedHtml))
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
                },
            )
        } catch (err) {
            // Always remove the empty placeholder assistant message
            setChatHistory(prev => prev.slice(0, -1))
            if ((err as Error).name !== 'AbortError') {
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

    const toggleDoc = (id: string) => {
        setSelectedDocPaths(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
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
                        {/* Section title */}
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

                        {/* Instructions */}
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

                        {/* Context document selector */}
                        {projectDocs.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setDocsExpanded(v => !v)}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition-colors w-full"
                                >
                                    {docsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    Context Documents
                                    {selectedDocPaths.size > 0 && (
                                        <span className="ml-auto normal-case font-normal text-violet-600">
                                            {selectedDocPaths.size} selected
                                        </span>
                                    )}
                                </button>
                                {docsExpanded && (
                                    <div className="mt-1.5 flex flex-col gap-1">
                                        {projectDocs.map(doc => (
                                            <label
                                                key={doc.id}
                                                className="flex items-center gap-2 cursor-pointer group"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDocPaths.has(doc.id)}
                                                    onChange={() => toggleDoc(doc.id)}
                                                    className="accent-violet-600 shrink-0"
                                                />
                                                <FileText size={10} className="text-slate-400 shrink-0" />
                                                <span
                                                    className="text-[11px] text-slate-600 truncate group-hover:text-slate-800"
                                                    title={doc.name}
                                                >
                                                    {doc.name}
                                                </span>
                                            </label>
                                        ))}
                                        {selectedDocPaths.size > 0 && (
                                            <button
                                                onClick={() => setSelectedDocPaths(new Set())}
                                                className="text-[10px] text-slate-400 hover:text-slate-600 text-left mt-0.5"
                                            >
                                                Clear selection (use all)
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={generate}
                            disabled={isGenerating || !sectionTitle.trim()}
                            className="flex items-center justify-center gap-1.5 py-1.5 rounded bg-violet-600 text-white text-[11px] font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                        >
                            {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                            {isGenerating ? 'Generating…' : 'Generate with RAG'}
                        </button>
                    </div>

                    {/* Output area */}
                    <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
                        {/* Output label + view-source toggle */}
                        <div className="flex items-center justify-between shrink-0">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                Generated content
                            </label>
                            {generatedHtml && (
                                <button
                                    onClick={() => setViewSource(v => !v)}
                                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                                    title={viewSource ? 'Show preview' : 'View HTML source'}
                                >
                                    <Code size={10} />
                                    {viewSource ? 'Preview' : 'Source'}
                                </button>
                            )}
                        </div>

                        {/* Rendered HTML preview or raw source */}
                        <div className="flex-1 overflow-y-auto rounded border border-slate-200 bg-slate-50">
                            {viewSource ? (
                                <textarea
                                    value={generatedHtml}
                                    onChange={e => setGeneratedHtml(e.target.value)}
                                    className="w-full h-full resize-none text-[11px] font-mono text-slate-600 bg-slate-50 p-2 outline-none leading-relaxed"
                                />
                            ) : (
                                <div
                                    className={`p-2 text-[12px] text-slate-700 leading-relaxed prose prose-sm max-w-none
                                        [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
                                        [&_p]:mb-2 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:mb-0.5
                                        [&_table]:w-full [&_table]:border-collapse [&_table]:text-[11px]
                                        [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-1.5 [&_th]:py-1 [&_th]:text-left
                                        [&_td]:border [&_td]:border-slate-200 [&_td]:px-1.5 [&_td]:py-1
                                        ${!generatedHtml ? 'text-slate-400 italic' : ''}`}
                                    // Safe: we sanitize before insert, preview is read-only
                                    dangerouslySetInnerHTML={{
                                        __html: generatedHtml || (isGenerating ? '' : 'Generated content will appear here'),
                                    }}
                                />
                            )}
                        </div>

                        {/* Source pills */}
                        {genSources.length > 0 && (
                            <div className="shrink-0">
                                <p className="text-[10px] text-slate-400 mb-1">Sources used:</p>
                                <div className="flex flex-wrap gap-1">
                                    {genSources.map(src => (
                                        <span
                                            key={src}
                                            className="inline-flex items-center gap-1 text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded px-1.5 py-0.5"
                                            title={src}
                                        >
                                            <FileText size={9} />
                                            <span className="max-w-[120px] truncate">{src}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

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
                            disabled={!generatedHtml || isGenerating}
                            className="flex items-center justify-center gap-1 px-3 text-[11px] py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            {copied ? <Check size={11} /> : <Copy size={11} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        {onInsert && (
                            <button
                                onClick={handleInsert}
                                disabled={!generatedHtml || isGenerating}
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
                            <div key={i} className={`flex flex-col gap-1 max-w-[92%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                                <div
                                    className={`text-[12px] leading-relaxed rounded-lg px-3 py-2 ${
                                        msg.role === 'user'
                                            ? 'bg-violet-600 text-white rounded-br-sm'
                                            : 'bg-slate-100 text-slate-700 rounded-bl-sm prose prose-sm max-w-none [&_h3]:text-[12px] [&_h3]:font-semibold [&_p]:mb-1 [&_ul]:pl-4 [&_li]:mb-0.5 [&_table]:text-[11px] [&_td]:border [&_td]:border-slate-200 [&_td]:px-1 [&_th]:border [&_th]:border-slate-300 [&_th]:px-1'
                                    }`}
                                    // Assistant content is HTML from LLM; user content is plain text
                                    {...(msg.role === 'assistant'
                                        ? { dangerouslySetInnerHTML: { __html: msg.content || (isChatting && i === chatHistory.length - 1 ? '<span style="opacity:0.6">Thinking…</span>' : '') } }
                                        : { children: msg.content }
                                    )}
                                />
                                {/* Insert button for assistant messages */}
                                {msg.role === 'assistant' && msg.content && onInsert && (
                                    <button
                                        onClick={() => onInsert(sanitizeHtml(msg.content))}
                                        className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 transition-colors"
                                        title="Insert into document"
                                    >
                                        <CornerDownLeft size={10} /> Insert
                                    </button>
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
