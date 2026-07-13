# Phase 7 — Radar

**Status: shipped (v1)**

## Product

**Radar** investigates production incidents from logs (and optional metrics notes): signal extraction, ranked root causes, timeline, checklist, postmortem draft.

## Flow

1. Paste logs or upload `.log`/`.txt` at `/app/radar`
2. Optional: incident title, context, metrics notes
3. `POST /v1/radar/investigations` → parse signals → job
4. DeepSeek RCA → report
5. UI shows causes, timeline, actions, postmortem (copy Markdown)

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/radar/investigations` | Start investigation (meters 1) |
| GET | `/v1/radar/investigations` | List |
| GET | `/v1/radar/investigations/:id` | Detail + report |

## Limits

Free 2 / Pro 30 / Team 100 investigations per month.

## v1 scope

- Log paste/upload only (no live Datadog/Grafana yet)
- Structured heuristics (levels, services, error signatures) + LLM
- Optional R2 storage of raw logs

## Next

- Integrations (Sentry, Datadog, OTel)
- Shared incident workspaces (Team)
