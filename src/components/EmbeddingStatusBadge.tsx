import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';

type EmbeddingStatus = 'pending' | 'processing' | 'processed' | 'failed';

export default function EmbeddingStatusBadge({ status }: { status: EmbeddingStatus | string }) {
    if (status === 'processed') return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 size={10} /> Indexed
        </span>
    );
    if (status === 'processing') return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <Loader2 size={10} className="animate-spin" /> Processing
        </span>
    );
    if (status === 'failed') return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            <AlertCircle size={10} /> Failed
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
            <Clock size={10} /> Pending
        </span>
    );
}
