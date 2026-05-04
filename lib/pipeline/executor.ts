import type { PipelineRunResult, ScrapingConfig } from "@/types/config";
import type { PipelinePersist } from "@/types/pipeline";
import type { Edge, Node } from "@xyflow/react";

import { nodeHandlers, type PipelineNode } from "./nodeHandlers";

function topoSort(nodes: Node[], edges: Edge[]): { order: string[]; error?: string } {
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

function mergeUpstreamParts(parts: unknown[]): unknown {
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  if (parts.every((p) => typeof p === "string")) return parts.join("\n");
  return parts;
}

function incomingMap(edges: Edge[], nodeIds: Set<string>) {
  const map = new Map<string, string[]>();
  for (const id of nodeIds) map.set(id, []);
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    map.get(e.target)!.push(e.source);
  }
  for (const [, arr] of map) arr.sort();
  return map;
}

export async function executePipeline(args: {
  config: ScrapingConfig;
  pipeline: PipelinePersist;
}): Promise<PipelineRunResult> {
  const { config, pipeline } = args;
  const nodes = pipeline.nodes ?? [];
  const edges = pipeline.edges ?? [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const { order, error } = topoSort(nodes as unknown as Node[], edges);
  if (error) {
    return {
      configId: config.id,
      ok: false,
      orderedNodeIds: [],
      nodeResults: [
        {
          nodeId: "__pipeline__",
          type: "error",
          ok: false,
          error,
        },
      ],
      finalOutput: undefined,
    };
  }

  const incoming = incomingMap(edges, nodeIds);
  const outputs = new Map<string, unknown>();
  const nodeResults: PipelineRunResult["nodeResults"] = [];

  for (const id of order) {
    const node = nodeById.get(id);
    if (!node) continue;
    const type = node.type as PipelineNode["type"];
    const parents = incoming.get(id) ?? [];
    const parts = parents.map((p) => outputs.get(p)).filter((v) => v !== undefined);
    const upstream = mergeUpstreamParts(parts);

    const handler = nodeHandlers[type];
    if (!handler) {
      nodeResults.push({
        nodeId: id,
        type,
        ok: false,
        error: `No handler for node type: ${type}`,
      });
      return {
        configId: config.id,
        ok: false,
        orderedNodeIds: order,
        nodeResults,
        finalOutput: undefined,
      };
    }

    const res = await handler({ config, upstream }, node as PipelineNode);
    if (!res.ok) {
      nodeResults.push({
        nodeId: id,
        type,
        ok: false,
        error: res.error,
      });
      return {
        configId: config.id,
        ok: false,
        orderedNodeIds: order,
        nodeResults,
        finalOutput: undefined,
      };
    }
    outputs.set(id, res.output);
    nodeResults.push({ nodeId: id, type, ok: true, output: res.output });
  }

  const lastId = order[order.length - 1];
  return {
    configId: config.id,
    ok: true,
    orderedNodeIds: order,
    nodeResults,
    finalOutput: lastId ? outputs.get(lastId) : undefined,
  };
}
