import { useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface Props {
    message: string;
    onUndo: () => void;
    onClose: () => void;
    durationMs?: number;
}

export default function UndoToast({ message, onUndo, onClose, durationMs = 8000 }: Props) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        timerRef.current = setTimeout(onClose, durationMs);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [onClose, durationMs]);

    const handleUndo = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        onUndo();
        onClose();
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200 min-w-[320px] max-w-[480px]">
            <span className="text-sm font-medium flex-1">{message}</span>
            <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors shrink-0"
            >
                <RotateCcw size={13} />
                Undo
            </button>
            <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
            >
                <X size={14} />
            </button>
        </div>
    );
}
