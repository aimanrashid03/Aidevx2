import { createContext, useContext, useState, type ReactNode } from 'react';

export interface RequirementDoc {
    id: string;
    title: string;
    type: string; // 'BRS', 'URS', etc.
    content: Record<number, string>; // Section content
    lastModified: string;
    status: 'draft' | 'final';
}

export interface Project {
    id: string;
    name: string;
    description: string;
    notes?: string;
    documents?: string[];
    requirementDocs: RequirementDoc[];
    createdAt: string;
}

interface ProjectContextType {
    projects: Project[];
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'requirementDocs'>) => void;
    saveRequirementDoc: (projectId: string, doc: RequirementDoc) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([
        {
            id: '1',
            name: 'E-Commerce Platform',
            description: 'Modern e-commerce solution for retail clients.',
            notes: 'Key focus on mobile responsiveness and payment gateway integration.',
            documents: ['requirements_v1.pdf', 'competitor_analysis.docx'],
            requirementDocs: [
                {
                    id: 'doc-1',
                    title: 'Initial BRS',
                    type: 'BRS',
                    content: { 0: 'This is the executive summary...' },
                    lastModified: new Date().toISOString(),
                    status: 'draft'
                }
            ],
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            name: 'Internal HR Tool',
            description: 'Employee management system for internal use.',
            requirementDocs: [],
            createdAt: new Date(Date.now() - 86400000).toISOString()
        }
    ]);

    const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'requirementDocs'>) => {
        const newProject: Project = {
            ...projectData,
            id: Math.random().toString(36).substr(2, 9),
            requirementDocs: [],
            createdAt: new Date().toISOString()
        };
        setProjects(prev => [newProject, ...prev]);
    };

    const saveRequirementDoc = (projectId: string, doc: RequirementDoc) => {
        setProjects(prev => prev.map(p => {
            if (p.id === projectId) {
                const existingDocIndex = p.requirementDocs.findIndex(d => d.id === doc.id);
                let updatedDocs;
                if (existingDocIndex >= 0) {
                    updatedDocs = [...p.requirementDocs];
                    updatedDocs[existingDocIndex] = doc;
                } else {
                    updatedDocs = [...p.requirementDocs, doc];
                }
                return { ...p, requirementDocs: updatedDocs };
            }
            return p;
        }));
    };

    return (
        <ProjectContext.Provider value={{ projects, addProject, saveRequirementDoc }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProjects() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
}

