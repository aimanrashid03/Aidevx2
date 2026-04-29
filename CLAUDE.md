# Aidevx2 — CLAUDE.md

## Project Overview
**Aidevx** is a web-based requirements engineering tool for creating, editing, and exporting BRS, URS, SRS, and SDS documents. Features AI-powered content generation with RAG, real-time collaboration, and automatic full-document generation. Built with React 19, OnlyOffice Document Server, and Supabase.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Editor**: OnlyOffice Document Server (self-hosted on Oracle Cloud ARM VM) — replaced Tiptap WYSIWYG
- **Backend**: Supabase Cloud (Postgres, Auth, Storage, Edge Functions) — cloud project `hpjzwpocxuxqntuuqzbr` (ap-southeast-1)
- **AI**: OpenRouter (default, `deepseek/deepseek-chat-v3-0324`), Voyage AI `voyage-3-lite` for RAG embeddings
- **Document processing**: mammoth (DOCX→HTML), docx (DOCX generation), docx-preview, PizZip (template manipulation), idb-keyval (client-side persistent preferences)
- **Diagrams**: Mermaid (client-side rendering), draw.io (via public viewer API)
- **Routing**: React Router v7

## Commands
```bash
npm run dev          # Start Vite dev server
npm run build        # Type-check + build (tsc -b && vite build)
npm run lint         # ESLint
npm run functions    # Serve Supabase edge functions locally (no JWT verify)
npm run bundle:corrad  # Rebuild _shared/corradDesign.ts from corrad-design/ assets
```

Build must pass with **zero TypeScript errors**. Chunk size warnings are expected (mermaid + pdfjs + tiptap in bundle).

## Deployment Architecture (Primary)

> **The canonical deployment uses Supabase Cloud + a hosted OnlyOffice server.** Local Supabase is supported as a secondary option for contributors who need an isolated environment.

| Component | Where |
|---|---|
| Frontend | Vite dev / static build |
| Supabase (DB, Auth, Storage, Edge Functions) | Supabase Cloud — `hpjzwpocxuxqntuuqzbr` (ap-southeast-1) |
| OnlyOffice Document Server | Oracle Cloud ARM VM — `149.118.143.205:8080` (`JWT_ENABLED=false`) |

**Env vars for cloud setup** (`.env`):
```
VITE_SUPABASE_URL=https://hpjzwpocxuxqntuuqzbr.supabase.co
VITE_SUPABASE_ANON_KEY=<cloud anon key>
VITE_ONLYOFFICE_SERVER_URL=http://149.118.143.205:8080
VITE_ONLYOFFICE_CALLBACK_SECRET=<secret matching OO server>
# VITE_ONLYOFFICE_JWT_SECRET — leave unset (JWT_ENABLED=false on OO server)
```

**Edge function secrets** (set once via `supabase secrets set`):
```
OPENROUTER_API_KEY=...
VOYAGE_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ONLYOFFICE_CALLBACK_SECRET=...
```

### Optional: Local Supabase setup

```bash
supabase start               # Starts local Postgres, Auth, Storage, Kong
supabase db reset            # Apply all migrations + seed
docker compose up -d         # OnlyOffice at http://localhost:8080
npm run functions            # Edge functions locally
```

Local `.env` defaults are pre-filled for `http://localhost:54321`. Templates must be manually uploaded after `supabase db reset`:
```bash
SERVICE_KEY=$(npx supabase status --output env | grep SERVICE_ROLE_KEY | cut -d'"' -f2)
curl -X POST "http://127.0.0.1:54404/storage/v1/object/documents/templates/BRS.docx" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  --data-binary @public/templates/BRS.docx
curl -X POST "http://127.0.0.1:54404/storage/v1/object/documents/templates/URS.docx" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  --data-binary @public/templates/URS.docx
```

