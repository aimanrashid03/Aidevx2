import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, FolderOpen, GitBranch } from 'lucide-react';
import LibraryUserStories from './LibraryUserStories';
import LibrarySupportingFiles from './LibrarySupportingFiles';
import LibraryDiagramNotes from './LibraryDiagramNotes';
import type { Project } from '../../context/ProjectContext';

interface SectionProps {
    title: string;
    icon: React.ElementType;
    badge?: number;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

function Section({ title, icon: Icon, badge, defaultOpen = true, children }: SectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-200 rounded overflow-hidden bg-white">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    <Icon size={15} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-900">{title}</span>
                    {badge !== undefined && badge > 0 && (
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
            </button>
            {open && (
                <div className="p-4">
                    {children}
                </div>
            )}
        </div>
    );
}

interface Props {
    project: Project;
    onFilesChanged: () => Promise<void>;
}

export default function LibraryTab({ project, onFilesChanged }: Props) {
    return (
        <div className="space-y-4">
            <Section
                title="User Stories"
                icon={BookOpen}
                defaultOpen={true}
            >
                <LibraryUserStories projectId={project.id} />
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section
                    title="Supporting Files"
                    icon={FolderOpen}
                    badge={project.documents?.length}
                    defaultOpen={true}
                >
                    <LibrarySupportingFiles project={project} onFilesChanged={onFilesChanged} />
                </Section>

                <Section
                    title="Diagram Notes"
                    icon={GitBranch}
                    defaultOpen={true}
                >
                    <LibraryDiagramNotes projectId={project.id} />
                </Section>
            </div>
        </div>
    );
}
