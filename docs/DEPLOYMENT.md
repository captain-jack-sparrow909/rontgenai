# Deployment guide — Röntgen AI

Target architecture:

| Piece | Host | URL (recommended) |
|-------|------|-------------------|
| Web (Next.js) | **Vercel** | `https://rontgenai.dev` |
| API (Fastify) | **Render web service** | `https://api.rontgenai.dev` |
| AI jobs | **Render background worker** | private process |
| DB | **Supabase** | existing project |
| Auth | **Clerk** | Production instance + custom domain |
| Files | **Cloudflare R2** | existing bucket |
| AI | **DeepSeek** | API key |

Config files in repo:

- `web/vercel.json`
- `render.yaml` (api-gateway)
- `web/.env.production.example`
- `api-gateway/.env.production.example`

---

## 0. Prerequisites

- [ ] Supabase schema applied (`supabase/APPLY_IN_DASHBOARD.sql`)
- [ ] Clerk **Production** keys work for `rontgenai.dev` (Frontend API DNS done)
- [ ] GitHub repo(s) pushed (recommend separate `web` and `api-gateway` remotes, or monorepo with rootDir)
- [ ] Accounts: Vercel, Render

**Repo layout note:** This workspace has both apps under one folder. Options:

1. **Monorepo (simplest):** one GitHub repo; Vercel Root Directory = `web`; Render Root Directory = `api-gateway`
2. **Split remotes:** push `web/` and `api-gateway/` to separate GitHub repos

---

## 1. Deploy API (Render)

### 1.1 Create Web Service

