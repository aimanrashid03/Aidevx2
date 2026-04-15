import { useState, useEffect, useRef } from 'react';
import { HardDrive, RefreshCw, AlertCircle, Upload, Trash2, CheckCircle } from 'lucide-react';
import { callAdminTelemetry } from '../../lib/admin/adminApi';
import clsx from 'clsx';

interface StorageObject {
    name: string;
    size: number;
    lastModified: string;
    isTemplate: boolean;
    isOrphaned: boolean;
}

interface StorageData {
    totalBytes: number;
    objectCount: number;
    orphanedCount: number;
    objects: StorageObject[];
    templates: StorageObject[];
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function AdminStorage() {
    const [data, setData] = useState<StorageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const ursRef = useRef<HTMLInputElement>(null);
    const brsRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setUploadSuccess(null);
        try {
            const result = await callAdminTelemetry('storage_stats') as StorageData;
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load storage data');
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateUpload = async (templateName: 'URS' | 'BRS', file: File) => {
        setUploading(prev => ({ ...prev, [templateName]: true }));
        setError(null);
        try {
            // Get signed upload URL from telemetry fn
            const { uploadUrl } = await callAdminTelemetry('template_upload_url', { templateName }) as { uploadUrl: string };
            const res = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
                body: file,
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
            setUploadSuccess(`${templateName}.docx uploaded successfully.`);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(prev => ({ ...prev, [templateName]: false }));
        }
    };

    const onFileSelect = (templateName: 'URS' | 'BRS') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleTemplateUpload(templateName, file);
        e.target.value = '';
    };

    if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading storage data...</div>;

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <HardDrive size={22} /> Storage
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Documents bucket usage, template files, and orphaned object cleanup.
                    </p>
                </div>
                <button onClick={fetchData}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {uploadSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-3 border border-emerald-200">
                    <CheckCircle size={18} className="shrink-0" />
                    <p className="text-sm font-medium">{uploadSuccess}</p>
                </div>
            )}

            {data && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Total Size</div>
                            <div className="text-2xl font-bold text-slate-900">{formatBytes(data.totalBytes)}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Total Objects</div>
                            <div className="text-2xl font-bold text-slate-900">{data.objectCount.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">Orphaned Files</div>
                            <div className={clsx('text-2xl font-bold', data.orphanedCount > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                                {data.orphanedCount}
                            </div>
                        </div>
                    </div>

                    {/* Templates */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-4 py-2.5">
                            <h2 className="text-sm font-semibold text-slate-900">Document Templates</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Upload new versions of BRS or URS templates used when creating new documents.</p>
                        </div>
                        <div className="p-4 space-y-3">
                            {(['URS', 'BRS'] as const).map(name => {
                                const tmpl = data.templates.find(t => t.name.includes(name));
                                return (
                                    <div key={name} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                                        <div>
                                            <div className="text-sm font-medium text-slate-900">{name}.docx</div>
                                            {tmpl ? (
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {formatBytes(tmpl.size)} · Last modified {new Date(tmpl.lastModified).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-red-500 mt-0.5">Not found in storage</div>
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                ref={name === 'URS' ? ursRef : brsRef}
                                                type="file"
                                                accept=".docx"
                                                className="hidden"
                                                onChange={onFileSelect(name)}
                                            />
                                            <button
                                                onClick={() => (name === 'URS' ? ursRef : brsRef).current?.click()}
                                                disabled={uploading[name]}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                                            >
                                                <Upload size={12} />
                                                {uploading[name] ? 'Uploading...' : `Upload ${name}.docx`}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orphaned files */}
                    {data.orphanedCount > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-3">
                                <Trash2 size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">
                                        {data.orphanedCount} orphaned {data.orphanedCount === 1 ? 'file' : 'files'} detected
                                    </p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        These storage objects have no matching record in <code className="bg-amber-100 px-1 rounded">requirement_docs</code>.
                                        Manual cleanup via the Supabase Storage dashboard is recommended.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
