import { Info } from 'lucide-react';

export default function AdminViewBanner() {
    return (
        <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
            <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <p>
                You're seeing these as <span className="font-bold text-slate-900">Administrator</span>. You don't own or collaborate on them — read-only access.
            </p>
        </div>
    );
}
