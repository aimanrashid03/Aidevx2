import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to Supabase Realtime postgres_changes on requirement_docs
 * for a specific doc, so lock/unlock state is reflected in real-time
 * across all open tabs/browsers.
 */
export function useDocumentLock(docId: string | undefined, projectId: string | undefined) {
    const [lockedBy, setLockedBy] = useState<string | null>(null);
    const [lockedAt, setLockedAt] = useState<string | null>(null);

    useEffect(() => {
        if (!docId || !projectId) return;

        const channel = supabase
            .channel(`lock:${docId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'requirement_docs',
                    filter: `id=eq.${docId}`,
                },
                (payload) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const newRow = payload.new as any;
                    setLockedBy(newRow.locked_by ?? null);
                    setLockedAt(newRow.locked_at ?? null);
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [docId, projectId]);

    return { lockedBy, lockedAt };
}
