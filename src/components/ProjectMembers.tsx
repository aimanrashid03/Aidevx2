import { useState } from 'react';
import { UserPlus, X, Users, Trash2 } from 'lucide-react';
import { useProjectMembers, type ProjectMember } from '../hooks/useProjectMembers';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

interface ProjectMembersProps {
    projectId: string;
}

export default function ProjectMembers({ projectId }: ProjectMembersProps) {
    const { members, loading, inviteByEmail, removeMember, updateMemberRole } = useProjectMembers(projectId);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);
    const { dialog, confirm } = useConfirmDialog();

    const handleInvite = async () => {
        if (!email.trim()) return;
        setInviting(true);
        setInviteError(null);
        const result = await inviteByEmail(email.trim(), role);
        if (!result.success) {
            setInviteError(result.error || 'Failed to invite');
        } else {
            setEmail('');
            setRole('viewer');
        }
        setInviting(false);
    };

    const handleRemove = async (member: ProjectMember) => {
        const ok = await confirm({
            title: 'Remove Member',
            message: `Remove ${member.fullName || member.email} from this project? They will lose access.`,
            confirmLabel: 'Remove',
            variant: 'danger',
        });
        if (!ok) return;
        await removeMember(member.id);
    };

    const getRoleBadgeStyle = (r: string) => {
        switch (r) {
            case 'owner':  return 'bg-[var(--accent-100)] text-[var(--accent-700)] border-[var(--accent-200)]';
            case 'editor': return 'bg-blue-100 text-blue-700 border-blue-200';
            default:       return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getInitials = (name: string, em: string) => {
        if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        return em.slice(0, 2).toUpperCase();
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Users size={14} />
                    Collaborators
                </h2>
                <span className="text-[10px] text-slate-400 font-medium">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Invite Form */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleInvite()}
                        placeholder="Enter email to invite..."
                        className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs shadow-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                    </select>
                    <button
                        onClick={handleInvite}
                        disabled={inviting || !email.trim()}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
                    >
                        {inviting
                            ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            : <UserPlus size={12} />
                        }
                        Invite
                    </button>
                </div>
                {inviteError && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-rose-600">
                        <X size={12} />
                        {inviteError}
                    </p>
                )}
            </div>

            {/* Members List */}
            <div className="divide-y divide-slate-100">
                {loading ? (
                    <div className="p-4 text-center">
                        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--accent-600)]" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-6 text-center">
                        <Users size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">No team members yet. Invite collaborators above.</p>
                    </div>
                ) : (
                    members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between px-4 py-3 group hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {getInitials(member.fullName, member.email)}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900">{member.fullName || member.email}</div>
                                    {member.fullName && <div className="text-[10px] text-slate-400">{member.email}</div>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {member.role === 'owner' ? (
                                    <>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${getRoleBadgeStyle(member.role)}`}>
                                            {member.role}
                                        </span>
                                        <div className="w-[22px]" />
                                    </>
                                ) : (
                                    <>
                                        <select
                                            value={member.role}
                                            onChange={e => updateMemberRole(member.id, e.target.value as 'viewer' | 'editor')}
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border cursor-pointer ${getRoleBadgeStyle(member.role)}`}
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="editor">Editor</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemove(member)}
                                            className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-rose-50"
                                            title="Remove member"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            {dialog}
        </div>
    );
}
