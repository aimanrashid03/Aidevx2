# Aidevx2 — CLAUDE.md

## Project Overview
**Aidevx** is a web-based requirements engineering tool for creating, editing, and exporting BRS, URS, SRS, and SDS documents. Features AI-powered content generation with RAG, real-time collaboration, and automatic full-document generation. Built with React 19, OnlyOffice Document Server, and Supabase.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Editor**: OnlyOffice Document Server (self-hosted via Docker) — replaced Tiptap WYSIWYG
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o (streaming SSE), text-embedding-3-small for RAG
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
    ProjectDetails.tsx           # Project detail — 5 tabs: Dashboard, Workspace, Library, Prototype, Collaborators
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
    project-tabs/
      DashboardTab.tsx           # Stats, doc progress, project health, quick actions, notes
      WorkspaceTab.tsx           # Requirement doc cards grid with status badges
      LibraryTab.tsx             # Orchestrates 3 sections: User Stories, Supporting Files, Diagram Notes
      LibraryUserStories.tsx     # Template questionnaire (7 groups), embeddable into RAG
      LibrarySupportingFiles.tsx # Multi-file upload with queue UI and per-file RAG status
      LibraryDiagramNotes.tsx    # Mermaid / draw.io / freeform diagram reference notes
      PrototypeTab.tsx           # [Experimental] Front-end prototype generator — localStorage-only, no backend
      CollaboratorsTab.tsx       # Thin wrapper around ProjectMembers
    Layout.tsx
    PresenceIndicator.tsx
    ProjectMembers.tsx           # Invite/remove/update members — header label: "Collaborators"
  context/
    AuthContext.tsx
    ProjectContext.tsx           # Projects + collaboration (userRole, memberCount, ownerName)
                                 # documents type: { id, name, path, embeddingStatus }[]
  hooks/
    useProjectMembers.ts         # Invite/remove/update members with role management
    useUserStories.ts            # CRUD + embedStory() for user_stories table
    useDiagramNotes.ts           # CRUD for diagram_notes table
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
supabase/
  functions/
    generate_section/            # Per-section AI generation (streaming SSE, chat mode, RAG)
    auto_generate_document/      # Full-document auto-generation (BRS) with progress streaming
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
- **JWT**: Disabled locally (`JWT_ENABLED=false`); enable + set `ONLYOFFICE_JWT_SECRET` in production

## AI Generation

### Per-Section Generation (`generate_section`)
- Streams OpenAI SSE responses for individual sections
- Supports all doc types: BRS, URS, SRS, SDS
- Content types: text, table, diagram (mermaid or draw.io format)
- Chat mode with multi-turn conversation history
- Refinement mode: accepts previous output + user feedback
- RAG-enhanced: uses embedded project documents as context
- `AIGeneratePanel` is the primary UI — supports doc type selection, document path picker, content type choice, source attribution display

### Full-Document Auto-Generation (`auto_generate_document`)
- Server-side pipeline that generates all auto-generate sections for a document
- Two-phase DOCX builder: template-based (preserves exact formatting) with from-scratch fallback
- Streams SSE progress events per section back to frontend
- `AutoGenerateProgress` modal shows real-time section completion status
- Currently supports BRS documents

### RAG Pipeline
- `embed_document` edge function chunks and embeds uploaded project files
- Dual-query embedding strategy (direct + template-aware) for better recall
- Structure-aware chunker: preserves heading boundaries, keeps tables intact
- Context quality assessment: none/low/medium/high
- Default config: match threshold 0.30, match count 18, embedding dimensions 1536

### LLM Configuration (`llmConfig.ts`)
- Model: `gpt-4o` (configurable via env vars)
- Per-content-type settings: tables (temp 0.2, 1500 tokens), diagrams (temp 0.2, 1800 tokens), text (temp 0.3, 2500 tokens)
- Supports custom endpoints for self-hosted models (Ollama, etc.)

## Collaboration
- `project_members` table: roles are `owner`, `editor`, `viewer`
- `ProjectContext` exposes `userRole`, `memberCount`, `ownerName` per project
- `useProjectMembers` hook: invite by email, remove member, update role
- Dashboard shows owner avatar, member count, role badges
- Real-time presence via `PresenceIndicator`
- UI label: "Collaborators" (not "Team Members") throughout the app

