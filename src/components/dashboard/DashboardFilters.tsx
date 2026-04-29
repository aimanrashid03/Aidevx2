import { Search, Archive } from 'lucide-react';

export type SortOrder = 'recent' | 'name';

interface Props {
    search: string;
    sort: SortOrder;
    onSearchChange: (v: string) => void;
    onSortChange: (v: SortOrder) => void;
    showArchived: boolean;
    onShowArchivedChange: (v: boolean) => void;
}

export default function DashboardFilters({
    search,
    sort,
    onSearchChange,
    onSortChange,
    showArchived,
    onShowArchivedChange,
}: Props) {
    return (
        <div className="flex items-center gap-2">
            {/* Show archived toggle chip */}
            <button
                onClick={() => onShowArchivedChange(!showArchived)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    showArchived
                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
            >
                <Archive size={12} />
                Archived
            </button>

            {/* Search */}
            <div className="relative">
                <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search projects…"
                    className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-200 w-48 text-slate-700 placeholder:text-slate-400"
                />
            </div>

            {/* Sort */}
            <select
                value={sort}
                onChange={(e) => onSortChange(e.target.value as SortOrder)}
                className="py-1.5 px-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none cursor-pointer text-slate-600 font-medium focus:border-slate-300 focus:ring-1 focus:ring-slate-200"
            >
                <option value="recent">Recent</option>
                <option value="name">Name (A–Z)</option>
            </select>
        </div>
    );
}
