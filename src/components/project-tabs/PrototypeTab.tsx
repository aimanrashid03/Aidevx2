import { useState, useEffect, useRef } from 'react';
import { Plus, Play, Eye, Trash2, FileText, Loader2, Monitor, X, ChevronRight, Copy, Check as CheckIcon } from 'lucide-react';
import type { Project } from '../../context/ProjectContext';
import { supabase } from '../../lib/supabase';

interface Prototype {
    id: string;
    name: string;
    sourceDocId: string;
    sourceDocTitle: string;
    sourceDocType: string;
    createdAt: string;
    html: string;
}

// ─── Code Viewer Modal ────────────────────────────────────────────────────────

interface CodeViewerProps {
    proto: Prototype;
    onClose: () => void;
    onRun: () => void;
    onDelete: () => void;
}

function CodeViewerModal({ proto, onClose, onRun, onDelete }: CodeViewerProps) {
    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        };
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(proto.html).then(() => {
            setCopied(true);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete this prototype?')) return;
        onDelete();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in duration-200" style={{ maxHeight: '90vh' }}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Monitor size={15} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{proto.name}</p>
                            <p className="text-[11px] text-slate-400">index.html — {(proto.html.length / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            {copied ? <CheckIcon size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                            onClick={onRun}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                        >
                            <Play size={13} />
                            Run
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 rounded text-xs font-bold hover:bg-rose-50 transition-colors"
                        >
                            <Trash2 size={13} />
                            Delete
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors ml-1">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* File tab bar */}
                <div className="flex items-center gap-0 px-4 bg-slate-950 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-[11px] font-bold border-t-2 border-[var(--accent-500)] -mb-px">
                        <span className="text-[var(--accent-ring)]">{'</>'}</span>
                        index.html
                    </div>
                </div>

                {/* Code */}
                <div className="flex-1 overflow-auto bg-slate-950">
                    <pre className="text-[11px] leading-relaxed text-slate-300 p-5 font-mono whitespace-pre-wrap break-words">
                        {proto.html}
                    </pre>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                    <p className="text-[11px] text-slate-400">{proto.html.split('\n').length} lines · Generated {new Date(proto.createdAt).toLocaleString()}</p>
                    <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-900">Close</button>
                </div>
            </div>
        </div>
    );
}

// ─── Wizard Modal ─────────────────────────────────────────────────────────────

interface WizardProps {
    project: Project;
    onClose: () => void;
    onGenerated: (proto: Prototype) => void;
}

function WizardModal({ project, onClose, onGenerated }: WizardProps) {
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressLabel, setProgressLabel] = useState('');
    const [error, setError] = useState<string | null>(null);

    const docs = project.requirementDocs || [];
    const selectedDoc = docs.find(d => d.id === selectedDocId);

    const handleGenerate = async () => {
        if (!selectedDoc) return;
        setIsGenerating(true);
        setError(null);
        setProgressLabel('Starting...');

        const ctrl = new AbortController();

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            };

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate_prototype`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        projectId: project.id,
                        docId: selectedDoc.id,
                        docTitle: selectedDoc.title,
                        docType: selectedDoc.type,
                    }),
                    signal: ctrl.signal,
                }
            );

            if (!res.ok || !res.body) {
                const msg = await res.text().catch(() => res.statusText);
                throw new Error(msg || 'Request failed');
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
                            setProgressLabel(event.status ?? '');
                        } else if (event.type === 'complete') {
                            const proto: Prototype = {
                                id: event.prototypeId,
                                name: event.name,
                                sourceDocId: event.sourceDocId,
                                sourceDocTitle: event.sourceDocTitle,
                                sourceDocType: event.sourceDocType,
                                createdAt: event.createdAt,
                                html: event.html,
                            };
                            onGenerated(proto);
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
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message || 'Generation failed');
                setIsGenerating(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Monitor size={16} className="text-[var(--accent-600)]" />
                            <h2 className="text-base font-bold text-slate-900">New Prototype</h2>
                        </div>
                        <p className="text-xs text-slate-500">Select a workspace document to generate a front-end prototype.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors ml-2">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5">
                    {!isGenerating ? (
                        <>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">Select a document from workspace</p>
                            {docs.length === 0 ? (
                                <div className="border border-dashed border-slate-200 rounded p-6 text-center">
                                    <FileText size={20} className="text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">No documents in workspace yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-56 overflow-y-auto">
                                    {docs.map(doc => (
                                        <button
                                            key={doc.id}
                                            onClick={() => setSelectedDocId(doc.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded border text-left transition-all ${
                                                selectedDocId === doc.id
                                                    ? 'border-slate-900 bg-slate-50'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                                                selectedDocId === doc.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {doc.type}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{doc.title}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(doc.lastModified).toLocaleDateString()}</p>
                                            </div>
                                            {selectedDocId === doc.id && (
                                                <ChevronRight size={14} className="text-slate-900 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {error && (
                                <p className="mt-3 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>
                            )}
                        </>
                    ) : (
                        <div className="py-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded bg-[var(--accent-50)] border border-[var(--accent-200)] flex items-center justify-center shrink-0">
                                    <Loader2 size={16} className="text-[var(--accent-600)] animate-spin" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900">Generating prototype…</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{progressLabel}</p>
                                </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                                <div className="h-full bg-[var(--accent-500)] rounded animate-pulse" style={{ width: '100%' }} />
                            </div>
                        </div>
                    )}
                </div>

                {!isGenerating && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900">
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={!selectedDocId}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                            <Monitor size={14} />
                            Generate
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface Props {
    project: Project;
}

export default function PrototypeTab({ project }: Props) {
    const [prototypes, setPrototypes] = useState<Prototype[]>([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [viewingProto, setViewingProto] = useState<Prototype | null>(null);
    const [loading, setLoading] = useState(true);
    const revokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (revokeTimerRef.current) clearTimeout(revokeTimerRef.current);
        };
    }, []);

    // Load prototypes from DB on mount
    useEffect(() => {
        supabase
            .from('prototypes')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                if (data) {
                    setPrototypes(data.map(row => ({
                        id: row.id,
                        name: row.name,
                        sourceDocId: row.source_doc_id,
                        sourceDocTitle: row.source_doc_title,
                        sourceDocType: row.source_doc_type,
                        createdAt: row.created_at,
                        html: row.html,
                    })));
                }
                setLoading(false);
            });
    }, [project.id]);

    const handleGenerated = (proto: Prototype) => {
        setPrototypes(prev => [proto, ...prev]);
        setIsWizardOpen(false);
        setViewingProto(proto); // auto-open code viewer after generation
    };

    const handleDelete = async (id: string) => {
        await supabase.from('prototypes').delete().eq('id', id);
        setPrototypes(prev => prev.filter(p => p.id !== id));
        if (viewingProto?.id === id) setViewingProto(null);
    };

    const handleRun = (proto: Prototype) => {
        const blob = new Blob([proto.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        if (revokeTimerRef.current) clearTimeout(revokeTimerRef.current);
        revokeTimerRef.current = setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };

    const DOC_TYPE_COLORS: Record<string, string> = {
        BRS: 'bg-blue-50 text-blue-700 border-blue-200',
        URS: 'bg-violet-50 text-violet-700 border-violet-200',
        SRS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        SDS: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-1">Prototype Generation</h2>
                    <p className="text-[11px] text-slate-500">Generate front-end prototypes from your workspace documents.</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm shrink-0 ml-4"
                >
                    <Plus size={13} />
                    New Prototype
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
            ) : prototypes.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded flex flex-col items-center justify-center py-14 text-center bg-white">
                    <Monitor size={28} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No prototypes yet</p>
                    <p className="text-[11px] text-slate-400 mb-5 max-w-xs">
                        Select a workspace document and generate a front-end prototype in seconds.
                    </p>
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={13} />
                        New Prototype
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {prototypes.map(proto => (
                        <div
                            key={proto.id}
                            className="bg-white border border-slate-200 rounded p-4 flex items-center gap-4 hover:border-slate-300 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors">
                                <Monitor size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-bold text-slate-900 truncate">{proto.name}</p>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${DOC_TYPE_COLORS[proto.sourceDocType] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {proto.sourceDocType}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    From: <span className="font-medium text-slate-500">{proto.sourceDocTitle}</span>
                                    <span className="mx-1.5">·</span>
                                    {new Date(proto.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setViewingProto(proto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    <Eye size={13} />
                                    View Code
                                </button>
                                <button
                                    onClick={() => handleRun(proto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-900 rounded text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                                >
                                    <Play size={13} />
                                    Run
                                </button>
                                <button
                                    onClick={() => handleDelete(proto.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-200 hover:border-rose-200 transition-colors"
                                    title="Delete prototype"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isWizardOpen && (
                <WizardModal
                    project={project}
                    onClose={() => setIsWizardOpen(false)}
                    onGenerated={handleGenerated}
                />
            )}

            {viewingProto && (
                <CodeViewerModal
                    proto={viewingProto}
                    onClose={() => setViewingProto(null)}
                    onRun={() => handleRun(viewingProto)}
                    onDelete={() => handleDelete(viewingProto.id)}
                />
            )}
        </div>
    );
}
