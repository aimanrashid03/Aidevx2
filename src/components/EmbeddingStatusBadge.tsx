import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';

type EmbeddingStatus = 'pending' | 'processing' | 'processed' | 'failed';

export default function EmbeddingStatusBadge({ status }: { status: EmbeddingStatus | string }) {
    if (status === 'processed') return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={12} /> Indexed
        </span>
    );
    if (status === 'processing') return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-700">
            <Loader2 size={12} className="animate-spin" /> Processing
        </span>
    );
    if (status === 'failed') return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-rose-100 text-rose-700">
            <AlertCircle size={12} /> Failed
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-500">
            <Clock size={12} /> Pending
        </span>
    );
}
