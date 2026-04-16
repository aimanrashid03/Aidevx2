import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface UserStory {
    id: string;
    projectId: string;
    title: string;
    responses: Record<string, string>;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    embeddingStatus: 'pending' | 'processing' | 'processed' | 'failed';
}

export function useUserStories(projectId: string) {
    const { user } = useAuth();
    const [stories, setStories] = useState<UserStory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStories = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_stories')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStories(
                (data || []).map(s => ({
                    id: s.id,
                    projectId: s.project_id,
                    title: s.title,
                    responses: s.responses || {},
                    createdBy: s.created_by,
                    createdAt: s.created_at,
                    updatedAt: s.updated_at,
                    embeddingStatus: s.embedding_status || 'pending',
                }))
            );
        } catch (err) {
            console.error('Error fetching user stories:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    const createStory = async (title: string, responses: Record<string, string> = {}): Promise<UserStory | null> => {
        if (!user) return null;
        try {
            const { data, error } = await supabase
                .from('user_stories')
                .insert({ project_id: projectId, title, responses, created_by: user.id })
                .select()
                .single();

            if (error) throw error;
            const story: UserStory = {
                id: data.id,
                projectId: data.project_id,
                title: data.title,
                responses: data.responses || {},
                createdBy: data.created_by,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                embeddingStatus: data.embedding_status || 'pending',
            };
            setStories(prev => [story, ...prev]);
            return story;
        } catch (err) {
            console.error('Error creating user story:', err);
            return null;
        }
    };

    const updateStory = async (id: string, updates: { title?: string; responses?: Record<string, string> }): Promise<void> => {
        try {
            const { error } = await supabase
                .from('user_stories')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setStories(prev =>
                prev.map(s =>
                    s.id === id
                        ? { ...s, ...updates, updatedAt: new Date().toISOString() }
                        : s
                )
            );
        } catch (err) {
            console.error('Error updating user story:', err);
            throw err;
        }
    };

    const deleteStory = async (id: string): Promise<void> => {
        try {
            // Clean up RAG chunks (matches pattern from embedStory: `user-story/${id}`)
            await supabase
                .from('document_chunks')
                .delete()
                .eq('project_id', projectId)
                .eq('document_path', `user-story/${id}`);

            const { error } = await supabase
                .from('user_stories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setStories(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error('Error deleting user story:', err);
            throw err;
        }
    };

    const embedStory = async (story: UserStory): Promise<void> => {
        // Update local + DB status to processing
        setStories(prev => prev.map(s => s.id === story.id ? { ...s, embeddingStatus: 'processing' } : s));
        await supabase.from('user_stories').update({ embedding_status: 'processing' }).eq('id', story.id);

        try {
            // Section title lookup for meaningful RAG context
            const SECTION_TITLES: Record<string, { title: string; prompts: string[] }> = {
                q1: { title: 'System Overview', prompts: ['What is the system name and purpose?', 'What are the expected outcomes?'] },
                q2: { title: 'Users & Roles', prompts: ['Who will be using this system?', 'What roles/responsibilities?', 'Current issues?', 'Impact?'] },
                q3: { title: 'Modules & Features', prompts: ['Main modules?', 'Purpose of each?', 'Which users use each?'] },
                q4: { title: 'Current Workflow (AS-IS)', prompts: ['Current workflow?', 'Where do delays/errors occur?'] },
                q5: { title: 'Proposed Workflow (TO-BE)', prompts: ['How should it work after?', 'Steps automated/improved?'] },
                q6: { title: 'User Actions & Permissions', prompts: ['Actions per user?', 'Approval/verification needed?'] },
                q7: { title: 'Validations', prompts: ['Required validations?', 'Mandatory fields?'] },
            };

            // Format with section headings and question context for better RAG retrieval
            const content = Object.entries(story.responses)
                .filter(([, value]) => value?.trim())
                .map(([key, value]) => {
                    const section = SECTION_TITLES[key];
                    if (section) {
                        return `## ${section.title}\n${section.prompts.join(' ')}\n${value.trim()}`;
                    }
                    return `## ${key}\n${value.trim()}`;
                })
                .join('\n\n');

            const documentPath = `user-story/${story.id}`;

            const { error } = await supabase.functions.invoke('embed_document', {
                body: { projectId, documentPath, content, extraMetadata: { fileName: story.title } },
            });

            if (error) throw error;

            // Mark as processed
            await supabase.from('user_stories').update({ embedding_status: 'processed' }).eq('id', story.id);

            // Refresh semantic coverage assessment (fire-and-forget)
            supabase.functions.invoke('assess_coverage', {
                body: { projectId, docType: 'BRS' },
            }).catch(() => {});
            setStories(prev => prev.map(s => s.id === story.id ? { ...s, embeddingStatus: 'processed' } : s));
        } catch (err) {
            console.error('Error embedding user story:', err);
            await supabase.from('user_stories').update({ embedding_status: 'failed' }).eq('id', story.id);
            setStories(prev => prev.map(s => s.id === story.id ? { ...s, embeddingStatus: 'failed' } : s));
            throw err;
        }
    };

    return { stories, loading, fetchStories, createStory, updateStory, deleteStory, embedStory };
}
