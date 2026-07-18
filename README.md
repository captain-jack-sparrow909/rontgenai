# Röntgen AI

**See through your systems.** Multi-product AI suite for engineers — architecture, code, data, and production reliability.

| Domain | [rontgenai.dev](https://rontgenai.dev) |
|--------|----------------------------------------|

## Products

| Product | Status | Description |
|---------|--------|-------------|
| **Blueprint** | v1 | Architecture diagram review |
| **Pulse** | v1 | Chat with spreadsheets & SQL |
| **Atlas** | v1 | GitHub repo explainer |
| **Sentinel** | v1 | AI PR reviewer on GitHub |
| **Forge** | v1 | Issue → plan → PR |
| **Radar** | v1 | Production incident RCA |
| **Relay** | v1 | CI pipeline optimization |
| Orbit, Aegis, Echo, Arena | Coming soon | Placeholders + waitlist |

## Repo strategy (separate services)

| Repo / folder | Role | Stack | Deploy |
|---------------|------|-------|--------|
| **`web/`** (this app) | Marketing + app shell | Next.js, Tailwind, shadcn, Clerk, TanStack, Framer Motion | Vercel |
| **`api-gateway/`** | Auth, rate limits, routing, webhooks | Fastify + TypeScript | Render web service |
| **`api-gateway/src/worker.ts`** | Durable product jobs and retention | Node + Supabase leases + DeepSeek | Render background worker |
| **`supabase/`** | Shared Postgres migrations | Supabase | Supabase |

The API and worker share one package so processors and typed payloads cannot drift.

## Phase status

### Phase 0 — complete

- [x] Next.js app + landing + app shell
- [x] Clerk auth (login working)
- [x] Platform port stubs, pricing, product names
- [x] Privacy/Terms drafts, Sentry init, secret-safe gitignore
- [x] Waitlist UI → API persistence
- [ ] Optional: Clerk **Email** DNS for branded auth mail
- [ ] Optional: Vercel production deploy of `web`

### Phase 1 — complete

- [x] `api-gateway` (Fastify): me, usage, waitlist, jobs, Paddle
- [x] Supabase schema applied
- [x] Waitlist + profile/usage sync
- [x] Paddle.js checkout overlay + monthly/yearly
- [x] PostHog project key + identify
- [x] Settings shows synced profile

See `docs/PRODUCTION-HARDENING.md` for the current execution and operations model.

## Deployment

Production targets: **Vercel** (web) + **Render** (api-gateway).

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for:

- Render service settings + `api.rontgenai.dev`
- Vercel root directory `web` + `rontgenai.dev`
- Production env vars and smoke tests

Config: `web/vercel.json`, `render.yaml`, `*.env.production.example`.

## Quick start (`web`)


```bash
cd web
cp .env.example .env.local
# Fill NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY when ready

npm install --cache ../.npm-cache   # if global npm cache has permission issues
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the API in another terminal with `npm run dev:api`. Local development uses
inline execution by default. Set `JOB_EXECUTION_MODE=worker` and run
`npm run dev:worker` to exercise production-style durable jobs.

### Clerk setup

Clerk app id: `app_3GOj4jk3LR4HYEtMof2YIE8643P`

```bash
npm install -g clerk
clerk auth login
cd web && clerk init --app app_3GOj4jk3LR4HYEtMof2YIE8643P
clerk doctor
```

Without keys, the landing and app shell still render; sign-in shows a setup message.

## Pricing (launch)

| Plan | Price | Notes |
|------|-------|--------|
| Free | $0 | Sample quotas on Blueprint, Pulse, Atlas, Radar |
| Pro | $29/mo ($290/yr) | Full suite + Sentinel (1 repo) + Forge |
| Team | $99/mo ($990/yr) | Clerk Organizations, 5 seats, higher limits |

**Orgs strategy:** Free/Pro = personal accounts. Team = Clerk Organization for seats, shared usage, and GitHub installs.

## Platform abstractions

Callers depend on ports under `web/src/platform/`:

- `LLMProvider` → DeepSeek
- `ObjectStore` → Cloudflare R2
- `BillingProvider` → Paddle → Stripe later
- `EmailProvider` → Spacemail
- `CacheStore` → Upstash Redis
- `AnalyticsProvider` → PostHog

## Email

| Address | Use |
|---------|-----|
| jabir@rontgenai.dev | Founder (not automated) |
| hello@rontgenai.dev | Marketing / waitlist |
| support@rontgenai.dev | Support |

## Implementation order

1. **Phase 0** — Foundation (this)
2. **Phase 1** — API gateway, metering, Paddle, jobs
3. **Phase 2** — Blueprint (first full product)
4. Atlas → Pulse → Radar
5. Sentinel → Forge (GitHub App)
6. Launch polish

## Docs in this workspace

- `project-scope.md` — original product brief
- `clerk-prompt.md` / `paddle-prompt.md` — vendor agent prompts
- `supabase/migrations/` — database schema
- `docs/DECISIONS.md` — locked product/tech decisions
