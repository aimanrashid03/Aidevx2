import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface PresenceUser {
    userId: string;
    userName: string;
    onlineAt: string;
}

export function useDocumentPresence(docId: string | undefined) {
    const { user, profile } = useAuth();
    const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);

    useEffect(() => {
        if (!docId || !user) return;

        const channel = supabase.channel(`presence:doc:${docId}`);

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users: PresenceUser[] = [];
                const seen = new Set<string>();

                Object.values(state).forEach((presences: any[]) => {
                    presences.forEach((p: any) => {
                        if (!seen.has(p.user_id)) {
                            seen.add(p.user_id);
                            users.push({
                                userId: p.user_id,
                                userName: p.user_name,
                                onlineAt: p.online_at,
                            });
                        }
                    });
                });

                setPresentUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        user_name: profile?.full_name || profile?.email || 'Unknown',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [docId, user, profile]);

    // Filter out current user from the list for display
    const otherUsers = presentUsers.filter(u => u.userId !== user?.id);

    return {
        presentUsers,
        otherUsers,
        totalViewers: presentUsers.length,
    };
}
