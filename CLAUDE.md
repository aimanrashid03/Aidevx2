# Aidevx2 — CLAUDE.md

## Project Overview
**Aidevx** is a web-based requirements engineering tool for creating, editing, and exporting BRS, URS, SRS, and SDS documents. Features AI-powered content generation with RAG, real-time collaboration, and automatic full-document generation. Built with React 19, OnlyOffice Document Server, and Supabase.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Editor**: OnlyOffice Document Server (self-hosted via Docker) — replaced Tiptap WYSIWYG
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI**: Anthropic Claude Haiku (streaming SSE), Voyage AI voyage-3-lite for RAG embeddings
- **Document processing**: mammoth (DOCX→HTML), docx (DOCX generation), docx-preview, PizZip (template manipulation)
- **Diagrams**: Mermaid (client-side rendering), draw.io (via public viewer API)
- **Routing**: React Router v7

## Commands
```bash
npm run dev          # Start Vite dev server
npm run build        # Type-check + build (tsc -b && vite build)
npm run lint         # ESLint
npm run functions    # Serve Supabase edge functions locally (no JWT verify)
```

Build must pass with **zero TypeScript errors**. Chunk size warnings are expected (mermaid + pdfjs + tiptap in bundle).

## Project Structure
```
src/
  App.tsx                        # Routes
  pages/
    DocumentEditor.tsx           # Main editor page — route /editor/:projectId/:templateId
    ProjectDetails.tsx           # Project detail + document list (with collaboration)
    Dashboard.tsx                # Project list with owner/member info
    AddProject.tsx
    DocumentRepository.tsx
    AdminDashboard.tsx
  components/
    document-editor/
      OnlyOfficeEditor.tsx       # OO iframe wrapper
      AIGeneratePanel.tsx        # Slide-in AI panel: multi-doc-type, chat mode, RAG, diagrams
      AutoGenerateProgress.tsx   # Modal UI for full-document auto-generation progress
      SectionTOC.tsx             # TOC sidebar — accepts DocHeading[] from mammoth
      VersionHistory.tsx
      VersionViewer.tsx          # Dual-path: docx-preview (OO) or legacy block renderer
      CommentsSidebar.tsx
    ConfirmDialog.tsx              # Reusable confirm modal (danger/default variants)
    EmbeddingStatusBadge.tsx      # Unified RAG indexing status badge (pending/processing/processed/failed)
    ProjectMembers.tsx            # Collaborator management UI (invite, remove, role change)
    Layout.tsx                       # Sticky top header (logo, user avatar, theme picker, logout) — no sidebar
    PresenceIndicator.tsx
    project-tabs/
      DashboardTab.tsx
      WorkspaceTab.tsx
      LibraryTab.tsx               # Tabbed container for supporting files, user stories, diagrams
      LibrarySupportingFiles.tsx   # File upload, embedding, download, delete
      LibraryUserStories.tsx       # User story template CRUD with auto-indexing
      LibraryDiagramNotes.tsx      # Diagram note CRUD
      CollaboratorsTab.tsx
      PrototypeTab.tsx
  context/
    AuthContext.tsx
    ProjectContext.tsx           # Projects + collaboration (userRole, memberCount, ownerName)
  hooks/
    useProjectMembers.ts         # Invite/remove/update members with role management
    useUserStories.ts            # User story CRUD + RAG embedding + chunk cleanup on delete
    useDiagramNotes.ts           # Diagram note CRUD
    useConfirmDialog.ts          # Promise-based confirm dialog + toast notification hook
  lib/
    onlyoffice/
      documentService.ts         # OO config builder, template registry, storage URL helpers
      extractSections.ts         # mammoth → DocHeading[] from DOCX
      docModeDetector.ts         # detectDocMode(): 'onlyoffice' | 'tiptap-v1' | 'legacy'
    ai/
      sectionContext.ts          # Extracts section context from doc structures (fuzzy matching)
      diagramRenderer.ts         # Mermaid → base64 PNG (via canvas)
      drawioRenderer.ts          # draw.io XML → base64 PNG (via public viewer API)
    export/
      docxBuilder.ts             # DOCX export for blank/non-URS docs
      ursDocxTemplate.ts         # Legal-format URS DOCX export
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
    auto_generate_document/      # Full-document auto-generation (BRS) with progress streaming
    generate_prototype/          # UI prototype generation from requirement docs (SSE progress events)
    onlyoffice_callback/         # OO save callback — rotates documentKey
    embed_document/              # Document embedding for RAG pipeline
    admin-users/
    _shared/
      ragHelper.ts               # RAG pipeline: dual-query embedding, dedup, quality assessment
      promptBuilder.ts           # System/user prompt construction for auto-generate mode
      llmConfig.ts               # Environment-based LLM/embedding config (model, temp, tokens)
      chunker.ts                 # Structure-aware text splitter with heading/table detection
      markdownToOoxml.ts         # Markdown → raw OOXML fragments (preserves template styles)
      docxTemplateBuilder.ts     # Template-based DOCX builder (PizZip, preserves formatting)
      docxServerBuilder.ts       # From-scratch DOCX builder (markdown → docx library nodes)
      docxTextExtractor.ts       # DOCX → plaintext extractor (PizZip, strips XML) for LLM prompts
      brsStructure.ts            # Server-side BRS structure with autoGenerate flags
      brsExamples.ts             # Few-shot examples for BRS generation
      srsExamples.ts             # Few-shot examples for SRS generation
      sdsExamples.ts             # Few-shot examples for SDS generation
      ursExamples.ts             # Few-shot examples for URS generation
  migrations/
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
- **Local setup**: bucket is created by migration `20260305000001_create_documents_bucket.sql`; templates must be uploaded manually after `supabase db reset`:
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
- **Local**: `docker compose up -d` → OO at `http://localhost:8080`
- **Env vars** (in `.env`):
  - `VITE_ONLYOFFICE_SERVER_URL=http://localhost:8080`
  - `VITE_ONLYOFFICE_CALLBACK_SECRET=aidevx-oo-callback-secret-change-in-prod`
