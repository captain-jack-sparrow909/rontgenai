# Production hardening

The API and AI worker are separate processes backed by the same Supabase job
table. HTTP requests create queued work; the worker leases and executes it.

## Execution model

- Production sets `JOB_EXECUTION_MODE=worker` on both services.
- `npm start` runs only the Fastify API.
- `npm run worker` runs the durable worker.
- Claims use `FOR UPDATE SKIP LOCKED`, bounded attempts, heartbeats, stale-lease
  recovery, and exponential retry delays.
- Forge plan approval requeues the same job as a separately retried execution
  stage. Human approval remains mandatory before repository writes.
- `JOB_EXECUTION_MODE=inline` is a compatibility mode for local development.

## Security boundaries

- API responses include `X-Request-Id`; created jobs retain the same ID.
- Read and write limits use Upstash Redis when configured and a bounded local
  fallback otherwise.
- Clerk organization claims are mirrored into Supabase memberships.
- Billing, GitHub installation changes, and Forge execution approval require an
  organization owner or admin. Personal workspaces are owner-equivalent.
- Product records are scoped to the active personal or organization workspace.
- Clerk, GitHub, and Paddle webhooks require signatures in production. Clerk
  and Paddle deliveries are recorded idempotently; GitHub jobs use delivery
  fingerprints.
- The generic job endpoint is disabled unless `ENABLE_GENERIC_JOB_API=true`.

## Files and retention

`POST /v1/uploads/presign` creates a ten-minute R2 PUT URL after checking the
content type and declared size. The client must call the confirmation endpoint,
which checks the stored object size. Artifacts receive an expiration time and
the worker deletes expired objects hourly. Configure:

```text
UPLOAD_MAX_BYTES=10485760
ARTIFACT_RETENTION_DAYS=30
```

Legacy `.xls` input is rejected. The previous parser had unpatched security
advisories; Pulse accepts `.xlsx` and CSV using the audited replacement.

## Monitoring and readiness

- Set `SENTRY_DSN` on both API and worker services.
- API exceptions include request metadata without request bodies or tokens.
- Worker exceptions include job, product, attempt, and originating request ID.
- `/health` is a liveness endpoint.
- `/ready` verifies Supabase, configured Redis, and reports the execution mode.

## Release gates

The GitHub Actions workflow runs API tests, type checks, builds, production
dependency audits, full web lint/build, and applies every migration twice to a
clean PostgreSQL service. Chromium smoke tests exercise the production landing,
privacy, and terms routes. Dependabot watches both npm projects and Actions.

Before production traffic:

1. Deploy the API and background worker from `render.yaml`.
2. Configure Sentry, Upstash, R2, Clerk, Supabase, DeepSeek, and GitHub secrets
   on both services where applicable.
3. Confirm `/ready` returns HTTP 200.
4. Create one job and verify `job.started` and `job.completed` share the API
   request ID.
5. Confirm an intentionally failed test job retries and eventually becomes
   terminal after `max_attempts`.
