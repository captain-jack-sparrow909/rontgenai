# Phase 1 — Platform plumbing

**Status: complete** (schema applied, waitlist live, billing overlay wired)

## What’s included

### API gateway (`api-gateway/`)

Fastify on port **8000**:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health`, `/v1/health` | — | Liveness |
| GET | `/v1/me` | Bearer | Profile sync + plan + usage |
| GET/POST | `/v1/usage` | Bearer | Metering |
| POST | `/v1/waitlist` | — | Waitlist (Supabase) |
| GET | `/v1/billing/prices` | — | Configured Paddle price IDs |
| POST | `/v1/billing/checkout` | Bearer | Checkout params for Paddle.js |
| POST | `/v1/webhooks/paddle` | signature | Plan updates |
| POST | `/v1/webhooks/clerk` | optional | User sync |
| POST/GET | `/v1/jobs` | Bearer | Job queue + Inngest emit |

### Web

- API client + `useMe()` (Clerk JWT)
- Dashboard usage meters
- Waitlist → API
- Billing: Paddle.js overlay (`@paddle/paddle-js`), monthly/yearly
- Settings shows synced profile
- PostHog project key + identify on login
- Sentry browser init

### Database

Applied via Supabase SQL Editor (`supabase/APPLY_IN_DASHBOARD.sql`).

## Local run

```bash
# Terminal 1
cd api-gateway && npm run dev

# Terminal 2
cd web && npm run dev
```

Or from repo root:

```bash
npm run dev:api   # one terminal
npm run dev:web   # another
```

- Web: http://localhost:3000  
- API: http://localhost:8000/health  

Use **Clerk Development** keys (`pk_test_` / `sk_test_`) on localhost.

## Paddle checkout flow

1. User clicks Upgrade on `/app/billing`
2. Web → `POST /v1/billing/checkout` with session JWT
3. Web opens Paddle.js overlay with `priceId` + `customData` (`profile_id`, `plan`, …)
4. Webhook `POST /v1/webhooks/paddle` updates `subscriptions`

### Webhook for local testing

```bash
# expose API (example)
cloudflared tunnel --url http://localhost:8000
# or ngrok http 8000
```

In Paddle sandbox → Developer tools → Notifications:

```text
https://<tunnel-host>/v1/webhooks/paddle
```

Subscribe to `subscription.*` and `transaction.completed`.

## Env checklist

| Var | Where |
|-----|--------|
| Clerk dev keys | web + api |
| `NEXT_PUBLIC_API_URL=http://localhost:8000` | web |
| Supabase URL (no `/rest/v1`) + service role | api |
| `NEXT_PUBLIC_POSTHOG_KEY=phc_…` | web |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_…` | web |
| `NEXT_PUBLIC_PADDLE_ENV=sandbox` | web |
| `PADDLE_PRICE_*` | api |
| `PADDLE_WEBHOOK_SECRET` | api (production required) |

## Next: Phase 2

**Blueprint** — diagram upload → R2 → job → DeepSeek review → UI.
