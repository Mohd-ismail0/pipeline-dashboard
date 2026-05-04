# Diff Checker Azure Function

HTTP service that compares two strings or JSON-compatible structures and returns normalized display values, line stats, and a unified diff.

## Contract

`POST /api/diff`

```json
{
  "previous": "<html>old</html>",
  "current": "<html>new</html>"
}
```

`previous` and `current` may also be JSON objects or arrays. Object keys are sorted before comparison so equivalent object structures do not diff only because of key order.

Response:

```json
{
  "previous": "...",
  "current": "...",
  "stats": {
    "addedLines": 1,
    "removedLines": 1,
    "unchangedLines": 10,
    "totalLines": 11,
    "changedLines": 2,
    "similarity": 0.91,
    "hasChanges": true
  },
  "unifiedDiff": "--- previous\n+++ current\n ..."
}
```

## Local Run

```bash
npm install
npm test
npm start
```

Set the dashboard to use the function:

```bash
DIFF_SERVICE_URL=http://localhost:7071/api/diff
DIFF_SERVICE_KEY=<optional-function-key>
```

If `DIFF_SERVICE_URL` is not set, the Next.js API route uses the same local comparison behavior as a fallback.
