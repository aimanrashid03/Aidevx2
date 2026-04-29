import type { CSSProperties } from 'react';

interface StatCardProps {
    label: string;
    value: number;
    barStyle: CSSProperties;
}

function StatCard({ label, value, barStyle }: StatCardProps) {
    return (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
            <div className="w-1 h-8 rounded-full shrink-0" style={barStyle} />
            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-1">
                    {label}
                </p>
                <p className="text-xl font-extrabold text-slate-900 leading-none">{value}</p>
            </div>
        </div>
    );
}

interface Props {
    total: number;
    owned: number;
    shared: number;
    adminView?: number;
}

export default function StatCardsRow({ total, owned, shared, adminView }: Props) {
    const hasAdmin = adminView !== undefined;
    return (
        <div className={`grid gap-3 ${hasAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
            <StatCard
                label="Total Projects"
                value={total}
                barStyle={{ background: '#94a3b8' }}
            />
            <StatCard
                label="You Own"
                value={owned}
                barStyle={{ background: 'var(--accent-500)' }}
            />
            <StatCard
                label="Shared With You"
                value={shared}
                barStyle={{ background: '#10b981' }}
            />
            {hasAdmin && (
                <StatCard
                    label="Admin View"
                    value={adminView}
                    barStyle={{ background: '#94a3b8' }}
                />
            )}
        </div>
    );
}
