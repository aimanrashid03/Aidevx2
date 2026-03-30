# Aidevx2

Web-based requirements engineering tool. Create, edit, and export standard requirement documents (BRS, URS, SRS, SDS) with real-time collaboration, AI-powered content generation with RAG, automatic full-document generation, versioning, and comments.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React
- **Document Editor:** ONLYOFFICE Document Server (self-hosted via Docker)
- **Backend / Database:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI:** OpenAI GPT-4o via Supabase Edge Functions (streaming SSE) + RAG with text-embedding-3-small
- **Diagrams:** Mermaid (client-side) + draw.io (via public viewer API)
- **Document Processing:** docx generation, mammoth (DOCX→HTML), PizZip (template manipulation)

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| Docker Desktop | latest | https://docker.com/products/docker-desktop |
| Supabase CLI | latest | `npm i -g supabase` |
| Deno | 2.x | https://deno.com (required for `supabase functions serve`) |

## Local Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/aimanrashid03/Aidevx2.git
cd Aidevx2
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The `.env` file ships with local Supabase defaults pre-filled. You only need to change values if you're connecting to a cloud Supabase project.

### 3. Configure edge function secrets

```bash
cp supabase/.env.local.example supabase/.env.local
```

Edit `supabase/.env.local` and add your **OpenAI API key**. This is required for the AI generate feature.

### 4. Start local Supabase

```bash
supabase start
```

This starts a local Postgres database, Auth, Storage, and Kong API gateway inside Docker. On first run it pulls ~2 GB of images.

### 5. Start OnlyOffice Document Server

```bash
docker compose up -d
```

OnlyOffice will be available at http://localhost:8080. Wait ~30 seconds for it to become healthy before opening documents.

> **Note:** OnlyOffice and Supabase must be on the same Docker network so the callback works. The `docker-compose.yml` already configures this via the `supabase_net` external network.

### 6. Start the dev server

```bash
npm run dev
```

App runs at http://localhost:5173.

### 7. (Optional) Serve edge functions locally

```bash
npm run functions
```

Starts the Supabase Edge Functions runtime locally. Required if you want AI generation to work without deploying to the cloud.

---

## Key Features

- **Multi-document support** — BRS (Bahasa Malaysia), URS, SRS, SDS templates with pre-defined section structures
- **AI section generation** — Generate individual sections with context from uploaded project files (RAG), supporting text, tables, and diagrams (Mermaid/draw.io)
- **Full-document auto-generation** — Server-side pipeline that generates all sections of a BRS document end-to-end, with real-time progress streaming
- **Chat-based refinement** — Multi-turn conversation with AI to refine generated content with feedback
- **Real-time collaboration** — Project roles (owner/editor/viewer), member management, presence indicators
- **Version history** — DOCX snapshots with restore capability
- **Comments** — Section-level commenting sidebar
- **Project Library** — Per-project knowledge base with three sections:
  - *User Stories* — structured 7-section questionnaire, answers indexed into the RAG pipeline
  - *Supporting Files* — multi-file upload (txt/md/csv/docx/pdf) with per-file RAG indexing status
  - *Diagram Notes* — store Mermaid, draw.io, or freeform diagram references
- **Prototype Generation** *(Experimental)* — Generate a self-contained HTML/CSS front-end prototype from any workspace document; view source, copy, and run directly in the browser

## How It Works

1. Documents are stored as native `.docx` files in **Supabase Storage** (`documents` bucket).
2. The **OnlyOffice editor** loads the `.docx` directly from a public Supabase Storage URL.
3. When a user saves, OnlyOffice POSTs the updated file to the **`onlyoffice_callback`** edge function, which writes the new `.docx` back to Storage.
4. The **AI generate** feature calls the **`generate_section`** edge function, which streams OpenAI completions as SSE directly into the editor.
5. Uploaded project files are chunked and embedded via the **`embed_document`** function, enabling RAG-powered context for AI generation. Each file tracks an `embedding_status` (pending → processing → processed / failed).
6. The **`auto_generate_document`** function generates a complete document server-side using template-based DOCX building with AI-generated content.
7. **User Stories** answers are also embedded into the RAG pipeline, giving the AI richer project context during generation.
8. **Prototype Generation** runs entirely client-side — a built-in HTML/CSS template is rendered based on the selected document type and stored in `localStorage`. No backend call is made.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run functions` | Serve edge functions locally |
| `npm run preview` | Preview production build |

---

## Deployment Notes

- Set `JWT_ENABLED=true` and `ONLYOFFICE_JWT_SECRET` in `docker-compose.yml` for production.
- Run `supabase db push` to apply database migrations to your cloud project.
- Deploy edge functions:
  ```bash
  supabase functions deploy generate_section
  supabase functions deploy auto_generate_document
  supabase functions deploy onlyoffice_callback
  supabase functions deploy embed_document
  ```
- Set secrets for production:
  ```bash
  supabase secrets set ONLYOFFICE_CALLBACK_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
  ```

---

## License

Proprietary. All rights reserved.
