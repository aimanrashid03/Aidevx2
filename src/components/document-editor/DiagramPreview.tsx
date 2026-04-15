import { useState, useEffect } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'

interface DiagramPreviewProps {
    html: string
    mermaidCode: string | null
    drawioXml: string | null
    /** When true, shows a yellow chip indicating drawio preview failed but XML is preserved */
    drawioFallback?: boolean
}

function DiagramPreviewInner({ html, mermaidCode, drawioXml, drawioFallback }: DiagramPreviewProps) {
    const [renderedSvg, setRenderedSvg] = useState<string | null>(null)
    const [renderError, setRenderError] = useState<string | null>(null)

    useEffect(() => {
        setRenderedSvg(null)
        setRenderError(null)
        if (!mermaidCode) return

        import('mermaid').then(mod => {
            const mermaid = mod.default
            mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
            mermaid.render(`preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, mermaidCode)
                .then(({ svg }) => {
                    const patched = svg
                        .replace(/style="[^"]*max-width[^"]*"/gi, 'style="width:100%;height:auto;"')
                        .replace(/<svg /, '<svg style="width:100%;height:auto;" ')
                    setRenderedSvg(patched)
                })
                .catch(e => setRenderError(String(e)))
        }).catch(e => setRenderError(String(e)))
    }, [mermaidCode])

    if (mermaidCode) {
        return (
            <div className="p-2 flex flex-col gap-2 h-full overflow-y-auto">
                {renderedSvg ? (
                    <div
                        className="rounded border border-slate-200 bg-white p-3 w-full overflow-x-auto min-h-[220px] flex items-center justify-center [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: renderedSvg }}
                    />
                ) : renderError ? (
                    <div className="flex flex-col gap-1.5 rounded border border-red-200 bg-red-50 p-3 min-h-[80px]">
                        <p className="text-[11px] font-medium text-red-600">Diagram failed to render — check syntax.</p>
                        <pre className="text-[10px] font-mono text-red-500 whitespace-pre-wrap">{renderError}</pre>
                        <pre className="text-[10px] font-mono text-slate-500 bg-white p-2 rounded border border-slate-200 overflow-auto whitespace-pre-wrap">{mermaidCode}</pre>
                    </div>
                ) : (
                    <div className="min-h-[80px] flex items-center justify-center text-[11px] text-slate-400 animate-pulse">
                        Rendering diagram…
                    </div>
                )}
                <details className="text-[10px] shrink-0">
                    <summary className="text-slate-400 cursor-pointer hover:text-slate-600">Mermaid source</summary>
                    <pre className="mt-1 text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 overflow-auto whitespace-pre-wrap">{mermaidCode}</pre>
                </details>
            </div>
        )
    }

    if (drawioXml) {
        return (
            <div className="p-2 flex flex-col gap-2 h-full overflow-y-auto">
                {drawioFallback && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        Preview unavailable — diagram XML will still be saved/exported.
                    </div>
                )}
                {!drawioFallback && (
                    <p className="text-[11px] text-slate-500 italic">Draw.io diagram generated — click Insert to add to document.</p>
                )}
                <pre className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 overflow-auto whitespace-pre-wrap flex-1">{drawioXml}</pre>
            </div>
        )
    }

    return (
        <div
            className="p-2 text-[12px] text-slate-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html || 'Generated content will appear here' }}
        />
    )
}

export function DiagramPreview(props: DiagramPreviewProps) {
    return (
        <ErrorBoundary fallback={(err) => (
            <div className="p-3 flex flex-col gap-2">
                <p className="text-[11px] font-medium text-red-600">Diagram failed to render — check syntax.</p>
                <p className="text-[10px] text-red-500 font-mono">{err.message}</p>
                {props.mermaidCode && (
                    <pre className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 overflow-auto whitespace-pre-wrap">
                        {props.mermaidCode}
                    </pre>
                )}
            </div>
        )}>
            <DiagramPreviewInner {...props} />
        </ErrorBoundary>
    )
}