- **JWT**: Disabled locally (`JWT_ENABLED=false`); production OO server also runs with `JWT_ENABLED=false`
- **OO JWT signing** (`config.token`): only performed if `VITE_ONLYOFFICE_JWT_SECRET` is set in `.env` — this must match `JWT_SECRET` on the OO server. Leave unset when `JWT_ENABLED=false`. Do NOT use `VITE_ONLYOFFICE_CALLBACK_SECRET` for this — they are separate concerns.

## AI Generation

### Per-Section Generation (`generate_section`)
- Streams SSE responses; Anthropic SSE is translated to OpenAI-compatible format via `pipeAnthropicStream()` so the frontend stays unchanged
- Supports all doc types: BRS, URS, SRS, SDS
- Content types: text, table, diagram (mermaid or draw.io format)
- Chat mode with multi-turn conversation history
- Refinement mode: accepts previous output + user feedback
- RAG-enhanced: uses embedded project documents as context
- `AIGeneratePanel` is the primary UI — supports doc type selection, document path picker, content type choice, source attribution display

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

### RAG Pipeline
- `embed_document` edge function chunks and embeds uploaded project files
- Dual-query embedding strategy (direct + template-aware) for better recall
- `embedBatch()` in `ragHelper.ts`: batch-embeds N queries in a single Voyage AI API call — used by auto-generate to reduce 40 individual calls to 2
- `performRagWithEmbeddings()` in `ragHelper.ts`: search-only variant that accepts pre-computed embeddings, skipping the embed step
- Structure-aware chunker: preserves heading boundaries, keeps tables intact
- Context quality assessment: none/low/medium/high
- Default config: match threshold 0.30, match count 18, embedding dimensions 512
- **DB migration** `20260401000000_voyage_embeddings.sql`: resizes pgvector column from 1536d → 512d, truncates `document_chunks`, resets `embedding_status → pending`. All documents must be re-embedded after applying this migration.
- **DB migration** `20260402100000_add_embedding_index.sql`: adds HNSW index on `document_chunks.embedding` (`vector_cosine_ops`, m=16, ef_construction=64) for faster similarity search. HNSW chosen over IVFFlat — no training step, better recall, suits incrementally growing data.

