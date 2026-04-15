import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, FolderOpen, FileText, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface Stats {
    totalUsers: number;
    totalProjects: number;
    totalDocs: number;
    draftDocs: number;
    finalDocs: number;
}

interface UserRow {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
}

export default function AdminOverview() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [userProjectMap, setUserProjectMap] = useState<Map<string, number>>(new Map());
    const [userFinalMap, setUserFinalMap] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersResult, projectsResult, docsResult] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email, role').order('role', { ascending: true }),
                supabase.from('projects').select('id, user_id'),
                supabase.from('requirement_docs').select('project_id, status'),
            ]);
            if (usersResult.error) throw usersResult.error;
            if (projectsResult.error) throw projectsResult.error;

            const usersData = (usersResult.data ?? []) as UserRow[];
            const projectsData = (projectsResult.data ?? []) as { id: string; user_id: string }[];
            const docsData = (docsResult.data ?? []) as { project_id: string; status: string }[];

            setUsers(usersData);

            // Project count per user
            const projMap = new Map<string, number>();
            projectsData.forEach(p => projMap.set(p.user_id, (projMap.get(p.user_id) || 0) + 1));
            setUserProjectMap(projMap);

            // Finalized docs per user via project ownership
            const projectOwnerMap = new Map<string, string>();
            projectsData.forEach(p => projectOwnerMap.set(p.id, p.user_id));

            const finalMap = new Map<string, number>();
            docsData.filter(d => d.status === 'final').forEach(d => {
                const ownerId = projectOwnerMap.get(d.project_id);
                if (ownerId) finalMap.set(ownerId, (finalMap.get(ownerId) || 0) + 1);
            });
            setUserFinalMap(finalMap);

            setStats({
                totalUsers: usersData.length,
                totalProjects: projectsData.length,
                totalDocs: docsData.length,
                draftDocs: docsData.filter(d => d.status === 'draft').length,
                finalDocs: docsData.filter(d => d.status === 'final').length,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading overview...</div>;

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div>
                <h1 className="page-title">Overview</h1>
                <p className="text-sm text-slate-500 mt-0.5">Platform-wide statistics and user activity summary.</p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {stats && (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Total Users',      value: stats.totalUsers,    icon: <Users size={18} />,    color: 'text-[var(--accent-700)]', bg: 'bg-[var(--accent-100)]' },
                            { label: 'Total Projects',   value: stats.totalProjects, icon: <FolderOpen size={18} />, color: 'text-blue-700',  bg: 'bg-blue-50' },
                            { label: 'Total Documents',  value: stats.totalDocs,     icon: <FileText size={18} />, color: 'text-slate-700', bg: 'bg-slate-100' },
                            { label: 'In Draft',         value: stats.draftDocs,     icon: <FileText size={18} />, color: 'text-amber-700', bg: 'bg-amber-50' },
                            { label: 'Finalized',        value: stats.finalDocs,     icon: <FileText size={18} />, color: 'text-green-700', bg: 'bg-green-50' },
                        ].map(s => (
                            <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-all">
                                <div className={clsx('flex h-7 w-7 items-center justify-center rounded-md mb-2', s.bg, s.color)}>
                                    {s.icon}
                                </div>
                                <div className="text-xl font-bold text-slate-900">{s.value}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Users by activity */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                            <h2 className="text-sm font-semibold text-slate-900">Users by Activity</h2>
                        </div>
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Finalized Docs</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-sm text-slate-900">{u.full_name || 'N/A'}</div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={clsx(
                                                'px-2 py-0.5 text-xs font-semibold rounded-full',
                                                u.role === 'admin'
                                                    ? 'bg-[var(--accent-100)] text-[var(--accent-700)]'
                                                    : 'bg-slate-100 text-slate-700'
                                            )}>
                                                {u.role === 'admin' ? 'Administrator' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-slate-700">{userProjectMap.get(u.id) || 0}</td>
                                        <td className="px-6 py-3 text-sm text-slate-700">{userFinalMap.get(u.id) || 0}</td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
