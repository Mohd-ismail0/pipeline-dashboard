# Pipeline Builder UX Guide

This dashboard now follows a lightweight "n8n-style" editing flow while keeping your current backend contracts and runtime strategy.

## What changed

- Click any node to open a right-side inspector.
- Rename a node using **Node label**.
- Change a node runtime using **Node type** (HTTP, Python scrape, Browser scrape, JS script, etc).
- Duplicate or delete a node directly from the inspector.
- Right-click any node for context actions: edit, duplicate, delete, or replace.
- Add nodes either by drag-drop or by clicking the **+** button in the node palette.
- Click an edge, then use **Delete selected connection** to remove it.
- Use keyboard shortcuts:
  - `Ctrl/Cmd + D` duplicates selected node
  - `Delete`/`Backspace` deletes selected node or edge

## Editing behavior

- Changing **Node type** resets that node config to defaults for that handler.
- **Replace node (keep connections)** changes handler/config in place while preserving incoming/outgoing edges.
- Node cards show both:
  - Human-readable label (editable)
  - Runtime handler id (source of execution truth)
- Saved pipeline snapshots persist `data.handlerId` and `data.label`.
- Validation still blocks invalid save states (missing required URL/selector/container, invalid JSON).

## Why this approach vs full n8n embed

We intentionally adopted n8n interaction patterns (rename, duplicate, delete, connection-level edits) without embedding n8n itself. This keeps:

- Existing Next.js + Azure architecture intact
- Current API contracts and observability model unchanged
- Lower integration risk and faster iteration

A full n8n runtime embed would require migration of workflow schema, execution engine, auth model, and deployment topology.

## Future enhancements (recommended)

- Node context menu (right click) for replace, duplicate, disable.
- Multi-select edit actions (bulk move/delete/group).
- Keyboard shortcuts (`Del` to remove selected nodes/edges, `Ctrl+D` duplicate).
- Replace-node flow that preserves existing incoming/outgoing edges.
- Node-level execution policies (continue on fail, retry, timeout) in inspector.
