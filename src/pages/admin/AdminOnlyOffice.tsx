import { useState, useEffect } from 'react';
import { FileText, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { callAdminTelemetry } from '../../lib/admin/adminApi';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface OoStatus {
    reachable: boolean;
    latencyMs: number;
    serverUrl: string;
    jwtEnabled: boolean;
}

interface RecentSave {
    id: string;
    title: string;
    updated_at: string;
    document_key: string | null;
    project_name: string | null;
}

interface OoData {
    status: OoStatus;
    recentCallbacks: { doc_id: string; timestamp: string; success: boolean }[];
}

export default function AdminOnlyOffice() {
    const [ooData, setOoData] = useState<OoData | null>(null);
    const [recentSaves, setRecentSaves] = useState<RecentSave[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [ooResult, savesResult] = await Promise.all([
                callAdminTelemetry('oo_status') as Promise<OoData>,
                supabase
                    .from('requirement_docs')
                    .select('id, title, updated_at, document_key, project_id')
                    .not('document_key', 'is', null)
                    .order('updated_at', { ascending: false })
                    .limit(20),
            ]);

            setOoData(ooResult);

            const projectIds = [...new Set(
                ((savesResult.data ?? []) as { project_id: string }[]).map(d => d.project_id).filter(Boolean)
            )];
            const projectMap = new Map<string, string>();
            if (projectIds.length) {
                const { data: projects } = await supabase
                    .from('projects')
                    .select('id, name')
                    .in('id', projectIds);
                ((projects ?? []) as { id: string; name: string }[]).forEach(p => projectMap.set(p.id, p.name));
            }

            setRecentSaves(((savesResult.data ?? []) as { id: string; title: string; updated_at: string; document_key: string | null; project_id: string }[]).map(d => ({
                id: d.id,
                title: d.title,
                updated_at: d.updated_at,
                document_key: d.document_key,
                project_name: projectMap.get(d.project_id) || null,
            })));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load OO status');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading OnlyOffice status...</div>;

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <FileText size={22} /> OnlyOffice Monitor
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Server health, callback status, and recent documentKey rotations.
                    </p>
                </div>
                <button onClick={fetchAll}
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

            {ooData && (
                <>
                    {/* Server status */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-4 py-2.5">
                            <h2 className="text-sm font-semibold text-slate-900">Server Status</h2>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Reachability</div>
                                <div className="flex items-center gap-1.5">
                                    {ooData.status.reachable
                                        ? <CheckCircle size={16} className="text-emerald-500" />
                                        : <XCircle size={16} className="text-red-500" />
                                    }
                                    <span className={clsx(
                                        'text-sm font-semibold',
                                        ooData.status.reachable ? 'text-emerald-700' : 'text-red-700'
                                    )}>
                                        {ooData.status.reachable ? 'Healthy' : 'Unreachable'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Latency</div>
                                <div className="text-sm font-semibold text-slate-900">
                                    {ooData.status.latencyMs > 0 ? `${ooData.status.latencyMs}ms` : '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">JWT Mode</div>
                                <span className={clsx(
                                    'px-2 py-0.5 text-xs font-medium rounded-full',
                                    ooData.status.jwtEnabled ? 'bg-[var(--accent-50)] text-[var(--accent-700)]' : 'bg-slate-100 text-slate-600'
                                )}>
                                    {ooData.status.jwtEnabled ? 'JWT Enabled' : 'JWT Disabled'}
                                </span>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Server URL</div>
                                <div className="text-xs font-mono text-slate-700 truncate">{ooData.status.serverUrl || 'Not configured'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Recent callback events */}
                    {ooData.recentCallbacks.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-slate-100 px-4 py-2.5">
                                <h2 className="text-sm font-semibold text-slate-900">Recent OO Callbacks</h2>
                            </div>
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document ID</th>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {ooData.recentCallbacks.map((cb, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-700">{cb.doc_id}</td>
                                            <td className="px-6 py-3 text-xs text-slate-500">{new Date(cb.timestamp).toLocaleString()}</td>
                                            <td className="px-6 py-3">
                                                {cb.success
                                                    ? <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle size={12} />Saved</span>
                                                    : <span className="flex items-center gap-1 text-xs text-red-700"><XCircle size={12} />Failed</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Recent documentKey rotations */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">Recent documentKey Rotations</h2>
                    <span className="text-xs text-slate-400">Last 20 saves</span>
                </div>
                {recentSaves.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">No recent saves with document keys.</div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                                <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Saved</th>
                                <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Key</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {recentSaves.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{doc.title}</td>
                                    <td className="px-6 py-3 text-xs text-slate-600">{doc.project_name || '—'}</td>
                                    <td className="px-6 py-3 text-xs text-slate-500">{new Date(doc.updated_at).toLocaleString()}</td>
                                    <td className="px-6 py-3 font-mono text-xs text-slate-500 truncate max-w-[180px]">
                                        {doc.document_key || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
