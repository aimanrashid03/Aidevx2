import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Download, History, MessageSquare,
    FileText, FileDown, Loader2, AlertCircle, Sparkles
} from 'lucide-react'
import { useProjects, type DocVersion } from '../context/ProjectContext'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDocumentComments } from '../hooks/useDocumentComments'
import { useDocumentPresence } from '../hooks/useDocumentPresence'
import VersionHistory from '../components/VersionHistory'
import VersionViewer from '../components/VersionViewer'
import CommentsSidebar from '../components/CommentsSidebar'
import PresenceIndicator from '../components/PresenceIndicator'
import OnlyOfficeEditor, { type OnlyOfficeEditorHandle } from '../components/document-editor/OnlyOfficeEditor'
import AIGeneratePanel from '../components/document-editor/AIGeneratePanel'
import {
    initializeDocxForDoc,
    getOnlyOfficeConfig,
    getDocPublicUrl,
} from '../lib/onlyoffice/documentService'
import { extractSectionsFromDocx, type DocHeading } from '../lib/onlyoffice/extractSections'
import { detectDocMode } from '../lib/onlyoffice/docModeDetector'

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DocumentEditor() {
    const { projectId, templateId } = useParams()
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const { projects, loading: projectsLoading, restoreVersion, restoreOnlyOfficeVersion, refreshProjects } = useProjects()
    const project = projects.find(p => p.id === projectId)

    const existingDoc = project?.requirementDocs.find(d => d.id === templateId)
    const isNewDoc = !existingDoc

    const docType = existingDoc ? existingDoc.type : (templateId || 'BRS')

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


    // AI panel state
    const [showAiPanel, setShowAiPanel] = useState(true)
    const [aiPrefillTitle, setAiPrefillTitle] = useState<string | undefined>()
    const [aiActiveSectionId, setAiActiveSectionId] = useState<string | undefined>()

    // Sidebar toggles
    const [showVersionHistory, setShowVersionHistory] = useState(false)
    const [viewingVersion, setViewingVersion] = useState<DocVersion | null>(null)
    const [showComments, setShowComments] = useState(false)
    const [showExport, setShowExport] = useState(false)

    const editorRef = useRef<OnlyOfficeEditorHandle>(null)
    // stable docId ref (doesn't go stale in callbacks)
    const docIdRef = useRef<string | null>(existingDoc?.id ?? null)
    // prevents React StrictMode double-fire from creating duplicate docs
    const initKeyRef = useRef<string | null>(null)
    // tracks previous documentKey to detect rotations (for TOC re-extract)
    const prevDocumentKeyRef = useRef<string | null>(null)
    // ref for export dropdown click-outside detection
    const exportDropdownRef = useRef<HTMLDivElement>(null)

    // ─── Collaboration hooks ────────────────────────────────────────────────────

    const docId = existingDoc?.id
    const { comments, addComment, resolveComment, deleteComment, getCommentCountBySection } = useDocumentComments(docId, projectId)
    const { otherUsers, totalViewers } = useDocumentPresence(docId)

    // Derive commentCounts keyed by sectionId slug
    const commentCounts: Record<string, number> = {}
    const sectionTitles = tocSections.map(s => s.title)
    const rawCommentCounts = getCommentCountBySection()
    Object.entries(rawCommentCounts).forEach(([idx, count]) => {
        const section = tocSections[Number(idx)]
        if (section) commentCounts[section.sectionId] = count
    })

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
            // Verify the DOCX actually exists in storage — ghost entries (storage_path in DB
            // but file missing) happen when a previous upload failed mid-init.
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
            // File missing — fall through to Case 2 to re-initialize
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

            // Persist the new storage fields to DB
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

        // Only doc-type templateIds (BRS, URS, SRS, SDS) represent genuinely new documents.
        // Any other templateId is an existing doc ID — don't proceed until existingDoc is
        // resolved from the project context. Without this, a reload would see existingDoc as
        // undefined (projects not yet fetched), treat it as new, and create a phantom entry.
        const isDocType = templateId && ['BRS', 'URS', 'SRS', 'SDS'].includes(templateId)
        if (!isDocType && !existingDoc) return

        const did = existingDoc?.id ?? `req-${Date.now()}`

        // Deduplicate: React StrictMode fires effects twice with no cleanup.
        // Using an init key prevents two concurrent inits from creating duplicate docs.
        const initKey = `${pid}::${existingDoc?.id ?? 'new'}`
        if (initKeyRef.current === initKey) return
        initKeyRef.current = initKey

        docIdRef.current = did

        const title = existingDoc?.title || 'Untitled Document'
        const type = existingDoc ? existingDoc.type : (templateId || 'BRS')
        const pname = project?.name || 'Untitled Project'

        setDocTitle(title)
        setDocStatus(existingDoc?.status || 'draft')

        loadDocumentState(existingDoc, pid, did, title, type, pname)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingDoc?.id, projectId, projectsLoading])

    // Sync document_key when OnlyOffice callback rotates it (other tabs, or after save)
    useEffect(() => {
        if (!existingDoc?.documentKey) return
        if (!hasUnsavedChanges && existingDoc.documentKey !== documentKey) {
            setDocumentKey(existingDoc.documentKey)
        }
    }, [existingDoc?.documentKey, hasUnsavedChanges, documentKey])

    // Reset editor-ready flag whenever documentKey changes (OO remounts on save/restore)
    useEffect(() => { if (documentKey) setIsEditorReady(false) }, [documentKey])

    // Re-parse TOC headings when documentKey rotates (OO callback saved new content)
    useEffect(() => {
        if (!documentKey || !docPublicUrl) return
        if (prevDocumentKeyRef.current === null) {
            prevDocumentKeyRef.current = documentKey
            return // skip initial set — loadDocumentState already extracted
        }
        if (prevDocumentKeyRef.current === documentKey) return
        prevDocumentKeyRef.current = documentKey
        extractSectionsFromDocx(docPublicUrl).then(setTocSections).catch(() => {})
    }, [documentKey, docPublicUrl])

    // Close export dropdown on outside click
    useEffect(() => {
        if (!showExport) return
        const handler = (e: MouseEvent) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node))
                setShowExport(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showExport])


    // ─── AI panel handler ─────────────────────────────────────────────────────

    const handleAutoGen = useCallback((sectionId: string, sectionTitle: string) => {
        setAiActiveSectionId(sectionId)
        setAiPrefillTitle(sectionTitle)
        setShowAiPanel(true)
        setShowVersionHistory(false)
        setShowComments(false)
    }, [])

    // ─── OnlyOffice config ────────────────────────────────────────────────────

    const onlyOfficeConfig = useMemo(() => {
        if (!docPublicUrl || !documentKey) return null
        const currentDocId = docIdRef.current
        if (!currentDocId || !projectId) return null

        // OnlyOffice runs inside Docker — it cannot reach 127.0.0.1 (host loopback).
        // Replace the browser-facing Supabase URL with the Docker-reachable equivalent
        // for both the document download URL and the save callback URL.
        const supabaseBase = import.meta.env.VITE_SUPABASE_URL as string
        const ooBase = (import.meta.env.VITE_ONLYOFFICE_CALLBACK_BASE_URL as string) || supabaseBase

        // Rewrite storage URL so OO can download the DOCX from inside Docker
        const ooDocUrl = docPublicUrl.replace(supabaseBase, ooBase)

        const callbackSecret = import.meta.env.VITE_ONLYOFFICE_CALLBACK_SECRET as string
        const callbackUrl =
            `${ooBase}/functions/v1/onlyoffice_callback` +
            `?docId=${currentDocId}&projectId=${projectId}&token=${callbackSecret}`

        return getOnlyOfficeConfig({
            docId: currentDocId,
            projectId,
            docTitle,
            publicUrl: ooDocUrl,
            documentKey,
            callbackUrl,
            mode: viewingVersion ? 'view' : 'edit',
            userId: user?.id ?? 'anonymous',
            userDisplayName: profile?.full_name || user?.email || 'User',
        })
    }, [docPublicUrl, documentKey, docTitle, viewingVersion, projectId, user?.id, profile?.full_name])

    // ─── Export ──────────────────────────────────────────────────────────────

    const handleDownload = () => {
        if (!docPublicUrl) return
        const a = document.createElement('a')
        // Cache-buster so the browser fetches the latest saved DOCX, not a cached copy
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
        if (!confirm(`Restore to version ${version.versionNumber}? Current content will be kept as a version.`)) return
        if (version.storagePath) {
            await restoreOnlyOfficeVersion(version, projectId)
            setViewingVersion(null)
        } else {
            await restoreVersion(version, projectId)
            window.location.reload()
        }
    }, [projectId, restoreVersion, restoreOnlyOfficeVersion])

    // ─── Title / status persistence ──────────────────────────────────────────

    const handleTitleBlur = useCallback(async () => {
        const did = docIdRef.current
        if (!did || !projectId) return
        await supabase.from('requirement_docs')
            .update({ title: docTitle, last_modified: new Date().toISOString() })
            .eq('id', did).eq('project_id', projectId)
    }, [docTitle, projectId])

    const handleStatusToggle = useCallback(async () => {
        const newStatus = docStatus === 'draft' ? 'final' : 'draft'
        setDocStatus(newStatus)
        const did = docIdRef.current
        if (!did || !projectId) return
        await supabase.from('requirement_docs')
            .update({ status: newStatus })
            .eq('id', did).eq('project_id', projectId)
    }, [docStatus, projectId])

    // ─── Render ──────────────────────────────────────────────────────────────

    const serverUrl = (import.meta.env.VITE_ONLYOFFICE_SERVER_URL as string) || 'http://localhost:8080'

    // Whether the AI panel should be visible (toggled independently, hidden when other panels are open)
    const aiPanelVisible = showAiPanel && !showVersionHistory && !showComments

    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">

            {/* ── Header ── */}
            <header className="h-12 bg-white border-b border-slate-200 flex items-center gap-2 px-3 shrink-0 z-20 relative">
                <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                    <ArrowLeft size={16} />
                </button>

                <input
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="flex-1 min-w-0 text-sm font-medium text-slate-800 bg-transparent border-none outline-none truncate"
                    placeholder="Document title…"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                    {hasUnsavedChanges && (
                        <span className="text-[11px] text-amber-500">Unsaved changes</span>
                    )}

                    <PresenceIndicator otherUsers={otherUsers} totalViewers={totalViewers} />

                    <button
                        onClick={handleStatusToggle}
                        className={`text-[11px] px-2 py-0.5 rounded border font-medium ${docStatus === 'final'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                        {docStatus}
                    </button>

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
                    <button
                        onClick={() => setShowAiPanel(v => !v)}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${showAiPanel ? 'bg-violet-100 text-violet-600' : 'text-slate-500'}`}
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
                </div>

                {/* Export dropdown */}
                {showExport && (
                    <div ref={exportDropdownRef} className="absolute right-3 top-12 bg-white border border-slate-200 rounded-lg shadow-lg z-30 w-44 py-1">
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
                {projectId && aiPanelVisible && (
                    <AIGeneratePanel
                        projectId={projectId}
                        docType={docType}
                        tocSections={tocSections}
                        prefillTitle={aiPrefillTitle}
                        activeSectionId={aiActiveSectionId}
                        onInsert={(html) => editorRef.current?.pasteHtml(html)}
                    />
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
                            />
                        )}
                    </aside>
                )}
            </div>

            {/* Version viewer — self-contained modal, renders its own overlay */}
            {viewingVersion && (
                <VersionViewer
                    version={viewingVersion}
                    docType={docType}
                    onClose={() => setViewingVersion(null)}
                    onRestore={() => handleRestoreVersion(viewingVersion)}
                />
            )}
        </div>
    )
}
