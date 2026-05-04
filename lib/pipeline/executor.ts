import type { PipelineRunResult, ScrapingConfig } from "@/types/config";
import type { PipelinePersist, PipelineReactFlowNode } from "@/types/pipeline";
import type { Edge, Node } from "@xyflow/react";

import { nodeHandlers, type PipelineNode } from "./nodeHandlers";
import { incomingMap, mergeUpstreamParts, topoSort } from "./topo";

export function resolveHandlerId(node: PipelineNode): string {
  const data = node.data as Record<string, unknown> | undefined;
  const h = data?.handlerId;
  if (typeof h === "string" && h.trim()) return h.trim();
  return String(node.type ?? "");
}

export async function executeSingleNode(args: {
  config: ScrapingConfig;
  node: PipelineReactFlowNode;
  upstream: unknown;
}): Promise<{
  nodeId: string;
  type: string;
  ok: boolean;
  output?: unknown;
  error?: string;
}> {
  const { config, node, upstream } = args;
  const id = node.id;
  const handlerId = resolveHandlerId(node as PipelineNode);
  const handler = nodeHandlers[handlerId];
  if (!handler) {
    return {
      nodeId: id,
      type: handlerId,
      ok: false,
      error: `No handler for node: ${handlerId}`,
    };
  }
  const res = await handler({ config, upstream }, node as PipelineNode);
  if (!res.ok) {
    return { nodeId: id, type: handlerId, ok: false, error: res.error };
  }
  return { nodeId: id, type: handlerId, ok: true, output: res.output };
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
    const handlerId = resolveHandlerId(node as PipelineNode);
    const parents = incoming.get(id) ?? [];
    const parts = parents.map((p) => outputs.get(p)).filter((v) => v !== undefined);
    const upstream = mergeUpstreamParts(parts);

    const single = await executeSingleNode({
      config,
      node: node as PipelineReactFlowNode,
      upstream,
    });
    if (!single.ok) {
      nodeResults.push({
        nodeId: single.nodeId,
        type: single.type,
        ok: false,
        error: single.error,
      });
      return {
        configId: config.id,
        ok: false,
        orderedNodeIds: order,
        nodeResults,
        finalOutput: undefined,
      };
    }
    outputs.set(id, single.output);
    nodeResults.push({
      nodeId: single.nodeId,
      type: single.type,
      ok: true,
      output: single.output,
    });
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