## Project Structure
```
src/
  App.tsx                        # Routes (includes /admin/* nested routes)
  pages/
    DocumentEditor.tsx           # Main editor page — route /editor/:projectId/:templateId
    ProjectDetails.tsx           # Project detail + document list (with collaboration)
    Dashboard.tsx                # Project list with owner/member info
    AddProject.tsx
    DocumentRepository.tsx
    Trash.tsx                        # Trashed projects — restore or permanently delete
    admin/
      AdminLayout.tsx            # Admin shell with sidebar nav (AdminRoute-gated)
      AdminOverview.tsx          # Platform stats overview
      AdminUsers.tsx             # User list, role management, disable/delete
      AdminProjects.tsx          # All projects + document counts
      AdminTechStack.tsx         # Dependency versions, migration history
      AdminApi.tsx               # Edge function health + latency pings
      AdminLlmUsage.tsx          # LLM token/cost breakdown from llm_usage_log
      AdminRagHealth.tsx         # Embedding index stats, chunk counts, re-index trigger
      AdminStorage.tsx           # Supabase storage bucket usage
      AdminAudit.tsx             # admin_audit_log viewer
      AdminSettings.tsx          # Feature flags via app_config table
      AdminOnlyOffice.tsx        # OO server health check + document stats
      adminNav.ts                # ADMIN_NAV items (path, label, icon, group)
  components/
    document-editor/
      OnlyOfficeEditor.tsx       # OO iframe wrapper
      AIGeneratePanel.tsx        # Slide-in AI panel: multi-doc-type, chat mode, RAG, diagrams
      DiagramPreview.tsx         # Live Mermaid/draw.io preview in AI panel (with ErrorBoundary)
      AutoGenerateProgress.tsx   # Modal UI for full-document auto-generation progress
      VersionHistory.tsx         # Version list; requires currentVersion prop and onClose prop
      VersionViewer.tsx          # Dual-path: docx-preview (OO) or legacy block renderer
      CommentsSidebar.tsx        # Requires activeSectionIndex + onClose props; styled section picker
    ErrorBoundary.tsx              # Generic React class error boundary (fallback render prop)
    AdminRoute.tsx                 # Route guard: redirects to /dashboard if profile.role !== 'admin'
    ConfirmDialog.tsx              # Reusable confirm modal (danger/default variants)
    CRStatusBadge.tsx              # CR status pill: draft | in_review | approved | rejected | merged
    CreateCRDialog.tsx             # Modal to create a Change Request from a locked doc; inline error state
    EmbeddingStatusBadge.tsx      # Unified RAG indexing status badge (pending/processing/processed/failed)
    CoverageBreakdown.tsx         # Per-section BRS coverage table (compact bar + full collapsible grouped view)
    ProjectMembers.tsx            # Collaborator management UI (invite, remove, role change)
    Layout.tsx                    # Collapsible sidebar + header; reads trashedCount from ProjectContext for Trash badge
    PresenceIndicator.tsx
    TableEditor.tsx                # Reusable inline table editor
    UndoToast.tsx                  # Bottom-center toast with Undo button (8s default timeout); used by Dashboard lifecycle actions
    dashboard/
      AdminViewBanner.tsx          # Read-only info banner shown when admin views projects they don't own
      DashboardEmptyState.tsx      # Empty state for no-owned / no-shared / no-search-results
      DashboardFilters.tsx         # Search input + sort select + Show-archived chip
      DashboardTabs.tsx            # Tab control: mine | shared | admin (DashboardTab type)
      DeleteProjectModal.tsx       # Permanent-delete confirm modal (from Trash)
      DuplicateProjectModal.tsx    # Duplicate project modal with name prompt
      EditProjectModal.tsx         # Edit project name / description / notes
      ProjectCardMenu.tsx          # Context menu on project card (edit / duplicate / archive / trash)
      StatCardsRow.tsx             # Top-of-dashboard stat cards (total / active / archived / shared)
    project-tabs/
      ActivityTab.tsx              # Activity timeline: day-grouped, Lucide icons, consecutive-action collapse, filter
      DashboardTab.tsx            # Project health panel — blended checklist+coverage score, coverage modal
      WorkspaceTab.tsx             # Document list; Import Document modal; optional onRefresh prop
      LibraryTab.tsx               # Tabbed container for supporting files, user stories, diagrams
      LibrarySupportingFiles.tsx   # File upload, embedding, download, delete; fires assess_coverage after embed
      LibraryUserStories.tsx       # User story template CRUD with auto-indexing
      LibraryDiagramNotes.tsx      # Diagram note CRUD
      CollaboratorsTab.tsx
      PrototypeTab.tsx             # Prototype list; WizardModal (doc select + Upload-and-Generate shortcut); CodeViewerModal
      PrototypeGenerateProgress.tsx # Progress UI for prototype generation
  context/
    AuthContext.tsx               # Session + user + profile (role: 'admin'|'user') — profileLoading separate flag
    ProjectContext.tsx           # Projects + collaboration (userRole, memberCount, ownerName)
  hooks/
    useProjectMembers.ts         # Invite/remove/update members with role management
    useUserStories.ts            # User story CRUD + RAG embedding + chunk cleanup on delete; fires assess_coverage after embed
    useDiagramNotes.ts           # Diagram note CRUD
    useConfirmDialog.ts          # Promise-based confirm dialog + toast notification hook
    useCoverageAssessment.ts     # Fetches/runs semantic coverage assessment; exposes assessment, assessing, isStale, assessmentError, runAssessment, refetch
    useActivityLog.ts            # Activity log read/write (timeline data for ActivityTab)
    useDocumentComments.ts       # Comment CRUD per document
    useDocumentLock.ts           # Realtime postgres_changes subscription for live lock state in editor
    useDocumentPresence.ts       # Live presence tracking for OO editor sessions
    useProjectMetadataEmbedding.ts # Embeds project description + notes into RAG; tracks description_embedding_status / notes_embedding_status
    useSectionContent.ts         # Per-section AI-generated content read/write (backed by section_content table)
  lib/
    admin/
      adminApi.ts                # callAdminUsers(), callAdminTelemetry(), pingEdgeFunction()
      index.ts                   # Re-exports
    onlyoffice/
      documentService.ts         # OO config builder, template registry, storage URL helpers
      extractSections.ts         # mammoth → DocHeading[] from DOCX
      docModeDetector.ts         # detectDocMode(): 'onlyoffice' | 'tiptap-v1' | 'legacy'
    ai/
      sectionContext.ts          # Extracts section context from doc structures (fuzzy matching)
      diagramRenderer.ts         # Mermaid → base64 PNG (via canvas)
      drawioRenderer.ts          # draw.io XML → base64 PNG; returns { png, fallback: boolean }
    export/                      # DOCX/PDF export helpers
    extractText.ts               # Generic text extraction utility
    validateUpload.ts            # File-upload validation (size limits, MIME types)
  tiptap/
    converters/
      tiptapToDocx.ts            # Tiptap JSON → docx nodes (async)
      htmlStringToTiptapNodes.ts # HTML string → Tiptap nodes (with table support)
  constants/
    docs.ts                      # DOC_STRUCTURES registry — maps doc types to structures
    urs_structure.ts             # URS DocSection[] template
    brs_structure.ts             # BRS DocSection[] template (Bahasa Malaysia)
    srs_structure.ts             # SRS DocSection[] template
    sds_structure.ts             # SDS DocSection[] template
    userStoryTemplate.ts         # USER_STORY_TEMPLATE array (7 sections) — imported by LibraryUserStories
supabase/
  functions/
    generate_section/            # Per-section AI generation (streaming SSE, chat mode, RAG)
    auto_generate_document/      # Full-document auto-generation (BRS) with progress streaming + server-side diagrams
    generate_prototype/          # UI prototype generation from requirement docs (SSE progress events)
    assess_coverage/             # Semantic coverage assessment — dry-run RAG against all BRS sections, no LLM (verify_jwt=false)
    onlyoffice_callback/         # OO save callback — rotates documentKey, captures last_edited_by, enforces lock guard
    embed_document/              # Document embedding for RAG pipeline
    replace_section/             # Targeted server-side section replacement in DOCX (verify_jwt=false)
    admin-users/                 # Admin: user CRUD, role management, profile operations
    admin-telemetry/             # Admin: platform stats, OO health, embedding indexes, storage, migrations
    _shared/
      ragHelper.ts               # RAG pipeline: dual-query embedding, dedup, quality assessment
      promptBuilder.ts           # System/user prompt construction for auto-generate mode
      llmConfig.ts               # Environment-based LLM/embedding config (model, temp, tokens)
      chunker.ts                 # Structure-aware text splitter with heading/table detection
      markdownToOoxml.ts         # Markdown → raw OOXML fragments; includes diagramOoxml() for inline image fragments
      markdownToHtml.ts          # Markdown → HTML conversion helper
      htmlToOoxml.ts             # HTML → OOXML fragments (used by replace_section)
      docxTemplateBuilder.ts     # Template-based DOCX builder (PizZip, preserves formatting)
      docxServerBuilder.ts       # From-scratch DOCX builder (markdown → docx library nodes)
      docxTextExtractor.ts       # DOCX → plaintext extractor (PizZip, strips XML) for LLM prompts
      renderMermaidServer.ts     # Server-side Mermaid → PNG via kroki.io / mermaid.ink (sanitization, retry, syntax auto-fixes)
      brsStructure.ts            # Server-side BRS structure with autoGenerate flags
      brsExamples.ts             # Few-shot examples for BRS generation
      srsExamples.ts             # Few-shot examples for SRS generation
      sdsExamples.ts             # Few-shot examples for SDS generation
      ursExamples.ts             # Few-shot examples for URS generation
      corradDesign.ts            # AUTO-GENERATED — do not edit; run npm run bundle:corrad
      prototypeSchema.ts         # PrototypeModel types, validators, serializers
  migrations/
    ...                          # See DB Migrations section below
public/
  templates/
    URS.docx                     # URS template loaded on new document creation
    BRS.docx                     # BRS template (government specification format)
```

