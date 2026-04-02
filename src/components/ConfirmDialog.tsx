import { AlertTriangle, Info } from 'lucide-react';

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
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in duration-150">
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${
                        isDanger ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                        {isDanger ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            isDanger
                                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                                : 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-600'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
