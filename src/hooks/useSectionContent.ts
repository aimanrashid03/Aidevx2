import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface SectionContentRecord {
    id: string;
    projectId: string;
    docId: string;
    sectionTitle: string;
    html: string;
    sources: string[];
    contentType: 'text' | 'table' | 'diagram';
    diagramType: 'mermaid' | 'drawio' | null;
    isInDocument: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export type SectionStatus = 'not_started' | 'generated_saved' | 'in_document';

interface UpsertPayload {
    projectId: string;
    docId: string;
    sectionTitle: string;
    html: string;
    sources: string[];
    contentType: 'text' | 'table' | 'diagram';
    diagramType: 'mermaid' | 'drawio' | null;
    isInDocument: boolean;
}

function mapRow(row: Record<string, unknown>): SectionContentRecord {
    return {
        id: row.id as string,
        projectId: row.project_id as string,
        docId: row.doc_id as string,
        sectionTitle: row.section_title as string,
        html: (row.html as string) || '',
        sources: (row.sources as string[]) || [],
        contentType: ((row.content_type as string) || 'text') as SectionContentRecord['contentType'],
        diagramType: (row.diagram_type as 'mermaid' | 'drawio' | null) ?? null,
        isInDocument: (row.is_in_document as boolean) || false,
        createdBy: row.created_by as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

export function useSectionContent(projectId: string, docId: string | null) {
    const { user } = useAuth();
    const [records, setRecords] = useState<SectionContentRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchRecords = useCallback(async () => {
        if (!projectId || !docId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('section_content')
                .select('*')
                .eq('project_id', projectId)
                .eq('doc_id', docId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRecords((data || []).map(mapRow));
        } catch (err) {
            console.error('Error fetching section content:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId, docId]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // O(1) lookup by section title
    const recordMap = useMemo(() => {
        const map = new Map<string, SectionContentRecord>();
        for (const r of records) map.set(r.sectionTitle, r);
        return map;
    }, [records]);

    const getRecord = useCallback(
        (sectionTitle: string): SectionContentRecord | undefined => recordMap.get(sectionTitle),
        [recordMap]
    );

    const upsertRecord = useCallback(
        async (data: UpsertPayload): Promise<SectionContentRecord | null> => {
            if (!user) return null;
            try {
                const { data: row, error } = await supabase
                    .from('section_content')
                    .upsert(
                        {
                            project_id: data.projectId,
                            doc_id: data.docId,
                            section_title: data.sectionTitle,
                            html: data.html,
                            sources: data.sources,
                            content_type: data.contentType,
                            diagram_type: data.diagramType,
                            is_in_document: data.isInDocument,
                            created_by: user.id,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'doc_id,section_title' }
                    )
                    .select()
                    .single();

                if (error) throw error;
                const record = mapRow(row as Record<string, unknown>);
                setRecords(prev => {
                    const idx = prev.findIndex(r => r.sectionTitle === data.sectionTitle);
                    if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = record;
                        return next;
                    }
                    return [record, ...prev];
                });
                return record;
            } catch (err) {
                console.error('Error upserting section content:', err);
                return null;
            }
        },
        [user]
    );

    const markInDocument = useCallback(
        async (sectionTitle: string): Promise<void> => {
            if (!docId) return;
            try {
                const { error } = await supabase
                    .from('section_content')
                    .update({ is_in_document: true, updated_at: new Date().toISOString() })
                    .eq('doc_id', docId)
                    .eq('section_title', sectionTitle);

                if (error) throw error;
                setRecords(prev =>
                    prev.map(r =>
                        r.sectionTitle === sectionTitle
                            ? { ...r, isInDocument: true, updatedAt: new Date().toISOString() }
                            : r
                    )
                );
            } catch (err) {
                console.error('Error marking section as in document:', err);
            }
        },
        [docId]
    );

    const getSectionStatus = useCallback(
        (sectionTitle: string): SectionStatus => {
            const record = recordMap.get(sectionTitle);
            if (!record) return 'not_started';
            if (record.isInDocument) return 'in_document';
            return 'generated_saved';
        },
        [recordMap]
    );

    return { records, loading, getRecord, upsertRecord, markInDocument, getSectionStatus };
}
