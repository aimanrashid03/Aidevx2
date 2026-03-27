import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface ProjectMember {
    id: string;
    userId: string;
    email: string;
    fullName: string;
    role: 'viewer' | 'editor' | 'owner';
    invitedAt: string;
}

export function useProjectMembers(projectId: string | undefined) {
    const { user } = useAuth();
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!projectId || !user) return;

        setLoading(true);
        try {
            // 1. Fetch member rows
            const { data: memberRows, error } = await supabase
                .from('project_members')
                .select('id, user_id, role, invited_at')
                .eq('project_id', projectId);

            if (error) throw error;
            if (!memberRows || memberRows.length === 0) {
                setMembers([]);
                setLoading(false);
                return;
            }

            // 2. Fetch profiles for all member user_ids
            const userIds = memberRows.map(m => m.user_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .in('id', userIds);

            const profileMap: Record<string, { email: string; full_name: string }> = {};
            for (const p of profiles || []) {
                profileMap[p.id] = { email: p.email || '', full_name: p.full_name || '' };
            }

            // 3. Merge
            const mapped: ProjectMember[] = memberRows.map((m) => ({
                id: m.id,
                userId: m.user_id,
                email: profileMap[m.user_id]?.email || '',
                fullName: profileMap[m.user_id]?.full_name || '',
                role: m.role,
                invitedAt: m.invited_at,
            }));

            setMembers(mapped);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    }, [projectId, user]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const inviteByEmail = async (email: string, role: 'viewer' | 'editor' = 'viewer') => {
        if (!projectId || !user) return { success: false, error: 'Not authenticated' };

        try {
            // Look up user by email in profiles
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', email)
                .single();

            if (profileError || !profile) {
                return { success: false, error: 'User not found. They must have an account first.' };
            }

            if (profile.id === user.id) {
                return { success: false, error: 'You cannot invite yourself.' };
            }

            // Check if already a member
            const existing = members.find(m => m.userId === profile.id);
            if (existing) {
                return { success: false, error: 'User is already a member of this project.' };
            }

            const { error: insertError } = await supabase
                .from('project_members')
                .insert({
                    project_id: projectId,
                    user_id: profile.id,
                    role,
                    invited_by: user.id,
                });

            if (insertError) throw insertError;

            await fetchMembers();
            return { success: true, error: null };
        } catch (error: any) {
            console.error('Error inviting member:', error);
            return { success: false, error: error.message || 'Failed to invite member' };
        }
    };

    const removeMember = async (memberId: string) => {
        if (!projectId || !user) return;

        try {
            const { error } = await supabase
                .from('project_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
            await fetchMembers();
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const updateMemberRole = async (memberId: string, newRole: 'viewer' | 'editor') => {
        if (!projectId || !user) return;

        try {
            const { error } = await supabase
                .from('project_members')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;
            await fetchMembers();
        } catch (error) {
            console.error('Error updating member role:', error);
        }
    };

    return {
        members,
        loading,
        inviteByEmail,
        removeMember,
        updateMemberRole,
        refreshMembers: fetchMembers,
    };
}
