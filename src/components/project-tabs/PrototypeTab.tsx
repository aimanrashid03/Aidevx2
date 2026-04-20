import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Play, Eye, Trash2, FileText, Loader2, Monitor, X, ChevronRight, Copy, Check as CheckIcon, Code2, Upload } from 'lucide-react';
import type { Project } from '../../context/ProjectContext';
import { useProjects } from '../../context/ProjectContext';
import { supabase } from '../../lib/supabase';
import { uploadDocxToStorage, generateDocumentKey, getDocStoragePath } from '../../lib/onlyoffice/documentService';
import PrototypeGenerateProgress, { type GeneratedPrototype } from './PrototypeGenerateProgress';

// Re-use the type from PrototypeGenerateProgress to keep a single source of truth
type Prototype = GeneratedPrototype;

// ─── Code Viewer Modal ────────────────────────────────────────────────────────

interface CodeViewerProps {
    proto: Prototype;
    onClose: () => void;
    onRun: () => void;
    onDelete: () => void;
}

type TabKey = 'index.html' | string;

function CodeViewerModal({ proto, onClose, onRun, onDelete }: CodeViewerProps) {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('index.html');
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
    }, []);

    // Reset tab when proto changes
    useEffect(() => { setActiveTab('index.html'); }, [proto.id]);

    const pages = proto.model?.pages ?? [];

    const activeContent = useMemo(() => {
        if (activeTab === 'index.html') return proto.html;
        const page = pages.find(p => p.key === activeTab);
        return page?.html ?? '';
    }, [activeTab, proto.html, pages]);

    const lineCount = useMemo(() => activeContent.split('\n').length, [activeContent]);

    const highlightedLines = useMemo(() => {
        return activeContent.split('\n').map((line, i) => ({
            num: i + 1,
            content: line,
        }));
    }, [activeContent]);

    const handleCopy = () => {
        navigator.clipboard.writeText(activeContent).then(() => {
            setCopied(true);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete this prototype?')) return;
        onDelete();
    };

    const fileSizeLabel = activeTab === 'index.html'
        ? `${(proto.html.length / 1024).toFixed(1)} KB`
        : `${(activeContent.length / 1024).toFixed(1)} KB fragment`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div
                className="bg-white rounded-lg w-full max-w-5xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in duration-200"
                style={{ maxHeight: '92vh' }}
            >
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Monitor size={15} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{proto.name}</p>
                            <p className="text-[11px] text-slate-400">{fileSizeLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            {copied ? <CheckIcon size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                            onClick={onRun}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                        >
                            <Play size={13} />
                            Run
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 rounded text-xs font-bold hover:bg-rose-50 transition-colors"
                        >
                            <Trash2 size={13} />
                            Delete
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors ml-1">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex items-end gap-0 px-4 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto">
                    {/* index.html tab — always first */}
                    <button
                        onClick={() => setActiveTab('index.html')}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                            activeTab === 'index.html'
                                ? 'border-[var(--accent-600)] text-[var(--accent-700)] bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <Code2 size={12} />
                        index.html
                    </button>
                    {/* Per-page tabs (only if model is available) */}
                    {pages.map(page => (
                        <button
                            key={page.key}
                            onClick={() => setActiveTab(page.key)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                                activeTab === page.key
                                    ? 'border-[var(--accent-600)] text-[var(--accent-700)] bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            {page.title}
                        </button>
                    ))}
                </div>

                {/* Code pane — light mode with line numbers */}
                <div className="flex-1 overflow-auto bg-white">
                    <table className="w-full border-collapse font-mono text-[11px] leading-relaxed">
                        <tbody>
                            {highlightedLines.map(({ num, content }) => (
                                <tr key={num} className="hover:bg-slate-50">
                                    <td
                                        className="select-none text-right pr-4 pl-4 text-slate-300 border-r border-slate-100 w-12 shrink-0 align-top"
                                        style={{ userSelect: 'none', minWidth: '3rem' }}
                                    >
                                        {num}
                                    </td>
                                    <td className="pl-4 pr-5 whitespace-pre text-slate-800 align-top">
                                        <span dangerouslySetInnerHTML={{ __html: syntaxLine(content) }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                    <p className="text-[11px] text-slate-400">
                        {lineCount} lines
                        {activeTab === 'index.html' && (
                            <> · Generated {new Date(proto.createdAt).toLocaleString()}</>
                        )}
                        {activeTab !== 'index.html' && pages.length > 0 && (
                            <> · Page fragment · Full file on <button onClick={() => setActiveTab('index.html')} className="underline hover:text-slate-600">index.html</button></>
                        )}
                    </p>
                    <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-900">Close</button>
                </div>
            </div>
        </div>
    );
}

// Syntax highlight a single line of HTML
function syntaxLine(line: string): string {
    const esc = (s: string) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Comment
    if (line.trim().startsWith('<!--')) {
        return `<span class="text-slate-400">${esc(line)}</span>`;
    }

    // Has HTML tags — tokenise
    if (!line.includes('<')) {
        return `<span class="text-slate-700">${esc(line)}</span>`;
    }

    return line.replace(/(<\/?\s*[\w-]+(?:\s[^>]*)?\s*\/?>|<!--[\s\S]*?-->)/g, (tag) => {
        if (tag.startsWith('<!--')) {
            return `<span class="text-slate-400">${esc(tag)}</span>`;
        }
        const closingMatch = tag.match(/^<\/([\w-]+)>$/);
        if (closingMatch) {
            return `<span class="text-slate-400">&lt;/</span><span class="text-violet-600">${esc(closingMatch[1])}</span><span class="text-slate-400">&gt;</span>`;
        }
        const openMatch = tag.match(/^<([\w-]+)([\s\S]*?)(\/?>)$/);
        if (!openMatch) return `<span class="text-slate-400">${esc(tag)}</span>`;
        const [, tagName, attrs, close] = openMatch;
        const coloredAttrs = attrs
            .replace(/(\s+)([\w-:@.]+)(=)("([^"]*)")/g,
                (_m, sp, name, eq, quoted) =>
                    `${sp}<span class="text-blue-600">${esc(name)}</span>${eq}<span class="text-emerald-700">${esc(quoted)}</span>`)
            .replace(/(\s+)([\w-:@.]+)(=)('([^']*)')/g,
                (_m, sp, name, eq, quoted) =>
                    `${sp}<span class="text-blue-600">${esc(name)}</span>${eq}<span class="text-emerald-700">${esc(quoted)}</span>`)
            .replace(/(\s+)([\w-:@.]+)(?=[>\s/]|$)/g,
                (_m, sp, name) => `${sp}<span class="text-blue-600">${esc(name)}</span>`);
        return `<span class="text-slate-400">&lt;</span><span class="text-violet-600 font-medium">${esc(tagName)}</span>${coloredAttrs}<span class="text-slate-400">${esc(close)}</span>`;
    }).replace(/(?<=>|^)([^<]+)/g, (text) => `<span class="text-slate-700">${esc(text)}</span>`);
}

// ─── Wizard Modal ─────────────────────────────────────────────────────────────

const DOC_TYPES = ['BRS', 'URS', 'SRS', 'SDS'] as const;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

interface WizardProps {
    project: Project;
    onClose: () => void;
    onStartGenerate: (docId: string, docTitle: string, docType: string) => void;
    refreshProjects: () => Promise<void>;
}

function WizardModal({ project, onClose, onStartGenerate, refreshProjects }: WizardProps) {
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadDocTitle, setUploadDocTitle] = useState('');
    const [uploadDocType, setUploadDocType] = useState<string>('BRS');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const docs = project.requirementDocs || [];
    const selectedDoc = docs.find(d => d.id === selectedDocId);

    const handleSelectDoc = (docId: string) => {
        setSelectedDocId(docId);
        setUploadedFile(null);
        setUploadError(null);
    };

    const handleFileSelect = (file: File) => {
        setUploadError(null);
        if (!file.name.toLowerCase().endsWith('.docx')) {
            setUploadError('Only .docx files are supported.');
            return;
        }
        if (file.size > MAX_UPLOAD_SIZE) {
            setUploadError('File exceeds 10 MB limit.');
            return;
        }
        setUploadedFile(file);
        setUploadDocTitle(file.name.replace(/\.docx$/i, ''));
        setSelectedDocId(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleGenerate = () => {
        if (!selectedDoc) return;
        onStartGenerate(selectedDoc.id, selectedDoc.title, selectedDoc.type);
    };

    const handleUploadAndGenerate = async () => {
        if (!uploadedFile || !uploadDocTitle.trim()) return;
        setIsUploading(true);
        setUploadError(null);
        try {
            const docId = `uploaded-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const storagePath = getDocStoragePath(project.id, docId);
            await uploadDocxToStorage(uploadedFile, storagePath);
            const documentKey = generateDocumentKey(docId);
            const { error } = await supabase.from('requirement_docs').insert({
                id: docId,
                project_id: project.id,
                title: uploadDocTitle.trim(),
                type: uploadDocType,
                content: {},
                storage_path: storagePath,
                document_key: documentKey,
                status: 'draft',
                current_version: 1,
                last_modified: new Date().toISOString(),
            });
            if (error) throw new Error(error.message);
            await refreshProjects();
            onStartGenerate(docId, uploadDocTitle.trim(), uploadDocType);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
            setIsUploading(false);
        }
    };

    const isUploadMode = uploadedFile !== null;
    const canGenerate = isUploadMode ? (uploadDocTitle.trim().length > 0 && !isUploading) : !!selectedDocId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Monitor size={16} className="text-[var(--accent-600)]" />
                            <h2 className="text-base font-bold text-slate-900">New Prototype</h2>
                        </div>
                        <p className="text-xs text-slate-500">Select a workspace document or upload your own to generate a prototype.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors ml-2">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Existing workspace docs */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">From workspace</p>
                        {docs.length === 0 ? (
                            <div className="border border-dashed border-slate-200 rounded p-4 text-center">
                                <FileText size={18} className="text-slate-300 mx-auto mb-1.5" />
                                <p className="text-xs text-slate-400">No documents in workspace yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                                {docs.map(doc => (
                                    <button
                                        key={doc.id}
                                        onClick={() => handleSelectDoc(doc.id)}
                                        disabled={isUploading}
                                        className={`w-full flex items-center gap-3 p-3 rounded border text-left transition-all ${
                                            selectedDocId === doc.id
                                                ? 'border-slate-900 bg-slate-50'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        } disabled:opacity-50`}
                                    >
                                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                                            selectedDocId === doc.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {doc.type}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">{doc.title}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(doc.lastModified).toLocaleDateString()}</p>
                                        </div>
                                        {selectedDocId === doc.id && (
                                            <ChevronRight size={14} className="text-slate-900 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">or</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* Upload section */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">Upload a document</p>
                        {!uploadedFile ? (
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded p-5 text-center cursor-pointer transition-colors ${
                                    isDragging
                                        ? 'border-[var(--accent-400)] bg-[var(--accent-50)]'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <Upload size={18} className="text-slate-400 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-600">Drop a .docx file here</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">or click to browse · max 10 MB</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx"
                                    className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                                />
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded p-3 space-y-3">
                                {/* File name + remove */}
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-xs font-bold text-slate-700 flex-1 truncate">{uploadedFile.name}</span>
                                    <button
                                        onClick={() => { setUploadedFile(null); setUploadError(null); }}
                                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                                {/* Title input */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Document title</label>
                                    <input
                                        type="text"
                                        value={uploadDocTitle}
                                        onChange={e => setUploadDocTitle(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                                        placeholder="e.g. My System BRS"
                                    />
                                </div>
                                {/* Doc type selector */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Document type</label>
                                    <div className="flex gap-1.5">
                                        {DOC_TYPES.map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setUploadDocType(t)}
                                                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                                    uploadDocType === t
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'border-slate-200 text-slate-500 hover:border-slate-400'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {uploadError && (
                            <p className="text-[11px] text-rose-600 mt-2">{uploadError}</p>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} disabled={isUploading} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 disabled:opacity-50">
                        Cancel
                    </button>
                    {isUploadMode ? (
                        <button
                            onClick={handleUploadAndGenerate}
                            disabled={!canGenerate}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {isUploading ? 'Uploading…' : 'Upload & Generate'}
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        >
                            <Monitor size={14} />
                            Generate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface Props {
    project: Project;
}

interface GeneratingDoc {
    docId: string;
    docTitle: string;
    docType: string;
}

export default function PrototypeTab({ project }: Props) {
    const { refreshProjects } = useProjects();
    const [prototypes, setPrototypes] = useState<Prototype[]>([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [generatingDoc, setGeneratingDoc] = useState<GeneratingDoc | null>(null);
    const [viewingProto, setViewingProto] = useState<Prototype | null>(null);
    const [loading, setLoading] = useState(true);
    const revokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (revokeTimerRef.current) clearTimeout(revokeTimerRef.current); };
    }, []);

    // Load prototypes from DB on mount
    useEffect(() => {
        supabase
            .from('prototypes')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                if (data) {
                    setPrototypes(data.map(row => ({
                        id: row.id,
                        name: row.name,
                        sourceDocId: row.source_doc_id,
                        sourceDocTitle: row.source_doc_title,
                        sourceDocType: row.source_doc_type,
                        createdAt: row.created_at,
                        html: row.html,
                        model: row.model ?? undefined,
                    })));
                }
                setLoading(false);
            });
    }, [project.id]);

    const handleStartGenerate = (docId: string, docTitle: string, docType: string) => {
        setIsWizardOpen(false);
        setGeneratingDoc({ docId, docTitle, docType });
    };

    const handleGenerated = (proto: Prototype) => {
        setPrototypes(prev => [proto, ...prev]);
        setGeneratingDoc(null);
        setViewingProto(proto);
    };

    const handleDelete = async (id: string) => {
        await supabase.from('prototypes').delete().eq('id', id);
        setPrototypes(prev => prev.filter(p => p.id !== id));
        if (viewingProto?.id === id) setViewingProto(null);
    };

    const handleRun = (proto: Prototype) => {
        const blob = new Blob([proto.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        if (revokeTimerRef.current) clearTimeout(revokeTimerRef.current);
        revokeTimerRef.current = setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };

    const DOC_TYPE_COLORS: Record<string, string> = {
        BRS: 'bg-blue-50 text-blue-700 border-blue-200',
        URS: 'bg-violet-50 text-violet-700 border-violet-200',
        SRS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        SDS: 'bg-slate-50 text-slate-600 border-slate-200',
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-1">Prototype Generation</h2>
                    <p className="text-[11px] text-slate-500">Generate front-end prototypes from your workspace documents.</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm shrink-0 ml-4"
                >
                    <Plus size={13} />
                    New Prototype
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                </div>
            ) : prototypes.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded flex flex-col items-center justify-center py-14 text-center bg-white">
                    <Monitor size={28} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500 mb-1">No prototypes yet</p>
                    <p className="text-[11px] text-slate-400 mb-5 max-w-xs">
                        Select a workspace document and generate a front-end prototype in seconds.
                    </p>
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={13} />
                        New Prototype
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {prototypes.map(proto => (
                        <div
                            key={proto.id}
                            className="bg-white border border-slate-200 rounded p-4 flex items-center gap-4 hover:border-slate-300 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors">
                                <Monitor size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-bold text-slate-900 truncate">{proto.name}</p>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${DOC_TYPE_COLORS[proto.sourceDocType] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {proto.sourceDocType}
                                    </span>
                                    {proto.model && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 bg-slate-50 text-slate-400 border-slate-100">
                                            {proto.model.pages.length} pages
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    From: <span className="font-medium text-slate-500">{proto.sourceDocTitle}</span>
                                    <span className="mx-1.5">·</span>
                                    {new Date(proto.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setViewingProto(proto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    <Eye size={13} />
                                    View Code
                                </button>
                                <button
                                    onClick={() => handleRun(proto)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-900 rounded text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                                >
                                    <Play size={13} />
                                    Run
                                </button>
                                <button
                                    onClick={() => handleDelete(proto.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-200 hover:border-rose-200 transition-colors"
                                    title="Delete prototype"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isWizardOpen && (
                <WizardModal
                    project={project}
                    onClose={() => setIsWizardOpen(false)}
                    onStartGenerate={handleStartGenerate}
                    refreshProjects={refreshProjects}
                />
            )}

            {generatingDoc && (
                <PrototypeGenerateProgress
                    projectId={project.id}
                    docId={generatingDoc.docId}
                    docTitle={generatingDoc.docTitle}
                    docType={generatingDoc.docType}
                    onComplete={handleGenerated}
                    onCancel={() => setGeneratingDoc(null)}
                />
            )}

            {viewingProto && (
                <CodeViewerModal
                    proto={viewingProto}
                    onClose={() => setViewingProto(null)}
                    onRun={() => handleRun(viewingProto)}
                    onDelete={() => handleDelete(viewingProto.id)}
                />
            )}
        </div>
    );
}
