export type DashboardTab = 'mine' | 'shared' | 'admin';

interface TabItemProps {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}

function TabItem({ label, count, active, onClick }: TabItemProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-semibold border-b-2 -mb-px transition-colors"
            style={
                active
                    ? { color: 'var(--accent-600)', borderBottomColor: 'var(--accent-500)' }
                    : { color: '#64748b', borderBottomColor: 'transparent' }
            }
        >
            {label}
            <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={
                    active
                        ? { background: 'var(--accent-100)', color: 'var(--accent-700)' }
                        : { background: '#f1f5f9', color: '#64748b' }
                }
            >
                {count}
            </span>
        </button>
    );
}

interface Props {
    activeTab: DashboardTab;
    mineCount: number;
    sharedCount: number;
    adminCount?: number;
    onChange: (tab: DashboardTab) => void;
}

export default function DashboardTabs({ activeTab, mineCount, sharedCount, adminCount, onChange }: Props) {
    return (
        <div className="flex">
            <TabItem
                label="My Projects"
                count={mineCount}
                active={activeTab === 'mine'}
                onClick={() => onChange('mine')}
            />
            <TabItem
                label="Shared with me"
                count={sharedCount}
                active={activeTab === 'shared'}
                onClick={() => onChange('shared')}
            />
            {adminCount !== undefined && (
                <TabItem
                    label="Admin view"
                    count={adminCount}
                    active={activeTab === 'admin'}
                    onClick={() => onChange('admin')}
                />
            )}
        </div>
    );
}
