import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FolderOpen, AlertCircle } from 'lucide-react';

interface AuditProject {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    userId: string;
    ownerName: string | null;
    ownerEmail: string | null;
    docCount: number;
    draftCount: number;
    finalCount: number;
}

interface UserRow {
    id: string;
    full_name: string | null;
    email: string | null;
}

export default function AdminProjects() {
    const [projects, setProjects] = useState<AuditProject[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterUserId, setFilterUserId] = useState('all');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, projectsRes, docsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email'),
                supabase.from('projects').select('*').order('created_at', { ascending: false }),
                supabase.from('requirement_docs').select('project_id, status'),
            ]);
            if (usersRes.error) throw usersRes.error;
            if (projectsRes.error) throw projectsRes.error;

            const usersData = (usersRes.data ?? []) as UserRow[];
            const projectsData = projectsRes.data ?? [];
            const docsData = (docsRes.data ?? []) as { project_id: string; status: string }[];

            setUsers(usersData);
            const profileMap = new Map(usersData.map(u => [u.id, u]));

            const docsPerProject = new Map<string, { total: number; draft: number; final: number }>();
            docsData.forEach(d => {
                const e = docsPerProject.get(d.project_id) || { total: 0, draft: 0, final: 0 };
                e.total++;
                if (d.status === 'draft') e.draft++;
                else if (d.status === 'final') e.final++;
                docsPerProject.set(d.project_id, e);
            });

            setProjects(projectsData.map((p: { id: string; name: string; description: string; created_at: string; user_id: string }) => {
                const profile = profileMap.get(p.user_id);
                const docs = docsPerProject.get(p.id) || { total: 0, draft: 0, final: 0 };
                return {
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    createdAt: p.created_at,
                    userId: p.user_id,
                    ownerName: profile?.full_name || null,
                    ownerEmail: profile?.email || null,
                    docCount: docs.total,
                    draftCount: docs.draft,
                    finalCount: docs.final,
                };
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const filtered = filterUserId === 'all' ? projects : projects.filter(p => p.userId === filterUserId);

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading projects...</div>;

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <FolderOpen size={22} /> Projects
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Read-only view of all platform projects. ({projects.length} total)</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">Owner:</label>
                    <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none">
                        <option value="all">All users</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Documents</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filtered.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900 text-sm">{p.name}</div>
                                    {p.description && (
                                        <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{p.description}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-700">{p.ownerName || 'N/A'}</div>
                                    <div className="text-xs text-slate-500">{p.ownerEmail}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {new Date(p.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    {p.docCount === 0 ? (
                                        <span className="text-xs text-slate-400">None</span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {p.draftCount > 0 && (
                                                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                                                    {p.draftCount} draft
                                                </span>
                                            )}
                                            {p.finalCount > 0 && (
                                                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                                                    {p.finalCount} final
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">No projects found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
