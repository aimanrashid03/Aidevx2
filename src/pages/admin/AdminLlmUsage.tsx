import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface UsageRow {
    id: string;
    created_at: string;
    user_id: string | null;
    project_id: string | null;
    feature: string;
    provider: string;
    model: string;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_usd: number | null;
}

interface UserProfile {
    id: string;
    full_name: string | null;
    email: string | null;
}

const FEATURE_LABELS: Record<string, string> = {
    generate_section: 'Section Gen',
    auto_generate_document: 'Auto Gen',
    generate_prototype: 'Prototype',
    embed: 'Embedding',
};

function fmt(n: number | null, decimals = 0): string {
    if (n === null) return '—';
    if (decimals > 0) return n.toFixed(decimals);
    return n.toLocaleString();
}

export default function AdminLlmUsage() {
    const [rows, setRows] = useState<UsageRow[]>([]);
    const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tableExists, setTableExists] = useState(true);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usageRes, usersRes] = await Promise.all([
                supabase.from('llm_usage_log').select('*').order('created_at', { ascending: false }).limit(200),
                supabase.from('profiles').select('id, full_name, email'),
            ]);

            if (usageRes.error) {
                // Table might not exist yet — check by code or message (cloud vs local differ)
                const isMissing =
                    usageRes.error.code === '42P01' ||
                    /relation.*does not exist/i.test(usageRes.error.message ?? '') ||
                    /could not find the table/i.test(usageRes.error.message ?? '');
                if (isMissing) {
                    setTableExists(false);
                    return;
                }
                throw usageRes.error;
            }

            setRows((usageRes.data ?? []) as UsageRow[]);
            const userMap = new Map<string, UserProfile>();
            ((usersRes.data ?? []) as UserProfile[]).forEach(u => userMap.set(u.id, u));
            setUsers(userMap);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load usage data');
        } finally {
            setLoading(false);
        }
    };

    // Aggregate stats
    const totalTokens = rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0);
    const totalCost = rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0);

    const byModel = new Map<string, { calls: number; tokens: number; cost: number }>();
    rows.forEach(r => {
        const e = byModel.get(r.model) || { calls: 0, tokens: 0, cost: 0 };
        e.calls++;
        e.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
        e.cost += r.cost_usd ?? 0;
        byModel.set(r.model, e);
    });

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading LLM usage...</div>;

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Sparkles size={22} /> LLM Usage & Cost
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Token consumption and estimated cost per model, feature, and user.</p>
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

            {!tableExists && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Migration required</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            The <code className="bg-amber-100 px-1 rounded">llm_usage_log</code> table does not exist yet.
                            Run the pending migration <code className="bg-amber-100 px-1 rounded">20260415000000_llm_usage_log.sql</code> to enable usage tracking.
                        </p>
                    </div>
                </div>
            )}

            {tableExists && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Total Calls</div>
                            <div className="text-2xl font-bold text-slate-900">{rows.length.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Total Tokens</div>
                            <div className="text-2xl font-bold text-slate-900">{fmt(totalTokens)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Estimated Cost</div>
                            <div className="text-2xl font-bold text-slate-900">${totalCost.toFixed(4)}</div>
                        </div>
                    </div>

                    {/* By model */}
                    {byModel.size > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-slate-100 px-4 py-2.5">
                                <h2 className="text-sm font-semibold text-slate-900">Usage by Model</h2>
                            </div>
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model</th>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Calls</th>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tokens</th>
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost (USD)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {[...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([model, stats]) => (
                                        <tr key={model} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-800">{model}</td>
                                            <td className="px-6 py-3 text-sm text-slate-700">{stats.calls}</td>
                                            <td className="px-6 py-3 text-sm text-slate-700">{fmt(stats.tokens)}</td>
                                            <td className="px-6 py-3 text-sm text-slate-700">${stats.cost.toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Recent calls */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-900">Recent Calls</h2>
                            <span className="text-xs text-slate-500">Last 200 records</span>
                        </div>
                        {rows.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-400">
                                No usage data yet. Usage will appear here once edge functions are instrumented to log calls.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Feature</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tokens</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {rows.map(r => {
                                            const user = r.user_id ? users.get(r.user_id) : null;
                                            const tokens = (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                                        {new Date(r.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                                                            {FEATURE_LABELS[r.feature] || r.feature}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700 max-w-[200px] truncate">{r.model}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-600">
                                                        {user?.full_name || user?.email || r.user_id?.slice(0, 8) || '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-700">{fmt(tokens)}</td>
                                                    <td className={clsx('px-4 py-2.5 text-xs font-medium', r.cost_usd ? 'text-slate-700' : 'text-slate-400')}>
                                                        {r.cost_usd ? `$${r.cost_usd.toFixed(5)}` : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
