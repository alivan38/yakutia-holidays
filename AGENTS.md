# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

**Yakutia Holidays** (`yakutia-holidays`) is a public catalog of national holidays of Yakutia's peoples: React SPA + Express API + Directus CMS (SQLite). See `README.md` for full setup docs.

### Services

| Service | Port (from `.env`) | How to start |
|---------|-------------------|--------------|
| **Docker stack** (recommended) — Directus + API serving built frontend | Directus `8058`, site `8081`, API `5000` | `sudo docker compose up -d --build` |
| **Local dev** — Vite HMR + Express + Directus in Docker | Vite `5173`, API `5000`, Directus `8058` | `sudo docker compose up -d directus`, then `npm run setup:directus`, then `npm run dev` |

Copy `.env.example` → `.env` before first run. Default admin: `admin@yakutia.ru` / `admin123`.

### Docker in Cloud Agent VMs

Docker is not pre-installed. One-time VM setup (already done in snapshots when applicable):

1. Install Docker CE + compose plugin (requires `sudo`).
2. Configure `/etc/docker/daemon.json` with `"storage-driver": "fuse-overlayfs"`.
3. Use `iptables-legacy` / `ip6tables-legacy`.
4. Start daemon: `sudo dockerd > /tmp/dockerd.log 2>&1 &`

Use **`sudo docker compose`** (not bare `docker compose`) unless your user is in the `docker` group.

Health check after stack start: `curl http://localhost:8081/api/health`

### Common commands

| Task | Command |
|------|---------|
| Install deps | `npm install && npm run install:server` |
| Lint | `npm run lint` (has pre-existing errors in server Node globals and React hooks rules) |
| Build frontend | `npm run build` |
| Dev (local) | `npm run dev` |
| Docker up/down | `sudo docker compose up -d --build` / `sudo docker compose down` |
| Directus schema | `npm run setup:directus` (local) or auto on `api` container start |

There is no automated test suite (`npm test` is not defined).

### Gotchas

- **`DIRECTUS_TOKEN`** is required for local (non-Docker) API dev; Docker auto-creates `DIRECTUS_STATIC_TOKEN`.
- **`directus/database/data.db`** and **`directus/uploads/`** are runtime data — do not commit changes from normal app usage.
- **`VITE_API_URL`** must be empty in Docker (same-origin `/api`); set to `http://localhost:5000` for local Vite dev.
- SmartCaptcha keys are optional; forms work without them when `CAPTCHA_REQUIRED` is unset.
