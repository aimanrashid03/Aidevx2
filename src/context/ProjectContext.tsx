import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface RequirementDoc {
    id: string;
    title: string;
    type: string; // 'BRS', 'URS', etc.
    content: Record<string, unknown[]>; // Section content (Array of structural blocks)
    sectionStatuses?: Record<string, 'drafting' | 'complete'>;
    lastModified: string;
    status: 'draft' | 'final';
    currentVersion?: number;
    // OnlyOffice storage fields
    storagePath?: string | null;   // path in Supabase Storage: documents/{projectId}/{docId}/current.docx
    documentKey?: string | null;   // cache-busting key for OnlyOffice, rotated on every save
}

export interface DocVersion {
    id: string;
    docId: string;
    projectId: string;
    versionNumber: number;
    content: Record<string, unknown[]>;
    sectionStatuses?: Record<string, 'drafting' | 'complete'>;
    title: string;
    status: string;
    createdBy: string | null;
    createdAt: string;
    changeSummary?: string;
    // OnlyOffice storage field
    storagePath?: string | null;   // path to DOCX snapshot: documents/{projectId}/{docId}/v{n}.docx
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
    updateProject: (projectId: string, updates: Partial<Pick<Project, 'name' | 'description' | 'notes'>>) => Promise<void>;
    deleteProjectDocument: (path: string) => Promise<void>;
    deleteRequirementDoc: (id: string, projectId: string) => Promise<void>;
    saveRequirementDoc: (projectId: string, doc: RequirementDoc, changeSummary?: string) => Promise<void>;
    fetchDocVersions: (docId: string, projectId: string) => Promise<DocVersion[]>;
    restoreVersion: (version: DocVersion, projectId: string) => Promise<void>;
    restoreOnlyOfficeVersion: (version: DocVersion, projectId: string) => Promise<void>;
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
                .eq('user_id', user.id)
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
                        sectionStatuses: d.section_statuses || undefined,
                        lastModified: d.last_modified,
                        status: d.status as 'draft' | 'final',
                        currentVersion: d.current_version || 1,
                        storagePath: d.storage_path || null,
                        documentKey: d.document_key || null,
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

    const saveRequirementDoc = async (projectId: string, doc: RequirementDoc, changeSummary?: string) => {
        if (!user) return;

        try {
            // 1. Check if doc already exists (for versioning snapshot)
            const { data: existing } = await supabase
                .from('requirement_docs')
                .select('id, content, title, status, current_version, section_statuses')
                .eq('id', doc.id)
                .eq('project_id', projectId)
                .single();

            let nextVersion = 1;

            if (existing) {
                // 2. Snapshot current content into doc_versions
                const currentVersion = existing.current_version || 1;
                nextVersion = currentVersion + 1;

                await supabase
                    .from('doc_versions')
                    .insert({
                        doc_id: doc.id,
                        project_id: projectId,
                        version_number: currentVersion,
                        content: existing.content || {},
                        section_statuses: existing.section_statuses,
                        title: existing.title,
                        status: existing.status,
                        created_by: user.id,
                        change_summary: changeSummary || null,
                    });
            }

            // 3. Upsert the current document with new content
            const { error } = await supabase
                .from('requirement_docs')
                .upsert({
                    id: doc.id,
                    project_id: projectId,
                    title: doc.title,
                    type: doc.type,
                    content: doc.content,
                    section_statuses: doc.sectionStatuses || null,
                    status: doc.status,
                    current_version: nextVersion,
                    last_modified: new Date().toISOString()
                });

            if (error) throw error;
            await fetchProjects();
        } catch (error) {
            console.error('Error saving document:', error);
        }
    };

