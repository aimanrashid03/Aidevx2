# Deployment Guide — Aidevx2 (Company Server via Coolify)

This guide is for deploying the **frontend only** to a self-hosted company server (Coolify). Supabase and OnlyOffice remain on their existing hosts — you do **not** need to set those up.

## Architecture

| Component | Host | Managed by |
|---|---|---|
| Frontend (this repo) | Company server (Coolify) | You |
| Supabase (DB, Auth, Storage, Edge Functions) | Supabase Cloud — project `hpjzwpocxuxqntuuqzbr` (ap-southeast-1) | Already provisioned |
| OnlyOffice Document Server | Oracle Cloud VM — `149.118.143.205:8080` | Already provisioned |

The frontend is a **static SPA** (Vite build). No Node runtime is needed in production — just a static file server with SPA fallback.

## 1. Build

```bash
npm ci
npm run build
```

- Requires **Node 20+**
- Output directory: `dist/`
- Build must pass with zero TypeScript errors
- Chunk-size warnings during build are expected (mermaid + pdfjs bundled)

## 2. Environment Variables

Vite bakes env vars in at **build time**, not runtime. In Coolify, set these as **build-time** variables for the service:

```
VITE_SUPABASE_URL=https://hpjzwpocxuxqntuuqzbr.supabase.co
VITE_SUPABASE_ANON_KEY=<ask the project owner>
VITE_ONLYOFFICE_SERVER_URL=http://149.118.143.205:8080
VITE_ONLYOFFICE_CALLBACK_SECRET=<ask the project owner — must match the OO server secret>
```

**Do NOT set `VITE_ONLYOFFICE_JWT_SECRET`.** The OnlyOffice server runs with `JWT_ENABLED=false`; adding this var will break the editor.

If you change any env var, you must **rebuild** — restarting the container is not enough.

## 3. Serve Configuration (SPA fallback)

The app uses React Router v7 (client-side routing). The server must serve `index.html` for any path that doesn't match a static file, otherwise deep links (e.g. `/editor/:projectId/:templateId`) return 404.

### Option A — Coolify "Static" build pack
Coolify's static preset handles SPA fallback automatically. Point it at `dist/` as the publish directory.

### Option B — Nginx
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Option C — Caddy
```
try_files {path} /index.html
file_server
```

### Option D — Dockerfile (if Coolify needs one)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

`nginx.conf`:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 4. HTTPS / Mixed Content (important)

If the frontend is served over **HTTPS**, browsers will block the OnlyOffice iframe because it loads from **HTTP** (`http://149.118.143.205:8080`). This will break the editor entirely.

Pick one:

1. **Put OnlyOffice behind HTTPS** (recommended) — add a reverse proxy + Let's Encrypt cert on the Oracle VM, update `VITE_ONLYOFFICE_SERVER_URL` to the HTTPS URL, and rebuild. Requires coordination with whoever maintains the OO VM.
2. **Serve the frontend over HTTP** — not recommended; Supabase Auth and modern browser features degrade.

Flag this with the project owner **before** go-live.

## 5. Supabase Cloud — Post-Deploy Configuration

Once the final production URL is known, the project owner must add it to Supabase:

- **Dashboard → Authentication → URL Configuration**
  - Site URL: `https://<your-domain>`
  - Redirect URLs: add `https://<your-domain>/**`

Without this, email magic links and OAuth redirects will fail.

## 6. OnlyOffice — Reachability Check

The OO server URL is loaded **client-side** (in the user's browser), not server-to-server. Verify that end users on the company network can reach `http://149.118.143.205:8080/` — if the company firewall blocks outbound traffic to that IP, the editor won't load.

## 7. What You Do NOT Need

- Docker Compose (`docker-compose.yml` is for local dev only)
- Local Supabase (`supabase start`, `supabase db reset`)
- Manual template upload (`public/templates/*.docx` — cloud bucket already has them)
- `supabase/.env.local.example` (local dev only)
- Access to the OnlyOffice VM (unless enabling HTTPS)

## 8. Items to Request from the Project Owner

- [ ] `VITE_SUPABASE_ANON_KEY` value
- [ ] `VITE_ONLYOFFICE_CALLBACK_SECRET` value
- [ ] Confirmation of final production domain (for Supabase Auth config)
- [ ] Decision on HTTPS for OnlyOffice (see section 4)
- [ ] (Optional) Supabase Cloud access, only if you need to deploy edge functions or run migrations

## 9. Smoke Test Checklist

After first deploy:

- [ ] App loads at the production URL
- [ ] Sign up / sign in works (email magic link arrives and redirects correctly)
- [ ] Dashboard lists projects
- [ ] Opening a document loads the OnlyOffice editor (no mixed-content errors in devtools console)
- [ ] Editing a document and closing it triggers a save (check `documents` bucket for a new version)
- [ ] AI Generate panel streams a response for a section
- [ ] Deep link (e.g. paste `/editor/<id>/<id>` directly into address bar) loads without 404

## 10. Reference

- Project CLAUDE.md — architecture, edge functions, migrations, design system
- Supabase project: `hpjzwpocxuxqntuuqzbr` (ap-southeast-1)
- OnlyOffice server: `149.118.143.205:8080` (Oracle Cloud VM, `JWT_ENABLED=false`)
