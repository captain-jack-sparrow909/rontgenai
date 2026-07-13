# Phase 4 — Atlas

**Status: shipped (v1)**

## Product

**Atlas** maps public GitHub repositories: architecture overview, Mermaid diagram, modules, how to run/contribute, onboarding checklist, and Q&A.

## Flow

1. User pastes `https://github.com/owner/repo` or `owner/repo`
2. API fetches repo metadata, recursive tree, README, key files (GitHub REST)
3. Job runs DeepSeek → structured `AtlasReport`
4. UI shows map + chat for follow-up questions

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/atlas/maps` | Start map (meters 1) |
| GET | `/v1/atlas/maps` | List maps |
| GET | `/v1/atlas/maps/:id` | Map detail + report |
| POST | `/v1/atlas/maps/:id/chat` | Q&A (meters 1) |

## Env

- `DEEPSEEK_API_KEY` — required for analysis
- `GITHUB_TOKEN` (optional) — higher unauthenticated rate limits

## Limits

Atlas units (maps + chat): Free 2 repos/sessions pool, Pro 20, Team unlimited (`-1`) per plan config.

## Constraints (v1)

- Public repositories only
- No private GitHub App install yet
- Mermaid shown as source (copy-friendly); render can be added later

## Next

- Radar (incident investigator)
- Sentinel / Forge (GitHub App)
- Private repos via OAuth
