import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, File, Calendar, Plus, X, LayoutTemplate, ChevronRight, Download, Edit, Trash2, Check, CloudUpload, Clock, FileCheck, AlertCircle, LayoutDashboard, Folders } from 'lucide-react';
import { useRef, useState, useCallback, DragEvent } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for PDF.js to load from unpkg CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const TEMPLATES = [
    { id: 'BRS', name: 'Business Requirement Spec (BRS)', desc: 'High-level business goals and scope.' },
    { id: 'URS', name: 'User Requirement Spec (URS)', desc: 'User needs and interaction flows.' },
    { id: 'SRS', name: 'Software Requirement Spec (SRS)', desc: 'Detailed functional and non-functional requirements.' },
    { id: 'SDS', name: 'Software Design Spec (SDS)', desc: 'Technical architecture and system design.' },
];

// Helper to determine simulated status based on last modification
const getDocumentStatus = (lastModified: string) => {
    const daysSinceMod = (new Date().getTime() - new Date(lastModified).getTime()) / (1000 * 3600 * 24);
    if (daysSinceMod < 1) return { key: 'Active', label: 'Active Draft', icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (daysSinceMod > 7) return { key: 'Review', label: 'Ready for Review', icon: FileCheck, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return { key: 'Stale', label: 'Needs Attention', icon: AlertCircle, color: 'text-rose-700 bg-rose-50 border-rose-200' };
};


export default function ProjectDetails() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { projects, updateProject, deleteProjectDocument, deleteRequirementDoc, refreshProjects } = useProjects();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const project = projects.find(p => p.id === projectId);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', notes: '' });

    if (!project) {
        return <div className="p-8">Project not found</div>;
    }

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
        } catch (error) {
            alert('Failed to update project details.');
        }
    };

    const handleDeleteDocument = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this file?")) {
            try {
                await deleteProjectDocument(path);
            } catch (error) {
                alert('Failed to delete file.');
            }
        }
    };

    const handleDeleteRequirement = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this requirement document?")) {
            try {
                await deleteRequirementDoc(id, project.id);
            } catch (error) {
                alert('Failed to delete requirement document.');
            }
        }
    };

    const handleCreateDocument = (templateId: string) => {
        navigate(`/editor/${projectId}/${templateId}`);
    };

    const handleDownload = async (filePath: string) => {
        try {
            setDownloading(filePath);
            const { data, error } = await supabase.storage
                .from('project-files')
                .createSignedUrl(filePath, 60); // Valid for 60 seconds

            if (error) throw error;

            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file.');
        } finally {
            setDownloading(null);
        }
    };

    const processFile = async (file: File) => {
        if (!project) return;
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const filePath = `${project.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Save Metadata
            const { error: metaError } = await supabase
                .from('project_documents')
                .insert({
                    project_id: project.id,
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    mime_type: file.type
                });

            if (metaError) throw metaError;

            // 3. Inform User and Ingest Text Data
            let contentToIngest = '';

            try {
                if (file.type === 'text/plain' || fileExt === 'txt' || fileExt === 'md' || fileExt === 'csv') {
                    contentToIngest = await file.text();
                } else if (fileExt === 'docx') {
                    // Extract text from DOCX
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    contentToIngest = result.value;
                } else if (fileExt === 'pdf' || file.type === 'application/pdf') {
                    // Extract text from PDF
                    const arrayBuffer = await file.arrayBuffer();
                    const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';

                    for (let i = 1; i <= pdfDocument.numPages; i++) {
                        const page = await pdfDocument.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items
                            // @ts-ignore - pdfjs types can be tricky
                            .map(item => item.str)
                            .join(' ');
                        fullText += pageText + '\n\n';
                    }
                    contentToIngest = fullText;
                }
            } catch (err) {
                console.warn("Failed to extract text for ingestion:", err);
            }

            if (contentToIngest && contentToIngest.trim().length > 0) {
                // Call edge function to chunk and embed
                const { error: functionError } = await supabase.functions.invoke('embed_document', {
                    body: {
                        projectId: project.id,
                        documentPath: filePath,
                        content: contentToIngest
                    }
                });

                if (functionError) {
                    console.error('Embedding error:', functionError);
                }
            }
            await refreshProjects();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file.');
        } finally {
            setUploading(false);
        }
    }


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await processFile(e.target.files[0]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // For simplicity, just take the first file dropped
            await processFile(e.dataTransfer.files[0]);
        }
    }, [project]);


    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto font-sans relative pb-10">
            {/* Top Navigation & Header */}
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-slate-500 hover:text-slate-900 mb-4 transition-colors text-xs font-medium"
            >
                <ArrowLeft size={12} className="mr-1.5" />
                Back to Dashboard
            </button>

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
                            <button onClick={handleSaveEdit} className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"><Check size={14} /> Save</button>
                            <button onClick={() => setIsEditing(false)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"><X size={14} /> Cancel</button>
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

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors shadow-sm text-xs font-bold whitespace-nowrap mt-1"
                >
                    <Plus size={14} />
                    <span>Create Document</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-5 space-x-6">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeTab === 'overview'
                        ? 'text-slate-900 before:absolute before:bottom-0 before:left-0 before:w-full before:h-0.5 before:bg-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <LayoutDashboard size={16} className={activeTab === 'overview' ? 'text-slate-900' : 'text-slate-400'} />
                    Project Overview
                </button>
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeTab === 'documents'
                        ? 'text-slate-900 before:absolute before:bottom-0 before:left-0 before:w-full before:h-0.5 before:bg-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Folders size={16} className={activeTab === 'documents' ? 'text-slate-900' : 'text-slate-400'} />
                    Documents Workspace
                    {project.requirementDocs && project.requirementDocs.length > 0 && (
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">
                            {project.requirementDocs.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="space-y-5 animate-in fade-in duration-300">
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {/* Internal Notes Section */}
                        <section className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Internal Notes</h2>
                                {!isEditing && (
                                    <button onClick={handleEditClick} className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">
                                        <Edit size={12} /> Edit
                                    </button>
                                )}
                            </div>
                            <div className="p-4">
                                {isEditing ? (
                                    <textarea
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                        className="w-full h-24 border border-slate-300 rounded p-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                                        placeholder="Enter internal project notes here..."
                                    />
                                ) : project.notes ? (
                                    <div className="text-slate-700 whitespace-pre-wrap text-[13px] leading-relaxed">
                                        {project.notes}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic text-[13px]">No internal notes added.</p>
                                )}
                            </div>
                        </section>

                        {/* Quick Stats Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white border border-slate-200 p-4 rounded flex items-center gap-3 shadow-sm">
                                <div className="w-10 h-10 bg-slate-50 rounded text-slate-400 flex items-center justify-center border border-slate-200 shrink-0">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-slate-900 leading-none">{project.requirementDocs?.length || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">Requirement Drafts</div>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded flex items-center gap-3 shadow-sm">
                                <div className="w-10 h-10 bg-slate-50 rounded text-slate-400 flex items-center justify-center border border-slate-200 shrink-0">
                                    <File size={18} />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-slate-900 leading-none">{project.documents?.length || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">Supporting Files</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        {/* 1. Ongoing Document Drafting Section */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Requirement Documents</h2>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Structured templates for requirements engineering.</p>
                                </div>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm text-xs font-bold"
                                >
                                    <Plus size={14} />
                                    New Draft
                                </button>
                            </div>

                            {project.requirementDocs && project.requirementDocs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {project.requirementDocs.map((doc, idx) => {
                                        const status = getDocumentStatus(doc.lastModified);
                                        const StatusIcon = status.icon;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => navigate(`/editor/${project.id}/${doc.id}`)}
                                                className="bg-white p-4 rounded border border-slate-200 hover:border-slate-800 hover:shadow-sm transition-all cursor-pointer group relative flex flex-col justify-between"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors group-hover:border-slate-900 shrink-0">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 group-hover:underline decoration-slate-400 underline-offset-2 break-words mr-8 min-w-0 pr-2 leading-tight mb-1">{doc.title}</div>
                                                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                                                <Calendar size={10} className="text-slate-400" />
                                                                Updated {new Date(doc.lastModified).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                                                    <div className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold border flex items-center gap-1.5 ${status.color}`}>
                                                        <StatusIcon size={12} />
                                                        {status.label}
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                                        {doc.type}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => handleDeleteRequirement(e, doc.id)}
                                                    className="absolute top-4 right-4 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded"
                                                    title="Delete Document"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded border border-slate-200 border-dashed">
                                    <LayoutTemplate size={32} className="mx-auto text-slate-300 mb-3" />
                                    <h3 className="text-sm font-bold text-slate-900 mb-1">No requirement documents</h3>
                                    <p className="text-slate-500 text-sm mb-4">Start drafting your first structured requirements spec.</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                                    >
                                        Create New Draft
                                    </button>
                                </div>
                            )}
                        </section>

                        <hr className="border-slate-200" />

                        {/* 2. Supporting Documents Section (Drag & Drop) */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-slate-900">Supporting Files</h2>
                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-200 hidden sm:inline-block">AI Indexed</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Upload reference materials (PDF, DOCX, TXT) used by AI to auto-generate requirements.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* File Upload Zone */}
                                <div
                                    className={`lg:col-span-1 border-2 border-dashed rounded flex flex-col items-center justify-center text-center transition-colors min-h-[180px] p-4 ${isDragging ? 'border-brand-purple bg-purple-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />

                                    {uploading ? (
                                        <div className="flex flex-col items-center space-y-2">
                                            <div className="animate-spin h-6 w-6 border-4 border-slate-300 border-t-slate-900 rounded-full"></div>
                                            <p className="text-xs font-bold text-slate-700">Uploading...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                                                <CloudUpload size={20} className="text-slate-600" />
                                            </div>
                                            <h3 className="text-xs font-bold text-slate-900 mb-1">Upload files here</h3>
                                            <p className="text-[10px] text-slate-500 mb-3 max-w-[180px]">Drag & drop or browse.</p>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                                            >
                                                Browse Files
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* File List */}
                                <div className="lg:col-span-2">
                                    {project.documents && project.documents.length > 0 ? (
                                        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm h-full flex flex-col">
                                            <div className="grid grid-cols-12 gap-3 p-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                                                <div className="col-span-9 pl-1">File Details</div>
                                                <div className="col-span-3 text-right pr-1">Actions</div>
                                            </div>
                                            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[180px] lg:max-h-[none]">
                                                {project.documents.map((doc, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="grid grid-cols-12 gap-3 p-2 items-center hover:bg-slate-50 transition-colors group"
                                                    >
                                                        <div className="col-span-9 flex items-center gap-2 overflow-hidden">
                                                            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                                                                {downloading === doc.path ? (
                                                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-slate-400 border-t-slate-900 rounded-full"></div>
                                                                ) : (
                                                                    <File size={12} />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div
                                                                    onClick={() => handleDownload(doc.path)}
                                                                    className="text-xs font-bold text-slate-700 truncate cursor-pointer hover:text-slate-900 hover:underline decoration-slate-400 underline-offset-2"
                                                                    title={doc.name}
                                                                >
                                                                    {doc.name}
                                                                </div>
                                                                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                                                                    {doc.name.split('.').pop() || 'file'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3 flex items-center justify-end gap-1.5 pr-1">
                                                            <button
                                                                onClick={() => handleDownload(doc.path)}
                                                                className="p-1 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded hover:border-slate-300 transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteDocument(e, doc.path)}
                                                                className="p-1 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded hover:border-red-200 hover:bg-red-50 transition-colors"
                                                                title="Delete File"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full min-h-[180px] bg-white rounded border border-slate-200 border-dashed flex items-center justify-center p-4 text-center">
                                            <div>
                                                <Folders size={20} className="mx-auto text-slate-300 mb-2" />
                                                <p className="text-xs text-slate-500 font-bold mb-1">No reference files yet</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
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
        </div>
    );
}
