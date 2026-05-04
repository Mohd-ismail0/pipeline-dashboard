# AI Agent Playbook

This playbook is for autonomous agents operating this pipeline system through APIs.

## Objective

Safely manage configs, workflows, and run operations without direct DB writes or filesystem edits.

## Rules of Engagement

- Use only HTTP APIs documented in `docs/api-reference.md`.
- Never call internal routes with operator tokens; use `x-internal-secret`.
- Never store secrets in logs or prompts.
- Always treat `PATCH /api/config/:id` as full graph update when writing pipeline changes.
- For destructive actions (`DELETE /api/config/:id`), require explicit confirmation from operator.

## Required Environment

- `APP_BASE_URL`
- `OPERATOR_API_TOKEN`
- `INTERNAL_API_SECRET` (only for internal worker/orchestrator agents)

Optional execution controls:

- `USE_LOCAL_EXECUTOR`
- `RUN_PIPELINE_ORCHESTRATION_URL`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_QUEUE_NAME`
- `DISABLE_IN_PROCESS_SCHEDULER`
- `AZURE_TIMER_SCHEDULE_ENABLED`

## Suggested Capabilities for Your Agent

- Config CRUD
- Pipeline graph editor (read/write node/edge graph)
- Run trigger + monitor
- Output retrieval (documents + diff)
- Failure triage from run logs/events

## Recommended Agent Workflow

1. Discover configs:
   - `GET /api/configs`
2. Load one config:
   - `GET /api/config/:id`
3. Modify graph:
   - add/update/remove `nodes` and `edges`
   - preserve `data.handlerId` and `data.handlerVersion`
4. Persist:
   - `PATCH /api/config/:id`
5. Validate with run:
   - `POST /api/run/:id`
6. Observe:
   - `GET /api/runs?configId=:id&limit=5`
   - `GET /api/runs/:runId`
   - optional SSE `GET /api/runs/:runId/stream`
7. Fetch artifacts:
   - `GET /api/documents/:id`
   - `GET /api/diff/:id`

## Error Handling Strategy

- `400`: schema/validation issue; fix payload and retry.
- `401`: bad/missing token/secret.
- `404`: invalid config/run/document ids.
- `409`: create conflict on duplicate config id.
- `500`: backend failure; capture error text and retry with backoff.

Retry policy:

- safe reads: exponential backoff up to 3 retries.
- mutating writes: retry only if idempotent by design.
- run triggers: if `202`, poll run logs instead of retriggering immediately.

## Pipeline Editing Conventions

- Use stable node ids where possible.
- For “replace node keep connections”, update node `data.handlerId` + `data.config` in place.
- Always maintain valid edges (source/target must exist).
- Keep graph acyclic unless your orchestrator semantics explicitly support cycles.

## Observability Conventions

- Attach and propagate correlation IDs when available.
- Use run events as source of truth for node-level execution sequence.
- For timeline UX or agent diagnostics, prefer `/api/runs/:runId` (log + events).

## Security Checklist

- Rotate `OPERATOR_API_TOKEN` and `INTERNAL_API_SECRET` periodically.
- Restrict internal routes at network layer (private ingress/VNet where possible).
- Disable unsafe JS eval in production: `ALLOW_UNSAFE_JS_SCRIPT_EVAL=false`.

## Minimal Health Probes for Agent Startup

1. `GET /api/configs`
2. `GET /api/node-catalog`
3. `GET /api/metrics`

If all succeed, agent can proceed with workflow operations.
