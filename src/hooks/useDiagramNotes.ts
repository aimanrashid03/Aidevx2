import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface DiagramNote {
    id: string;
    projectId: string;
    title: string;
    content: string;
    diagramType: 'mermaid' | 'drawio' | 'freeform';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export function useDiagramNotes(projectId: string) {
    const { user } = useAuth();
    const [notes, setNotes] = useState<DiagramNote[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotes = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('diagram_notes')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(
                (data || []).map(n => ({
                    id: n.id,
                    projectId: n.project_id,
                    title: n.title,
                    content: n.content || '',
                    diagramType: (n.diagram_type as DiagramNote['diagramType']) || 'freeform',
                    createdBy: n.created_by,
                    createdAt: n.created_at,
                    updatedAt: n.updated_at,
                }))
            );
        } catch (err) {
            console.error('Error fetching diagram notes:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const createNote = async (
        title: string,
        content: string = '',
        diagramType: DiagramNote['diagramType'] = 'freeform'
    ): Promise<DiagramNote | null> => {
        if (!user) return null;
        try {
            const { data, error } = await supabase
                .from('diagram_notes')
                .insert({ project_id: projectId, title, content, diagram_type: diagramType, created_by: user.id })
                .select()
                .single();

            if (error) throw error;
            const note: DiagramNote = {
                id: data.id,
                projectId: data.project_id,
                title: data.title,
                content: data.content || '',
                diagramType: (data.diagram_type as DiagramNote['diagramType']) || 'freeform',
                createdBy: data.created_by,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
            setNotes(prev => [note, ...prev]);
            return note;
        } catch (err) {
            console.error('Error creating diagram note:', err);
            return null;
        }
    };

    const updateNote = async (
        id: string,
        updates: { title?: string; content?: string; diagramType?: DiagramNote['diagramType'] }
    ): Promise<void> => {
        try {
            const dbUpdates: Record<string, string> = { updated_at: new Date().toISOString() };
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.content !== undefined) dbUpdates.content = updates.content;
            if (updates.diagramType !== undefined) dbUpdates.diagram_type = updates.diagramType;

            const { error } = await supabase
                .from('diagram_notes')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
            setNotes(prev =>
                prev.map(n =>
                    n.id === id
                        ? { ...n, ...updates, updatedAt: new Date().toISOString() }
                        : n
                )
            );
        } catch (err) {
            console.error('Error updating diagram note:', err);
            throw err;
        }
    };

    const deleteNote = async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('diagram_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Error deleting diagram note:', err);
            throw err;
        }
    };

    return { notes, loading, fetchNotes, createNote, updateNote, deleteNote };
}
