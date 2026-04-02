import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, ChevronLeft, ChevronRight, FolderOpen, ChevronDown, ShieldAlert, Palette } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

// ── Theme ──────────────────────────────────────────────────────────────────
const THEMES = [
    { key: 'violet', label: 'Violet', color: '#7c3aed' },
    { key: 'blue',   label: 'Blue',   color: '#2563eb' },
    { key: 'green',  label: 'Green',  color: '#16a34a' },
    { key: 'red',    label: 'Red',    color: '#dc2626' },
    { key: 'slate',  label: 'Slate',  color: '#1e293b' },
    { key: 'grey',   label: 'Grey',   color: '#525252' },
] as const;

type ThemeKey = typeof THEMES[number]['key'];

function useTheme() {
    const [theme, setThemeState] = useState<ThemeKey>(() => {
        return (localStorage.getItem('themeColor') as ThemeKey) || 'violet';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'violet') {
            delete root.dataset.themeColor;
        } else {
            root.dataset.themeColor = theme;
        }
    }, [theme]);

    const setTheme = (next: ThemeKey) => {
        localStorage.setItem('themeColor', next);
        setThemeState(next);
    };

    return { theme, setTheme };
}

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { projects } = useProjects();
    const { profile, session, loading, signOut } = useAuth();
    const { theme, setTheme } = useTheme();

    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebarCollapsed') === 'true';
    });

    const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const themeRef = useRef<HTMLDivElement>(null);

    // Close theme dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
                setIsThemeOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebarCollapsed', String(next));
            return next;
        });
    };

    useEffect(() => {
        if (!loading && !session) {
            navigate('/', { replace: true });
        }
    }, [session, loading, navigate]);

    if (loading || !session) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f8f9fb]">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-[var(--accent-600)] rounded-full animate-spin flex-shrink-0" />
            </div>
        );
    }

    const displayName = profile?.full_name || profile?.email || 'User';
    const displayInitials = getInitials(displayName);
    const shortName = displayName.split(' ')[0]?.slice(0, 20) ?? displayName.slice(0, 20);
    const roleLabel = profile?.role === 'admin' ? 'Administrator' : 'Member';

    return (
        <div className="flex flex-col h-screen font-sans text-slate-900">

            {/* ── Sticky Header ─────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 flex h-10 items-center justify-between border-b border-slate-200 bg-white px-5 shrink-0">
                {/* Left: logo */}
                <div className="flex items-center gap-2">
                    <img
                        src="/logo.png"
                        alt="Aidevx"
                        className="h-5 w-auto"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>

                {/* Right: user info + theme picker + logout */}
                <div className="flex items-center">
                    {/* User badge */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg cursor-default select-none">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                             style={{ background: 'var(--accent-600)' }}>
                            {displayInitials}
                        </div>
                        <div className="hidden sm:flex flex-col leading-none">
                            <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{shortName}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{roleLabel}</span>
                        </div>
                    </div>

                    <div className="h-full w-px bg-slate-200 mx-1" />

                    {/* Theme picker */}
                    <div className="relative" ref={themeRef}>
                        <button
                            onClick={() => setIsThemeOpen(v => !v)}
                            className="flex h-10 w-10 items-center justify-center text-slate-500 transition-colors hover:bg-[var(--accent-600)] hover:text-white"
                            title="Theme"
                        >
                            <Palette className="h-4 w-4" />
                        </button>
                        {isThemeOpen && (
                            <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-slate-200 bg-white p-3 shadow-lg z-50">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Accent Color</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {THEMES.map(t => (
                                        <button
                                            key={t.key}
                                            onClick={() => { setTheme(t.key); setIsThemeOpen(false); }}
                                            className={clsx(
                                                "flex flex-col items-center gap-1 rounded-md p-1.5 text-[10px] font-medium transition-colors",
                                                theme === t.key
                                                    ? "bg-slate-100 text-slate-900"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                            )}
                                        >
                                            <span
                                                className="h-5 w-5 rounded-full transition-all"
                                                style={{
                                                    backgroundColor: t.color,
                                                    outline: theme === t.key ? `2px solid ${t.color}` : 'none',
                                                    outlineOffset: '3px',
                                                }}
                                            />
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </header>

            {/* ── Body (sidebar + content) ───────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Sidebar ───────────────────────────────────────────── */}
                <aside
                    className={clsx(
                        "bg-slate-50/50 border-r border-slate-200 flex flex-col fixed h-[calc(100vh-2.5rem)] z-30 transition-[width] duration-300 ease-in-out",
                        isCollapsed ? "w-14" : "w-64"
                    )}
                >
                    {/* Collapse toggle button */}
                    <button
                        onClick={toggleSidebar}
                        className="absolute -right-3.5 top-10 h-7 w-7 rounded-full flex items-center justify-center text-white shadow-sm z-[100] transition-all cursor-pointer"
                        style={{ background: 'var(--accent-600)' }}
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                    </button>

                    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
                        {!isCollapsed && (
                            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Main</div>
                        )}

                        {/* Projects */}
                        <div className="flex flex-col">
                            <div className={clsx(
                                "group flex items-center justify-between px-3 py-1.5 rounded-lg transition-all border text-sm overflow-hidden relative",
                                location.pathname === '/dashboard' && !isProjectsExpanded
                                    ? "border-[var(--accent-200)] bg-[var(--accent-50)] font-medium text-[var(--accent-700)]"
                                    : "border-transparent text-slate-900 hover:bg-[var(--accent-50)]",
                                isCollapsed ? "justify-center px-0" : ""
                            )}>
                                <Link
                                    to="/dashboard"
                                    className="flex items-center gap-2.5 flex-1 overflow-hidden"
                                    title={isCollapsed ? "Projects" : undefined}
                                >
                                    <LayoutDashboard size={17} className={clsx(
                                        "flex-shrink-0 transition-colors",
                                        location.pathname === '/dashboard' && !isProjectsExpanded
                                            ? "text-[var(--accent-700)]"
                                            : "text-slate-400 group-hover:text-[var(--accent-600)]"
                                    )} />
                                    {!isCollapsed && <span className="whitespace-nowrap truncate font-medium">Projects</span>}
                                </Link>

                                {/* Collapsed tooltip */}
                                {isCollapsed && (
                                    <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                        Projects
                                    </span>
                                )}

                                {!isCollapsed && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); setIsProjectsExpanded(v => !v); }}
                                        className="p-1 hover:bg-slate-200/70 rounded text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                                    >
                                        <ChevronDown size={13} className={clsx("transition-transform duration-200", isProjectsExpanded ? "rotate-180" : "")} />
                                    </button>
                                )}
                            </div>

                            {/* Project sub-items */}
                            {!isCollapsed && isProjectsExpanded && projects.length > 0 && (
                                <div className="mt-0.5 ml-5 pl-3 border-l-2 border-slate-200 flex flex-col gap-0.5">
                                    {projects.map(p => {
                                        const isActive = location.pathname.startsWith(`/projects/${p.id}`) || location.pathname.startsWith(`/editor/${p.id}`);
                                        return (
                                            <Link
                                                key={p.id}
                                                to={`/projects/${p.id}`}
                                                className={clsx(
                                                    "text-[12px] py-1.5 px-2 rounded-lg truncate transition-all flex border outline-none font-medium",
                                                    isActive
                                                        ? "text-[var(--accent-700)] bg-[var(--accent-50)] border-[var(--accent-200)]"
                                                        : "text-slate-500 hover:text-slate-900 hover:bg-[var(--accent-50)] border-transparent"
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
                        <div className="group relative">
                            <Link
                                to="/documents"
                                className={clsx(
                                    "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all border text-sm overflow-hidden",
                                    location.pathname.startsWith('/documents')
                                        ? "border-[var(--accent-200)] bg-[var(--accent-50)] font-medium text-[var(--accent-700)]"
                                        : "border-transparent text-slate-900 hover:bg-[var(--accent-50)]",
                                    isCollapsed ? "justify-center px-0" : ""
                                )}
                                title={isCollapsed ? "Document Repository" : undefined}
                            >
                                <FolderOpen size={17} className={clsx(
                                    "flex-shrink-0 transition-colors",
                                    location.pathname.startsWith('/documents')
                                        ? "text-[var(--accent-700)]"
                                        : "text-slate-400 group-hover:text-[var(--accent-600)]"
                                )} />
                                {!isCollapsed && <span className="whitespace-nowrap font-medium">Document Repository</span>}
                            </Link>
                            {isCollapsed && (
                                <span className="pointer-events-none absolute left-full top-0 z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                    Document Repository
                                </span>
                            )}
                        </div>

                        {/* Admin Panel */}
                        {profile?.role === 'admin' && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                {!isCollapsed && (
                                    <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin</div>
                                )}
                                <div className="group relative">
                                    <Link
                                        to="/admin"
                                        className={clsx(
                                            "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all border text-sm overflow-hidden",
                                            location.pathname.startsWith('/admin')
                                                ? "border-[var(--accent-200)] bg-[var(--accent-50)] font-medium text-[var(--accent-700)]"
                                                : "border-transparent text-slate-900 hover:bg-[var(--accent-50)]",
                                            isCollapsed ? "justify-center px-0" : ""
                                        )}
                                        title={isCollapsed ? "Admin Panel" : undefined}
                                    >
                                        <ShieldAlert size={17} className={clsx(
                                            "flex-shrink-0 transition-colors",
                                            location.pathname.startsWith('/admin')
                                                ? "text-[var(--accent-700)]"
                                                : "text-slate-400 group-hover:text-[var(--accent-600)]"
                                        )} />
                                        {!isCollapsed && <span className="whitespace-nowrap">Admin Panel</span>}
                                    </Link>
                                    {isCollapsed && (
                                        <span className="pointer-events-none absolute left-full top-0 z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                            Admin Panel
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </nav>

                    {/* Sign out at bottom */}
                    <div className="border-t border-slate-200 px-2 py-2">
                        <div className="group relative">
                            <button
                                onClick={async () => {
                                    try { await signOut(); } catch { /* session effect handles navigation */ }
                                }}
                                className={clsx(
                                    "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all border border-transparent text-sm w-full text-slate-500 hover:bg-rose-50 hover:text-rose-600",
                                    isCollapsed ? "justify-center px-0" : ""
                                )}
                                title="Sign Out"
                            >
                                <LogOut size={17} className="flex-shrink-0 text-slate-400 group-hover:text-rose-500 transition-colors" />
                                {!isCollapsed && <span className="whitespace-nowrap font-medium">Sign Out</span>}
                            </button>
                            {isCollapsed && (
                                <span className="pointer-events-none absolute left-full bottom-0 z-50 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                    Sign Out
                                </span>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ── Main Content ───────────────────────────────────────── */}
                <main
                    className={clsx(
                        "flex-1 overflow-auto transition-[margin] duration-300 ease-in-out",
                        isCollapsed ? "ml-14" : "ml-64"
                    )}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
