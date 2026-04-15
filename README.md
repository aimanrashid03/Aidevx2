# Aidevx2

Web-based requirements engineering tool. Create, edit, and export standard requirement documents (BRS, URS, SRS, SDS) with real-time collaboration, AI-powered content generation with RAG, automatic full-document generation, versioning, and comments.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React
- **Document Editor:** ONLYOFFICE Document Server (hosted on Oracle Cloud ARM VM)
- **Backend / Database:** Supabase Cloud (Postgres + Auth + Storage + Edge Functions)
- **AI:** OpenRouter (`deepseek/deepseek-chat-v3-0324` default) via Supabase Edge Functions (streaming SSE) + RAG with Voyage AI `voyage-3-lite` embeddings
- **Diagrams:** Mermaid (client-side) + draw.io (via public viewer API)
- **Document Processing:** docx generation, mammoth (DOCX→HTML), PizZip (template manipulation)

## Deployment Architecture

> The primary setup uses **Supabase Cloud** and a **hosted OnlyOffice server**. Local Supabase is supported as an optional alternative for isolated development.

| Component | Where |
|---|---|
| Supabase (DB, Auth, Storage, Edge Functions) | Supabase Cloud — `hpjzwpocxuxqntuuqzbr` (ap-southeast-1) |
| OnlyOffice Document Server | Oracle Cloud ARM VM — `149.118.143.205:8080` |
| Frontend | Vite dev server / static build |

---

## Setup (Cloud — Primary)

### 1. Clone and install

```bash
git clone https://github.com/aimanrashid03/Aidevx2.git
cd Aidevx2
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the Supabase Cloud credentials and OnlyOffice server URL:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<cloud anon key>
VITE_ONLYOFFICE_SERVER_URL=http://149.118.143.205:8080
VITE_ONLYOFFICE_CALLBACK_SECRET=<matching secret>
VITE_ONLYOFFICE_CALLBACK_BASE_URL=https://<project-ref>.supabase.co
```

### 3. Configure edge function secrets

```bash
cp supabase/.env.local.example supabase/.env.local
```

Add your API keys to `supabase/.env.local`:

```
OPENROUTER_API_KEY=...
VOYAGE_API_KEY=...
ONLYOFFICE_CALLBACK_SECRET=...
```

### 4. Start the dev server

```bash
npm run dev
```

App runs at http://localhost:5173. It connects directly to Supabase Cloud and the hosted OnlyOffice server — no local Docker required.

### 5. (Optional) Serve edge functions locally

```bash
npm run functions
```

Starts the Supabase Edge Functions runtime locally. Required only if you want to test edge function changes without deploying to the cloud.

---

## Setup (Local Supabase — Optional)

Use this if you need a fully isolated local environment.

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| Docker Desktop | latest | https://docker.com/products/docker-desktop |
| Supabase CLI | latest | `npm i -g supabase` |
| Deno | 2.x | https://deno.com (required for `supabase functions serve`) |

```bash
supabase start         # Local Postgres, Auth, Storage, Kong (pulls ~2 GB images on first run)
supabase db reset      # Apply all migrations
docker compose up -d   # OnlyOffice at http://localhost:8080
npm run functions      # Edge functions locally
npm run dev
```

The `docker-compose.yml` places OnlyOffice on the `supabase_net` external network so the OO save callback can reach the local Supabase edge function runtime.

After `supabase db reset`, upload the document templates manually:

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

---

## Key Features

- **Multi-document support** — BRS (Bahasa Malaysia), URS, SRS, SDS templates with pre-defined section structures
- **AI section generation** — Generate individual sections with context from uploaded project files (RAG), supporting text, tables, and diagrams (Mermaid/draw.io), with live diagram preview
- **Full-document auto-generation** — Server-side pipeline that generates all sections of a BRS document end-to-end, with real-time progress streaming
- **Chat-based refinement** — Multi-turn conversation with AI to refine generated content with feedback
- **Real-time collaboration** — Project roles (owner/editor/viewer), member management, presence indicators
- **Version history** — DOCX snapshots with restore capability
- **Comments** — Section-level commenting sidebar
- **Project Library** — Per-project knowledge base with three sections:
  - *User Stories* — structured 7-section questionnaire, answers indexed into the RAG pipeline
  - *Supporting Files* — multi-file upload (txt/md/csv/docx/pdf) with per-file RAG indexing status
  - *Diagram Notes* — store Mermaid, draw.io, or freeform diagram references
- **Prototype Generation** — Generate a self-contained multi-page HTML/CSS front-end prototype from any workspace document; view source, copy, and run directly in the browser
- **Admin Dashboard** — Role-gated `/admin` section with platform stats, user management, LLM cost tracking, RAG index health, OnlyOffice status, feature flags, and audit log

## How It Works

1. Documents are stored as native `.docx` files in **Supabase Storage** (`documents` bucket).
2. The **OnlyOffice editor** loads the `.docx` directly from a Supabase Storage URL.
3. When a user saves, OnlyOffice POSTs the updated file to the **`onlyoffice_callback`** edge function, which writes the new `.docx` back to Storage.
4. The **AI generate** feature calls the **`generate_section`** edge function, which streams completions via SSE directly into the editor. The AI panel shows a live diagram preview for Mermaid and draw.io output.
5. Uploaded project files are chunked and embedded via the **`embed_document`** function, enabling RAG-powered context for AI generation. Each file tracks an `embedding_status` (pending → processing → processed / failed).
6. The **`auto_generate_document`** function generates a complete document server-side using template-based DOCX building with AI-generated content for all sections in parallel.
7. **User Stories** answers are also embedded into the RAG pipeline, giving the AI richer project context during generation.
8. **Prototype Generation** calls the **`generate_prototype`** edge function, which extracts the document, calls the LLM for a structured JSON model, assembles a CORRAD-design HTML prototype, and saves it to the DB.
9. The **Admin Dashboard** (role: `admin`) surfaces platform telemetry via the **`admin-telemetry`** edge function — OO health, embedding stats, LLM cost log, storage usage, and runtime feature flags.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run functions` | Serve edge functions locally |
| `npm run preview` | Preview production build |
| `npm run bundle:corrad` | Rebuild `_shared/corradDesign.ts` from `corrad-design/` assets |

---

## Deployment Notes

- Apply pending migrations to cloud: `supabase db push`
- Deploy edge functions:
  ```bash
  supabase functions deploy generate_section --no-verify-jwt
  supabase functions deploy auto_generate_document --no-verify-jwt
  supabase functions deploy generate_prototype --no-verify-jwt
  supabase functions deploy onlyoffice_callback
  supabase functions deploy embed_document --no-verify-jwt
  supabase functions deploy admin-users
  supabase functions deploy admin-telemetry --no-verify-jwt
  ```
- Set secrets for production:
  ```bash
  supabase secrets set \
    ONLYOFFICE_CALLBACK_SECRET=... \
    SUPABASE_SERVICE_ROLE_KEY=... \
    OPENROUTER_API_KEY=... \
    VOYAGE_API_KEY=...
  ```
- OnlyOffice runs with `JWT_ENABLED=false`; do not set `VITE_ONLYOFFICE_JWT_SECRET` unless you explicitly enable JWT on the OO server.

---

## License

Proprietary. All rights reserved.
