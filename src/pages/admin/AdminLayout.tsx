import { Outlet, NavLink } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { ADMIN_NAV, type AdminNavGroup } from './adminNav';

const GROUP_LABELS: Record<AdminNavGroup, string> = {
    platform: 'Platform',
    system: 'System',
};

export default function AdminLayout() {
    const groups: AdminNavGroup[] = ['platform', 'system'];

    return (
        <div className="flex h-full overflow-hidden">
            {/* Admin sub-sidebar */}
            <aside className="w-52 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
                    <ShieldAlert size={16} className="text-[var(--accent-600)] shrink-0" />
                    <span className="text-sm font-semibold text-slate-900">Admin Panel</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-3 space-y-4">
                    {groups.map(group => {
                        const items = ADMIN_NAV.filter(i => i.group === group);
                        return (
                            <div key={group}>
                                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    {GROUP_LABELS[group]}
                                </p>
                                <div className="space-y-0.5">
                                    {items.map(item => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) => clsx(
                                                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all border',
                                                isActive
                                                    ? 'border-[var(--accent-200)] bg-[var(--accent-50)] font-medium text-[var(--accent-700)]'
                                                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            )}
                                        >
                                            <item.icon
                                                size={14}
                                                className="shrink-0"
                                            />
                                            <span className="truncate">{item.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </aside>

            {/* Page content */}
            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
}