## Document Storage Model
- Documents are stored as native `.docx` files in Supabase Storage (`documents` bucket)
- `doc.storagePath` — path in storage bucket
- `docPublicUrl` — Supabase public URL used by OO editor and TOC extraction
- `documentKey` — unique per-save string for OO cache-busting; rotated by `onlyoffice_callback`
- Version snapshots stored at: `documents/{projectId}/{docId}/v{n}.docx`
- **Local setup only**: bucket is created by migration `20260305000001_create_documents_bucket.sql`; templates must be uploaded manually after `supabase db reset` (see Local setup above)

## Document Templates
- Template registry in `documentService.ts`: `FILE_TEMPLATE_TYPES = new Set(['URS', 'BRS'])`
- Templates loaded from `/public/templates/{TYPE}.docx` on new document creation
- Falls back to from-scratch DOCX build if template not available

## Content Format Detection (`docModeDetector.ts`)
- `doc.storagePath` present → `'onlyoffice'`
- `content.__format === 'tiptap-v1'` → `'tiptap-v1'`
- Otherwise → `'legacy'`

## Key State in DocumentEditor
| State | Purpose |
|---|---|
| `docPublicUrl` | Storage URL for OO + TOC |
| `documentKey` | Cache-bust key, rotated on save |
| `isEditorReady` | True after `onDocumentReady` fires; gates loading overlay |
| `tocSections: DocHeading[]` | From `extractSectionsFromDocx()` |
| `generatingSectionId` | Which section AI is generating (disables other sparkles) |
| `aiPanelSection` | Open AI panel target section |

## OnlyOffice Setup
- **Production (primary)**: Oracle Cloud ARM VM at `http://149.118.143.205:8080`
  - Ubuntu 22.04, Docker, OnlyOffice Document Server
  - `JWT_ENABLED=false` — `VITE_ONLYOFFICE_JWT_SECRET` must NOT be set in `.env`
  - SSH: `~/.ssh/ssh-key-2026-04-02.key`, user `ubuntu`
- **Local (optional)**: `docker compose up -d` → OO at `http://localhost:8080`
  - `docker-compose.yml` configures the `supabase_net` external network for callback routing
- **Env vars** (`.env`):
  - `VITE_ONLYOFFICE_SERVER_URL` — URL of OO server (cloud or local)
  - `VITE_ONLYOFFICE_CALLBACK_SECRET` — must match `ONLYOFFICE_CALLBACK_SECRET` edge function secret
- **OO JWT signing** (`config.token`): only if `VITE_ONLYOFFICE_JWT_SECRET` is set — must match `JWT_SECRET` on OO server. Leave unset when `JWT_ENABLED=false`. Do NOT use `VITE_ONLYOFFICE_CALLBACK_SECRET` for this — they are separate concerns.

## Auth and Roles
- `AuthContext` loads `profiles` row (`id`, `email`, `full_name`, `role: 'admin'|'user'`) after sign-in
- `profileLoading` is a separate flag from `loading` — prevents flash of unauthorized state
- `AdminRoute` checks `profile.role === 'admin'` and redirects to `/dashboard` if not
- Admin actions use service role key server-side (via `admin-users` and `admin-telemetry` edge functions)

