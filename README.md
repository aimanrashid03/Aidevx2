# Aidevx2

Web-based requirements engineering tool. Create, edit, and export standard requirement documents (BRS, URS, SRS, SDS) with versioning, comments, collaboration, and AI-assisted generation.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React
- **Document Editor:** ONLYOFFICE Document Server (self-hosted via Docker)
- **Backend / Database:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI:** OpenAI via Supabase Edge Functions (streaming SSE)
- **Export:** docx generation via `docx` library

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

## How It Works

1. Documents are stored as native `.docx` files in **Supabase Storage** (`documents` bucket).
2. The **OnlyOffice editor** loads the `.docx` directly from a public Supabase Storage URL.
3. When a user saves, OnlyOffice POSTs the updated file to the **`onlyoffice_callback`** edge function, which writes the new `.docx` back to Storage.
4. The **AI generate** feature calls the **`generate_section`** edge function, which streams OpenAI completions as SSE directly into the editor.

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
- Run `supabase functions deploy onlyoffice_callback generate_section` to deploy edge functions.
- Set `ONLYOFFICE_CALLBACK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` as Supabase secrets for production.

---

## License

Proprietary. All rights reserved.
