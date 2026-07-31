# Clerk custom domain (`clerk.rontgenai.dev`)

## Symptom

```
ClerkRuntimeError: Failed to load Clerk JS
failed to load script: https://clerk.rontgenai.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js
(code="failed_to_load_clerk_js")
```

The page may still render, but Sign in / Sign up / UserButton will not work.

## Cause

Your **production** publishable key (`pk_live_…`) is bound to the Frontend API host:

```text
clerk.rontgenai.dev
```

That hostname currently **does not resolve in DNS** (no A/CNAME record). Clerk cannot download `clerk.browser.js` or talk to the Frontend API until DNS is fixed.

This is **not** a Next.js bug.

## Fix A — Production domain (recommended for live)

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → your app → **Configure → Domains**.
2. Under production, find the **Frontend API** / custom domain instructions for `clerk.rontgenai.dev`.
3. At your DNS host for `rontgenai.dev`, add the CNAME Clerk shows, typically:

   | Type  | Name / Host | Target (example — use Clerk’s exact value) |
   |-------|-------------|--------------------------------------------|
   | CNAME | `clerk`     | `frontend-api.clerk.services`              |

4. If you use **Cloudflare**:
   - Set the record to **DNS only** (grey cloud), **not** Proxied (orange cloud).
   - Proxied CNAMEs to Clerk often break validation (Error 1000 / failed checks).

5. Wait for DNS (often minutes; can take longer). Verify:

   ```bash
   dig +short clerk.rontgenai.dev CNAME
   curl -I https://clerk.rontgenai.dev/v1/health
   ```

6. In Clerk Dashboard, confirm the domain shows as **verified** / certificate issued.

7. Hard-refresh `http://localhost:3000` (or redeploy production).

You may also need related records Clerk lists (Accounts Portal, Email, etc.) — follow the dashboard checklist exactly.

## Fix B — Local development (fast)

Use the **Development** instance keys while coding, so Clerk loads from `*.clerk.accounts.dev` (no custom DNS required).

1. Dashboard → switch to **Development**.
2. Copy **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`).
3. Put them in `web/.env.local`:

   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

4. Restart `npm run dev`.

Keep `pk_live_…` only for production deploys (Vercel env), after Fix A is done.

## Fix C — Proxy (if you cannot create a CNAME)

Clerk supports [proxying the Frontend API](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi) through your app (e.g. `/__clerk`). Prefer Fix A when possible.

Do not enable `frontendApiProxy` in `clerkMiddleware` while using the verified
`clerk.rontgenai.dev` CNAME. Proxy mode is a separate Clerk domain
configuration and requires the exact proxy URL (including `www`) to be
registered in the Clerk Dashboard. Mixing both modes can redirect expired
session refreshes to `/__clerk/v1/client/handshake` and produce `host_invalid`.

## Verify

```bash
# Must return a CNAME or A record (not NXDOMAIN)
dig +short clerk.rontgenai.dev

# Script URL should return 200
curl -sI "https://clerk.rontgenai.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js" | head -5
```

Browser console should no longer show `failed_to_load_clerk_js`.

## Email DNS (optional leftover)

Frontend API + Account Portal are enough for login. **Email** DNS (SPF/DKIM records Clerk shows) is optional but recommended before real users so verification/magic-link mail is branded and deliverable. Add it under Clerk → Domains → Email when ready.