## Admin Dashboard (`/admin/*`)
- Protected by `AdminRoute` (requires `profile.role === 'admin'`)
- Routes nested under `AdminLayout` which provides the sidebar with `ADMIN_NAV` items
- Two nav groups: **platform** (Overview, Users, Projects, Audit Log) and **system** (Tech Stack, API & Functions, LLM Usage & Cost, RAG Index, Storage, OnlyOffice, Feature Flags)
- `src/lib/admin/adminApi.ts` — client-side wrappers: `callAdminUsers()`, `callAdminTelemetry()`, `pingEdgeFunction()`
- `admin-telemetry` edge function provides: OO health ping, pgvector status, applied migrations, embedding index stats, embedding status counts, storage usage, LLM usage aggregates

## DB Migrations (key)
| Migration | Description |
|---|---|
| `20260305000001_create_documents_bucket.sql` | Supabase Storage `documents` bucket (local only — cloud bucket pre-exists) |
| `20260401000000_voyage_embeddings.sql` | Resize pgvector 1536d→512d; truncate chunks; reset embedding_status |
| `20260402000000_create_prototypes.sql` | `prototypes` table |
| `20260402100000_add_embedding_index.sql` | HNSW index on `document_chunks.embedding` |
| `20260410000000_add_prototype_model.sql` | Adds nullable `model jsonb` to prototypes |
| `20260415000000_llm_usage_log.sql` | `llm_usage_log` table — LLM cost/token tracking per call |
| `20260415000001_admin_audit_log.sql` | `admin_audit_log` table — admin action audit trail |
| `20260415000002_app_config.sql` | `app_config` table — feature flags + runtime model overrides |
| `20260415100000_admin_telemetry_helpers.sql` | SQL helper functions for `admin-telemetry` (SECURITY DEFINER, service_role only) |
| `20260417000000_rag_coverage_assessments.sql` | `rag_coverage_assessments` table — cached semantic coverage per project per doc type; UNIQUE (project_id, doc_type); RLS: project members read only, service role writes |
| `20260418000000_doc_management_features.sql` | `requirement_docs`: adds `last_edited_by`, `locked_by/locked_at`, `parent_doc_id/cr_number`; new `change_requests` table (status: draft/in_review/approved/rejected/merged) with RLS; enables Realtime on `requirement_docs` |
| `20260403000000_section_content.sql` | `section_content` table — stores AI-generated HTML per section (doc_id, section_title, html, sources, content_type, is_in_document); used by `replace_section` and AI panel reload |
| `20260404000000_activity_log.sql` | `activity_log` table — workspace activity timeline (project_id, doc_id, user_id, action, details jsonb) with typed action kinds |
| `20260416000000_upload_limits.sql` | Upload size and MIME type constraints |
| `20260422000000_project_metadata_embedding_status.sql` | Adds `description_embedding_status` and `notes_embedding_status` columns to `projects` for tracking project-metadata RAG indexing |
| `20260428000000_project_lifecycle.sql` | `projects`: adds `archived_at`, `deleted_at`, `updated_at` + auto-update trigger; partial indices; replaces UPDATE/DELETE RLS policies (editors can update, owners can hard-delete) |
| `20260429000000_phase5_hardening.sql` | pg_cron job to hard-delete projects trashed > 30 days; admin INSERT policy on `admin_audit_log` for client-side audit writes |

## Document Lifecycle Features

### Document Locking
- Owner can lock/unlock any document from the editor header (lock icon, owner-only)
- **`onlyoffice_callback`** enforces the lock server-side: rejects saves from non-lock-holders and returns a `403` with `{ error: 'locked' }`
- `useDocumentLock(docId)` subscribes to `requirement_docs` Realtime `postgres_changes` so the lock state updates live in the editor without polling
- Locked docs open in view-mode for non-owners; AI panel is hidden with an explanatory toast

### Change Requests (CR Versioning)
- Any editor/owner can create a CR from a locked doc via `CreateCRDialog` (opens from editor header CR badge or WorkspaceTab card)
- `createChangeRequest()` in `ProjectContext`: clones the storage DOCX object, inserts a new `requirement_docs` row with `parent_doc_id` + `cr_number`, auto-locks the parent, creates a `change_requests` row
- CR children grouped under their parent doc in `WorkspaceTab` (indented, with `CRStatusBadge`)
- `change_requests` table status values: `draft | in_review | approved | rejected | merged`

### Last-Edited-By Tracking
- `onlyoffice_callback` captures the OO `actions[].users` payload and writes `last_edited_by` (UUID) + `last_edited_by_name` to `requirement_docs`
- `ProjectContext` exposes this per-document and displays it on WorkspaceTab doc cards

### Direct DOCX Import
- **WorkspaceTab** "Import Document" modal: upload any `.docx` and register it as a first-class `requirement_docs` row — editable in OnlyOffice, usable for AI generation and RAG
- **PrototypeTab** WizardModal has an "Upload & Generate" shortcut: upload a doc and immediately trigger prototype generation in one step

## Project Lifecycle (Dashboard)

### Dashboard Tabs
- `mine` — projects the current user owns
- `shared` — projects where user is an editor or viewer
- `admin` — all projects (admin role only); shows `AdminViewBanner` ("read-only, you don't own these")
- Tab state is local; `DashboardTabs` component drives the UI

### Filters and Sorting
- `DashboardFilters`: search by name, sort by Recent or Name A–Z, Show-archived chip (amber toggle)
- Archived projects are hidden by default; toggle chip reveals them inline
- `StatCardsRow` shows total / active / archived / shared counts at the top of the dashboard

### Project Card Actions (`ProjectCardMenu`)
- **Edit** — `EditProjectModal`: update name, description, notes in-place
- **Duplicate** — `DuplicateProjectModal`: clone project with "(Copy)" suffix, no documents copied
- **Archive / Unarchive** — soft status change (`archived_at`); project hidden from default view but not deleted
- **Trash** — soft-delete (`deleted_at` set); project moves to `/trash`; `UndoToast` shown for 8 s to reverse
- **Permanent Delete** — from Trash page (`DeleteProjectModal`): hard deletes immediately (cascades to all child rows)

