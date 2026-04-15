import { useState, useEffect } from 'react';
import { ScrollText, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

interface AuditRow {
    id: string;
    created_at: string;
    actor_id: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    metadata: Record<string, unknown> | null;
}

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    'user.create':      { label: 'User Created',     color: 'text-emerald-700', bg: 'bg-emerald-50'  },
    'user.delete':      { label: 'User Deleted',     color: 'text-red-700',     bg: 'bg-red-50'      },
    'user.role_change': { label: 'Role Changed',     color: 'text-blue-700',    bg: 'bg-blue-50'     },
    'project.delete':   { label: 'Project Deleted',  color: 'text-red-700',     bg: 'bg-red-50'      },
    'prototype.generate':{ label: 'Prototype Gen',   color: 'text-violet-700',  bg: 'bg-violet-50'   },
    'flag.set':         { label: 'Flag Changed',     color: 'text-amber-700',   bg: 'bg-amber-50'    },
    'oo.save':          { label: 'OO Save',          color: 'text-slate-700',   bg: 'bg-slate-100'   },
};

const ALL_ACTIONS = Object.keys(ACTION_CONFIG);

export default function AdminAudit() {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tableExists, setTableExists] = useState(true);
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [auditRes, profilesRes] = await Promise.all([
                supabase
                    .from('admin_audit_log')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(300),
                supabase.from('profiles').select('id, full_name, email'),
            ]);

            if (auditRes.error) {
                // Table might not exist yet — check by code or message (cloud vs local differ)
                const isMissing =
                    auditRes.error.code === '42P01' ||
                    /relation.*does not exist/i.test(auditRes.error.message ?? '') ||
                    /could not find the table/i.test(auditRes.error.message ?? '');
                if (isMissing) {
                    setTableExists(false);
                    return;
                }
                throw auditRes.error;
            }

            setRows((auditRes.data ?? []) as AuditRow[]);
            const map = new Map<string, Profile>();
            ((profilesRes.data ?? []) as Profile[]).forEach(p => map.set(p.id, p));
            setProfiles(map);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit log');
        } finally {
            setLoading(false);
        }
    };

    const filtered = filterAction === 'all' ? rows : rows.filter(r => r.action === filterAction);

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading audit log...</div>;

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <ScrollText size={22} /> Audit Log
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Platform-wide action trail — user, role, and system events.
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

            {!tableExists && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Migration required</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            The <code className="bg-amber-100 px-1 rounded">admin_audit_log</code> table does not exist yet.
                            Run migration <code className="bg-amber-100 px-1 rounded">20260415000001_admin_audit_log.sql</code> to enable the audit trail.
                        </p>
                    </div>
                </div>
            )}

            {tableExists && (
                <>
                    {/* Filter */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-slate-600 font-medium shrink-0">Filter by action:</label>
                        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none">
                            <option value="all">All actions</option>
                            {ALL_ACTIONS.map(a => (
                                <option key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400">{filtered.length} entries</span>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        {filtered.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-400">
                                No audit entries yet. Events will appear here as admins perform actions.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actor</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Target</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {filtered.map(row => {
                                            const actor = row.actor_id ? profiles.get(row.actor_id) : null;
                                            const cfg = ACTION_CONFIG[row.action];
                                            return (
                                                <tr key={row.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                                        {new Date(row.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={clsx(
                                                            'px-2 py-0.5 text-xs font-medium rounded-full',
                                                            cfg ? `${cfg.color} ${cfg.bg}` : 'text-slate-700 bg-slate-100'
                                                        )}>
                                                            {cfg?.label ?? row.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-700">
                                                        {actor?.full_name || actor?.email || row.actor_id?.slice(0, 8) || 'System'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600">
                                                        {row.target_type && (
                                                            <span className="font-medium">{row.target_type}</span>
                                                        )}
                                                        {row.target_id && (
                                                            <span className="text-slate-400 ml-1">({row.target_id.slice(0, 8)}…)</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                                                        {row.metadata ? JSON.stringify(row.metadata) : '—'}
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
