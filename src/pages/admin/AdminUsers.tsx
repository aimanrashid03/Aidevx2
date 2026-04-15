import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { type UserProfile } from '../../context/AuthContext';
import { Users, AlertCircle, Plus, Trash2, Pencil, X } from 'lucide-react';
import clsx from 'clsx';
import { callAdminUsers } from '../../lib/admin/adminApi';

export default function AdminUsers() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
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

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase
                .from('profiles')
                .select('*')
                .order('role', { ascending: true });
            if (err) throw err;
            setUsers((data ?? []) as UserProfile[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setError(null);
        try {
            await callAdminUsers('create_user', {
                email: inviteEmail,
                password: invitePassword,
                full_name: inviteName,
                role: inviteRole,
            });
            setShowInviteForm(false);
            setInviteEmail(''); setInviteName(''); setInvitePassword(''); setInviteRole('user');
            await fetchUsers();
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
            await callAdminUsers('update_role', { user_id: userId, role: newRole });
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
            await callAdminUsers('delete_user', { user_id: userId });
            setUsers(prev => prev.filter(u => u.id !== userId));
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
            const originalEmail = users.find(u => u.id === userId)?.email;
            await callAdminUsers('update_user', {
                user_id: userId,
                full_name: editName,
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

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading users...</div>;

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Users size={22} /> Users
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage user accounts and roles. ({users.length} total)</p>
                </div>
                <button
                    onClick={() => setShowInviteForm(v => !v)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                    <Plus size={16} />
                    {showInviteForm ? 'Cancel' : 'Create User'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {showInviteForm && (
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-4">Create New Account</h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    placeholder="Jane Smith" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    placeholder="jane@example.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                                <input type="password" required value={invitePassword} onChange={e => setInvitePassword(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    placeholder="Min. 6 characters" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'user' | 'admin')}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                                    <option value="user">User</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button type="submit" disabled={inviting}
                                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50">
                                {inviting ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map(u => {
                            const isSelf = u.id === currentUser?.id;
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
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--accent-100)] text-[var(--accent-700)]">
                                                    {u.role === 'admin' ? 'Administrator' : 'User'} (you)
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <select value={u.role} disabled={roleChanging[u.id]}
                                                        onChange={e => handleRoleChange(u.id, e.target.value as 'user' | 'admin')}
                                                        className={clsx(
                                                            'rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium bg-white focus:ring-2 focus:ring-slate-200 outline-none transition-opacity',
                                                            u.role === 'admin' ? 'text-[var(--accent-700)]' : 'text-slate-700',
                                                            roleChanging[u.id] && 'opacity-50'
                                                        )}>
                                                        <option value="user">User</option>
                                                        <option value="admin">Administrator</option>
                                                    </select>
                                                    {roleChanging[u.id] && <span className="text-xs text-slate-400">Saving...</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {!isSelf && (
                                                    <button onClick={() => isEditing ? setEditingUserId(null) : openEdit(u)}
                                                        title={isEditing ? 'Cancel edit' : 'Edit user'}
                                                        className={clsx('p-1.5 rounded transition-colors',
                                                            isEditing
                                                                ? 'text-[var(--accent-600)] bg-[var(--accent-50)] hover:bg-[var(--accent-100)]'
                                                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                        )}>
                                                        {isEditing ? <X size={15} /> : <Pencil size={15} />}
                                                    </button>
                                                )}
                                                {!isSelf && (
                                                    <button onClick={() => handleDeleteUser(u.id, u.full_name || u.email || 'this user')}
                                                        disabled={deleting[u.id]} title="Delete user"
                                                        className="text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50 p-1.5 rounded hover:bg-rose-50">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {isEditing && (
                                        <tr key={`${u.id}-edit`} className="bg-slate-50 border-b border-slate-200">
                                            <td colSpan={3} className="px-6 py-4">
                                                <div className="grid grid-cols-3 gap-3 items-end">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                                                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                                                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
                                                        <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                                                            placeholder="Leave blank to keep current"
                                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end mt-3 gap-2">
                                                    <button onClick={() => setEditingUserId(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium">Cancel</button>
                                                    <button onClick={() => handleSaveUser(u.id)} disabled={saving[u.id]}
                                                        className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50">
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
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500 text-sm">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
