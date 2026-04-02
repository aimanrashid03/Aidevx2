import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface ActivityEntry {
    id: string;
    projectId: string;
    docId: string | null;
    userId: string;
    userName: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: string;
}

function mapRow(row: Record<string, unknown>, profileMap: Record<string, string>): ActivityEntry {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        docId: (row.doc_id as string) || null,
        userId: row.user_id as string,
        userName: profileMap[row.user_id as string] || 'Unknown',
        action: row.action as string,
        details: (row.details as Record<string, unknown>) || {},
        createdAt: row.created_at as string,
    };
}

export function useActivityLog(projectId: string, docId?: string | null) {
    const { user } = useAuth();
    const [entries, setEntries] = useState<ActivityEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchEntries = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            let query = supabase
                .from('activity_log')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (docId) {
                query = query.eq('doc_id', docId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const rows = data || [];
            if (rows.length === 0) {
                setEntries([]);
                return;
            }

            // Batch-fetch profiles for all unique user IDs
            const userIds = [...new Set(rows.map(r => r.user_id as string))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);

            const profileMap: Record<string, string> = {};
            for (const p of profiles || []) {
                profileMap[p.id] = p.full_name || p.email || p.id;
            }

            setEntries(rows.map(r => mapRow(r as Record<string, unknown>, profileMap)));
        } catch (err) {
            console.error('Error fetching activity log:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId, docId]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    // Real-time subscription
    useEffect(() => {
        if (!projectId) return;
        const channel = supabase
            .channel(`activity:${projectId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `project_id=eq.${projectId}` },
                () => { fetchEntries(); }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [projectId, fetchEntries]);

    const logAction = useCallback(
        async (action: string, details: Record<string, unknown> = {}, logDocId?: string | null) => {
            if (!user || !projectId) return;
            try {
                await supabase.from('activity_log').insert({
                    project_id: projectId,
                    doc_id: logDocId ?? docId ?? null,
                    user_id: user.id,
                    action,
                    details,
                });
            } catch (err) {
                console.error('Error logging activity:', err);
            }
        },
        [user, projectId, docId]
    );

    return { entries, loading, logAction, refetch: fetchEntries };
}
