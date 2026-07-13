# Phase 2 — Blueprint

**Status: shipped (v1)**

## Product

**Blueprint** reviews system architecture for scalability, reliability, security, cost, and design tradeoffs.

## Flow

1. User opens `/app/blueprint`
2. Submits description ± Mermaid ± diagram image
3. `POST /v1/blueprint/reviews` → usage check → optional R2 upload → `jobs` row
4. In-process worker runs DeepSeek review (async)
5. UI polls `GET /v1/blueprint/reviews/:id` until `succeeded` / `failed`
6. Results: scores, findings, tradeoffs, next steps; copy as Markdown

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/blueprint/reviews` | Create review (meters 1 unit) |
| GET | `/v1/blueprint/reviews` | List recent |
| GET | `/v1/blueprint/reviews/:id` | Detail + result |

## Env (api-gateway)

- `DEEPSEEK_API_KEY` (required for reviews)
- `DEEPSEEK_MODEL` (default `deepseek-chat`)
- `R2_*` (optional; stores diagrams; without R2, small images may be processed inline)

## Limits

Plan limits from Phase 1 (`PLAN_LIMITS.blueprint`): Free 3, Pro 50, Team 200 / month.

## Next phases

- Pulse / Atlas / Radar product pipelines
- Extract Blueprint processor to dedicated `ai-worker` + Inngest
- PDF export, multi-diagram compare
