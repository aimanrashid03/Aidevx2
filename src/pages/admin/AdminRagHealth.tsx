import { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle, RotateCcw, CheckCircle } from 'lucide-react';
import { callAdminTelemetry } from '../../lib/admin/adminApi';
import clsx from 'clsx';

interface StatusCount {
    status: string;
    count: number;
}

interface FailedChunk {
    id: string;
    document_id: string;
    doc_title: string | null;
    project_name: string | null;
    created_at: string;
}

interface RagData {
    statusCounts: StatusCount[];
    totalChunks: number;
    failedChunks: FailedChunk[];
    dimensionMismatches: number;
    avgChunksPerDoc: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    processed:  { label: 'Processed',  color: 'text-emerald-700', bg: 'bg-emerald-50' },
    processing: { label: 'Processing', color: 'text-blue-700',    bg: 'bg-blue-50'    },
    pending:    { label: 'Pending',    color: 'text-amber-700',   bg: 'bg-amber-50'   },
    failed:     { label: 'Failed',     color: 'text-red-700',     bg: 'bg-red-50'     },
};

export default function AdminRagHealth() {
    const [data, setData] = useState<RagData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requeuing, setRequeuing] = useState(false);
    const [requeueSuccess, setRequeueSuccess] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setRequeueSuccess(false);
        try {
            const result = await callAdminTelemetry('rag_status') as RagData;
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load RAG data');
        } finally {
            setLoading(false);
        }
    };

    const handleRequeue = async () => {
        if (!confirm('Re-queue all failed chunks for re-embedding? This will mark them as pending and they will be processed on next embed trigger.')) return;
        setRequeuing(true);
        setError(null);
        try {
            await callAdminTelemetry('rag_requeue');
            setRequeueSuccess(true);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to requeue chunks');
        } finally {
            setRequeuing(false);
        }
    };

    const failedCount = data?.statusCounts.find(s => s.status === 'failed')?.count ?? 0;

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading RAG health...</div>;

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Database size={22} /> RAG Index Health
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Cross-project embedding status, failed chunks, and index health.
                    </p>
                </div>
                <button onClick={fetchData}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {requeueSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-3 border border-emerald-200">
                    <CheckCircle size={18} className="shrink-0" />
                    <p className="text-sm font-medium">Failed chunks have been re-queued for re-embedding.</p>
                </div>
            )}

            {data && (
                <>
                    {/* Status breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(['processed', 'processing', 'pending', 'failed'] as const).map(status => {
                            const count = data.statusCounts.find(s => s.status === status)?.count ?? 0;
                            const cfg = STATUS_CONFIG[status];
                            return (
                                <div key={status} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className={clsx('text-xs font-semibold mb-1 px-2 py-0.5 rounded w-fit', cfg.color, cfg.bg)}>
                                        {cfg.label}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900 mt-2">{count.toLocaleString()}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">chunks</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary stats */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-4 py-2.5">
                            <h2 className="text-sm font-semibold text-slate-900">Index Summary</h2>
                        </div>
                        <div className="px-4 py-4 grid grid-cols-3 gap-6">
                            <div>
                                <div className="text-xs text-slate-500 mb-0.5">Total Chunks</div>
                                <div className="text-lg font-bold text-slate-900">{data.totalChunks.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-0.5">Avg Chunks / Doc</div>
                                <div className="text-lg font-bold text-slate-900">{data.avgChunksPerDoc.toFixed(1)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-0.5">Dimension Mismatches</div>
                                <div className={clsx('text-lg font-bold', data.dimensionMismatches > 0 ? 'text-red-600' : 'text-emerald-600')}>
                                    {data.dimensionMismatches}
                                </div>
                                {data.dimensionMismatches > 0 && (
                                    <div className="text-[10px] text-red-500 mt-0.5">Expected 512d. Re-embed affected docs.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Failed chunks */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-900">
                                Failed Chunks
                                {failedCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                        {failedCount}
                                    </span>
                                )}
                            </h2>
                            {failedCount > 0 && (
                                <button
                                    onClick={handleRequeue}
                                    disabled={requeuing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw size={12} className={requeuing ? 'animate-spin' : ''} />
                                    {requeuing ? 'Re-queuing...' : 'Re-queue All Failed'}
                                </button>
                            )}
                        </div>
                        {data.failedChunks.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-400">
                                {failedCount === 0 ? 'No failed chunks.' : 'Detailed failed chunk list not available.'}
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed At</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {data.failedChunks.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-sm text-slate-800">{c.doc_title || c.document_id}</td>
                                            <td className="px-6 py-3 text-sm text-slate-600">{c.project_name || '—'}</td>
                                            <td className="px-6 py-3 text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
