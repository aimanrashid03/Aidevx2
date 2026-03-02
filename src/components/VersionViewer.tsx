import { X, RotateCcw, Clock } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import TableEditor from './TableEditor';
import { DOC_STRUCTURES } from '../constants/docs';
import type { DocVersion } from '../context/ProjectContext';
import type { DocSection } from '../constants/urs_structure';

interface VersionViewerProps {
    version: DocVersion;
    docType: string;
    onClose: () => void;
    onRestore: (version: DocVersion) => void;
}

export default function VersionViewer({ version, docType, onClose, onRestore }: VersionViewerProps) {
    const structure = DOC_STRUCTURES[docType] || DOC_STRUCTURES['BRS'];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Clock size={16} className="text-slate-500" />
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Version {version.versionNumber}
                            </h2>
                            <p className="text-[10px] text-slate-400">
                                {formatDate(version.createdAt)}
                                {version.changeSummary && ` — ${version.changeSummary}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onRestore(version)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                        >
                            <RotateCcw size={12} />
                            Restore This Version
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Read-only content */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
                    <div className="max-w-[760px] mx-auto space-y-4">
                        {/* Read-only banner */}
                        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-center gap-2 text-amber-800 text-xs font-medium mb-6">
                            <Clock size={14} />
                            You are viewing a read-only snapshot of version {version.versionNumber}. Click "Restore This Version" to revert to this content.
                        </div>

                        {structure.map((item, idx) => {
                            const isString = typeof item === 'string';
                            const title = isString ? item : (item as DocSection).title;
                            const level = isString ? 1 : (item as DocSection).level;

                            const blocks = (version.content[idx] as Record<string, unknown>[]) || [];
                            if (blocks.length === 0) return null;

                            return (
                                <div key={idx} className="scroll-mt-24">
                                    <div className="mb-2 pb-1">
                                        {level === 1 && <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>}
                                        {level === 2 && <h3 className="text-base font-bold text-slate-800 tracking-tight">{title}</h3>}
                                        {level === 3 && <h4 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h4>}
                                        {level > 3 && <h5 className="text-[13px] font-bold text-slate-700 tracking-tight">{title}</h5>}
                                    </div>

                                    <div className="space-y-3 pl-3 border-l-2 border-slate-100">
                                        {blocks.map((block, bIdx) => {
                                            if (block.type === 'text') {
                                                return (
                                                    <div key={`text-${bIdx}`} className="mb-2">
                                                        <RichTextEditor
                                                            content={(block.data as string) || ''}
                                                            onChange={() => {}}
                                                            editable={false}
                                                        />
                                                    </div>
                                                );
                                            } else if (block.type === 'table') {
                                                return (
                                                    <div key={`table-${bIdx}`} className="mb-2 opacity-80">
                                                        <TableEditor
                                                            columns={(block.columns as string[]) || []}
                                                            initialData={(block.data as string[][]) || []}
                                                            onChange={() => {}}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
