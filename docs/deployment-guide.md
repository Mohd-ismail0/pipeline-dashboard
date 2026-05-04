# Deployment Guide (Azure)

This guide describes how to deploy the dashboard/API and worker components to Azure for production.

## Deployment Architecture

- **Web app (Next.js)** hosts:
  - dashboard UI
  - operator APIs (`/api/*`)
  - internal APIs (`/api/internal/*`)
- **Azure Functions** hosts:
  - timer trigger (cron tick)
  - queue worker (run dispatcher)
- **Storage + DB**:
  - PostgreSQL (`DATABASE_URL`) for app state via Prisma
  - Azure Storage Queue for run messages
  - Azure Blob for document bodies (optional but recommended)

## Prerequisites

- Azure subscription with permissions to create:
  - Resource Group
  - Storage Account
  - App Service (or Azure Container Apps for web app)
  - Function App
  - PostgreSQL Flexible Server
- Node.js 20.9+ and npm
- Azure CLI (`az`) logged in
- Repository checked out with lockfile

## Required Environment Variables

Set these for production:

- `DATABASE_URL`
- `OPERATOR_API_TOKEN`
- `INTERNAL_API_SECRET`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_QUEUE_NAME` (default `pipeline-runs` if omitted)
- `AZURE_STORAGE_DOCUMENTS_CONTAINER` (for blob docs)
- `USE_LOCAL_EXECUTOR=false`
- `DISABLE_IN_PROCESS_SCHEDULER=true`
- `AZURE_TIMER_SCHEDULE_ENABLED=true`
- `APP_BASE_URL=https://<your-web-app-domain>`

Optional:

- `RUN_PIPELINE_ORCHESTRATION_URL` (if external orchestrator start endpoint is used)
- `ALLOW_UNSAFE_JS_SCRIPT_EVAL=false` (keep disabled in production)

## Build and Validation

Run before every deploy:

```bash
npm ci
npm run lint
npm run build
npm run --prefix azure-functions build
```

## Deploy Sequence (Recommended)

1. **Provision infra**
   - Resource Group
   - PostgreSQL
   - Storage Account + Queue (`pipeline-runs`)
   - Web App / Container App
   - Function App

2. **Deploy web app**
   - Set web app env vars
   - Deploy build artifact / container image
   - Verify `/dashboard` loads

3. **Deploy Azure Functions**
   - Set function app env vars (`APP_BASE_URL`, `INTERNAL_API_SECRET`, storage settings)
   - Deploy function package
   - Confirm timer + queue triggers are active

4. **Apply DB migrations (if schema changed)**
   - Run Prisma migration workflow in CI/CD or release step

5. **Smoke test**
   - Create/read config
   - Save pipeline
   - Trigger manual run
   - Verify events + documents

## Post-Deploy Verification Checklist

- `GET /api/configs` returns `200` with operator token
- `GET /api/node-catalog` returns entries
- `GET /api/metrics` returns expected shape
- `POST /api/run/:id` returns `202` (queue mode) or `200` (sync mode as configured)
- Queue worker consumes messages and writes run logs
- Timer trigger calls `/api/internal/cron-tick` successfully
- SSE stream `/api/runs/:runId/stream` emits events

## Security Hardening

- Restrict `/api/internal/*` to private network where possible
- Rotate `OPERATOR_API_TOKEN` and `INTERNAL_API_SECRET` regularly
- Store secrets in Key Vault or platform secret store, not in source control
- Keep `ALLOW_UNSAFE_JS_SCRIPT_EVAL=false` in production

## Rollback Plan

If a release fails:

1. Roll back web app to previous deployment slot/image
2. Roll back function app package
3. Re-apply previous env config snapshot if changed
4. Replay failed queue messages if needed (from dead-letter/manual recovery process)

## Day-2 Operations

- Monitor:
  - run failure rate
  - queue depth
  - function errors/timeouts
  - API latency
- Alert on:
  - sustained `cronFailed` growth
  - queue backlog threshold
  - internal auth failures (`401` on internal routes)
- Periodically test:
  - manual run path
  - cron run path
  - document download + diff
