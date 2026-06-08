# Biosyn CRM — Hardening Notes (M10)

Covers the security-, scale-, and reliability-relevant decisions made in Milestone 10.

## Done

### Network / transport
- **helmet** wired in `main.ts` — security headers (XSS, frame-ancestors, content-type sniffing, HSTS when behind HTTPS, etc.).
- **CORS** — configurable via `ALLOWED_ORIGINS` env (comma-separated). Defaults to `http://localhost:3000` for local dev. Credentials enabled.
- **compression** middleware — gzip responses.
- `/api` global prefix excludes `/healthz` and `/readyz` so probes don't get rerouted.

### Rate limiting (`@nestjs/throttler`)
- Global guard: **100 req/min/IP** across the whole API.
- `POST /api/auth/login`: **5 req/min/IP** (credential stuffing / brute-force).
- `POST /api/auth/refresh`: **30 req/min/IP**.
- `ThrottlerGuard` is registered as APP_GUARD *before* `JwtAuthGuard`, so unauthenticated traffic gets throttled too.

### Health checks
- `GET /healthz` — public, returns `{ status, uptimeSeconds }`. Liveness probe.
- `GET /readyz` — public, runs `SELECT 1` against Postgres and `HeadBucket` against S3/MinIO. 503 if either dependency is unreachable.

### Offline sync
- **`POST /api/sync/push`** — batched offline submissions (≤ 100 visits). Each item processed independently:
  - `ok` — new visit accepted.
  - `idempotent` — `(repId, clientId)` already exists; returned existing visit id.
  - `error` — per-item failure with reason. Other items in the batch still succeed.

### Audit log (M10 schema + migration 0006)
- `audit_logs` table — `actor_id`, `action`, `target_type`, `target_id`, `meta` (JSONB), `created_at`.
- Hooked into the most sensitive transitions:
  - Admin **applies** a list-change request (`list_change.admin_applied`).
  - Admin **rejects** a list-change request (`list_change.admin_rejected`).
  - Admin **creates** or **revokes** a per-rep lock override (`list_lock.override_created`, `list_lock.override_revoked`).
- Writes are best-effort: a failed audit write logs a warning but never aborts the caller.

### Input validation
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Unknown body fields are stripped, unexpected fields are 400, query strings are number-coerced.

### Authorization
- `JwtAuthGuard` is global; `@Public()` opts specific endpoints out.
- `RolesGuard` + `@Roles(...)` enforces role on every privileged route.
- Cross-org access checks (e.g., manager-of-rep) sit in service methods (`requireManagedPlan`, `requireManagedRequest`, `IntegrityScope`) and throw 403.

### Data validation already in place from earlier milestones
- Arabic doctor name min-two-parts validator (M2).
- Plan-item doctor must be on rep's list (M5).
- Visit doctor must be on rep's list; plan-item must match (M4).
- List-edit locked outside quarter-end windows unless admin override is active (M6).
- Visit valid-only when ≥5 slides, ≥30s, in geofence, no mock (M4).

## Deferred / not in scope

### Performance & scale
- **Redis caching** of the sync snapshot and KPI snapshots. Spec calls out Redis for queues/notifications; we have Redis in docker-compose but the API hasn't started using it yet. The hot path for 100+ concurrent reps is the snapshot pull — caching it for 60 s would cut load substantially.
- **Connection-pool tuning**: Prisma's default pool is OK for ~100 concurrent users but should be benchmarked. Set `DATABASE_URL?connection_limit=N&pool_timeout=M` per the deployment's CPU count.
- **Load test harness** (k6 / artillery) — not built.
- **DB index review** — current indexes cover the primary access patterns; a real-data run will reveal whether any of the date-range aggregations (PM-hours, integrity reports) need composite indexes beyond what's there.

### Auth / session
- **Refresh-token rotation** — current refresh token is reusable until expiry. Rotation (revoke on use + family-detection on replay) is the right next step before production.
- **Password strength enforcement** — current minimum is 8 chars; consider zxcvbn or similar.
- **MFA** for admin role.

### Operational
- **Structured request logging** (pino) — currently using `console.log` only at startup.
- **Sentry / error tracking** integration.
- **Migration deploy automation** — `prisma migrate deploy` should run in CI before the new image is rolled.
- **Backups / PITR** — docker-compose volume is fine for dev; production needs Postgres backups.

### Sync push edge cases handled & not handled
- **Handled**: per-visit idempotency, doctor-not-on-list rejection, open-visit anti-overlap rejection, plan-item mismatch rejection, per-item failures don't kill the batch.
- **Not handled**: a doctor that was on the rep's list at capture time but has since been removed → currently 400. Consider accepting these visits but flagging them as `flag.doctor_off_list_at_sync=true`.
