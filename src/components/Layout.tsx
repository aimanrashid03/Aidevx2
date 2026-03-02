import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, ChevronLeft, ChevronRight, FolderOpen, ChevronDown, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { projects } = useProjects();
    const { profile, session, loading, signOut } = useAuth();

    useEffect(() => {
        if (!loading && !session) {
            navigate('/', { replace: true });
        }
    }, [session, loading, navigate]);

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

    const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

    if (loading || !session) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-700 rounded-full animate-spin flex-shrink-0"></div>
            </div>
        );
    }

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
                        {isCollapsed ? (
                            <div className="w-8 h-8 flex-shrink-0 bg-purple-700 rounded flex items-center justify-center text-white font-bold text-sm">A</div>
                        ) : (
                            <img src="/logo.png" alt="Aidevx Logo" className="h-8 w-auto object-contain" />
                        )}
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

                    {/* Projects Section */}
                    <div className="flex flex-col">
                        <div className={clsx(
                            "flex items-center justify-between px-3 py-2 rounded-md transition-all border border-transparent overflow-hidden text-sm",
                            (location.pathname === '/dashboard') && !isProjectsExpanded
                                ? "bg-white text-slate-900 font-medium shadow-sm border-slate-200"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            isCollapsed ? "justify-center px-0" : ""
                        )}>
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-3 flex-1 overflow-hidden"
                                title="Projects"
                            >
                                <LayoutDashboard size={18} className={clsx("flex-shrink-0", (location.pathname === '/dashboard') ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")} />
                                {!isCollapsed && <span className="whitespace-nowrap truncate font-medium">Projects</span>}
                            </Link>

                            {!isCollapsed && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsProjectsExpanded(!isProjectsExpanded);
                                    }}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                                >
                                    <ChevronDown size={14} className={clsx("transition-transform duration-200", isProjectsExpanded ? "rotate-180" : "")} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown for projects */}
                        {!isCollapsed && isProjectsExpanded && projects.length > 0 && (
                            <div className="mt-1 ml-6 pl-3 border-l relative border-slate-200 flex flex-col gap-0.5 pointer-events-auto overflow-hidden">
                                {projects.map(p => {
                                    const isProjectActive = location.pathname.startsWith(`/projects/${p.id}`) || location.pathname.startsWith(`/editor/${p.id}`);
                                    return (
                                        <Link
                                            key={p.id}
                                            to={`/projects/${p.id}`}
                                            className={clsx(
                                                "text-[11px] py-1.5 px-2 rounded-md truncate transition-all duration-200 flex border outline-none",
                                                isProjectActive
                                                    ? "text-purple-700 font-bold bg-purple-50 border-purple-100/50 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent font-medium"
                                            )}
                                            title={p.name}
                                        >
                                            {p.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Document Repository */}
                    <div className="mt-1">
                        <Link
                            to="/documents"
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-all border border-transparent overflow-hidden text-sm",
                                location.pathname.startsWith('/documents')
                                    ? "bg-white text-slate-900 font-medium shadow-sm border-slate-200"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                isCollapsed ? "justify-center px-0" : ""
                            )}
                            title="Document Repository"
                        >
                            <FolderOpen size={18} className={clsx("flex-shrink-0", location.pathname.startsWith('/documents') ? "text-slate-900" : "text-slate-400")} />
                            {!isCollapsed && <span className="whitespace-nowrap font-medium">Document Repository</span>}
                        </Link>
                    </div>

                    {/* Admin Panel */}
                    {profile?.role === 'admin' && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            {!isCollapsed && <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Admin</div>}
                            <Link
                                to="/admin"
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all border border-transparent overflow-hidden text-sm",
                                    location.pathname.startsWith('/admin')
                                        ? "bg-purple-50 text-purple-700 font-medium shadow-sm border-purple-100"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-purple-700 font-medium",
                                    isCollapsed ? "justify-center px-0" : ""
                                )}
                                title="Admin Panel"
                            >
                                <ShieldAlert size={18} className={clsx("flex-shrink-0", location.pathname.startsWith('/admin') ? "text-purple-700" : "text-slate-400")} />
                                {!isCollapsed && <span className="whitespace-nowrap">Admin Panel</span>}
                            </Link>
                        </div>
                    )}
                </nav>

                <div className="border-t border-slate-200">
                    {!isCollapsed && profile && (
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col justify-center">
                            <div className="text-sm font-medium text-slate-900 truncate">
                                {profile.full_name || profile.email}
                            </div>
                            <div className="text-xs text-slate-500 capitalize">
                                {profile.role}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={async (e) => {
                            e.preventDefault();
                            try {
                                await signOut();
                            } catch (err) {
                                console.error('Sign out failed:', err);
                            }
                            // Do not manually navigate here. The useEffect above will detect
                            // that the session is gone and navigate safely!
                        }}
                        className={clsx(
                            "flex items-center gap-3 px-3 py-3 text-slate-500 hover:text-slate-900 w-full hover:bg-slate-100 transition-colors overflow-hidden text-sm",
                            isCollapsed ? "justify-center" : ""
                        )}
                        title="Sign Out"
                    >
                        <LogOut size={18} className="flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium whitespace-nowrap">Sign Out</span>}
                    </button>
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
