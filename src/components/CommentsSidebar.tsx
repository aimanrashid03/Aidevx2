import { useState } from 'react';
import { MessageSquare, Send, CheckCircle, Trash2, Reply, X } from 'lucide-react';
import type { DocComment } from '../hooks/useDocumentComments';
import { useAuth } from '../context/AuthContext';

interface CommentsSidebarProps {
    comments: DocComment[];
    activeSectionIndex: number | null;
    onAddComment: (sectionIndex: number, content: string, parentId?: string) => Promise<void>;
    onResolveComment: (commentId: string) => Promise<void>;
    onDeleteComment: (commentId: string) => Promise<void>;
    sectionTitles: string[];
}

function CommentBubble({
    comment,
    onReply,
    onResolve,
    onDelete,
    currentUserId,
}: {
    comment: DocComment;
    onReply: (commentId: string) => void;
    onResolve: (commentId: string) => void;
    onDelete: (commentId: string) => void;
    currentUserId: string | undefined;
}) {
    const isAuthor = currentUserId === comment.authorId;
    const initials = comment.authorName
        ? comment.authorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : comment.authorEmail.slice(0, 2).toUpperCase();

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className={`group ${comment.resolved ? 'opacity-50' : ''}`}>
            <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0 mt-0.5">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                            {comment.authorName || comment.authorEmail}
                        </span>
                        <span className="text-[9px] text-slate-400 shrink-0">
                            {timeAgo(comment.createdAt)}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!comment.resolved && (
                            <>
                                <button
                                    onClick={() => onReply(comment.id)}
                                    className="text-[9px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-0.5 uppercase tracking-wider"
                                >
                                    <Reply size={9} />
                                    Reply
                                </button>
                                <button
                                    onClick={() => onResolve(comment.id)}
                                    className="text-[9px] font-bold text-emerald-500 hover:text-emerald-700 flex items-center gap-0.5 uppercase tracking-wider"
                                >
                                    <CheckCircle size={9} />
                                    Resolve
                                </button>
                            </>
                        )}
                        {isAuthor && (
                            <button
                                onClick={() => onDelete(comment.id)}
                                className="text-[9px] font-bold text-red-400 hover:text-red-600 flex items-center gap-0.5 uppercase tracking-wider"
                            >
                                <Trash2 size={9} />
                                Delete
                            </button>
                        )}
                    </div>

                    {comment.resolved && (
                        <div className="flex items-center gap-1 mt-1">
                            <CheckCircle size={10} className="text-emerald-500" />
                            <span className="text-[9px] text-emerald-600 font-bold">Resolved</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                    {comment.replies.map(reply => (
                        <CommentBubble
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onResolve={onResolve}
                            onDelete={onDelete}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CommentsSidebar({
    comments,
    activeSectionIndex,
    onAddComment,
    onResolveComment,
    onDeleteComment,
    sectionTitles,
}: CommentsSidebarProps) {
    const { user } = useAuth();
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [commentSection, setCommentSection] = useState<number>(activeSectionIndex ?? 0);
    const [showResolved, setShowResolved] = useState(false);

    // Filter comments by active section if one is selected
    const filteredComments = activeSectionIndex !== null
        ? comments.filter(c => c.sectionIndex === activeSectionIndex)
        : comments;

    const visibleComments = showResolved
        ? filteredComments
        : filteredComments.filter(c => !c.resolved);

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        const section = activeSectionIndex !== null ? activeSectionIndex : commentSection;
        await onAddComment(section, newComment.trim());
        setNewComment('');
    };

    const handleReply = async () => {
        if (!replyText.trim() || !replyingTo) return;
        // Find the parent comment to get its section index
        const parent = comments.find(c => c.id === replyingTo);
        if (!parent) return;
        await onAddComment(parent.sectionIndex, replyText.trim(), replyingTo);
        setReplyText('');
        setReplyingTo(null);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare size={12} />
                        Comments
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold">
                        {comments.length} total
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowResolved(!showResolved)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-colors ${
                            showResolved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                        }`}
                    >
                        {showResolved ? 'Showing All' : 'Show Resolved'}
                    </button>
                </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {visibleComments.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare size={20} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[11px] text-slate-400">
                            {activeSectionIndex !== null
                                ? 'No comments on this section yet.'
                                : 'No comments yet. Start a discussion!'}
                        </p>
                    </div>
                ) : (
                    visibleComments.map(comment => (
                        <div key={comment.id}>
                            {/* Section label */}
                            {activeSectionIndex === null && (
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {sectionTitles[comment.sectionIndex] || `Section ${comment.sectionIndex}`}
                                </div>
                            )}
                            <CommentBubble
                                comment={comment}
                                onReply={setReplyingTo}
                                onResolve={onResolveComment}
                                onDelete={onDeleteComment}
                                currentUserId={user?.id}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Reply input (when replying to a specific comment) */}
            {replyingTo && (
                <div className="px-4 py-2 border-t border-slate-200 bg-blue-50">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Replying to comment</span>
                        <button onClick={() => setReplyingTo(null)} className="text-blue-400 hover:text-blue-600">
                            <X size={12} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                            placeholder="Write a reply..."
                            className="flex-1 px-2 py-1.5 border border-blue-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                            autoFocus
                        />
                        <button
                            onClick={handleReply}
                            disabled={!replyText.trim()}
                            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* New Comment Input */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white">
                {activeSectionIndex === null && (
                    <select
                        value={commentSection}
                        onChange={(e) => setCommentSection(Number(e.target.value))}
                        className="w-full mb-2 px-2 py-1.5 border border-slate-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                        {sectionTitles.map((title, idx) => (
                            <option key={idx} value={idx}>{title}</option>
                        ))}
                    </select>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Add a comment..."
                        className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!newComment.trim()}
                        className="p-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        <Send size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
