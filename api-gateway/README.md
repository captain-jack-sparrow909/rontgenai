# @rontgenai/api-gateway

TypeScript **Fastify** API for Röntgen AI — auth, profiles, usage, billing webhooks, jobs.

Deploy separately (Render). Not part of the Next.js app.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health`, `/v1/health` | — | Liveness |
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

## Local

```bash
cp .env.example .env
# or copy from ../web/.env.local (gateway maps NEXT_PUBLIC_* keys)

npm install
npm run dev
# → http://localhost:8000/health
```

Web should set `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Auth

Clients send Clerk session JWT:

```http
Authorization: Bearer <clerk_session_token>
```

Obtain via `const token = await getToken()` from `@clerk/nextjs`.
