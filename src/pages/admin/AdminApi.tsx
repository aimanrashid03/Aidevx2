import { useState } from 'react';
import { Network, Zap, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { pingEdgeFunction } from '../../lib/admin/adminApi';
import clsx from 'clsx';

interface FunctionInfo {
    name: string;
    label: string;
    description: string;
    verifyJwt: boolean;
    streaming: boolean;
}

const EDGE_FUNCTIONS: FunctionInfo[] = [
    { name: 'generate_section',        label: 'Generate Section',       description: 'Per-section AI generation (streaming SSE, chat mode, RAG)',         verifyJwt: false, streaming: true  },
    { name: 'auto_generate_document',  label: 'Auto Generate Document', description: 'Full-document auto-generation pipeline with progress streaming',     verifyJwt: false, streaming: true  },
    { name: 'generate_prototype',      label: 'Generate Prototype',     description: 'UI prototype generation from requirement docs (SSE progress events)', verifyJwt: false, streaming: true  },
    { name: 'embed_document',          label: 'Embed Document',         description: 'Chunk and embed project files for RAG pipeline',                     verifyJwt: false, streaming: false },
    { name: 'onlyoffice_callback',     label: 'OnlyOffice Callback',    description: 'OO save callback — rotates documentKey on each save',               verifyJwt: true,  streaming: false },
    { name: 'admin-users',             label: 'Admin Users',            description: 'Admin user management (create, delete, update, role change)',        verifyJwt: true,  streaming: false },
    { name: 'admin-telemetry',         label: 'Admin Telemetry',        description: 'Read-only system telemetry for admin dashboard pages',              verifyJwt: true,  streaming: false },
];

interface PingResult {
    ok: boolean;
    latencyMs: number;
    error?: string;
}

export default function AdminApi() {
    const [pinging, setPinging] = useState<Record<string, boolean>>({});
    const [results, setResults] = useState<Record<string, PingResult>>({});

    const handlePing = async (fnName: string) => {
        setPinging(prev => ({ ...prev, [fnName]: true }));
        const result = await pingEdgeFunction(fnName);
        setResults(prev => ({ ...prev, [fnName]: result }));
        setPinging(prev => ({ ...prev, [fnName]: false }));
    };

    const handlePingAll = async () => {
        await Promise.all(EDGE_FUNCTIONS.map(fn => handlePing(fn.name)));
    };

    const allTested = EDGE_FUNCTIONS.every(fn => results[fn.name] !== undefined);
    const allOk = allTested && EDGE_FUNCTIONS.every(fn => results[fn.name]?.ok);

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Network size={22} /> API & Edge Functions
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Deployed Supabase edge functions — configuration overview and live ping test.
                    </p>
                </div>
                <button onClick={handlePingAll}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                    <Zap size={15} /> Ping All
                </button>
            </div>

            {allTested && (
                <div className={clsx(
                    'p-4 rounded-lg border flex items-start gap-3',
                    allOk ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                )}>
                    {allOk ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                    <p className="text-sm font-medium">
                        {allOk
                            ? 'All edge functions responded successfully.'
                            : 'One or more edge functions failed to respond. Check the function logs in Supabase dashboard.'}
                    </p>
                </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Function</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Config</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {EDGE_FUNCTIONS.map(fn => {
                            const result = results[fn.name];
                            const isPinging = pinging[fn.name];
                            return (
                                <tr key={fn.name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-sm font-medium text-slate-900">{fn.name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5 max-w-sm">{fn.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={clsx(
                                                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit',
                                                fn.verifyJwt ? 'bg-[var(--accent-50)] text-[var(--accent-700)]' : 'bg-slate-100 text-slate-600'
                                            )}>
                                                {fn.verifyJwt ? 'JWT verified' : 'no-verify-jwt'}
                                            </span>
                                            {fn.streaming && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 w-fit">
                                                    SSE streaming
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isPinging ? (
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock size={12} className="animate-spin" /> Pinging...
                                            </span>
                                        ) : result ? (
                                            <div className="flex items-center gap-2">
                                                {result.ok
                                                    ? <CheckCircle size={14} className="text-emerald-500" />
                                                    : <XCircle size={14} className="text-red-500" />
                                                }
                                                <span className={clsx('text-xs font-medium', result.ok ? 'text-emerald-700' : 'text-red-700')}>
                                                    {result.ok ? `${result.latencyMs}ms` : result.error || 'Failed'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">Not tested</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handlePing(fn.name)}
                                            disabled={isPinging}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                                        >
                                            <Zap size={12} />
                                            Ping
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500 font-medium mb-1">Note on ping results</p>
                <p className="text-xs text-slate-500">
                    Ping sends a <code className="bg-white px-1 py-0.5 rounded border border-slate-200">?mode=ping</code> GET request to each function.
                    A non-5xx response counts as reachable. Authentication errors (401/403) still indicate the function is running.
                    To view detailed invocation logs, open the Supabase dashboard → Edge Functions.
                </p>
            </div>
        </div>
    );
}
