import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import {
    ArrowLeft, FileText, File, Calendar, X,
    LayoutTemplate, ChevronRight, LayoutDashboard,
    CirclePlay, LibraryBig, Users, Sparkles, FileEdit, Check, Edit, FlaskConical
} from 'lucide-react';
import { useState } from 'react';
import DashboardTab from '../components/project-tabs/DashboardTab';
import WorkspaceTab from '../components/project-tabs/WorkspaceTab';
import LibraryTab from '../components/project-tabs/LibraryTab';
import CollaboratorsTab from '../components/project-tabs/CollaboratorsTab';
import PrototypeTab from '../components/project-tabs/PrototypeTab';

const TEMPLATES = [
    { id: 'BRS', name: 'Business Requirement Spec (BRS)', desc: 'High-level business goals and scope.' },
    { id: 'URS', name: 'User Requirement Spec (URS)', desc: 'User needs and interaction flows.' },
    { id: 'SRS', name: 'Software Requirement Spec (SRS)', desc: 'Detailed functional and non-functional requirements.' },
    { id: 'SDS', name: 'Software Design Spec (SDS)', desc: 'Technical architecture and system design.' },
];

type TabKey = 'dashboard' | 'workspace' | 'library' | 'prototype' | 'collaborators';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'workspace', label: 'Workspace', icon: CirclePlay },
    { key: 'library', label: 'Library', icon: LibraryBig },
    { key: 'prototype', label: 'Prototype', icon: FlaskConical },
    { key: 'collaborators', label: 'Collaborators', icon: Users },
];

export default function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { projects, updateProject, deleteRequirementDoc, refreshProjects } = useProjects();

    const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', notes: '' });

    const project = projects.find(p => p.id === projectId);

    const handleEditClick = () => {
        if (project) {
            setEditForm({ name: project.name, description: project.description || '', notes: project.notes || '' });
            setIsEditing(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!project || !editForm.name) return;
        try {
            await updateProject(project.id, editForm);
            setIsEditing(false);
        } catch {
            alert('Failed to update project details.');
        }
    };

    const handleDeleteRequirement = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!project) return;
        if (window.confirm('Are you sure you want to delete this requirement document?')) {
            try {
                await deleteRequirementDoc(id, project.id);
            } catch {
                alert('Failed to delete requirement document.');
            }
        }
    };

    const handleCreateDocument = (templateId: string) => {
        if (templateId === 'BRS') {
            setSelectedTemplate('BRS');
            return;
        }
        navigate(`/editor/${projectId}/${templateId}`);
    };

    if (!project) {
        return <div className="p-8">Project not found</div>;
    }

    const tabBadge = (key: TabKey): number | undefined => {
        if (key === 'workspace') return project.requirementDocs?.length || undefined;
        if (key === 'library') return project.documents?.length || undefined;
        return undefined;
    };

    return (
        <div className="px-6 py-6 font-sans relative pb-10">
            {/* Back */}
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-slate-500 hover:text-slate-900 mb-4 transition-colors text-xs font-medium"
            >
                <ArrowLeft size={12} className="mr-1.5" />
                Back to Dashboard
            </button>

            {/* Header */}
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-200">
                {isEditing ? (
                    <div className="flex-1 mr-4 space-y-3">
                        <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full text-xl md:text-2xl font-bold text-slate-900 tracking-tight border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="Project Name"
                        />
                        <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full h-16 border border-slate-300 rounded p-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            placeholder="Project Description..."
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSaveEdit} className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1">
                                <Check size={14} /> Save
                            </button>
                            <button onClick={() => setIsEditing(false)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1">
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">{project.name}</h1>
                            <button onClick={handleEditClick} className="text-slate-400 hover:text-slate-900 transition-colors" title="Edit Project">
                                <Edit size={16} />
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] md:text-xs text-slate-500 font-medium leading-none mb-2">
                            <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <FileText size={12} />
                                <span>{project.requirementDocs?.length || 0} Drafts</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <File size={12} />
                                <span>{project.documents?.length || 0} Files</span>
                            </div>
                        </div>
                        {project.description && (
                            <p className="text-slate-700 text-xs leading-relaxed max-w-3xl mt-1.5">
                                {project.description}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-5 space-x-4 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const badge = tabBadge(tab.key);
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-2 whitespace-nowrap ${
                                active
                                    ? 'text-slate-900 before:absolute before:bottom-0 before:left-0 before:w-full before:h-0.5 before:bg-slate-900'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon size={16} className={active ? 'text-slate-900' : 'text-slate-400'} />
                            {tab.label}
                            {badge !== undefined && badge > 0 && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'dashboard' && (
                    <DashboardTab
                        project={project}
                        onNewDraft={() => setIsCreateModalOpen(true)}
                        onGoToLibrary={() => setActiveTab('library')}
                        onGoToCollaborators={() => setActiveTab('collaborators')}
                        isEditing={isEditing}
                        editForm={editForm}
                        onEditFormChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
                        onEditClick={handleEditClick}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={() => setIsEditing(false)}
                    />
                )}
                {activeTab === 'workspace' && (
                    <WorkspaceTab
                        project={project}
                        onNewDraft={() => setIsCreateModalOpen(true)}
                        onDeleteDoc={handleDeleteRequirement}
                    />
                )}
                {activeTab === 'library' && (
                    <LibraryTab
                        project={project}
                        onFilesChanged={refreshProjects}
                    />
                )}
                {activeTab === 'prototype' && (
                    <PrototypeTab project={project} />
                )}
                {activeTab === 'collaborators' && (
                    <CollaboratorsTab projectId={project.id} />
                )}
            </div>

            {/* Create Document Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create Document</h2>
                                <p className="text-xs text-slate-500 mt-1">Select a document type to initialize your requirement document.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="space-y-3">
                                {TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleCreateDocument(template.id)}
                                        className="w-full flex items-center gap-4 p-3 rounded border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 rounded bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                            <LayoutTemplate size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-black">{template.name}</h3>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-900" />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">{template.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BRS Sub-Modal */}
            {selectedTemplate === 'BRS' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create BRS Document</h2>
                                <p className="text-xs text-slate-500 mt-1">Choose how to start your Business Requirement Specification.</p>
                            </div>
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <button
                                onClick={() => {
                                    setSelectedTemplate(null);
                                    setIsCreateModalOpen(false);
                                    navigate(`/editor/${projectId}/BRS?autoGenerate=true`);
                                }}
                                className="w-full flex items-start gap-4 p-4 rounded border-2 border-slate-900 bg-slate-50 hover:bg-slate-100 transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Sparkles size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">Jana Dokumen Automatik dengan AI</h3>
                                        <span className="text-[10px] font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded">RECOMMENDED</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        AI akan menganalisis fail projek yang dimuat naik dan menjana semua bahagian BRS secara automatik. Proses ini mengambil masa 2–5 minit.
                                    </p>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedTemplate(null);
                                    setIsCreateModalOpen(false);
                                    navigate(`/editor/${projectId}/BRS`);
                                }}
                                className="w-full flex items-start gap-4 p-4 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-slate-200">
                                    <FileEdit size={18} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-black">Mulakan dengan Templat Kosong</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Buka templat BRS kosong dan isi kandungan secara manual atau guna panel AI untuk menjana bahagian tertentu.
                                    </p>
                                </div>
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
