import {
    LayoutDashboard,
    Users,
    FolderOpen,
    ScrollText,
    Layers,
    Network,
    Sparkles,
    Database,
    HardDrive,
    FileText,
    ToggleLeft,
    type LucideIcon,
} from 'lucide-react';

export type AdminNavGroup = 'platform' | 'system';

export interface AdminNavItem {
    path: string;
    label: string;
    icon: LucideIcon;
    group: AdminNavGroup;
}

export const ADMIN_NAV: AdminNavItem[] = [
    { path: 'overview',   label: 'Overview',          icon: LayoutDashboard, group: 'platform' },
    { path: 'users',      label: 'Users',             icon: Users,           group: 'platform' },
    { path: 'projects',   label: 'Projects',          icon: FolderOpen,      group: 'platform' },
    { path: 'audit',      label: 'Audit Log',         icon: ScrollText,      group: 'platform' },
    { path: 'tech-stack', label: 'Tech Stack',        icon: Layers,          group: 'system'   },
    { path: 'api',        label: 'API & Functions',   icon: Network,         group: 'system'   },
    { path: 'llm-usage',  label: 'LLM Usage & Cost',  icon: Sparkles,        group: 'system'   },
    { path: 'rag-health', label: 'RAG Index',         icon: Database,        group: 'system'   },
    { path: 'storage',    label: 'Storage',           icon: HardDrive,       group: 'system'   },
    { path: 'onlyoffice', label: 'OnlyOffice',        icon: FileText,        group: 'system'   },
    { path: 'settings',   label: 'Feature Flags',     icon: ToggleLeft,      group: 'system'   },
];