### Trash Page (`/trash`)
- Lists all soft-deleted projects (where `deleted_at IS NOT NULL`)
- Actions: Restore (clears `deleted_at`) or Permanently Delete
- pg_cron job (migration `20260429000000_phase5_hardening.sql`) auto-purges rows older than 30 days daily at 03:00 UTC (requires `pg_cron` extension)

### Undo Pattern
- `UndoToast` component: fixed bottom-center, 8 s timeout, Undo + close buttons
- Destructive actions (archive, trash, duplicate) fire the DB write after the toast timeout unless Undo is clicked; "Undo" reverses via ProjectContext methods
- `trashedCount` exposed from `ProjectContext` — drives the Trash badge in the sidebar (red pill, shows 9+ if > 9)

## AI Generation

### Per-Section Generation (`generate_section`)
- Streams SSE responses; Anthropic SSE is translated to OpenAI-compatible format via `pipeAnthropicStream()` so the frontend stays unchanged
- Supports all doc types: BRS, URS, SRS, SDS
- Content types: text, table, diagram (mermaid or draw.io format)
- Chat mode with multi-turn conversation history
- Refinement mode: accepts previous output + user feedback
- RAG-enhanced: uses embedded project documents as context
- `AIGeneratePanel` is the primary UI — supports doc type selection, document path picker, content type choice, source attribution display
- `DiagramPreview` component renders live Mermaid SVG or draw.io PNG inline in the panel; draw.io failures show a yellow fallback chip (XML preserved)
- Diagram format preference persisted across sessions via `idb-keyval` (`localStorage` key `aidevx.diagramFormatPreset`)

