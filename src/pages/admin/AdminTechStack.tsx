import { useState, useEffect } from 'react';
import { Layers, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { callAdminTelemetry } from '../../lib/admin/adminApi';
import clsx from 'clsx';
import PKG from '../../../package.json';

const FRONTEND_STACK = [
    { name: 'React',       key: 'react' },
    { name: 'TypeScript',  key: 'typescript', dev: true },
    { name: 'Vite',        key: 'vite', dev: true },
    { name: 'Tailwind CSS', key: 'tailwindcss', dev: true },
    { name: 'Supabase JS', key: '@supabase/supabase-js' },
    { name: 'React Router', key: 'react-router-dom' },
    { name: 'Lucide React', key: 'lucide-react' },
    { name: 'Mermaid',     key: 'mermaid' },
    { name: 'docx',        key: 'docx' },
    { name: 'mammoth',     key: 'mammoth' },
];

function getVersion(key: string, dev = false): string {
    const deps = PKG.dependencies as Record<string, string> | undefined;
    const devDeps = PKG.devDependencies as Record<string, string> | undefined;
    const src = dev ? devDeps : deps;
    const v = src?.[key];
    if (!v) {
        const fallback = dev ? deps?.[key] : devDeps?.[key];
        return fallback ? fallback.replace(/^\^|~/, '') : '—';
    }
    return v.replace(/^\^|~/, '');
}

interface Migration {
    version: string;
    name?: string;
}

interface TechData {
    migrations: Migration[];
    pgIndexes: string[];
    pgvectorPresent: boolean;
    ooReachable: boolean;
    ooLatencyMs: number;
    ooUrl: string;
}

export default function AdminTechStack() {
    const [techData, setTechData] = useState<TechData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

    const fetchTechData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await callAdminTelemetry('tech_stack') as TechData;
            setTechData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tech data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTechData(); }, []);

    const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
        <span className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        )}>
            {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {label}
        </span>
    );

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Layers size={22} /> Tech Stack
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Frontend dependencies, applied migrations, and infrastructure health.</p>
                </div>
                <button onClick={fetchTechData}
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

            {/* Infrastructure status */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-2.5">
                    <h2 className="text-sm font-semibold text-slate-900">Infrastructure</h2>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 font-medium">OnlyOffice Server</span>
                        {loading
                            ? <span className="text-xs text-slate-400">Checking...</span>
                            : <StatusBadge
                                ok={techData?.ooReachable ?? false}
                                label={techData?.ooReachable ? `Healthy (${techData.ooLatencyMs}ms)` : 'Unreachable'}
                              />
                        }
                        <span className="text-[10px] text-slate-400 truncate">{techData?.ooUrl || 'Not configured'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 font-medium">Supabase</span>
                        <StatusBadge ok={!!supabaseUrl} label={supabaseUrl ? 'Connected' : 'Not configured'} />
                        <span className="text-[10px] text-slate-400 truncate">{supabaseUrl}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 font-medium">pgvector Extension</span>
                        {loading
                            ? <span className="text-xs text-slate-400">Loading...</span>
                            : <StatusBadge ok={techData?.pgvectorPresent ?? false} label={techData?.pgvectorPresent ? 'Installed' : 'Not found'} />
                        }
                    </div>
                </div>
            </div>

            {/* Frontend dependencies */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5">
                    <h2 className="text-sm font-semibold text-slate-900">Frontend Dependencies</h2>
                </div>
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Package</th>
                            <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
                            <th className="px-6 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {FRONTEND_STACK.map(item => (
                            <tr key={item.key} className="hover:bg-slate-50">
                                <td className="px-6 py-2.5 text-sm font-medium text-slate-900">{item.name}</td>
                                <td className="px-6 py-2.5 text-sm font-mono text-slate-600">{getVersion(item.key, item.dev)}</td>
                                <td className="px-6 py-2.5">
                                    <span className={clsx(
                                        'px-2 py-0.5 text-xs font-medium rounded-full',
                                        item.dev ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'
                                    )}>
                                        {item.dev ? 'devDependency' : 'dependency'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Applied migrations */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">Applied DB Migrations</h2>
                    {techData && (
                        <span className="text-xs text-slate-500">{techData.migrations.length} applied</span>
                    )}
                </div>
                {loading ? (
                    <div className="p-6 text-center text-sm text-slate-400">Loading migrations...</div>
                ) : (
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {(techData?.migrations ?? []).map(m => (
                            <div key={m.version} className="px-4 py-2 flex items-center gap-3">
                                <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                                <span className="font-mono text-xs text-slate-700">{m.version}</span>
                            </div>
                        ))}
                        {(techData?.migrations ?? []).length === 0 && (
                            <div className="p-6 text-center text-sm text-slate-400">No migration data available.</div>
                        )}
                    </div>
                )}
            </div>

            {/* DB Indexes */}
            {techData && techData.pgIndexes.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                        <h2 className="text-sm font-semibold text-slate-900">Embedding Indexes (pgvector)</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {techData.pgIndexes.map(idx => (
                            <div key={idx} className="px-4 py-2 flex items-center gap-3">
                                <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                                <span className="font-mono text-xs text-slate-700">{idx}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
