import { Search, FolderOpen } from 'lucide-react';
import type { DashboardTab } from './DashboardTabs';

interface Props {
    activeTab: DashboardTab;
    search: string;
}

export default function DashboardEmptyState({ activeTab, search }: Props) {
    const hasSearch = search.trim().length > 0;

    return (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed shadow-sm">
            <div className="mx-auto w-10 h-10 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                {hasSearch ? <Search size={20} /> : <FolderOpen size={20} />}
            </div>
            {hasSearch ? (
                <>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                        No results
                    </h3>
                    <p className="text-slate-500 mt-1 text-sm">
                        No projects match &ldquo;
                        <span className="font-medium text-slate-700">{search}</span>
                        &rdquo;. Try a different search.
                    </p>
                </>
            ) : (
                <>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                        {activeTab === 'mine' ? 'No owned projects' : 'No shared projects'}
                    </h3>
                    <p className="text-slate-500 mt-1 text-sm">
                        {activeTab === 'mine'
                            ? 'Projects you create will appear here.'
                            : 'Projects shared with you will appear here.'}
                    </p>
                </>
            )}
        </div>
    );
}
