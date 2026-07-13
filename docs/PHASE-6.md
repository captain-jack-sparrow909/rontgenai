# Phase 6 — Forge

**Status: shipped (v1)**

## Product

**Forge** turns a GitHub **issue** into a **plan**, then after human approval, generates code and opens a **pull request**.

## Flow

1. User pastes issue URL → `POST /v1/forge/jobs`
2. Fetch issue + comments + repo context files
3. DeepSeek drafts plan (files, steps, tests, risks)
4. Stage `awaiting_approval` — user **Approve** or **Reject**
5. On approve → generate file contents → branch → commits → PR (`Closes #N`)

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/forge/status` | Token/plan status |
| POST | `/v1/forge/jobs` | Start plan (meters 1) |
| GET | `/v1/forge/jobs` | List jobs |
| GET | `/v1/forge/jobs/:id` | Detail + plan/PR |
| POST | `/v1/forge/jobs/:id/approve` | Implement + PR (meters 1) |
| POST | `/v1/forge/jobs/:id/reject` | Reject plan |

## Auth

Same as Sentinel:

- `GITHUB_TOKEN` with **contents** write + **pull requests** write, or
- GitHub App installation

## Guardrails

- Plan-first (no PR without approval)
- Max 5 files per change set
- Blocks paths matching secrets / `.env` / keys
- Branch naming: `forge/issue-{n}-{stamp}` (never force-push main)
- Pro/Team only (`forge` limit 0 on free)

## UI

`/app/forge` — rose/pink high-tech shell, job list, plan review with approve/reject, PR success state.

## Next

- Radar (incident RCA)
- Issue assignment webhooks
- Multi-commit / monorepo scoping
