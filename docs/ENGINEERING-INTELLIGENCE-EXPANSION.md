# Engineering intelligence expansion

This program adds eight engineering-focused capabilities without turning every
workflow into a separate top-level product.

## Product mapping

| Capability | Product surface | Delivery shape |
|---|---|---|
| Build pipeline optimizer | **Relay** (provisional) | New product surface; GitHub CI ingestion and a dedicated analyzer worker |
| Bug reproduction assistant | **Forge** | Diagnosis and reproduction stage before plan approval |
| Architecture diagram generator | **Atlas** → Blueprint | Multi-view Mermaid diagrams generated from repository evidence |
| Migration planner | **Atlas** | Target-state assessment and staged migration plan mode |
| Open-source issue finder | **Forge** | Issue discovery, contributor-fit scoring, then the existing issue-to-PR flow |
| DevOps assistant | **Radar** | Deployment, alert, IaC, log, and remediation context |
| Cloud cost optimizer | **Blueprint** | Read-only cloud inventory and cost review mode |
| Security review assistant | **Sentinel** + Blueprint | Code/config review in Sentinel; architecture review in Blueprint |

## Shared architecture

The web application remains a UI and orchestration client. Fastify owns auth,
validation, metering, and job creation. Long-running analysis moves to durable
workers as continuous integrations are added.

Every capability should use the same execution envelope:

1. Validate and normalize the source input.
2. Authorize the user and organization.
3. Apply request-level rate limits and plan limits.
4. Create an idempotent job with a source fingerprint.
5. Execute in a worker with retries and a bounded timeout.
6. Store large source artifacts in R2 and structured results in Postgres.
7. Record evidence, confidence, model metadata, and audit events.
8. Require explicit approval before code, workflow, or infrastructure changes.

## Delivery stages

### Stage 1 — repository and issue intelligence

- [x] Atlas repository mapping baseline
- [x] Atlas system, data, API, and dependency diagrams
- [x] Forge reproduction steps, likely causes, and debugging plan
- [x] Atlas migration assessment mode
- [x] Forge open-source issue discovery

### Stage 2 — review and operations intelligence

- [ ] Sentinel security review mode
- [ ] Radar deployment and infrastructure context
- [ ] Blueprint cloud cost review mode

### Stage 3 — continuous CI intelligence

- [ ] Add Relay to product, plan, usage, and navigation registries
- [ ] Ingest GitHub workflow runs, jobs, steps, tests, and cache signals
- [ ] Detect flaky tests, duplicated work, cache misses, and critical paths
- [ ] Produce evidence-backed optimization recommendations

## Platform gates before continuous integrations

- [ ] Replace in-process `setImmediate` jobs with durable workers
- [ ] Add API and worker error monitoring
- [ ] Add request IDs and job-correlated structured logs
- [ ] Enforce organization roles in the API
- [ ] Add request-level rate limiting
- [ ] Add unit, integration, and browser tests
- [ ] Add CI for lint, typecheck, tests, builds, and migration validation
- [ ] Add presigned uploads and artifact retention policies

## Compatibility rules

- Existing report/job payloads remain readable when new fields are absent.
- New fields are additive until a versioned migration is necessary.
- Repository analysis is performed once and reused by Atlas, Forge, Sentinel,
  Blueprint, and Relay where authorization permits.
- Model output is always parsed into bounded, typed structures before storage or
  rendering.
- Generated Mermaid uses strict rendering and remains copyable as source.

## Next implementation batch

1. **Sentinel security focus**
   - Add an explicit security review focus with CWE-oriented findings,
     exploitability evidence, and config/IaC coverage.
2. **Radar operations context**
   - Accept deployments, infrastructure changes, alerts, and metrics alongside
     logs; keep remediation advisory until an approval/audit layer exists.
3. **Blueprint cloud cost focus**
   - Start with uploaded inventory and billing exports before adding read-only
     cloud credentials.
4. **Relay foundation**
   - Add a product/plan/schema migration only when durable workers, rate limits,
     and GitHub webhook idempotency are in place.
