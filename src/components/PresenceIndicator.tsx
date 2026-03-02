import type { PresenceUser } from '../hooks/useDocumentPresence';

interface PresenceIndicatorProps {
    otherUsers: PresenceUser[];
    totalViewers: number;
}

export default function PresenceIndicator({ otherUsers, totalViewers }: PresenceIndicatorProps) {
    if (otherUsers.length === 0) return null;

    const getInitials = (name: string) => {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const colors = [
        'bg-blue-500',
        'bg-emerald-500',
        'bg-violet-500',
        'bg-amber-500',
        'bg-rose-500',
    ];

    const maxDisplay = 3;
    const displayed = otherUsers.slice(0, maxDisplay);
    const overflow = otherUsers.length - maxDisplay;

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
                {displayed.map((user, idx) => (
                    <div
                        key={user.userId}
                        className={`w-6 h-6 rounded-full ${colors[idx % colors.length]} flex items-center justify-center text-[8px] font-bold text-white border-2 border-white shadow-sm`}
                        title={`${user.userName} is viewing`}
                    >
                        {getInitials(user.userName)}
                    </div>
                ))}
                {overflow > 0 && (
                    <div
                        className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-[8px] font-bold text-white border-2 border-white shadow-sm"
                        title={`${overflow} more viewer${overflow > 1 ? 's' : ''}`}
                    >
                        +{overflow}
                    </div>
                )}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                {totalViewers} viewing
            </span>
        </div>
    );
}
