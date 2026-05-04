# Pipeline Dashboard API Reference

This document describes all API endpoints available in this project, including operator-facing APIs and internal worker APIs.

Machine-readable contract: `docs/openapi.yaml` (OpenAPI 3.1).

## Base URL

- Local: `http://localhost:3000`
- Production: your deployed app URL

## Authentication

### Operator APIs

Used by dashboard users and external automation agents.

- Header: `Authorization: Bearer <OPERATOR_API_TOKEN>`
- If `OPERATOR_API_TOKEN` is not set, auth is effectively disabled for operator routes.

### Internal APIs

Used by queue/timer workers and orchestrators.

- Header: `x-internal-secret: <INTERNAL_API_SECRET>`
- If `INTERNAL_API_SECRET` is missing, internal routes return `500`.

---

## Operator API Endpoints

## `GET /api/configs`

List all scraping configs.

- Auth: operator
- Response: `{ configs: ScrapingConfig[] }`

## `POST /api/configs`

Create a new config and initialize empty pipeline + schedule.

- Auth: operator
- Body:

```json
{
  "id": "optional-custom-id",
  "country": "US",
  "target_url": "https://example.com",
  "archetype": "static",
  "cron": "0 * * * *",
  "status": "Active"
}
```

- Returns: `201 { config }`
- Errors:
  - `400` invalid body/cron
  - `409` duplicate id

## `GET /api/config/:id`

Get config and pipeline graph.

- Auth: operator
- Response:

```json
{
  "config": {},
  "pipeline": { "version": 1, "nodes": [], "edges": [] }
}
```

## `PATCH /api/config/:id`

Update config metadata and/or pipeline graph.

- Auth: operator
- Body:

```json
{
  "country": "US",
  "target_url": "https://example.com",
  "archetype": "spa",
  "cron": "*/15 * * * *",
  "status": "Active",
  "pipeline": {
    "nodes": [],
    "edges": []
  }
}
```

- Notes:
  - `pipeline.nodes/edges` are normalized server-side.
  - scheduler registration is updated when config changes.

## `DELETE /api/config/:id`

Delete config and associated data (pipeline/documents/schedules/runs/snapshots).

- Auth: operator
- Response: `{ ok: true }`

## `POST /api/run/:id`

Trigger a manual pipeline run for config.

- Auth: operator
- Behavior:
  - If local executor disabled, run is enqueued and returns `202`.
  - Otherwise executes immediately and returns run result + log id.
- Responses:
  - `202 { accepted: true, queued: true, message }`
  - `200 { result, logId }`

## `GET /api/runs`

List run logs with optional filters.

- Auth: operator
- Query params:
  - `configId` (optional)
  - `triggerType` (`manual | cron`, optional)
  - `limit` (default 50, max 200)
- Response: `{ runs: PipelineRunLog[] }`

## `GET /api/runs/:runId`

Get one run log + ordered run events.

- Auth: operator
- Response: `{ run, events }`

## `GET /api/runs/:runId/stream`

Server-Sent Events stream for run events.

- Auth: operator
- Content-Type: `text/event-stream`
- Emits event types:
  - `submit`
  - `completion`
  - `error`
  - `output`

## `GET /api/metrics`

Dashboard metrics derived from run logs.

- Auth: operator
- Response:

```json
{
  "totalRuns": 0,
  "totalCronRuns": 0,
  "cronSuccess": 0,
  "cronFailed": 0,
  "manualRuns": 0,
  "lastRunAt": null,
  "recentFailures": []
}
```

## `GET /api/node-catalog`

Fetch node catalog that powers workflow builder palette.

- Auth: operator
- Source:
  - Prisma `NodeCatalog` when DB enabled and rows exist
  - fallback built-in catalog
- Response: `{ entries: NodeCatalogEntry[] }`

## `GET /api/documents/:id`

List generated documents for a config.

- Auth: operator
- Response:

```json
{
  "documents": [
    {
      "id": "doc-1",
      "name": "output.txt",
      "createdAt": "ISO",
      "downloadUrl": "/api/documents/:id/download/:docId",
      "runId": "run-id-or-null",
      "triggerType": "manual|cron|null"
    }
  ]
}
```

## `GET /api/documents/:id/download/:docId`

Download a specific document body.

- Auth: operator
- Response: file body with content headers

## `GET /api/diff/:id`

Get current vs previous document body plus latest run metadata.

- Auth: operator
- Response:

```json
{
  "previous": "",
  "current": "",
  "runs": []
}
```

---

## Internal API Endpoints

These are backend-to-backend endpoints for orchestrators/workers. Do not expose publicly without network controls.

## `POST /api/internal/cron-tick`

Timer endpoint to evaluate due cron schedules and enqueue runs.

- Auth: internal
- Response: `{ ok: true }`

## `POST /api/internal/run-pipeline-sync`

Run full pipeline synchronously and persist run log/events.

- Auth: internal
- Body:

```json
{
  "correlationId": "optional-uuid",
  "configId": "cfg-id",
  "triggerType": "manual",
  "startedAt": "optional-iso"
}
```

- Response: `{ result, logId }`

## `POST /api/internal/execute-node`

Execute a single node with explicit upstream payload.

- Auth: internal
- Body:

```json
{
  "config": { "id": "cfg", "country": "", "target_url": "", "archetype": "static", "cron": "* * * * *", "status": "Active" },
  "node": {
    "id": "n1",
    "type": "http",
    "position": { "x": 0, "y": 0 },
    "data": { "config": { "url": "https://example.com" }, "handlerId": "http", "handlerVersion": "1.0.0" }
  },
  "upstream": {}
}
```

- Response:

```json
{
  "nodeId": "n1",
  "type": "http",
  "ok": true,
  "output": "..."
}
```

## `POST /api/internal/pipeline-complete`

Persist run completion payload from external orchestrator.

- Auth: internal
- Body:

```json
{
  "correlationId": "optional-uuid",
  "configId": "cfg-id",
  "triggerType": "cron",
  "startedAt": "ISO",
  "result": {
    "configId": "cfg-id",
    "ok": true,
    "orderedNodeIds": [],
    "nodeResults": [],
    "finalOutput": {}
  },
  "pipelineSnapshot": { "version": 1, "nodes": [], "edges": [] }
}
```

- Response: `{ ok: true, logId }`

---

## Typical Agent Flow

1. `GET /api/configs`
2. `GET /api/config/:id`
3. edit graph (nodes/edges)
4. `PATCH /api/config/:id` with updated pipeline
5. `POST /api/run/:id`
6. poll `GET /api/runs?configId=:id&limit=1` or stream `/api/runs/:runId/stream`
7. fetch outputs from `/api/documents/:id` and `/api/diff/:id`

---

## cURL Examples

## Operator request

```bash
curl -sS "http://localhost:3000/api/configs" \
  -H "Authorization: Bearer $OPERATOR_API_TOKEN"
```

## Patch pipeline

```bash
curl -sS -X PATCH "http://localhost:3000/api/config/cfg-seed-1" \
  -H "Authorization: Bearer $OPERATOR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline": {
      "nodes": [],
      "edges": []
    }
  }'
```

## Internal run sync

```bash
curl -sS -X POST "http://localhost:3000/api/internal/run-pipeline-sync" \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"configId":"cfg-seed-1","triggerType":"manual"}'
```
