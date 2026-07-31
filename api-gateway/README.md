# @rontgenai/api-gateway

TypeScript **Fastify** API for Röntgen AI — auth, profiles, usage, billing webhooks, jobs.

Deploy separately (Render). Not part of the Next.js app.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health`, `/v1/health` | — | Liveness |
| GET | `/ready` | — | Database, Redis, and execution-mode readiness |
| POST | `/v1/keepalive` | Cron bearer secret | Wake Render and atomically toggle a dedicated Supabase maintenance row |
| GET | `/v1/me` | Bearer | Profile + plan + usage (syncs Clerk → Supabase) |
| GET | `/v1/usage` | Bearer | Monthly usage snapshot |
| POST | `/v1/usage` | Bearer | Record usage (enforces limits) |
| POST | `/v1/waitlist` | — | Persist waitlist email |
| GET | `/v1/billing/prices` | — | Configured Paddle price IDs |
| POST | `/v1/billing/checkout` | Bearer | Paddle price + custom data for overlay |
| POST | `/v1/webhooks/paddle` | signature | Subscription updates |
| POST | `/v1/webhooks/clerk` | optional | User sync |
| POST | `/v1/jobs` | Bearer | Enqueue job + meter usage |
| GET | `/v1/jobs/:id` | Bearer | Job status |
| POST | `/v1/blueprint/reviews` | Bearer | Create architecture review |
| GET | `/v1/blueprint/reviews` | Bearer | List reviews |
| GET | `/v1/blueprint/reviews/:id` | Bearer | Review detail |
| POST | `/v1/uploads/presign` | Bearer | Create a bounded R2 upload URL |
| POST | `/v1/uploads/:id/confirm` | Bearer | Verify and retain an uploaded object |
| DELETE | `/v1/uploads/:id` | Bearer | Delete an owned artifact |

## Local

```bash
cp .env.example .env
# or copy from ../web/.env.local (gateway maps NEXT_PUBLIC_* keys)

npm install
npm run dev
# → http://localhost:8000/health
```

For the production execution model:

```bash
JOB_EXECUTION_MODE=worker npm run dev
npm run worker:tsx
```

The worker claims jobs through Postgres leases, emits heartbeats, retries with
bounded exponential backoff, recovers expired leases, and purges expired R2
artifacts. `JOB_EXECUTION_MODE=inline` is intended only for local development.

Production build:

```bash
npm run build   # tsc → dist/
npm start       # node dist/index.js
npm run worker  # node dist/worker.js (separate service)
```

Web should set `NEXT_PUBLIC_API_URL=http://localhost:8000` locally, or your Render URL in production.

## Deploy (Render)

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md). Root Directory: `api-gateway`. Health: `/health`.

## Auth

Clients send Clerk session JWT:

```http
Authorization: Bearer <clerk_session_token>
```

Obtain via `const token = await getToken()` from `@clerk/nextjs`.
