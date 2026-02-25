import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

export default function Layout() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebarCollapsed', String(next));
            return next;
        });
    };

    const navItems = [
        { label: 'Projects', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Document Repository', path: '/documents', icon: FolderOpen },
    ];

    return (
        <div className="flex h-screen bg-white font-sans text-slate-900">
            {/* Sidebar */}
            <aside
                className={clsx(
                    "bg-slate-50 border-r border-slate-200 flex flex-col fixed h-full z-50 transition-all duration-300",
                    isCollapsed ? "w-16" : "w-60"
                )}
            >
                <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 flex-shrink-0 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-sm">A</div>
                        {!isCollapsed && <span className="font-semibold text-slate-900 tracking-tight whitespace-nowrap">Aidevx</span>}
                    </div>
                </div>

                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-16 bg-white border border-slate-200 rounded-full p-1 text-slate-500 hover:text-slate-900 hover:border-slate-300 shadow-sm z-[100] transition-all cursor-pointer"
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>

                <nav className="flex-1 px-2 py-4 space-y-0.5">
                    {!isCollapsed && <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main</div>}

                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all border border-transparent overflow-hidden text-sm",
                                    isActive
                                        ? "bg-white text-slate-900 font-medium shadow-sm border-slate-200"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                    isCollapsed ? "justify-center px-0" : ""
                                )}
                                title={item.label}
                            >
                                <item.icon size={18} className={clsx("flex-shrink-0", isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")} />
                                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-2 border-t border-slate-200">
                    <Link
                        to="/"
                        className={clsx(
                            "flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900 w-full rounded-md hover:bg-slate-100 transition-colors overflow-hidden text-sm",
                            isCollapsed ? "justify-center" : ""
                        )}
                        title="Sign Out"
                    >
                        <LogOut size={18} className="flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap">Sign Out</span>}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={clsx(
                    "flex-1 overflow-auto transition-all duration-300 bg-white",
                    isCollapsed ? "ml-16" : "ml-60"
                )}
            >
                <Outlet />
            </main>
        </div>
    );
}
