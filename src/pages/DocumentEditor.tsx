import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
    ArrowLeft, Download, History, MessageSquare,
    FileText, FileDown, Loader2, AlertCircle, Sparkles,
    Lock, Unlock, GitBranch, ChevronRight,
} from 'lucide-react'
import { useProjects, type DocVersion } from '../context/ProjectContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDocumentComments } from '../hooks/useDocumentComments'
import { useDocumentPresence } from '../hooks/useDocumentPresence'
import { useDocumentLock } from '../hooks/useDocumentLock'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import VersionHistory from '../components/VersionHistory'
import VersionViewer from '../components/VersionViewer'
import CommentsSidebar from '../components/CommentsSidebar'
import PresenceIndicator from '../components/PresenceIndicator'
import OnlyOfficeEditor, { type OnlyOfficeEditorHandle } from '../components/document-editor/OnlyOfficeEditor'
import AIGeneratePanel from '../components/document-editor/AIGeneratePanel'
import AutoGenerateProgress from '../components/document-editor/AutoGenerateProgress'
import {
    initializeDocxForDoc,
    getOnlyOfficeConfig,
    getDocPublicUrl,
} from '../lib/onlyoffice/documentService'
import { extractSectionsFromDocx, type DocHeading } from '../lib/onlyoffice/extractSections'
import { detectDocMode } from '../lib/onlyoffice/docModeDetector'

