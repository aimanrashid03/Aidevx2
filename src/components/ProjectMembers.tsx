import { useState } from 'react';
import { UserPlus, X, Users, Trash2 } from 'lucide-react';
import { useProjectMembers, type ProjectMember } from '../hooks/useProjectMembers';

interface ProjectMembersProps {
    projectId: string;
}

export default function ProjectMembers({ projectId }: ProjectMembersProps) {
    const { members, loading, inviteByEmail, removeMember, updateMemberRole } = useProjectMembers(projectId);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);

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
        if (!confirm(`Remove ${member.fullName || member.email} from this project?`)) return;
        await removeMember(member.id);
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-violet-50 text-violet-700 border-violet-200';
            case 'editor': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getInitials = (name: string, email: string) => {
        if (name) {
            return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        }
        return email.slice(0, 2).toUpperCase();
    };

    return (
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Users size={14} />
                    Team Members
                </h2>
                <span className="text-[10px] text-slate-400 font-bold">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Invite Form */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                        placeholder="Enter email to invite..."
                        className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-xs"
                    />
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                        className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                    </select>
                    <button
                        onClick={handleInvite}
                        disabled={inviting || !email.trim()}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {inviting ? (
                            <div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                            <UserPlus size={12} />
                        )}
                        Invite
                    </button>
                </div>
                {inviteError && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <X size={12} />
                        {inviteError}
                    </p>
                )}
            </div>

            {/* Members List */}
            <div className="divide-y divide-slate-100">
                {loading ? (
                    <div className="p-4 text-center">
                        <div className="animate-spin h-5 w-5 border-2 border-slate-200 border-t-slate-600 rounded-full mx-auto" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-6 text-center">
                        <Users size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">No team members yet. Invite collaborators above.</p>
                    </div>
                ) : (
                    members.map((member) => (
                        <div key={member.id} className="px-4 py-3 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {getInitials(member.fullName, member.email)}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900">
                                        {member.fullName || member.email}
                                    </div>
                                    {member.fullName && (
                                        <div className="text-[10px] text-slate-400">{member.email}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {member.role === 'owner' ? (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeStyle(member.role)}`}>
                                        {member.role}
                                    </span>
                                ) : (
                                    <select
                                        value={member.role}
                                        onChange={(e) => updateMemberRole(member.id, e.target.value as 'viewer' | 'editor')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${getRoleBadgeStyle(member.role)}`}
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                    </select>
                                )}
                                {member.role !== 'owner' && (
                                    <button
                                        onClick={() => handleRemove(member)}
                                        className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-red-50"
                                        title="Remove member"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
