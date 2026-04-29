import { useRef, useEffect, useState } from 'react';
import { MoreHorizontal, Pencil, Copy, Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}

function MenuItem({ icon, label, onClick, danger }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-left ${
                danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-50'
            }`}
        >
            <span className="shrink-0 opacity-70">{icon}</span>
            {label}
        </button>
    );
}

interface Props {
    isArchived: boolean;
    onEdit: () => void;
    onDuplicate: () => void;
    onArchive: () => void;
    /** Phase 4: wired when Delete action is added to the menu */
    showDelete?: boolean;
    onDelete?: () => void;
}

export default function ProjectCardMenu({
    isArchived,
    onEdit,
    onDuplicate,
    onArchive,
    showDelete,
    onDelete,
}: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    const close = (cb: () => void) => () => { setOpen(false); cb(); };

    return (
        <div
            ref={ref}
            className="relative"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={() => setOpen(o => !o)}
                className={`p-1 rounded-md hover:bg-slate-100 transition-colors ${
                    open ? 'text-slate-600 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                }`}
                title="Project actions"
            >
                <MoreHorizontal size={15} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                    <MenuItem
                        icon={<Pencil size={13} />}
                        label="Edit details"
                        onClick={close(onEdit)}
                    />
                    <MenuItem
                        icon={<Copy size={13} />}
                        label="Duplicate"
                        onClick={close(onDuplicate)}
                    />
                    <div className="my-1 border-t border-slate-100" />
                    <MenuItem
                        icon={isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                        label={isArchived ? 'Unarchive' : 'Archive'}
                        onClick={close(onArchive)}
                    />
                    {showDelete && onDelete && (
                        <>
                            <div className="my-1 border-t border-slate-100" />
                            <MenuItem
                                icon={<Trash2 size={13} />}
                                label="Delete"
                                onClick={close(onDelete)}
                                danger
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