### LLM Configuration (`llmConfig.ts`)
- Provider: **OpenRouter** (default), configurable via `LLM_PROVIDER` env var — `openai` for OpenAI-compatible (OpenRouter, Ollama, etc.), `anthropic` for Anthropic direct
- Default model: `deepseek/deepseek-chat-v3-0324` via OpenRouter — strong structured output, Bahasa Malaysia support, ~70% cheaper than Haiku
- **Per-function model override**: `LLM_MODEL_<FEATURE>` env var overrides model for a specific function (e.g. `LLM_MODEL_PROTOTYPE=google/gemini-2.5-flash-preview`). Use `getLlmConfigForFeature('feature')` in the function instead of `getLlmConfig()`
- `generate_prototype` uses `LLM_MODEL_PROTOTYPE` (default: `google/gemini-2.5-flash-preview`) — needs 16k+ output for multi-page HTML; DeepSeek V3 caps at 8K
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
supabase functions deploy onlyoffice_callback
supabase functions deploy embed_document --no-verify-jwt
supabase secrets set ONLYOFFICE_CALLBACK_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
```

## Edge Function Auth Pattern
- All functions use `SUPABASE_SERVICE_ROLE_KEY` for DB/storage operations (bypasses RLS)
- **All SSE-streaming functions (`generate_section`, `auto_generate_document`, `generate_prototype`, `embed_document`) are deployed with `--no-verify-jwt`** — configured via `[functions.<name>] verify_jwt = false` in `supabase/config.toml`. These functions use the service role key internally and don't need the gateway to enforce JWT. The browser may have a stale or cross-project session token; gateway JWT enforcement would cause spurious 401s.
- **Do NOT use `createClient` + `auth.getUser()` to resolve the caller** — this creates an extra round-trip that fails if `SUPABASE_ANON_KEY` is unavailable in the function env
- Instead, decode the JWT payload directly (for functions that need `userId`):
  ```typescript
  const token = req.headers.get('authorization')?.replace(/^bearer\s+/i, '') ?? ''
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  const userId = payload.sub  // decoded client-side; signature already verified by gateway (or trusted as-is when verify_jwt=false)
  ```

## Component Prop Contracts (non-obvious)
- `PresenceIndicator`: requires both `otherUsers` and `totalViewers` props
- `VersionHistory`: requires `currentVersion` prop; no `onClose`
- `VersionViewer`: takes `docType: string`, `onRestore(version)` takes argument
- `CommentsSidebar`: requires `activeSectionIndex: number | null`; no `onClose`
- `SectionTOC`: accepts `DocHeading[]` (not a Tiptap editor instance)
- `AutoGenerateProgress`: modal component, receives project/doc IDs and streams progress
- `useConfirmDialog`: returns `{ dialog, notificationBanner, confirm, notify }` — render `dialog` and `notificationBanner` in JSX
- `EmbeddingStatusBadge`: accepts `status: string` — unified badge used by both supporting files and user stories
- `ProjectDetails`: uses URL search param `?tab=` for tab persistence; computes RAG readiness from indexed files + stories

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
- **Production OnlyOffice server** (Oracle Cloud free tier ARM VM):
  - Public IP: `149.118.143.205`, port `8080`
  - Ubuntu 22.04, Docker, OnlyOffice Document Server (`JWT_ENABLED=false`)
  - SSH key: `~/.ssh/ssh-key-2026-04-02.key`, user `ubuntu`
  - Supabase: cloud project `hpjzwpocxuxqntuuqzbr` (ap-southeast-1)
