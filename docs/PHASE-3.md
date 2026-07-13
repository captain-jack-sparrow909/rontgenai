# Phase 3 — Pulse

**Status: shipped (v1)**

## Product

**Pulse** — chat with spreadsheets for insights, SQL, charts, and tables.

## Flow

1. Upload CSV / XLSX at `/app/pulse`
2. `POST /v1/pulse/sessions` → parse → profile columns → job
3. Async bootstrap (DeepSeek): summary, insights, suggested questions, seed chart
4. Session UI: schema sidebar + chat
5. `POST /v1/pulse/sessions/:id/chat` → answer + optional SQL / chart / table

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/pulse/sessions` | Upload spreadsheet (meters 1) |
| GET | `/v1/pulse/sessions` | List sessions |
| GET | `/v1/pulse/sessions/:id` | Session detail |
| POST | `/v1/pulse/sessions/:id/chat` | Ask a question (meters 1) |

## Limits

Plan `pulse` units (messages + uploads share the pool): Free 20, Pro 500, Team 2000 / month.

## Safety

- Spreadsheet-only v1 (no live DB connectors yet)
- SQL suggestions are SELECT-only (validated)
- Sample rows retained (capped); full file optional in R2

## Next

- Atlas (repo explainer)
- Live DB connectors (read-only)
- Scheduled digests