    const fetchDocVersions = async (docId: string, projectId: string): Promise<DocVersion[]> => {
        try {
            const { data, error } = await supabase
                .from('doc_versions')
                .select('*')
                .eq('doc_id', docId)
                .eq('project_id', projectId)
                .order('version_number', { ascending: false });

            if (error) throw error;

            return (data || []).map(v => ({
                id: v.id,
                docId: v.doc_id,
                projectId: v.project_id,
                versionNumber: v.version_number,
                content: v.content || {},
                sectionStatuses: v.section_statuses || undefined,
                title: v.title,
                status: v.status,
                createdBy: v.created_by,
                createdAt: v.created_at,
                changeSummary: v.change_summary,
                storagePath: v.storage_path || null,
            }));
        } catch (error) {
            console.error('Error fetching versions:', error);
            return [];
        }
    };

    const restoreVersion = async (version: DocVersion, projectId: string) => {
        if (!user) return;

        try {
            // Save current state as a version first, then overwrite with restored content
            const restoredDoc: RequirementDoc = {
                id: version.docId,
                title: version.title,
                type: '', // type doesn't change, we'll read it
                content: version.content,
                sectionStatuses: version.sectionStatuses,
                lastModified: new Date().toISOString(),
                status: 'draft',
            };

            // Get current doc type
            const { data: current } = await supabase
                .from('requirement_docs')
                .select('type')
                .eq('id', version.docId)
                .eq('project_id', projectId)
                .single();

            restoredDoc.type = current?.type || 'BRS';

            await saveRequirementDoc(projectId, restoredDoc, `Restored from version ${version.versionNumber}`);
        } catch (error) {
            console.error('Error restoring version:', error);
        }
    };

    const restoreOnlyOfficeVersion = async (version: DocVersion, projectId: string) => {
        if (!user || !version.storagePath) return;

        try {
            const currentPath = `documents/${projectId}/${version.docId}/current.docx`;

            // Download the version snapshot DOCX
            const versionRelPath = version.storagePath.startsWith('documents/')
                ? version.storagePath.slice('documents/'.length)
                : version.storagePath;

            const { data: versionFile, error: downloadErr } = await supabase.storage
                .from('documents')
                .download(versionRelPath);

            if (downloadErr || !versionFile) throw new Error('Could not download version file');

            // Upload it as the new current.docx
            const { error: uploadErr } = await supabase.storage
                .from('documents')
                .upload(currentPath.slice('documents/'.length), versionFile, {
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    upsert: true,
                });

            if (uploadErr) throw uploadErr;

            // Rotate the document key so OnlyOffice reloads
            const newKey = `${version.docId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            const { error: dbErr } = await supabase
                .from('requirement_docs')
                .update({
                    storage_path: currentPath,
                    document_key: newKey,
                    last_modified: new Date().toISOString(),
                })
                .eq('id', version.docId)
                .eq('project_id', projectId);

            if (dbErr) throw dbErr;

            await fetchProjects();
        } catch (error) {
            console.error('Error restoring OnlyOffice version:', error);
            throw error;
        }
    };

    const updateProject = async (projectId: string, updates: Partial<Pick<Project, 'name' | 'description' | 'notes'>>) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('projects')
                .update(updates)
                .eq('id', projectId);

            if (error) throw error;
            await fetchProjects();
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    };

    const deleteProjectDocument = async (path: string) => {
        if (!user) return;
        try {
            // Remove from storage
            const { error: storageError } = await supabase.storage
                .from('project-files')
                .remove([path]);

            if (storageError) throw storageError;

            const { error: dbError } = await supabase
                .from('project_documents')
                .delete()
                .eq('file_path', path);

            if (dbError) throw dbError;

            await fetchProjects();
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    };

    const deleteRequirementDoc = async (id: string, projectId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('requirement_docs')
                .delete()
                .eq('id', id)
                .eq('project_id', projectId);

            if (error) throw error;

            await fetchProjects();
        } catch (error) {
            console.error('Error deleting requirement document:', error);
            throw error;
        }
    };

    return (
        <ProjectContext.Provider value={{ projects, loading, refreshProjects: fetchProjects, addProject, updateProject, deleteProjectDocument, deleteRequirementDoc, saveRequirementDoc, fetchDocVersions, restoreVersion, restoreOnlyOfficeVersion }}>
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
