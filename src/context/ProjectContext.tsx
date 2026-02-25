import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface RequirementDoc {
    id: string;
    title: string;
    type: string; // 'BRS', 'URS', etc.
    content: Record<number, any[]>; // Section content (Array of structural blocks)
    lastModified: string;
    status: 'draft' | 'final';
}

export interface Project {
    id: string;
    name: string;
    description: string;
    notes?: string;
    documents?: { name: string; path: string }[];
    requirementDocs: RequirementDoc[];
    createdAt: string;
}

interface ProjectContextType {
    projects: Project[];
    loading: boolean;
    refreshProjects: () => Promise<void>;
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'requirementDocs'>) => Promise<string | null>;
    saveRequirementDoc: (projectId: string, doc: RequirementDoc) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
        if (!user) {
            setProjects([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // 1. Fetch Projects
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;

            // 2. Fetch related data for all projects
            const enrichedProjects = await Promise.all(projectsData.map(async (p) => {
                // Fetch Documents (Metadata)
                const { data: docsData } = await supabase
                    .from('project_documents')
                    .select('file_name, file_path')
                    .eq('project_id', p.id);

                // Fetch Requirement Docs
                const { data: reqDocsData } = await supabase
                    .from('requirement_docs')
                    .select('*')
                    .eq('project_id', p.id);

                return {
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    notes: p.notes,
                    createdAt: p.created_at,
                    documents: docsData?.map(d => ({ name: d.file_name, path: d.file_path })) || [],
                    requirementDocs: reqDocsData?.map(d => ({
                        id: d.id,
                        title: d.title,
                        type: d.type,
                        content: d.content || {},
                        lastModified: d.last_modified,
                        status: d.status as 'draft' | 'final'
                    })) || []
                };
            }));

            setProjects(enrichedProjects);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'requirementDocs'>) => {
        if (!user) return null;

        try {
            const { data, error } = await supabase
                .from('projects')
                .insert({
                    user_id: user.id,
                    name: projectData.name,
                    description: projectData.description,
                    notes: projectData.notes
                })
                .select()
                .single();

            if (error) throw error;

            await fetchProjects();
            return data.id;
        } catch (error) {
            console.error('Error adding project:', error);
            return null;
        }
    };

    const saveRequirementDoc = async (projectId: string, doc: RequirementDoc) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('requirement_docs')
                .upsert({
                    id: doc.id,
                    project_id: projectId,
                    title: doc.title,
                    type: doc.type,
                    content: doc.content,
                    status: doc.status,
                    last_modified: new Date().toISOString()
                });

            if (error) throw error;
            await fetchProjects();
        } catch (error) {
            console.error('Error saving document:', error);
        }
    };

    return (
        <ProjectContext.Provider value={{ projects, loading, refreshProjects: fetchProjects, addProject, saveRequirementDoc }}>
            {children}
        </ProjectContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjects() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
}