1. [Render Dashboard](https://dashboard.render.com) → **New → Web Service**
2. Connect the GitHub repo
3. Settings:

| Field | Value |
|-------|--------|
| Root Directory | `api-gateway` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance | Free (or Starter) |
| Health Check Path | `/health` |

Or use **Blueprint**: connect repo with `render.yaml` at root.

### 1.2 Environment variables

Copy from `api-gateway/.env.production.example` and fill from your local `.env` (production Clerk secrets, etc.).

**Required minimum:**

```text
NODE_ENV=production
PORT=10000
APP_URL=https://rontgenai.dev
CORS_ORIGINS=https://rontgenai.dev,https://www.rontgenai.dev
CLERK_SECRET_KEY=sk_live_...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
DEEPSEEK_API_KEY=...
KEEPALIVE_CRON_SECRET=<random-secret-of-at-least-32-characters>
```

**Required for hardened production:** a separate worker, R2, Upstash, Sentry,
and signed Clerk/GitHub/Paddle webhooks. `render.yaml` declares both Render
services.

### 1.3 Custom domain for API

1. Render → service → **Settings → Custom Domains** → `api.rontgenai.dev`
2. DNS (Spaceship or your registrar):

| Type | Name | Target |
|------|------|--------|
| CNAME | `api` | `rontgenai-api.onrender.com` (use value Render shows) |

3. Wait for TLS certificate on Render.

### 1.4 Verify API

```bash
curl https://api.rontgenai.dev/health
# {"ok":true,"service":"api-gateway",...}
curl https://api.rontgenai.dev/ready
# HTTP 200 with database/Redis checks
```

### 1.5 Keep the free API and database active

After applying `supabase/migrations/20260731_000007_keepalive.sql`, create a
cron-job.org job with these settings:

| Field | Value |
|-------|-------|
| URL | `https://api.rontgenai.dev/v1/keepalive` |
| Schedule | Every 13 minutes (`*/13 * * * *`) |
| Method | `GET` |
| Header | `Authorization: Bearer <KEEPALIVE_CRON_SECRET>` |

Use the same secret in cron-job.org and the Render web service, then redeploy
the service. Do not put the secret in the URL. A successful response alternates
between `database.action: "inserted"` and `database.action: "deleted"`:

```bash
# Generate once, then save this value in both Render and cron-job.org.
openssl rand -hex 32

curl --fail \
  --header "Authorization: Bearer $KEEPALIVE_CRON_SECRET" \
  https://api.rontgenai.dev/v1/keepalive
```

The maintenance table is isolated from product data, protected by RLS, and the
toggle runs under a database transaction lock so concurrent calls remain safe.

---

## 2. Deploy Web (Vercel)

### 2.1 Create project

1. [Vercel](https://vercel.com) → **Add New Project** → import GitHub repo
2. Settings:

| Field | Value |
|-------|--------|
| Framework | Next.js |
| Root Directory | `web` |
| Build | `npm run build` |
| Install | `npm install` |
| Output | (default) |

### 2.2 Environment variables

From `web/.env.production.example`. Critical:

```text
NEXT_PUBLIC_APP_URL=https://rontgenai.dev
NEXT_PUBLIC_API_URL=https://api.rontgenai.dev

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_...
```

Redeploy after setting env (or enable “Redeploy” on env save).

### 2.3 Domain

1. Vercel → Project → **Settings → Domains**
2. Add `rontgenai.dev` and `www.rontgenai.dev`
3. DNS:

| Type | Name | Target |
|------|------|--------|
| A / CNAME | `@` | per Vercel instructions |
| CNAME | `www` | `cname.vercel-dns.com` (or as shown) |

4. Clerk Dashboard → Production → Allowed origins / redirect URLs:

```text
https://rontgenai.dev
https://www.rontgenai.dev
https://rontgenai.dev/sign-in
https://rontgenai.dev/sign-up
https://rontgenai.dev/app
```

---

## 3. Cross-service checklist

| Check | Action |
|-------|--------|
| CORS | API `CORS_ORIGINS` includes production site origin(s) |
| Clerk | Production keys on **both** web + API; domain allowlist |
| API URL | Web `NEXT_PUBLIC_API_URL` points at public Render URL |
| Webhooks (later) | Paddle → `https://api.rontgenai.dev/v1/webhooks/paddle` |
| GitHub App (later) | Webhook → `https://api.rontgenai.dev/v1/webhooks/github` |
| R2 CORS | If browser ever hits R2 directly, allow rontgenai.dev (currently server-side only) |

---

## 4. Smoke test (production)

1. Open `https://rontgenai.dev` — landing loads  
2. Sign up / sign in (Clerk production)  
3. `/app` — dashboard loads; usage numbers appear (API reachable)  
4. Blueprint — short architecture text → review succeeds  
5. Pulse — tiny CSV → session works  
6. (Optional) Atlas public repo map  

---

## 5. Free-tier notes

| Service | Caveat |
|---------|--------|
| **Render free** | Spins down after idle unless the authenticated keepalive cron is enabled; first request after sleep has a cold start |
| **Vercel hobby** | Fine for launch traffic |
| **Supabase free** | Watch DB size / egress |
| **DeepSeek** | Pay-as-you-go — set plan limits in app |

When cold starts hurt, upgrade Render to Starter (~always on).

---

## 6. Deploy order (recommended)

```text
1. API on Render + health green
2. DNS for api.rontgenai.dev
3. Web on Vercel with NEXT_PUBLIC_API_URL
4. DNS for rontgenai.dev
5. Clerk production allowlist
6. Smoke tests
7. (Next) Paddle live checkout + webhooks
```

---

## 7. Local production-like check

```bash
# API
cd api-gateway
npm run build && NODE_ENV=production PORT=8000 npm start

# Web (point at local API or production API carefully)
cd web
npm run build && npm start
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Dashboard “Could not reach API” | Wrong `NEXT_PUBLIC_API_URL` or CORS blocking |
| Clerk “production keys only for domain” | Use `pk_live` only on rontgenai.dev; keep `pk_test` for localhost |
| CORS error in browser | Add exact origin to `CORS_ORIGINS` (no trailing slash) |
| Render 502 | Check logs; ensure `npm run build` outputs `dist/`; `PORT` from Render |
| Cold start timeout | Wait and retry; or upgrade plan |

---

After this is green, next step: **Paddle production checkout** (live client token, price IDs, webhook URL, plan activation).
