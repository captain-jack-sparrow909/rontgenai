# Röntgen AI — Web

Marketing site + authenticated app shell for [rontgenai.dev](https://rontgenai.dev).

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4
- shadcn-style UI · Framer Motion · TanStack Query · Zod
- Clerk auth · PostHog (optional)

## Develop

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Structure

```
src/
  app/                 # Routes (landing, auth, /app/*)
  components/
    marketing/         # Landing sections
    app/               # Dashboard shell
    auth/              # Clerk-aware buttons
    ui/                # Design system primitives
  lib/                 # products, pricing, utils
  platform/            # Vendor-swappable ports (LLM, R2, Paddle, …)
```
