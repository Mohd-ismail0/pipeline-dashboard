## Pipeline Dashboard

Frontend + API control plane for a backend scraping workflow system.

- Dashboard edits configs and pipeline graphs.
- Backend APIs persist state, trigger runs, stream run events, and serve artifacts.
- Execution can run locally or via Azure queue/orchestrator workers.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Documentation

- API reference (all routes, auth, payloads):
  - `docs/api-reference.md`
- AI agent operational guide:
  - `docs/ai-agent-playbook.md`
- Pipeline builder UX guide:
  - `docs/pipeline-builder-ux.md`

## API Summary

Operator APIs:

- `GET/POST /api/configs`
- `GET/PATCH/DELETE /api/config/:id`
- `POST /api/run/:id`
- `GET /api/runs`
- `GET /api/runs/:runId`
- `GET /api/runs/:runId/stream` (SSE)
- `GET /api/metrics`
- `GET /api/node-catalog`
- `GET /api/documents/:id`
- `GET /api/documents/:id/download/:docId`
- `GET /api/diff/:id`

Internal APIs:

- `POST /api/internal/cron-tick`
- `POST /api/internal/run-pipeline-sync`
- `POST /api/internal/execute-node`
- `POST /api/internal/pipeline-complete`

Auth:

- Operator routes: `Authorization: Bearer <OPERATOR_API_TOKEN>`
- Internal routes: `x-internal-secret: <INTERNAL_API_SECRET>`

See `.env.example` for all runtime and execution flags.