// ─── Doc type badge colours (matches Dashboard.tsx) ────────────────────────
const DOC_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    BRS: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
    URS: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
    SRS: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    SDS: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DocumentEditor() {
    const { projectId, templateId } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, profile } = useAuth()
    const { projects, loading: projectsLoading, restoreVersion, restoreOnlyOfficeVersion, refreshProjects, lockDocument, unlockDocument } = useProjects()
    const project = projects.find(p => p.id === projectId)

    const existingDoc = project?.requirementDocs.find(d => d.id === templateId)
    const isNewDoc = !existingDoc

    const docType = existingDoc ? existingDoc.type : (templateId || 'BRS')
    const docTypeColors = DOC_TYPE_COLORS[docType] || DOC_TYPE_COLORS['BRS']

    // ─── State ─────────────────────────────────────────────────────────────────

    const [docTitle, setDocTitle] = useState(existingDoc?.title || 'Untitled Document')
    const [docStatus, setDocStatus] = useState<'draft' | 'final'>(existingDoc?.status || 'draft')
    // OnlyOffice document state
    const [docPublicUrl, setDocPublicUrl] = useState<string | null>(null)
    const [documentKey, setDocumentKey] = useState<string | null>(null)
    const [isInitializing, setIsInitializing] = useState(false)
    const [initError, setInitError] = useState<string | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [isEditorReady, setIsEditorReady] = useState(false)

    // TOC populated by mammoth parse on doc load
    const [tocSections, setTocSections] = useState<DocHeading[]>([])

    // Auto-generate mode (detected from ?autoGenerate=true query param)
    const isAutoGenerate = searchParams.get('autoGenerate') === 'true' && isNewDoc && templateId === 'BRS'
    const [autoGenerateComplete, setAutoGenerateComplete] = useState(false)

    // AI panel state
    const [showAiPanel, setShowAiPanel] = useState(true)
    const prevAiPanelVisible = useRef(true)

    // Sidebar toggles
    const [showVersionHistory, setShowVersionHistory] = useState(false)
    const [viewingVersion, setViewingVersion] = useState<DocVersion | null>(null)
    const [showComments, setShowComments] = useState(false)
    const [showExport, setShowExport] = useState(false)

    const editorRef = useRef<OnlyOfficeEditorHandle>(null)
    const docIdRef = useRef<string | null>(existingDoc?.id ?? null)
    const initKeyRef = useRef<string | null>(null)
    const prevDocumentKeyRef = useRef<string | null>(null)
    const exportDropdownRef = useRef<HTMLDivElement>(null)

    // ─── Hooks ──────────────────────────────────────────────────────────────────

    const docId = existingDoc?.id
    const { comments, addComment, resolveComment, deleteComment } = useDocumentComments(docId, projectId)
    const { otherUsers, totalViewers } = useDocumentPresence(docId)
    const { lockedBy: realtimeLockedBy } = useDocumentLock(docId, projectId)
    const { dialog, notificationBanner, confirm, notify } = useConfirmDialog()

    // Effective lock state: prefer realtime subscription value, fall back to DB value on initial load
    const lockedBy = realtimeLockedBy !== null ? realtimeLockedBy : (existingDoc?.lockedBy ?? null)
    const isDocLocked = Boolean(lockedBy)
    const isOwner = project?.userRole === 'owner'

    const sectionTitles = tocSections.map(s => s.title)

    // ─── AI panel auto-hide toast ────────────────────────────────────────────

    const aiPanelVisible = showAiPanel && !showVersionHistory && !showComments

    useEffect(() => {
        if (prevAiPanelVisible.current && !aiPanelVisible && showAiPanel) {
            notify({ message: 'AI panel hidden — click ✨ to reopen', variant: 'success', duration: 2500 })
        }
        prevAiPanelVisible.current = aiPanelVisible
    }, [aiPanelVisible, showAiPanel, notify])

    // ─── BRS auto-generate reload guard ────────────────────────────────────────
    // Prevents silent re-generation only if the user reloads the page mid-run.
    // Users may freely generate multiple BRS docs — the existence of a prior
    // BRS does NOT block a new generation.
    useEffect(() => {
        if (!isAutoGenerate || !project) return

        // If a recent in-progress session entry exists, check whether the doc
        // was already saved — if so, the reload landed after completion.
        const raw = sessionStorage.getItem('autoGenInProgress')
        if (!raw) return
        try {
            const { docId, projectId: pid, timestamp } = JSON.parse(raw)
            if (pid !== projectId || Date.now() - timestamp > 30 * 60 * 1000) {
                sessionStorage.removeItem('autoGenInProgress')
                return // stale — allow re-generation
            }
            supabase.from('requirement_docs').select('id, storage_path').eq('id', docId).single()
                .then(({ data }) => {
                    if (data?.storage_path) {
                        sessionStorage.removeItem('autoGenInProgress')
                        navigate(`/editor/${projectId}/${data.id}`, { replace: true })
                    }
                    // not in DB yet — generation was interrupted mid-run, let it re-trigger
                })
        } catch {
            sessionStorage.removeItem('autoGenInProgress')
        }
    }, [isAutoGenerate, project, projectId, navigate])

    // ─── Document initialization ────────────────────────────────────────────────

    const loadDocumentState = useCallback(async (
        doc: typeof existingDoc,
        pid: string,
        did: string,
        title: string,
        type: string,
        projectName: string,
    ) => {
        // Case 1: Already an OnlyOffice document (has storage_path + document_key)
        if (doc && detectDocMode(doc) === 'onlyoffice' && doc.storagePath && doc.documentKey) {
            const bucketPath = doc.storagePath.startsWith('documents/')
                ? doc.storagePath.slice('documents/'.length)
                : doc.storagePath
            const folder = bucketPath.split('/').slice(0, -1).join('/')
            const filename = bucketPath.split('/').at(-1)!
            const { data: fileList } = await supabase.storage.from('documents').list(folder)
            const fileExists = fileList?.some(f => f.name === filename)

            if (fileExists) {
                const url = getDocPublicUrl(doc.storagePath)
                setDocPublicUrl(url)
                setDocumentKey(doc.documentKey)
                extractSectionsFromDocx(url)
                    .then(setTocSections)
                    .catch(() => setTocSections([]))
                return
            }
        }

        // Case 2: New, tiptap-v1, or legacy — initialize DOCX in Supabase Storage
        setIsInitializing(true)
        setInitError(null)

        try {
            const { storagePath, documentKey: newKey, publicUrl } = await initializeDocxForDoc(
                doc ?? null,
                pid,
                did,
                projectName,
                title,
                type,
            )

            await supabase.from('requirement_docs').upsert({
                id: did,
                project_id: pid,
                title,
                type,
                storage_path: storagePath,
                document_key: newKey,
                content: null,
                section_statuses: doc?.sectionStatuses || null,
                status: doc?.status || 'draft',
                current_version: doc?.currentVersion || 1,
                last_modified: new Date().toISOString(),
            })

            setDocPublicUrl(publicUrl)
            setDocumentKey(newKey)

            if (isNewDoc) {
                navigate(`/editor/${pid}/${did}`, { replace: true })
            }

            extractSectionsFromDocx(publicUrl)
                .then(setTocSections)
                .catch(() => setTocSections([]))

            await refreshProjects()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to initialize document'
            setInitError(msg)
            console.error('DocumentEditor init error:', err)
        } finally {
            setIsInitializing(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNewDoc, navigate])

    useEffect(() => {
        const pid = projectId
        if (!pid) return

        const isDocType = templateId && ['BRS', 'URS', 'SRS', 'SDS'].includes(templateId)
        if (!isDocType && !existingDoc) return

        const did = existingDoc?.id ?? `req-${Date.now()}`

        const initKey = `${pid}::${existingDoc?.id ?? 'new'}`
        if (initKeyRef.current === initKey) return
        initKeyRef.current = initKey

        docIdRef.current = did

        const title = existingDoc?.title || 'Untitled Document'
        const type = existingDoc ? existingDoc.type : (templateId || 'BRS')
        const pname = project?.name || 'Untitled Project'

        setDocTitle(title)
        setDocStatus(existingDoc?.status || 'draft')

        if (isAutoGenerate && !autoGenerateComplete) return

        if (autoGenerateComplete && docPublicUrl) {
            extractSectionsFromDocx(docPublicUrl)
                .then(setTocSections)
                .catch(() => setTocSections([]))
            return
        }

        loadDocumentState(existingDoc, pid, did, title, type, pname)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingDoc?.id, projectId, projectsLoading, autoGenerateComplete])

    useEffect(() => {
        if (!existingDoc?.documentKey) return
        if (!hasUnsavedChanges && existingDoc.documentKey !== documentKey) {
            setDocumentKey(existingDoc.documentKey)
        }
    }, [existingDoc?.documentKey, hasUnsavedChanges, documentKey])

    useEffect(() => { if (documentKey) setIsEditorReady(false) }, [documentKey])

    useEffect(() => {
        if (!documentKey || !docPublicUrl) return
        if (prevDocumentKeyRef.current === null) {
            prevDocumentKeyRef.current = documentKey
            return
        }
        if (prevDocumentKeyRef.current === documentKey) return
        prevDocumentKeyRef.current = documentKey
        extractSectionsFromDocx(docPublicUrl).then(setTocSections).catch(() => {})
    }, [documentKey, docPublicUrl])

    useEffect(() => {
        if (!showExport) return
        const handler = (e: MouseEvent) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node))
                setShowExport(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showExport])

    // ─── OnlyOffice config ────────────────────────────────────────────────────

    const [onlyOfficeConfig, setOnlyOfficeConfig] = useState<object | null>(null)

    useEffect(() => {
        if (!docPublicUrl || !documentKey) { setOnlyOfficeConfig(null); return }
        const currentDocId = docIdRef.current
        if (!currentDocId || !projectId) { setOnlyOfficeConfig(null); return }

        const supabaseBase = import.meta.env.VITE_SUPABASE_URL as string
        const ooBase = (import.meta.env.VITE_ONLYOFFICE_CALLBACK_BASE_URL as string) || supabaseBase
        const ooDocUrl = docPublicUrl.replace(supabaseBase, ooBase)

        const callbackSecret = import.meta.env.VITE_ONLYOFFICE_CALLBACK_SECRET as string
        const callbackUrl =
            `${ooBase}/functions/v1/onlyoffice_callback` +
            `?docId=${currentDocId}&projectId=${projectId}&token=${callbackSecret}`

        // Determine edit mode: locked docs are view-only for non-owners
        const isViewMode = viewingVersion
            || project?.userRole === 'viewer'
            || (isDocLocked && !isOwner)

        getOnlyOfficeConfig({
            docId: currentDocId,
            projectId,
            docTitle,
            publicUrl: ooDocUrl,
            documentKey,
            callbackUrl,
            mode: isViewMode ? 'view' : 'edit',
            userId: user?.id ?? 'anonymous',
            userDisplayName: profile?.full_name || user?.email || 'User',
        }).then(setOnlyOfficeConfig)
    }, [docPublicUrl, documentKey, docTitle, viewingVersion, projectId, user?.id, profile?.full_name, project?.userRole, user?.email, isDocLocked, isOwner])

    // ─── Export ──────────────────────────────────────────────────────────────

    const handleDownload = () => {
        if (!docPublicUrl) return
        const a = document.createElement('a')
        a.href = docPublicUrl.includes('?') ? `${docPublicUrl}&t=${Date.now()}` : `${docPublicUrl}?t=${Date.now()}`
        a.download = `${docTitle.replace(/\s+/g, '_')}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setShowExport(false)
    }

    const handlePdfDownload = () => {
        editorRef.current?.downloadAs('pdf')
        setShowExport(false)
    }

    // ─── Version history ─────────────────────────────────────────────────────

    const handleRestoreVersion = useCallback(async (version: DocVersion) => {
        if (!projectId) return
        const confirmed = await confirm({
            title: 'Restore Version',
            message: `Restore to version ${version.versionNumber}? Current content will be preserved as a new version.`,
            confirmLabel: 'Restore',
            variant: 'danger',
        })
        if (!confirmed) return
        if (version.storagePath) {
            await restoreOnlyOfficeVersion(version, projectId)
            setViewingVersion(null)
        } else {
            await restoreVersion(version, projectId)
            window.location.reload()
        }
    }, [projectId, restoreVersion, restoreOnlyOfficeVersion, confirm])

    // ─── Title / status persistence ──────────────────────────────────────────

    const handleTitleBlur = useCallback(async () => {
        const did = docIdRef.current
        if (!did || !projectId) return
        await supabase.from('requirement_docs')
            .update({ title: docTitle, last_modified: new Date().toISOString() })
            .eq('id', did).eq('project_id', projectId)
    }, [docTitle, projectId])

    const handleStatusSet = useCallback(async (newStatus: 'draft' | 'final') => {
        if (newStatus === docStatus) return
        setDocStatus(newStatus)
        const did = docIdRef.current
        if (!did || !projectId) return
        await supabase.from('requirement_docs')
            .update({ status: newStatus })
            .eq('id', did).eq('project_id', projectId)
    }, [docStatus, projectId])

    // ─── Lock / Unlock ────────────────────────────────────────────────────────

    const handleToggleLock = useCallback(async () => {
        const did = docIdRef.current
        if (!did || !projectId) return
        if (isDocLocked) {
            await unlockDocument(did, projectId)
        } else {
            await lockDocument(did, projectId)
        }
    }, [isDocLocked, projectId, lockDocument, unlockDocument])

    // ─── Render ──────────────────────────────────────────────────────────────

    const serverUrl = (import.meta.env.VITE_ONLYOFFICE_SERVER_URL as string) || 'http://localhost:8080'

    // Parent doc for breadcrumb "View original" link
    const parentDoc = existingDoc?.parentDocId
        ? project?.requirementDocs.find(d => d.id === existingDoc.parentDocId)
        : null

    // ─── Auto-generate overlay ──────────────────────────────────────────────
    if (isAutoGenerate && !autoGenerateComplete) {
        return (
            <AutoGenerateProgress
                projectId={projectId!}
                projectName={project?.name || 'Untitled Project'}
                docTitle="Spesifikasi Keperluan Bisnes (BRS)"
                docType="BRS"
                onComplete={(result) => {
                    setAutoGenerateComplete(true)
                    setDocPublicUrl(result.publicUrl)
                    setDocumentKey(result.documentKey)
                    docIdRef.current = result.docId
                    refreshProjects()
                    navigate(`/editor/${projectId}/${result.docId}`, { replace: true })
                }}
                onCancel={() => { navigate(`/project/${projectId}`) }}
                onFallbackEmpty={() => { navigate(`/editor/${projectId}/BRS`, { replace: true }) }}
            />
        )
    }

    return (
        <div className="flex flex-col h-screen bg-[#f8f9fb] overflow-hidden">

            {/* ── Header ── */}
            <header className="h-10 bg-white border-b border-slate-200 flex items-center px-3 shrink-0 z-20 relative gap-2">

                {/* Left zone: back + breadcrumb + title */}
                <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 shrink-0">
                    <ArrowLeft size={16} />
                </button>

                {/* Project name */}
                {project && (
                    <>
                        <Link
                            to={`/projects/${projectId}`}
                            onClick={e => e.stopPropagation()}
                            className="text-[11px] text-slate-400 hover:text-[var(--accent-600)] hover:underline transition-colors truncate max-w-[120px] shrink-0"
                        >
                            {project.name}
                        </Link>
                        <ChevronRight size={11} className="text-slate-300 shrink-0" />
                    </>
                )}

                {/* Doc type badge */}
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border shrink-0 ${docTypeColors.bg} ${docTypeColors.text} ${docTypeColors.border}`}>
                    {docType}
                </span>

                {/* CR badge */}
                {existingDoc?.crNumber != null && (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold border border-[var(--accent-200)] bg-[var(--accent-50)] text-[var(--accent-700)] shrink-0">
                        <GitBranch size={9} />
                        CR-{existingDoc.crNumber}
                    </span>
                )}

                {/* View original link (CR docs only) */}
                {parentDoc && (
                    <button
                        onClick={() => navigate(`/editor/${projectId}/${parentDoc.id}`)}
                        className="text-[10px] text-[var(--accent-600)] hover:underline shrink-0"
                    >
                        ← original
                    </button>
                )}

                <input
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="flex-1 min-w-0 text-sm font-medium text-slate-800 bg-transparent border-none outline-none truncate"
                    placeholder="Document title…"
                />

                {/* Divider */}
                <div className="w-px h-5 bg-slate-200 shrink-0" />

                {/* Center zone: status + presence + unsaved */}
                <div className="flex items-center gap-2 shrink-0">
                    {hasUnsavedChanges && (
                        <span className="text-[11px] text-amber-500 shrink-0">Unsaved</span>
                    )}
                    {existingDoc?.lastEditedByName && !hasUnsavedChanges && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={`Last edited by ${existingDoc.lastEditedByName}`}>
                            Last edit by <span className="font-medium">{existingDoc.lastEditedByName}</span>
                        </span>
                    )}

                    <PresenceIndicator otherUsers={otherUsers} totalViewers={totalViewers} />

                    {/* Locked banner for non-owners */}
                    {isDocLocked && !isOwner && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            <Lock size={10} />
                            Locked
                        </span>
                    )}

                    {/* Status segmented control */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shrink-0">
                        <button
                            onClick={() => handleStatusSet('draft')}
                            className={`px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                                docStatus === 'draft'
                                    ? 'bg-[var(--accent-600)] text-white'
                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            Draft
                        </button>
                        <button
                            onClick={() => handleStatusSet('final')}
                            className={`px-2.5 py-0.5 text-[10px] font-bold transition-colors border-l border-slate-200 ${
                                docStatus === 'final'
                                    ? 'bg-[var(--accent-600)] text-white'
                                    : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            Final
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-slate-200 shrink-0" />

                {/* Right zone: action buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                    {/* Lock/Unlock — owner only */}
                    {isOwner && docId && (
                        <button
                            onClick={handleToggleLock}
                            className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${isDocLocked ? 'text-amber-600' : 'text-slate-500'}`}
                            title={isDocLocked ? 'Unlock Document' : 'Lock Document'}
                        >
                            {isDocLocked ? <Lock size={15} /> : <Unlock size={15} />}
                        </button>
                    )}

                    {/* Divider if lock button present */}
                    {isOwner && docId && <div className="w-px h-4 bg-slate-200 mx-0.5" />}

                    <button
                        onClick={() => setShowAiPanel(v => !v)}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${showAiPanel ? 'bg-[var(--accent-100)] text-[var(--accent-600)]' : 'text-slate-500'}`}
                        title="AI Assistant"
                    >
                        <Sparkles size={15} />
                    </button>
                    <button
                        onClick={() => setShowExport(v => !v)}
                        className={`p-1.5 rounded hover:bg-slate-100 text-slate-500 ${showExport ? 'bg-slate-100' : ''}`}
                        title="Export"
                    >
                        <Download size={15} />
                    </button>

                    <div className="w-px h-4 bg-slate-200 mx-0.5" />

                    <button
                        onClick={() => { setShowVersionHistory(v => !v); setShowComments(false) }}
                        className={`p-1.5 rounded hover:bg-slate-100 text-slate-500 ${showVersionHistory ? 'bg-slate-100' : ''}`}
                        title="Version History"
                    >
                        <History size={15} />
                    </button>
                    <button
                        onClick={() => { setShowComments(v => !v); setShowVersionHistory(false) }}
                        className={`p-1.5 rounded hover:bg-slate-100 text-slate-500 ${showComments ? 'bg-slate-100' : ''}`}
                        title="Comments"
                    >
                        <MessageSquare size={15} />
                    </button>
                </div>

                {/* Export dropdown */}
                {showExport && (
                    <div ref={exportDropdownRef} className="absolute right-3 top-10 bg-white border border-slate-200 rounded-lg shadow-lg z-30 w-44 py-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">Export As</p>
                        <div className="border-t border-slate-100 mt-1">
                            <button
                                onClick={handleDownload}
                                disabled={!docPublicUrl}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <FileText size={14} /> Word (.docx)
                            </button>
                            <button
                                onClick={handlePdfDownload}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                <FileDown size={14} /> PDF
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* ── Body ── */}
            <div className="flex flex-1 min-h-0 relative">

                {/* Main canvas — OnlyOffice Editor */}
                <main className="flex-1 overflow-hidden flex flex-col relative">
                    {isInitializing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 size={24} className="animate-spin text-slate-400" />
                                <span className="text-sm text-slate-500">Preparing document…</span>
                            </div>
                        </div>
                    )}

                    {initError && !isInitializing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                            <div className="flex flex-col items-center gap-2 text-center px-8">
                                <AlertCircle size={24} className="text-red-400" />
                                <p className="text-sm text-red-600">{initError}</p>
                                <button
                                    onClick={() => {
                                        const pid = projectId
                                        const did = docIdRef.current
                                        const pname = project?.name || 'Untitled Project'
                                        if (pid && did) loadDocumentState(existingDoc, pid, did, docTitle, docType, pname)
                                    }}
                                    className="text-xs text-slate-500 underline mt-1"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {onlyOfficeConfig && !initError && (
                        <div className="relative flex-1 overflow-hidden flex flex-col">
                            {!isEditorReady && !isInitializing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 pointer-events-none">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 size={20} className="animate-spin text-slate-400" />
                                        <span className="text-xs text-slate-500">Loading editor…</span>
                                    </div>
                                </div>
                            )}
                            <OnlyOfficeEditor
                                ref={editorRef}
                                config={onlyOfficeConfig}
                                serverUrl={serverUrl}
                                onDocumentReady={() => setIsEditorReady(true)}
                                onDocumentStateChange={setHasUnsavedChanges}
                                onError={err => console.error('OnlyOffice error:', err.errorCode, err.errorDescription)}
                                className="flex-1"
                            />
                        </div>
                    )}
                </main>

                {/* AI Assistant Panel — toggleable */}
                {projectId && (
                    <div className={aiPanelVisible ? 'flex' : 'hidden'}>
                        <AIGeneratePanel
                            projectId={projectId}
                            docType={docType}
                            tocSections={tocSections}
                            docId={docId ?? undefined}
                            storagePath={existingDoc?.storagePath ?? undefined}
                            documentKey={documentKey ?? undefined}
                            hasUnsavedChanges={hasUnsavedChanges}
                            onInsert={(html) => editorRef.current?.pasteHtml(html)}
                            onDocumentKeyRotated={(newKey) => setDocumentKey(newKey)}
                        />
                    </div>
                )}

                {/* Right panel — version history / comments */}
                {(showVersionHistory || showComments) && (
                    <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden z-10">
                        {showVersionHistory && docId && (
                            <VersionHistory
                                docId={docId}
                                projectId={projectId!}
                                currentVersion={existingDoc?.currentVersion ?? 1}
                                onViewVersion={v => { setViewingVersion(v); setShowVersionHistory(false) }}
                                onRestoreVersion={handleRestoreVersion}
                                onClose={() => setShowVersionHistory(false)}
                            />
                        )}
                        {showComments && (
                            <CommentsSidebar
                                comments={comments}
                                sectionTitles={sectionTitles}
                                activeSectionIndex={null}
                                onAddComment={addComment}
                                onResolveComment={resolveComment}
                                onDeleteComment={deleteComment}
                                onClose={() => setShowComments(false)}
                            />
                        )}
                    </aside>
                )}
            </div>

            {/* Version viewer — self-contained modal */}
            {viewingVersion && (
                <VersionViewer
                    version={viewingVersion}
                    docType={docType}
                    onClose={() => setViewingVersion(null)}
                    onRestore={() => handleRestoreVersion(viewingVersion)}
                />
            )}

            {/* Confirm dialog + toast */}
            {dialog}
            {notificationBanner}
        </div>
    )
}
