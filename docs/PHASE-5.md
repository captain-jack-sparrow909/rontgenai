# Phase 5 — Sentinel

**Status: shipped (v1)**

## Product

**Sentinel** reviews GitHub pull requests with DeepSeek, posts a PR review + inline comments, and can auto-approve when clean.

## Modes

### Manual (works today with PAT)
1. Set `GITHUB_TOKEN` on api-gateway (repo contents read + PR write)
2. Open `/app/sentinel`, paste PR URL
3. Optional: post to GitHub / auto-approve if no critical/high issues

### GitHub App + webhooks (production)
1. Create a GitHub App with permissions:
   - Pull requests: Read & write
   - Contents: Read
   - Checks: optional
2. Subscribe to `pull_request` (opened, synchronize, reopened, ready_for_review)
3. Webhook URL: `https://<api-host>/v1/webhooks/github`
4. Set env:
   - `GITHUB_APP_ID`
   - `GITHUB_APP_PRIVATE_KEY` (PEM; use `\n` for newlines in env)
   - `GITHUB_WEBHOOK_SECRET`
   - `GITHUB_APP_SLUG` (for install link)
5. Install app on a repo → claim installation ID in UI (or `?installation_id=` redirect)
6. PRs auto-enqueue Sentinel reviews

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/sentinel/status` | App/token/plan status |
| POST | `/v1/sentinel/installations` | Claim installation |
| GET | `/v1/sentinel/installations` | List linked installs |
| PATCH | `/v1/sentinel/installations/settings` | autoApprove / enabled |
| POST | `/v1/sentinel/reviews` | Manual PR review |
| GET | `/v1/sentinel/reviews` | History |
| GET | `/v1/sentinel/reviews/:id` | Detail |
| POST | `/v1/webhooks/github` | GitHub App webhook |

## Plans

Sentinel is **Pro/Team only** (`PLAN_LIMITS.sentinel` is 0 on free).

## Safety

- Never force-merges
- Approve only when verdict is approve **and** auto-approve is enabled
- Critical findings force `REQUEST_CHANGES`
- Inline comment failures fall back to summary body listing findings

## Next

- Forge (issue → plan → PR)
- Radar
- Path filters + ignore noise rules in product settings
