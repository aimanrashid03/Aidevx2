import { useRef, useState, useEffect, DragEvent } from 'react';
import { CloudUpload, File, Download, Trash2, Folders, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Project } from '../../context/ProjectContext';
import EmbeddingStatusBadge from '../EmbeddingStatusBadge';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { extractText } from '../../lib/extractText';
import { validateFile, validateFileCount } from '../../lib/validateUpload';
import { UPLOAD_LIMITS, ALLOWED_EXTENSIONS_DISPLAY } from '../../constants/upload';

interface UploadQueueItem {
    name: string;
    state: 'queued' | 'uploading' | 'embedding' | 'done' | 'failed';
}

interface Props {
    project: Project;
    onFilesChanged: () => Promise<void>;
}

export default function LibrarySupportingFiles({ project, onFilesChanged }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
    const { dialog, notificationBanner, confirm, notify } = useConfirmDialog();
    const uploadQueueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (uploadQueueTimerRef.current) clearTimeout(uploadQueueTimerRef.current);
        };
    }, []);

    const processFile = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const filePath = `${project.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

        setUploadQueue(q => q.map(item => item.name === file.name ? { ...item, state: 'uploading' } : item));

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);
        if (uploadError) throw uploadError;

        // 2. Save metadata with 'processing' status
        const { data: docRow, error: metaError } = await supabase
            .from('project_documents')
            .insert({
                project_id: project.id,
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.type,
                embedding_status: 'processing',
            })
            .select('id')
            .single();
        if (metaError) throw metaError;

        // 3. Extract text
        setUploadQueue(q => q.map(item => item.name === file.name ? { ...item, state: 'embedding' } : item));
        const content = await extractText(file);

        // 4. Embed (pass documentId so edge function updates status)
        if (content.trim().length > 0) {
            await supabase.functions.invoke('embed_document', {
                body: { projectId: project.id, documentPath: filePath, content, documentId: docRow.id },
            });
        } else {
            // No embeddable content — mark processed anyway
            await supabase
                .from('project_documents')
                .update({ embedding_status: 'processed' })
                .eq('id', docRow.id);
        }

        // 5. Refresh semantic coverage assessment (fire-and-forget)
        supabase.functions.invoke('assess_coverage', {
            body: { projectId: project.id, docType: 'BRS' },
        }).catch(() => {});

        setUploadQueue(q => q.map(item => item.name === file.name ? { ...item, state: 'done' } : item));
    };

    const processFiles = async (files: File[]) => {
        const currentCount = project.documents?.length ?? 0;
        const countCheck = validateFileCount(currentCount, files.length);
        if (!countCheck.valid) {
            notify({ message: countCheck.error!, variant: 'error' });
            return;
        }

        const validFiles: File[] = [];
        for (const file of files) {
            const check = validateFile(file);
            if (!check.valid) {
                notify({ message: check.error!, variant: 'error' });
            } else {
                validFiles.push(file);
            }
        }
        if (validFiles.length === 0) return;

        const newItems: UploadQueueItem[] = validFiles.map(f => ({ name: f.name, state: 'queued' }));
        setUploadQueue(prev => [...prev, ...newItems]);

        for (const file of validFiles) {
            try {
                await processFile(file);
            } catch (err) {
                console.error('Upload error:', err);
                setUploadQueue(q => q.map(item => item.name === file.name ? { ...item, state: 'failed' } : item));
            }
        }

        await onFilesChanged();
        // Clear completed items after a short delay
        if (uploadQueueTimerRef.current) clearTimeout(uploadQueueTimerRef.current);
        uploadQueueTimerRef.current = setTimeout(() => {
            setUploadQueue(q => q.filter(item => item.state !== 'done'));
        }, 2000);
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await processFiles(files);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            await processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleDownload = async (filePath: string) => {
        try {
            setDownloading(filePath);
            const { data, error } = await supabase.storage.from('project-files').createSignedUrl(filePath, 60);
            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
        } catch {
            notify({ message: 'Failed to download file.', variant: 'error' });
        } finally {
            setDownloading(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        const ok = await confirm({
            title: 'Delete File',
            message: 'This will permanently delete the file and remove it from the AI knowledge base.',
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await supabase.storage.from('project-files').remove([path]);
            await supabase.from('project_documents').delete().eq('file_path', path);
            await onFilesChanged();
        } catch {
            notify({ message: 'Failed to delete file.', variant: 'error' });
        }
    };

    const isUploading = uploadQueue.some(item => item.state !== 'done');

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Supporting Files</h3>
                    <span className="rounded-full bg-[var(--accent-100)] text-[var(--accent-700)] px-2.5 py-0.5 text-[10px] font-medium border border-[var(--accent-200)]">AI Indexed</span>
                </div>
                <p className="text-[11px] text-slate-500">{ALLOWED_EXTENSIONS_DISPLAY} — max {UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB each, up to {UPLOAD_LIMITS.MAX_FILES_PER_PROJECT} files</p>
            </div>

            {/* Fixed Upload Zone */}
            <div
                className={`h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center transition-colors ${isDragging ? 'border-[var(--accent-500)] bg-[var(--accent-50)]' : 'border-slate-300 bg-slate-50 hover:bg-[var(--accent-50)] hover:border-[var(--accent-400)]'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept=".txt,.md,.csv,.docx,.pdf"
                    onChange={handleFileInput}
                />
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                    <CloudUpload size={18} className="text-slate-600" />
                </div>
                <p className="text-xs font-bold text-slate-900 mb-0.5">Drop files here or browse</p>
                <p className="text-[10px] text-slate-400 mb-2">Up to {UPLOAD_LIMITS.MAX_FILES_PER_PROJECT} files · {UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB max each</p>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                    Browse Files
                </button>
            </div>

            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-200 bg-white">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {isUploading ? 'Uploading...' : 'Upload Complete'}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                        {uploadQueue.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2">
                                {item.state === 'queued' && <Clock size={12} className="text-slate-400 shrink-0" />}
                                {item.state === 'uploading' && <Loader2 size={12} className="text-amber-500 animate-spin shrink-0" />}
                                {item.state === 'embedding' && <Loader2 size={12} className="text-[var(--accent-500)] animate-spin shrink-0" />}
                                {item.state === 'done' && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                                {item.state === 'failed' && <AlertCircle size={12} className="text-red-500 shrink-0" />}
                                <span className="text-xs text-slate-700 truncate flex-1">{item.name}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                    {item.state === 'queued' && 'Queued'}
                                    {item.state === 'uploading' && 'Uploading'}
                                    {item.state === 'embedding' && 'Indexing to AI'}
                                    {item.state === 'done' && 'Done'}
                                    {item.state === 'failed' && 'Failed'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* File List */}
            {project.documents && project.documents.length > 0 ? (
                <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 gap-2 p-2 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-5 pl-1">File</div>
                        <div className="col-span-4">AI Status</div>
                        <div className="col-span-3 text-right pr-1">Actions</div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {project.documents.map((doc) => (
                            <div key={doc.id} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-slate-50 transition-colors group">
                                <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                                    <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                                        {downloading === doc.path ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <File size={12} />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div
                                            onClick={() => handleDownload(doc.path)}
                                            className="text-xs font-bold text-slate-700 truncate cursor-pointer hover:underline"
                                            title={doc.name}
                                        >
                                            {doc.name}
                                        </div>
                                        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                                            {doc.name.split('.').pop() || 'file'}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <EmbeddingStatusBadge status={doc.embeddingStatus} />
                                </div>
                                <div className="col-span-3 flex items-center justify-end gap-1 pr-1">
                                    <button
                                        onClick={() => handleDownload(doc.path)}
                                        className="p-1 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded hover:border-slate-300 transition-colors"
                                        title="Download"
                                    >
                                        <Download size={13} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, doc.path)}
                                        className="p-1 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded hover:border-rose-200 hover:bg-rose-50 transition-colors"
                                        title="Delete File"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded border border-slate-200 border-dashed flex items-center justify-center py-8 text-center">
                    <div>
                        <Folders size={20} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-500">No files yet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Upload reference materials for the AI to use</p>
                    </div>
                </div>
            )}
            {dialog}
            {notificationBanner}
        </div>
    );
}
