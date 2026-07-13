# Key decisions

## Product names (locked)

| Slug | Name |
|------|------|
| blueprint | Blueprint |
| pulse | Pulse |
| atlas | Atlas |
| sentinel | Sentinel |
| forge | Forge |
| radar | Radar |
| orbit | Orbit (soon) |
| aegis | Aegis (soon) |
| echo | Echo (soon) |
| arena | Arena (soon) |

## Architecture

- **Separate repos** for web, API gateway, AI worker, GitHub service.
- **Web:** Next.js on Vercel — UI only; heavy work on workers.
- **AI worker:** FastAPI (Python) — best fit for LLM, pandas, logs.
- **API gateway:** TypeScript (Nest or Fastify) — Clerk JWT, Paddle webhooks, routing.
- **GitHub service:** Node preferred for Octokit (Sentinel then Forge).

## Auth & orgs

- Clerk app `app_3GOj4jk3LR4HYEtMof2YIE8643P`.
- Free/Pro: personal (no org required).
- Team: Clerk Organizations for seats + shared GitHub installs.

## Billing

- Paddle first (MoR), Stripe later via `BillingProvider`.
- Suite subscription: Free / Pro $29 / Team $99.

## Free-tier vendors

Vercel, Render, Supabase, R2, DeepSeek, Upstash, PostHog, Inngest, Sentry (paid year).