### UI Prototype Generation (`generate_prototype`)
- Generates a self-contained multi-page HTML UI prototype from any requirement document (BRS/URS/SRS/SDS)
- **Architecture**: LLM returns structured JSON (`PrototypeModel`); edge function assembles the HTML deterministically. The LLM never generates the shell (topbar/sidebar/JS helpers) — only page content fragments, nav groups, and modals.
- **Pipeline**: (1) [parallel] extract DOCX text + RAG retrieval, (2) LLM call produces JSON (`max_tokens: 14000`, `temp: 0.4`), (3) `parseLlmJson()` + `validatePrototypeModel()`, (4) `assembleHtml()` interpolates `CORRAD_SHELL_TEMPLATE`, (5) save to DB
- **Design system**: real CORRAD — Tailwind utility classes, violet accent (`bg-violet-600`), `bg-[#f8f9fb]` shell, `border-violet-200 bg-violet-50` active nav. Source of truth: `corrad-design/` folder.
- **Prototype bundling**: `corrad-design/` assets are bundled into `supabase/functions/_shared/corradDesign.ts` by `scripts/build-corrad-bundle.mjs` at build time (Deno edge functions can't read local files at runtime). Run `npm run bundle:corrad` after changing any file under `corrad-design/`. **Never edit `_shared/corradDesign.ts` by hand** — it is auto-generated and will be overwritten.
- **Language**: UI text and sample data match the source document's language (BM docs → Bahasa Malaysia UI, EN docs → English UI)
- SSE events: `progress` (status text), `complete` (prototypeId + html), `error`
- `PrototypeTab` component: loads prototypes from DB on mount, shows WizardModal for doc selection, CodeViewerModal for viewing/copying HTML, "Run" opens prototype in new tab via Blob URL
- **Migrations**: `20260402000000_create_prototypes.sql` — `prototypes` table; `20260410000000_add_prototype_model.sql` — adds nullable `model jsonb` column for the assembled PrototypeModel
- **Key shared files**: `_shared/corradDesign.ts` (generated), `_shared/prototypeSchema.ts` (PrototypeModel types + validators + serializers)

### Full-Document Auto-Generation (`auto_generate_document`)
- Server-side pipeline that generates all auto-generate sections for a document
- Three-phase pipeline: (1) batch-embed all sections + pre-fetch template in parallel, (2) vector search + LLM for all sections concurrently (max 8 at a time), (3) DOCX build using pre-fetched template
- Two-phase DOCX builder: template-based (preserves exact formatting) with from-scratch fallback
- Streams SSE progress events per section back to frontend; keep-alive heartbeat every 20s prevents connection drops on long runs
- `AutoGenerateProgress` modal shows real-time section completion status
- Currently supports BRS documents
- **`AutoGenerateProgress` design note**: `onComplete` and `selectedDocumentPaths` props are stored in refs inside the component — do NOT add them back to the `useCallback` dep array. The parent (`DocumentEditor`) re-renders frequently (real-time hooks) and creating new function references causes duplicate requests.

#### Server-Side Diagram Pipeline (BRS auto-generation)
- `renderMermaidServer.ts`: renders Mermaid code to PNG server-side; primary renderer is **kroki.io**, fallback is **mermaid.ink**
- Per-diagram retry: 2 attempts per API before falling back; common syntax auto-fixes applied pre-render: strip prose preamble, fix parentheses in labels, `graph` → `flowchart`, decode HTML entities, case-insensitive type detection (erDiagram, sequenceDiagram, etc.)
- Rendered PNGs embedded inline in the DOCX via `diagramOoxml()` helper in `markdownToOoxml.ts`
- **Per-diagram-type model routing**: `LLM_MODEL_DIAGRAM` env var overrides the LLM for erDiagram and sequenceDiagram sections specifically (defaults to base model if unset)
- SSE emits a progress event per diagram section; heartbeat keeps connection alive during rendering

#### Auto-Generate Reload Guards
- `auto_generate_document` emits a `started { docId }` SSE event immediately so the frontend can register the job before streaming begins
- `AutoGenerateProgress` polls the DB for completion if the SSE connection drops mid-stream
- `DocumentEditor` checks if a BRS already exists before triggering auto-generate — skips if already generated to prevent duplicate requests on page reload

#### Prototype Reload Guard
- A `sessionStorage` flag is set when prototype generation starts and cleared on completion
- On page reload during an active generation, `PrototypeTab` shows a warning banner ("Generation was interrupted")
- `WorkspaceTab` accepts an optional `onRefresh` prop; `DocumentEditor` passes `refreshProjects` after auto-generate completes

### RAG Pipeline
- `embed_document` edge function chunks and embeds uploaded project files
- Dual-query embedding strategy (direct + template-aware) for better recall
- `embedBatch()` in `ragHelper.ts`: batch-embeds N queries in a single Voyage AI API call — used by auto-generate to reduce 40 individual calls to 2
- `performRagWithEmbeddings()` in `ragHelper.ts`: search-only variant that accepts pre-computed embeddings, skipping the embed step
- Structure-aware chunker: preserves heading boundaries, keeps tables intact
- Context quality assessment: none/low/medium/high — computed from **top-6 highest-similarity chunks** (not all matched chunks) to avoid dilution by borderline 0.30-threshold matches
- Quality thresholds (calibrated for voyage-3-lite 512d): high > 0.48, medium > 0.38, low ≤ 0.38, none = 0 chunks
- Default config: match threshold 0.30, match count 18, embedding dimensions 512
- **DB migration** `20260401000000_voyage_embeddings.sql`: resizes pgvector column from 1536d → 512d, truncates `document_chunks`, resets `embedding_status → pending`. All documents must be re-embedded after applying this migration.
- **DB migration** `20260402100000_add_embedding_index.sql`: adds HNSW index on `document_chunks.embedding` (`vector_cosine_ops`, m=16, ef_construction=64) for faster similarity search. HNSW chosen over IVFFlat — no training step, better recall, suits incrementally growing data.

#### Project Metadata Indexing
- `useProjectMetadataEmbedding(projectId)` hook embeds the project's description and notes into the RAG pipeline whenever they change
- Embedding status tracked in two new `projects` columns: `description_embedding_status` and `notes_embedding_status` (same pending/processing/processed/failed values)
- `EmbeddingStatusBadge` shown in `ProjectDetails` and `DashboardTab` for both fields

### Semantic Coverage Assessment (`assess_coverage`)
- Lightweight RAG dry-run against all 19 BRS auto-generate sections — **no LLM calls**, only embedding + vector search
- Cost ~$0.001 per run (2 Voyage AI batch-embed calls + 19 DB vector searches)
- **Auto-triggered** (fire-and-forget) after every `embed_document` call in `LibrarySupportingFiles` and `useUserStories` — cached result stays fresh automatically
- Result cached in `rag_coverage_assessments` (upserted on each run); one row per (project_id, doc_type)
- `sections` JSONB: `[{ title, quality, chunkCount, avgSimilarity, topSources }]` — avgSimilarity is the full-chunk average; quality is derived from top-6 chunks
- `overall_score`: weighted average (high=1.0, medium=0.66, low=0.33, none=0)
- `chunk_count_at_assessment`: snapshot for staleness detection (frontend flags stale if delta > 2)
- **Realtime refresh**: `rag_coverage_assessments` is on Supabase Realtime; `useCoverageAssessment` subscribes to row changes and auto-refreshes the cached result — no manual polling needed
- **Staleness detection**: `useCoverageAssessment` computes `isStale` by comparing `chunkCountAtAssessment` vs current indexed count
- **Project Health panel** (DashboardTab): blended score = 40% checklist + 60% coverage; "View Details" button opens a modal with full per-section breakdown (all groups pre-expanded)
- **BRS creation modal** (ProjectDetails): replaces naive "X/5 materials" meter with semantic coverage bar + compact breakdown; syncs via `refetch()` when modal opens
- `useCoverageAssessment(projectId, docType, currentChunkCount)` → `{ assessment, loading, assessing, assessmentError, isStale, runAssessment, refetch }`
- `CoverageBreakdown` component: `compact` mode = stacked quality bar + legend; full mode = collapsible groups; `initialExpandAll` prop pre-expands all groups (used in modal)
- Deploy: `supabase functions deploy assess_coverage --no-verify-jwt`

### LLM Configuration (`llmConfig.ts`)
- Provider: **OpenRouter** (default), configurable via `LLM_PROVIDER` env var — `openai` for OpenAI-compatible (OpenRouter, Ollama, etc.), `anthropic` for Anthropic direct
- Default model: `deepseek/deepseek-chat-v3-0324` via OpenRouter — strong structured output, Bahasa Malaysia support, ~70% cheaper than Haiku
- **Per-function model override**: `LLM_MODEL_<FEATURE>` env var overrides model for a specific function (e.g. `LLM_MODEL_PROTOTYPE=google/gemini-2.5-flash-preview`). Use `getLlmConfigForFeature('feature')` in the function instead of `getLlmConfig()`
- `generate_prototype` uses `LLM_MODEL_PROTOTYPE` (default: `google/gemini-2.5-flash-preview`) — needs 16k+ output for multi-page HTML; DeepSeek V3 caps at 8K
- `auto_generate_document` diagram sections use `LLM_MODEL_DIAGRAM` — overrides model for erDiagram/sequenceDiagram sections; defaults to base model if unset
- `app_config` table supports runtime model overrides via `llm.model_override.*` keys — admin can change models without redeploying
- Embedding: Voyage AI (`voyage-3-lite`, 512 dimensions) via `VOYAGE_API_KEY`; Voyage AI does **not** accept a `dimensions` param in the request body (unlike OpenAI `text-embedding-3-small`)
- Per-content-type settings: tables (temp 0.2, 1500 tokens), diagrams (temp 0.2, 1800 tokens), text (temp 0.3, 2500 tokens)
- Typed interfaces: `LlmConfig`, `EmbeddingConfig` — passed through all helper functions
- Provider-abstraction helpers: `buildLlmHeaders`, `buildLlmEndpoint`, `buildLlmRequestBody`, `parseLlmResponse` — branch on `config.provider` to handle Anthropic vs OpenAI-compatible differences; `buildLlmHeaders` also injects OpenRouter-required `HTTP-Referer` and `X-Title` headers automatically
- `pipeAnthropicStream()`: translates Anthropic SSE events (`content_block_delta → delta.text`) into OpenAI-format SSE (`choices[0].delta.content`) — used by `generate_section` so the frontend SSE parser needs no changes
- Env vars: `OPENROUTER_API_KEY` (primary LLM key), `ANTHROPIC_API_KEY` (fallback for Anthropic direct), `VOYAGE_API_KEY` (embeddings) — see `supabase/.env.local.example`

## Collaboration
- `project_members` table: roles are `owner`, `editor`, `viewer`
- `ProjectContext` exposes `userRole`, `memberCount`, `ownerName` per project
- `useProjectMembers` hook: invite by email, remove member, update role
- Dashboard shows owner avatar, member count, role badges
- Real-time presence via `PresenceIndicator`

## Tiptap (Legacy — still in codebase for old content)
- Used only for rendering/exporting old `tiptap-v1` content
- `TiptapDocContent = { __format: 'tiptap-v1', doc: JSONContent }`
- `isLegacyContent()` checks for absence of `__format` key
- Do NOT add new Tiptap features; OO is the active editor

## Supabase Edge Functions — Deployment
```bash
supabase functions deploy generate_section --no-verify-jwt
supabase functions deploy auto_generate_document --no-verify-jwt
supabase functions deploy generate_prototype --no-verify-jwt
supabase functions deploy assess_coverage --no-verify-jwt
supabase functions deploy onlyoffice_callback
supabase functions deploy embed_document --no-verify-jwt
supabase functions deploy replace_section --no-verify-jwt
supabase functions deploy admin-users
supabase functions deploy admin-telemetry --no-verify-jwt
supabase secrets set ONLYOFFICE_CALLBACK_SECRET=... SUPABASE_SERVICE_ROLE_KEY=... \
  OPENROUTER_API_KEY=... VOYAGE_API_KEY=...
```

## Edge Function Auth Pattern
- All functions use `SUPABASE_SERVICE_ROLE_KEY` for DB/storage operations (bypasses RLS)
- **All SSE-streaming functions (`generate_section`, `auto_generate_document`, `generate_prototype`, `embed_document`) are deployed with `--no-verify-jwt`** — configured via `[functions.<name>] verify_jwt = false` in `supabase/config.toml`. These functions use the service role key internally and don't need the gateway to enforce JWT. The browser may have a stale or cross-project session token; gateway JWT enforcement would cause spurious 401s.
- `admin-telemetry` is also deployed with `verify_jwt = false` (supports `?mode=ping` unauthenticated health checks from the frontend)
- **Do NOT use `createClient` + `auth.getUser()` to resolve the caller** — this creates an extra round-trip that fails if `SUPABASE_ANON_KEY` is unavailable in the function env
- Instead, decode the JWT payload directly (for functions that need `userId`):
  ```typescript
  const token = req.headers.get('authorization')?.replace(/^bearer\s+/i, '') ?? ''
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  const userId = payload.sub  // decoded client-side; signature already verified by gateway (or trusted as-is when verify_jwt=false)
  ```

## Component Prop Contracts (non-obvious)
- `PresenceIndicator`: requires both `otherUsers` and `totalViewers` props
- `VersionHistory`: requires `currentVersion` prop and `onClose` prop (added in c78a6ce)
- `VersionViewer`: takes `docType: string`, `onRestore(version)` takes argument
- `CommentsSidebar`: requires `activeSectionIndex: number | null` and `onClose` prop (added in c78a6ce); uses styled section picker
- `AutoGenerateProgress`: modal component, receives project/doc IDs and streams progress
- `useConfirmDialog`: returns `{ dialog, notificationBanner, confirm, notify }` — render `dialog` and `notificationBanner` in JSX
- `EmbeddingStatusBadge`: accepts `status: string` — unified badge used by supporting files, user stories, and project metadata fields
- `CoverageBreakdown`: props `{ sections, loading?, compact?, initialExpandAll? }` — compact=true for modal summary bar; initialExpandAll=true pre-expands all groups (modal detail view)
- `useCoverageAssessment`: returns `{ assessment, loading, assessing, assessmentError, isStale, runAssessment, refetch }` — `refetch` does DB-only re-read (no edge function); auto-refreshes via Realtime subscription; call `refetch()` when opening the BRS modal to sync with DashboardTab
- `ProjectDetails`: uses URL search param `?tab=` for tab persistence; computes RAG readiness from indexed files + stories; calls `refetchCoverage()` when BRS template selected to sync with DashboardTab assessment
- `AIGeneratePanel`: accepts optional `onClose` callback; diagram format preference persisted via `idb-keyval`; `DiagramPreview` renders live inside the panel
- `ErrorBoundary`: class component; accepts optional `fallback: (error: Error) => ReactNode` render prop
- `UndoToast`: props `{ message, onUndo, onClose, durationMs? }` — durationMs defaults 8000; clears its own timer on Undo
- `CreateCRDialog`: modal; `onClose` + `onCreate(docId, title)` callbacks; inline error state
- `CRStatusBadge`: `status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'merged'`
- `useDocumentLock(docId)`: returns `{ lockedBy, lockedAt, isLocked }` live via Realtime postgres_changes
- `useProjectMetadataEmbedding(projectId)`: auto-triggers embed when project description/notes change; tracks per-field status
- `WorkspaceTab`: optional `onRefresh` prop — parent passes `refreshProjects` callback; component shows spinner button
- `Layout`: reads `trashedCount` from `ProjectContext` to drive the Trash sidebar badge

## UI Design Reference
The UI is being redesigned to closely mirror **CORRAD** (https://github.com/mfauzzury/corrad-laravel) — a Vue 3 + Laravel admin dashboard with a modern, gradient-forward aesthetic. Key design decisions to stay consistent with CORRAD:
- Sticky top header (40px height) + collapsible sidebar for navigation
- Six preset accent themes (violet/purple, blue, green, red, slate/black, grey)
- Neutral base (`bg-slate-50`, `text-slate-900`) with accent-driven emphasis
- Gradient text for page titles (`.page-title` utility class)
- All accent colours driven by CSS variables — never hardcoded Tailwind colour classes

## Theme System
- CSS variable-based accent theming defined in `src/index.css`
- Variables: `--accent-50` through `--accent-700`, `--accent-ring`
- Default theme: **violet**; options: violet, blue, green, red, slate, grey
- Applied via `data-theme-color` attribute on `document.documentElement` (e.g. `data-theme-color="blue"`)
- `useTheme()` hook in `Layout.tsx` reads/writes `localStorage('themeColor')` and syncs the attribute
- `.page-title` utility class in `index.css`: gradient text using accent CSS vars
- **All UI accent colors must use `var(--accent-*)` CSS variables** — never hardcode `purple-*` or `blue-*` Tailwind classes for brand/accent colours

## Coding Conventions
- TypeScript strict mode — zero errors required before committing
- Tailwind CSS for all styling; no CSS modules or styled-components
- Lucide React for icons
- Supabase client imported from `src/lib/supabase.ts` (singleton)
- Edge functions in `supabase/functions/<name>/index.ts` (Deno)
- Shared edge function modules in `supabase/functions/_shared/` (imported across functions)
- BRS document content uses Bahasa Malaysia (Malay); UI labels and prompts use English
- **React Fast Refresh**: never export non-component values (arrays, objects, constants) from component files — put them in `src/constants/` or `src/lib/` instead; mixing breaks HMR
- Do not auto-commit; do not force-push

## Server Setup
Two separate server environments exist:

- **Test/Client server** (self-hosted full stack — Docker, Coolify, tunnels, networking, credentials): see [SERVER-SETUP.md](./SERVER-SETUP.md)
- **Frontend deployment** (Coolify static build): see [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Production OnlyOffice server** (Oracle Cloud free tier ARM VM):
  - Public IP: `149.118.143.205`, port `8080`
  - Ubuntu 22.04, Docker, OnlyOffice Document Server (`JWT_ENABLED=false`)
  - SSH key: `~/.ssh/ssh-key-2026-04-02.key`, user `ubuntu`
  - Supabase: cloud project `hpjzwpocxuxqntuuqzbr` (ap-southeast-1)

## Behavioral Rules

### Verify-After-Complete (MANDATORY)
After finishing any implementation, task, or plan — ALWAYS run a verification step before declaring it done.

| Work Type | Verification |
|---|---|
| Code / feature | `npm run build` (type-check + build) |
| Edge function change | Re-read file; remind to deploy with `supabase functions deploy` |
| SQL migration | Check for missing RLS policies; confirm migration filename convention |
| Config change | Re-read config to confirm change landed |
| Git operation | `git status` to confirm clean state; `git log` to confirm commit |
| File edit | Re-read the file after editing to confirm the change is correct |
| Fact/data update | Grep for the OLD value (confirm absent everywhere) AND NEW value (confirm present) |

- **Don't assume it worked** — run the check.
- **End-to-end over unit** — the most important check is the final output the user would see.
- **Return to plan after interruptions** — after any side-task, check the todo list and resume.
- **Finish the current task before expanding scope** — note adjacent issues but don't detour mid-task.

### Diagnose-First (Before Any Fix)
Before writing any fix, always run these checks:

1. **Check git state** — `git status` (is the file missing due to an unstaged deletion?) and `git log --oneline -5` (was this already fixed?)
2. **Identify error source** — VSCode Problems panel vs terminal CLI vs runtime logs. Never treat a VSCode editor diagnostic as a CLI error without confirming.
3. **Check for existing suppression** — `.vscode/settings.json`, recent commits (`git log --grep=keyword`)
4. **Minimum viable diagnosis** — what is the simplest explanation that fits all evidence?

Only proceed with investigation and planning AFTER these checks pass.

### Plan-First (MANDATORY)
ALWAYS enter plan mode (`EnterPlanMode`) before making any non-trivial changes — even if the user doesn't ask.

- **Non-trivial** = modifies more than 1 file, adds new functionality, changes behavior, or touches configuration.
- **Trivial** (skip plan) = single-line typo fix, renaming a variable in one file.

Sequence: **Plan → User Review → Execute**.

### Verify-Before-Exit-Plan
Before calling `ExitPlanMode`, run these checks on your own plan:

1. **Count check** — if the plan says "N files modified", count them. Do the numbers match?
2. **Path check** — for every file path in the plan, verify it exists (`Read`/`Glob`) or is explicitly marked as "new file".
3. **Wiring check** — for every new file or feature, ask "who consumes this?" Read each consumer's actual code and confirm it can use the new thing.
4. **Policy check** — if the plan references any rule in `CLAUDE.md` or `MEMORY.md`, grep the source file and verify the actual text. Don't rely on memory.
5. **Completeness check** — for each item, trace its full lifecycle: creation → wiring → type-check → deploy (if edge function). Add missing steps, then re-run check #1.
6. **Stale value check** — when the plan updates a fact (count, version, date), grep the entire target file for the OLD value to catch stale copies elsewhere.
