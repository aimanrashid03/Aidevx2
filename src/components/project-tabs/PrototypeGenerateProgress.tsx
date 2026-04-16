import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Cpu, Blocks, CheckCircle2, XCircle, Loader2, Monitor } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PrototypePageModel {
    key: string;
    title: string;
    type: string;
    html: string;
}

interface PrototypeModelData {
    systemName: string;
    shortDescription: string;
    pages: PrototypePageModel[];
    modals: Array<{ id: string; html: string }>;
    navGroups: Array<{ label: string; items: Array<{ key: string; title: string; icon: string }> }>;
}

export interface GeneratedPrototype {
    id: string;
    name: string;
    sourceDocId: string;
    sourceDocTitle: string;
    sourceDocType: string;
    createdAt: string;
    html: string;
    model?: PrototypeModelData;
}

interface Props {
    projectId: string;
    docId: string;
    docTitle: string;
    docType: string;
    onComplete: (proto: GeneratedPrototype) => void;
    onCancel: () => void;
}

// ─── Phase definitions ────────────────────────────────────────────────────────

type PhaseKey = 'extract' | 'generate' | 'assemble' | 'save';
type PhaseStatus = 'pending' | 'active' | 'complete';
type OverallPhase = PhaseKey | 'done' | 'error';

const PHASES: { key: PhaseKey; label: string; description: string; Icon: React.ElementType }[] = [
    { key: 'extract',  label: 'Extract & Search',    description: 'Reading document and searching project context',      Icon: Search       },
    { key: 'generate', label: 'Generate Structure',   description: 'AI is designing the prototype layout and pages',      Icon: Cpu          },
    { key: 'assemble', label: 'Assemble & Validate',  description: 'Building HTML and applying the design system',        Icon: Blocks       },
    { key: 'save',     label: 'Save & Finalize',      description: 'Saving prototype to workspace',                       Icon: CheckCircle2 },
];

const PHASE_RANGES: Record<OverallPhase, [number, number]> = {
    extract:  [0,  25],
    generate: [25, 75],
    assemble: [75, 95],
    save:     [95, 100],
    done:     [100, 100],
    error:    [0,  0],
};

// Rotating tips shown during the long LLM generation phase
const GENERATE_TIPS = [
    'Analyzing document requirements...',
    'Designing page layouts and navigation...',
    'Building UI components and forms...',
    'Applying CORRAD design patterns...',
    'Generating responsive structure...',
];

