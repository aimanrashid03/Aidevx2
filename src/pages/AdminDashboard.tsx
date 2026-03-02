import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, useAuth } from '../context/AuthContext';
import {
    Users, AlertCircle, Plus, LayoutDashboard,
    FolderOpen, Trash2, FileText, Shield, Pencil, X,
} from 'lucide-react';
import clsx from 'clsx';

const formatRole = (role: string) => role === 'admin' ? 'Administrator' : 'User';

type Tab = 'overview' | 'users' | 'projects';

interface Stats {
    totalUsers: number;
    totalProjects: number;
    totalDocs: number;
    draftDocs: number;
    finalDocs: number;
}

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callAdminFn(accessToken: string, action: string, payload: object) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) {
        let errMsg = `Error ${res.status}`;
        try {
            const err = await res.json();
            errMsg = err.error || err.message || errMsg;
        } catch { /* body wasn't JSON */ }
        throw new Error(errMsg);
    }
    return res.json();
}

export default function AdminDashboard() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [auditProjects, setAuditProjects] = useState<AuditProject[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create user form
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
    const [invitePassword, setInvitePassword] = useState('');
    const [inviting, setInviting] = useState(false);

    // Per-row loading states
    const [roleChanging, setRoleChanging] = useState<Record<string, boolean>>({});
    const [deleting, setDeleting] = useState<Record<string, boolean>>({});

    // Edit user state
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    // Project audit filter
    const [projectFilterUserId, setProjectFilterUserId] = useState<string>('all');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersResult, projectsResult, docsResult] = await Promise.all([
                supabase.from('profiles').select('*').order('role', { ascending: true }),
                supabase.from('projects').select('*').order('created_at', { ascending: false }),
                supabase.from('requirement_docs').select('project_id, status'),
            ]);

            if (usersResult.error) throw usersResult.error;
            if (projectsResult.error) throw projectsResult.error;

            const usersData = usersResult.data as UserProfile[];
            const projectsData = projectsResult.data || [];
            const docsData = docsResult.data || [];

            setUsers(usersData);

            const profileMap = new Map(usersData.map(u => [u.id, u]));

            // Aggregate doc counts per project
            const docsPerProject = new Map<string, { total: number; draft: number; final: number }>();
            docsData.forEach(d => {
                const e = docsPerProject.get(d.project_id) || { total: 0, draft: 0, final: 0 };
                e.total++;
                if (d.status === 'draft') e.draft++;
                else if (d.status === 'final') e.final++;
                docsPerProject.set(d.project_id, e);
            });

            setAuditProjects(projectsData.map(p => {
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

    const getAccessToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Session expired — please sign out and sign back in.');
        return session.access_token;
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setError(null);
        try {
            const token = await getAccessToken();
            await callAdminFn(token, 'create_user', {
                email: inviteEmail,
                password: invitePassword,
                full_name: inviteName,
                role: inviteRole,
            });
            setShowInviteForm(false);
            setInviteEmail(''); setInviteName(''); setInvitePassword(''); setInviteRole('user');
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setInviting(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
        if (userId === currentUser?.id) return;
        setRoleChanging(prev => ({ ...prev, [userId]: true }));
        setError(null);
        try {
            const token = await getAccessToken();
            await callAdminFn(token, 'update_role', { user_id: userId, role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update role');
        } finally {
            setRoleChanging(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleDeleteUser = async (userId: string, displayName: string) => {
        if (userId === currentUser?.id) return;
        if (!confirm(`Delete "${displayName}"? This cannot be undone and will remove all their data.`)) return;
        setDeleting(prev => ({ ...prev, [userId]: true }));
        setError(null);
        try {
            const token = await getAccessToken();
            await callAdminFn(token, 'delete_user', { user_id: userId });
            setUsers(prev => prev.filter(u => u.id !== userId));
            setAuditProjects(prev => prev.filter(p => p.userId !== userId));
            setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : prev);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        } finally {
            setDeleting(prev => ({ ...prev, [userId]: false }));
        }
    };

    const openEdit = (u: UserProfile) => {
        setEditingUserId(u.id);
        setEditName(u.full_name || '');
        setEditEmail(u.email || '');
        setEditPassword('');
    };

    const handleSaveUser = async (userId: string) => {
        setSaving(prev => ({ ...prev, [userId]: true }));
        setError(null);
        try {
            const token = await getAccessToken();
            const originalEmail = users.find(u => u.id === userId)?.email;
            await callAdminFn(token, 'update_user', {
                user_id: userId,
                full_name: editName,
                // Only send email if it actually changed — sending the same email
                // to the Supabase auth admin API can fail in some versions
                ...(editEmail !== originalEmail ? { email: editEmail } : {}),
                ...(editPassword ? { password: editPassword } : {}),
            });
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, full_name: editName, email: editEmail } : u
            ));
            setEditingUserId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes');
        } finally {
            setSaving(prev => ({ ...prev, [userId]: false }));
        }
    };

    // Project count per user (derived from loaded data, no extra query)
    const projectsPerUser = new Map<string, number>();
    auditProjects.forEach(p => {
        projectsPerUser.set(p.userId, (projectsPerUser.get(p.userId) || 0) + 1);
    });

    const filteredProjects = projectFilterUserId === 'all'
        ? auditProjects
        : auditProjects.filter(p => p.userId === projectFilterUserId);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading admin dashboard...</div>;
    }

    const tabs = [
        { id: 'overview' as Tab, label: 'Overview', icon: <LayoutDashboard size={15} /> },
        { id: 'users' as Tab, label: `Users (${users.length})`, icon: <Users size={15} /> },
        { id: 'projects' as Tab, label: `Projects (${auditProjects.length})`, icon: <FolderOpen size={15} /> },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white px-8 py-5 border-b border-slate-200 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Shield className="text-purple-700" size={22} />
                            Admin Panel
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Platform management and oversight.</p>
                    </div>
                    {activeTab === 'users' && (
                        <button
                            onClick={() => setShowInviteForm(v => !v)}
                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                        >
                            <Plus size={16} />
                            {showInviteForm ? 'Cancel' : 'Create User'}
                        </button>
                    )}
                </div>

                {/* Tab bar */}
                <div className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                                activeTab === tab.id
                                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-8 overflow-auto flex-1">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm font-medium">Error</p>
                            <p className="text-sm mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                {/* ── OVERVIEW ── */}
                {activeTab === 'overview' && stats && (
                    <div className="space-y-6">
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[
                                { label: 'Total Users', value: stats.totalUsers, icon: <Users size={18} />, color: 'text-purple-700', bg: 'bg-purple-50' },
                                { label: 'Total Projects', value: stats.totalProjects, icon: <FolderOpen size={18} />, color: 'text-blue-700', bg: 'bg-blue-50' },
                                { label: 'Total Documents', value: stats.totalDocs, icon: <FileText size={18} />, color: 'text-slate-700', bg: 'bg-slate-100' },
                                { label: 'In Draft', value: stats.draftDocs, icon: <FileText size={18} />, color: 'text-amber-700', bg: 'bg-amber-50' },
                                { label: 'Finalized', value: stats.finalDocs, icon: <FileText size={18} />, color: 'text-green-700', bg: 'bg-green-50' },
                            ].map(s => (
                                <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
                                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center mb-3', s.bg, s.color)}>
                                        {s.icon}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Users activity summary */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-900">Users by Activity</h2>
                            </div>
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Projects</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Finalized Docs</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {users.map(u => {
                                        const userProjects = auditProjects.filter(p => p.userId === u.id);
                                        const finalizedDocs = userProjects.reduce((sum, p) => sum + p.finalCount, 0);
                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3">
                                                    <div className="font-medium text-sm text-slate-900">{u.full_name || 'N/A'}</div>
                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={clsx(
                                                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                                                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                                                    )}>
                                                        {formatRole(u.role)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-slate-700">{userProjects.length}</td>
                                                <td className="px-6 py-3 text-sm text-slate-700">{finalizedDocs}</td>
                                            </tr>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">No users found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── USERS ── */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {showInviteForm && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-base font-bold text-slate-900 mb-4">Create New Account</h2>
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                            <input
                                                type="text" required value={inviteName}
                                                onChange={e => setInviteName(e.target.value)}
                                                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                                                placeholder="Jane Smith"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                            <input
                                                type="email" required value={inviteEmail}
                                                onChange={e => setInviteEmail(e.target.value)}
                                                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                                                placeholder="jane@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                                            <input
                                                type="password" required value={invitePassword}
                                                onChange={e => setInvitePassword(e.target.value)}
                                                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                                                placeholder="Min. 6 characters"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                            <select
                                                value={inviteRole}
                                                onChange={e => setInviteRole(e.target.value as 'user' | 'admin')}
                                                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none bg-white"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit" disabled={inviting}
                                            className="bg-purple-700 text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-purple-800 disabled:opacity-50"
                                        >
                                            {inviting ? 'Creating...' : 'Create Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Projects</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {users.map(u => {
                                        const isSelf = u.id === currentUser?.id;
                                        const projectCount = projectsPerUser.get(u.id) || 0;
                                        const isEditing = editingUserId === u.id;
                                        return (
                                            <>
                                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900 text-sm">{u.full_name || 'N/A'}</div>
                                                        <div className="text-xs text-slate-500">{u.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isSelf ? (
                                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                                {formatRole(u.role)} (you)
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={u.role}
                                                                    disabled={roleChanging[u.id]}
                                                                    onChange={e => handleRoleChange(u.id, e.target.value as 'user' | 'admin')}
                                                                    className={clsx(
                                                                        'border border-slate-200 rounded-md px-2 py-1 text-xs font-medium bg-white focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-opacity',
                                                                        u.role === 'admin' ? 'text-purple-800' : 'text-slate-700',
                                                                        roleChanging[u.id] && 'opacity-50'
                                                                    )}
                                                                >
                                                                    <option value="user">User</option>
                                                                    <option value="admin">Administrator</option>
                                                                </select>
                                                                {roleChanging[u.id] && (
                                                                    <span className="text-xs text-slate-400">Saving...</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-700">
                                                        {projectCount}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {!isSelf && (
                                                                <button
                                                                    onClick={() => isEditing ? setEditingUserId(null) : openEdit(u)}
                                                                    title={isEditing ? 'Cancel edit' : 'Edit user'}
                                                                    className={clsx(
                                                                        'p-1.5 rounded transition-colors',
                                                                        isEditing
                                                                            ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                                                                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                                    )}
                                                                >
                                                                    {isEditing ? <X size={15} /> : <Pencil size={15} />}
                                                                </button>
                                                            )}
                                                            {!isSelf && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(u.id, u.full_name || u.email || 'this user')}
                                                                    disabled={deleting[u.id]}
                                                                    title="Delete user"
                                                                    className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 p-1.5 rounded hover:bg-red-50"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isEditing && (
                                                    <tr key={`${u.id}-edit`} className="bg-slate-50 border-b border-slate-200">
                                                        <td colSpan={4} className="px-6 py-4">
                                                            <div className="grid grid-cols-3 gap-3 items-end">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editName}
                                                                        onChange={e => setEditName(e.target.value)}
                                                                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                                                                    <input
                                                                        type="email"
                                                                        value={editEmail}
                                                                        onChange={e => setEditEmail(e.target.value)}
                                                                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none bg-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
                                                                    <input
                                                                        type="password"
                                                                        value={editPassword}
                                                                        onChange={e => setEditPassword(e.target.value)}
                                                                        placeholder="Leave blank to keep current"
                                                                        className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end mt-3 gap-2">
                                                                <button
                                                                    onClick={() => setEditingUserId(null)}
                                                                    className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSaveUser(u.id)}
                                                                    disabled={saving[u.id]}
                                                                    className="px-4 py-1.5 bg-purple-700 text-white text-sm font-medium rounded-md hover:bg-purple-800 disabled:opacity-50"
                                                                >
                                                                    {saving[u.id] ? 'Saving...' : 'Save Changes'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">No users found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── PROJECTS AUDIT ── */}
                {activeTab === 'projects' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">Read-only view of all platform projects.</p>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-600 font-medium">Owner:</label>
                                <select
                                    value={projectFilterUserId}
                                    onChange={e => setProjectFilterUserId(e.target.value)}
                                    className="border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                                >
                                    <option value="all">All users</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name || u.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Owner</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredProjects.map(p => (
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
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                                                {p.draftCount} draft
                                                            </span>
                                                        )}
                                                        {p.finalCount > 0 && (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-100">
                                                                {p.finalCount} final
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProjects.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">No projects found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
