interface Props {
    status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'merged';
    className?: string;
}

const STATUS_STYLES: Record<Props['status'], string> = {
    draft:     'bg-amber-50 text-amber-700 border-amber-200',
    in_review: 'bg-sky-50 text-sky-700 border-sky-200',
    approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:  'bg-rose-50 text-rose-700 border-rose-200',
    merged:    'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABELS: Record<Props['status'], string> = {
    draft:     'Draft',
    in_review: 'In Review',
    approved:  'Approved',
    rejected:  'Rejected',
    merged:    'Merged',
};

export default function CRStatusBadge({ status, className = '' }: Props) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${STATUS_STYLES[status]} ${className}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}