function formatElapsed(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrototypeGenerateProgress({
    projectId,
    docId,
    docTitle,
    docType,
    onComplete,
    onCancel,
}: Props) {
    const [phase, setPhase] = useState<OverallPhase>('extract');
    const [simulatedPercent, setSimulatedPercent] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);

    const abortRef = useRef<AbortController | null>(null);
    const startedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    // ── Elapsed timer ──────────────────────────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // ── Rotating tips during generate phase ───────────────────────────────
    useEffect(() => {
        if (phase !== 'generate') return;
        const id = setInterval(() => setTipIndex(i => (i + 1) % GENERATE_TIPS.length), 8000);
        return () => clearInterval(id);
    }, [phase]);

    // ── Trickle progress bar ───────────────────────────────────────────────
    useEffect(() => {
        const [floor, ceiling] = PHASE_RANGES[phase];

        if (phase === 'done') { setSimulatedPercent(100); return; }
        if (phase === 'error') return;

        // Jump to phase floor immediately if we haven't reached it yet
        setSimulatedPercent(prev => Math.max(prev, floor));

        // Trickle asymptotically toward ceiling (never quite reaches it)
        const id = setInterval(() => {
            setSimulatedPercent(prev => {
                const remaining = ceiling - prev;
                const increment = Math.max(remaining * 0.03, 0.1);
                return Math.min(prev + increment, ceiling - 0.5);
            });
        }, 500);

        return () => clearInterval(id);
    }, [phase]);

    // ── SSE fetch ─────────────────────────────────────────────────────────
    const startGeneration = useCallback(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate_prototype`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                    },
                    body: JSON.stringify({ projectId, docId, docTitle, docType }),
                    signal: controller.signal,
                }
            );

            if (!res.ok || !res.body) {
                const msg = await res.text().catch(() => res.statusText);
                throw new Error(msg || `Server error ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr || jsonStr === '[DONE]') continue;

                    try {
                        const event = JSON.parse(jsonStr);

                        if (event.type === 'progress') {
                            const s: string = event.status ?? '';
                            if (s.includes('Extracting'))  setPhase('extract');
                            if (s.includes('Generating'))  setPhase('generate');
                            if (s.includes('Assembling'))  setPhase('assemble');
                            if (s.includes('Saving'))      setPhase('save');
                        } else if (event.type === 'complete') {
                            setPhase('done');
                            const proto: GeneratedPrototype = {
                                id: event.prototypeId,
                                name: event.name,
                                sourceDocId: event.sourceDocId,
                                sourceDocTitle: event.sourceDocTitle,
                                sourceDocType: event.sourceDocType,
                                createdAt: event.createdAt,
                                html: event.html,
                                model: event.model ?? undefined,
                            };
                            // Brief delay so user sees the completed state before transitioning
                            setTimeout(() => onCompleteRef.current(proto), 800);
                            return;
                        } else if (event.type === 'error') {
                            throw new Error(event.message || 'Generation failed');
                        }
                    } catch (parseErr) {
                        if (parseErr instanceof SyntaxError) continue;
                        throw parseErr;
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            setPhase('error');
            setError((err as Error).message || 'Generation failed');
        }
    }, [projectId, docId, docTitle, docType]);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        startGeneration();
        return () => {
            abortRef.current?.abort();
            startedRef.current = false;
        };
    }, [startGeneration]);

    const handleCancel = () => {
        abortRef.current?.abort();
        onCancel();
    };

    const handleRetry = () => {
        setPhase('extract');
        setSimulatedPercent(0);
        setElapsedSeconds(0);
        setTipIndex(0);
        setError(null);
        startedRef.current = false;
        startGeneration();
    };

    // ── Phase status helpers ───────────────────────────────────────────────
    const PHASE_ORDER: OverallPhase[] = ['extract', 'generate', 'assemble', 'save', 'done'];
    const currentIndex = PHASE_ORDER.indexOf(phase);

    const getPhaseStatus = (key: PhaseKey): PhaseStatus => {
        const keyIndex = PHASE_ORDER.indexOf(key);
        if (keyIndex < currentIndex) return 'complete';
        if (keyIndex === currentIndex) return phase === 'done' ? 'complete' : 'active';
        return 'pending';
    };

    // Status text shown below the progress bar
    const statusText = phase === 'generate'
        ? GENERATE_TIPS[tipIndex]
        : phase === 'extract'  ? 'Reading document and searching project context...'
        : phase === 'assemble' ? 'Building HTML and applying the design system...'
        : phase === 'save'     ? 'Saving prototype to workspace...'
        : phase === 'done'     ? 'Prototype ready!'
        : phase === 'error'    ? 'Generation failed'
        : '';

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-50 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white mb-4"
                        style={{ background: 'var(--accent-600)' }}
                    >
                        <Monitor size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Generating Prototype
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {docTitle} &mdash; <span className="font-medium">{docType}</span>
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span className="transition-all duration-500">{statusText}</span>
                        <span className="font-mono tabular-nums text-slate-400">{formatElapsed(elapsedSeconds)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${simulatedPercent}%`,
                                background: phase === 'error' ? '#ef4444' : 'var(--accent-600)',
                            }}
                        />
                    </div>
                </div>

                {/* Vertical stepper */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                    {PHASES.map((p, i) => {
                        const status = getPhaseStatus(p.key);
                        const isLast = i === PHASES.length - 1;

                        return (
                            <div key={p.key} className="flex items-start gap-4 relative">
                                {/* Connector line */}
                                {!isLast && (
                                    <div
                                        className="absolute left-[19px] top-10 w-0.5 h-8 transition-colors duration-500"
                                        style={{
                                            background: status === 'complete'
                                                ? 'var(--accent-400)'
                                                : '#e2e8f0',
                                        }}
                                    />
                                )}

                                {/* Icon circle */}
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                                        status === 'complete'
                                            ? 'text-[var(--accent-600)]'
                                            : status === 'active'
                                            ? 'text-white'
                                            : 'bg-slate-100 text-slate-400'
                                    }`}
                                    style={
                                        status === 'complete'
                                            ? { background: 'var(--accent-100)', border: '1px solid var(--accent-200)' }
                                            : status === 'active'
                                            ? { background: 'var(--accent-600)' }
                                            : {}
                                    }
                                >
                                    {status === 'active' ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : status === 'complete' ? (
                                        <CheckCircle2 size={18} />
                                    ) : (
                                        <p.Icon size={18} />
                                    )}
                                </div>

                                {/* Text */}
                                <div className={`${isLast ? 'pb-0' : 'pb-8'}`}>
                                    <p className={`text-sm font-bold transition-colors duration-300 ${
                                        status === 'active'   ? 'text-slate-900' :
                                        status === 'complete' ? 'text-slate-600' :
                                        'text-slate-400'
                                    }`}>
                                        {p.label}
                                    </p>
                                    <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                                        status === 'active'   ? 'text-slate-500' :
                                        status === 'complete' ? 'text-slate-400' :
                                        'text-slate-300'
                                    }`}>
                                        {p.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Error state */}
                {phase === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Generation failed</p>
                                <p className="text-xs text-red-600 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-3">
                    {phase === 'error' ? (
                        <>
                            <button
                                onClick={handleRetry}
                                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-800 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onCancel}
                                className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    ) : phase !== 'done' ? (
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
    );
}
