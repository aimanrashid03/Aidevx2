import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
                <div className="p-5">
                    <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            isDanger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {isDanger ? <AlertTriangle size={18} /> : <Info size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded border border-slate-200 hover:bg-white transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                            isDanger
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
