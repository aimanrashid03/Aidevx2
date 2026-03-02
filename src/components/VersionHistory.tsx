import { useState, useEffect } from 'react';
import { Clock, RotateCcw, Eye } from 'lucide-react';
import { useProjects, type DocVersion } from '../context/ProjectContext';

interface VersionHistoryProps {
    docId: string;
    projectId: string;
    currentVersion: number;
    onViewVersion: (version: DocVersion) => void;
    onRestoreVersion: (version: DocVersion) => void;
}

export default function VersionHistory({
    docId,
    projectId,
    currentVersion,
    onViewVersion,
    onRestoreVersion,
}: VersionHistoryProps) {
    const { fetchDocVersions } = useProjects();
    const [versions, setVersions] = useState<DocVersion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await fetchDocVersions(docId, projectId);
            setVersions(data);
            setLoading(false);
        };
        load();
    }, [docId, projectId, fetchDocVersions]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="p-4 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-slate-200 border-t-slate-600 rounded-full mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading versions...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={12} />
                    Version History
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                    Current: v{currentVersion}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Current version indicator */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-700">v{currentVersion}</span>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Current</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-4">Latest saved version</p>
                </div>

                {versions.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-xs text-slate-400">No previous versions yet.</p>
                        <p className="text-[10px] text-slate-300 mt-1">Versions are created each time you save.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {versions.map((version) => (
                            <div
                                key={version.id}
                                className="px-4 py-3 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        <span className="text-xs font-bold text-slate-600">v{version.versionNumber}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                                            {version.status}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-[10px] text-slate-400 ml-3.5 mb-2">
                                    {formatDate(version.createdAt)}
                                </p>

                                {version.changeSummary && (
                                    <p className="text-[10px] text-slate-500 ml-3.5 mb-2 italic">
                                        {version.changeSummary}
                                    </p>
                                )}

                                <div className="flex gap-1.5 ml-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onViewVersion(version)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                                    >
                                        <Eye size={10} />
                                        View
                                    </button>
                                    <button
                                        onClick={() => onRestoreVersion(version)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                                    >
                                        <RotateCcw size={10} />
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
