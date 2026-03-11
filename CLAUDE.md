# Aidevx2 — CLAUDE.md

## Project Overview
**Aidevx** is a web-based requirements engineering tool for creating, editing, and exporting BRS, URS, SRS, and SDS documents. Built with React 19, OnlyOffice Document Server, and Supabase.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Editor**: OnlyOffice Document Server (self-hosted via Docker) — replaced Tiptap WYSIWYG
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **Document processing**: mammoth (DOCX→HTML), docx (DOCX generation), docx-preview
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
    ProjectDetails.tsx           # Project detail + document list
    Dashboard.tsx
    AddProject.tsx
    DocumentRepository.tsx
    AdminDashboard.tsx
  components/
    document-editor/
      OnlyOfficeEditor.tsx       # OO iframe wrapper
      AIGeneratePanel.tsx        # Slide-in AI generation panel (fallback)
      SectionTOC.tsx             # TOC sidebar — accepts DocHeading[] from mammoth
      VersionHistory.tsx
      VersionViewer.tsx          # Dual-path: docx-preview (OO) or legacy block renderer
      CommentsSidebar.tsx
    Layout.tsx
    PresenceIndicator.tsx
  context/
    AuthContext.tsx
    ProjectContext.tsx
  lib/
    onlyoffice/
      documentService.ts         # OO config builder, storage URL helpers
      extractSections.ts         # mammoth → DocHeading[] from DOCX
      docModeDetector.ts         # detectDocMode(): 'onlyoffice' | 'tiptap-v1' | 'legacy'
    export/
      docxBuilder.ts             # DOCX export for blank/non-URS docs
      ursDocxTemplate.ts         # Legal-format URS DOCX export
  tiptap/
    converters/
      legacyToTiptap.ts          # Legacy block[] → Tiptap JSON migration (content only)
      tiptapToDocx.ts            # Tiptap JSON → docx nodes (async)
      htmlStringToTiptapNodes.ts # HTML string → Tiptap nodes (with table support)
  constants/
    urs_structure.ts             # DocSection[] template structure
supabase/
  functions/
    generate_section/            # Streams AI text via OpenAI SSE
    onlyoffice_callback/         # OO save callback — rotates documentKey
    embed_document/
    admin-users/
  migrations/
public/
  templates/URS.docx             # URS template loaded on new URS document creation
  onlyoffice-plugins/
    ai-generate/                 # OO plugin: config.json + index.html
      config.json                # guid: asc.aidevx2-ai-generate-v1
      index.html                 # Reads sessionStorage keys, streams from generate_section
```

## Document Storage Model
- Documents are stored as native `.docx` files in Supabase Storage (`documents` bucket)
- `doc.storagePath` — path in storage bucket
- `docPublicUrl` — Supabase public URL used by OO editor and TOC extraction
- `documentKey` — unique per-save string for OO cache-busting; rotated by `onlyoffice_callback`

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
- Edge function `generate_section` streams OpenAI SSE (`stream: true`)
- System prompt: plain text paragraphs (no HTML tags)
- Plugin reads `sessionStorage`: `aidevx_supabase_url`, `aidevx_anon_key`, `aidevx_project_id`
- `DocumentEditor` writes those keys in a `useEffect([projectId])`
- OO plugin inserts generated text via `PasteHtml` executeMethod
- `AIGeneratePanel` (slide-in component) is a fallback triggered by TOC sparkle buttons

## Tiptap (Legacy — still in codebase for old content)
- Used only for rendering/exporting old `tiptap-v1` content
- `TiptapDocContent = { __format: 'tiptap-v1', doc: JSONContent }`
- `isLegacyContent()` checks for absence of `__format` key
- Do NOT add new Tiptap features; OO is the active editor

## Supabase Edge Functions — Deployment
```bash
supabase functions deploy generate_section
supabase functions deploy onlyoffice_callback
supabase secrets set ONLYOFFICE_CALLBACK_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
```

## Component Prop Contracts (non-obvious)
- `PresenceIndicator`: requires both `otherUsers` and `totalViewers` props
- `VersionHistory`: requires `currentVersion` prop; no `onClose`
- `VersionViewer`: takes `docType: string`, `onRestore(version)` takes argument
- `CommentsSidebar`: requires `activeSectionIndex: number | null`; no `onClose`
- `SectionTOC`: accepts `DocHeading[]` (not a Tiptap editor instance)

## Coding Conventions
- TypeScript strict mode — zero errors required before committing
- Tailwind CSS for all styling; no CSS modules or styled-components
- Lucide React for icons
- Supabase client imported from `src/lib/supabase.ts` (singleton)
- Edge functions in `supabase/functions/<name>/index.ts` (Deno)
- Do not auto-commit; do not force-push