## ProjectDetails Tab Structure
Tabs in order: `dashboard` → `workspace` → `library` → `prototype` → `collaborators`

| Tab | Key | Description |
|-----|-----|-------------|
| Dashboard | `dashboard` | Stats cards, doc progress, project health, quick actions, internal notes |
| Workspace | `workspace` | Requirement doc cards (BRS/URS/SRS/SDS) with status badges |
| Library | `library` | User Stories + Supporting Files + Diagram Notes (last two side-by-side on lg screens) |
| Prototype | `prototype` | **Experimental** — client-side HTML/CSS prototype generator, no backend |
| Collaborators | `collaborators` | Member invite/remove/role management |

### Library Tab Sections
- **User Stories** — 7-section questionnaire (q1–q7), saved to `user_stories` table, embeddable into RAG
- **Supporting Files** — multi-file upload with queue UI; `embedding_status` tracked per file
- **Diagram Notes** — Mermaid / draw.io / freeform notes saved to `diagram_notes` table

### Prototype Tab (Experimental)
- No backend; prototypes stored in `localStorage` keyed by `aidevx_prototypes_{projectId}`
- Wizard: select a workspace document → simulated generation (progress steps) → auto-opens code viewer
- Code viewer: dark-themed, shows full `index.html` source, copy button, run (opens blob URL in new tab), delete
- `generatePrototypeHTML(docTitle, docType)` produces a self-contained HTML/CSS app mock tailored to doc type
- Full backend (persistence, versioning, real AI generation) planned for a future release

## Database Tables (added via migration `20260330000000_library_enhancements.sql`)
| Table | Purpose |
|-------|---------|
| `user_stories` | Project user story questionnaires; JSONB `responses` keyed q1–q7; `embedding_status` |
| `diagram_notes` | Diagram references per project; `diagram_type`: mermaid / drawio / freeform |
| `project_documents.embedding_status` | Added column: pending / processing / processed / failed |

Chunk cleanup: `trg_cleanup_chunks_on_doc_delete` BEFORE DELETE trigger on `project_documents` auto-removes orphaned `document_chunks` rows.

## Page Layout Convention
All top-level page containers use `px-6 py-6 font-sans` — **no** `max-w-*` constraint, content fills available width. Applies to: `Dashboard.tsx`, `DocumentRepository.tsx`, `ProjectDetails.tsx`.

## Tiptap (Legacy — still in codebase for old content)
- Used only for rendering/exporting old `tiptap-v1` content
- `TiptapDocContent = { __format: 'tiptap-v1', doc: JSONContent }`
- `isLegacyContent()` checks for absence of `__format` key
- Do NOT add new Tiptap features; OO is the active editor

## Supabase Edge Functions — Deployment
```bash
supabase functions deploy generate_section
supabase functions deploy auto_generate_document
supabase functions deploy onlyoffice_callback
supabase functions deploy embed_document
supabase secrets set ONLYOFFICE_CALLBACK_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
```

## Component Prop Contracts (non-obvious)
- `PresenceIndicator`: requires both `otherUsers` and `totalViewers` props
- `VersionHistory`: requires `currentVersion` prop; no `onClose`
- `VersionViewer`: takes `docType: string`, `onRestore(version)` takes argument
- `CommentsSidebar`: requires `activeSectionIndex: number | null`; no `onClose`
- `SectionTOC`: accepts `DocHeading[]` (not a Tiptap editor instance)
- `AutoGenerateProgress`: modal component, receives project/doc IDs and streams progress

## Coding Conventions
- TypeScript strict mode — zero errors required before committing
- Tailwind CSS for all styling; no CSS modules or styled-components
- Lucide React for icons
- Supabase client imported from `src/lib/supabase.ts` (singleton)
- Edge functions in `supabase/functions/<name>/index.ts` (Deno)
- Shared edge function modules in `supabase/functions/_shared/` (imported across functions)
- BRS documents use Bahasa Malaysia (Malay); SRS/SDS use English
- Do not auto-commit; do not force-push
