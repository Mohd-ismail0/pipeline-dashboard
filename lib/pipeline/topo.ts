import type { Edge, Node } from "@xyflow/react";

export function topoSort(nodes: Node[], edges: Edge[]): { order: string[]; error?: string } {
  const ids = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const q: string[] = [];
  for (const [id, d] of indeg) if (d === 0) q.push(id);
  q.sort();
  const order: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    const outs = adj.get(id) ?? [];
    outs.sort();
    for (const t of outs) {
      const next = (indeg.get(t) ?? 0) - 1;
      indeg.set(t, next);
      if (next === 0) q.push(t);
    }
    q.sort();
  }
  if (order.length !== nodes.length) {
    return { order: [], error: "Pipeline graph has a cycle or disconnected nodes" };
  }
  return { order };
}

export function incomingMap(edges: Edge[], nodeIds: Set<string>) {
  const map = new Map<string, string[]>();
  for (const id of nodeIds) map.set(id, []);
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    map.get(e.target)!.push(e.source);
  }
  for (const [, arr] of map) arr.sort();
  return map;
}

export function mergeUpstreamParts(parts: unknown[]): unknown {
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  if (parts.every((p) => typeof p === "string")) return parts.join("\n");
  return parts;
}
