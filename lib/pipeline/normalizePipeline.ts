import type { Edge, Node } from "@xyflow/react";

import type { PipelinePersist, PipelineReactFlowNode } from "@/types/pipeline";

type UnknownNode = Partial<Node<Record<string, unknown>, string>>;
type UnknownEdge = Partial<Edge>;

function cleanNode(node: UnknownNode): PipelineReactFlowNode {
  const rawData =
    node.data && typeof node.data === "object" ? (node.data as Record<string, unknown>) : {};
  const config = (rawData.config as Record<string, unknown>) ?? {};
  const handlerId = typeof rawData.handlerId === "string" ? rawData.handlerId : undefined;
  const handlerVersion =
    typeof rawData.handlerVersion === "string" ? rawData.handlerVersion : undefined;
  const label = typeof rawData.label === "string" ? rawData.label : undefined;
  const rfType = String(node.type ?? "http");
  return {
    id: String(node.id ?? ""),
    type: rfType,
    position: {
      x: Number(node.position?.x ?? 0),
      y: Number(node.position?.y ?? 0),
    },
    data: {
      config,
      ...(handlerId ? { handlerId, handlerVersion } : {}),
      ...(label ? { label } : {}),
    },
  };
}

function cleanEdge(edge: UnknownEdge): Edge {
  return {
    id: String(edge.id ?? `${String(edge.source)}-${String(edge.target)}`),
    source: String(edge.source ?? ""),
    target: String(edge.target ?? ""),
  };
}

export function normalizePipeline(input: {
  nodes?: unknown[];
  edges?: unknown[];
}): PipelinePersist {
  const rawNodes = Array.isArray(input.nodes) ? input.nodes : [];
  const rawEdges = Array.isArray(input.edges) ? input.edges : [];

  const nodes = rawNodes
    .map((n) => cleanNode(n as UnknownNode))
    .filter((n) => Boolean(n.id));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges = rawEdges
    .map((e) => cleanEdge(e as UnknownEdge))
    .filter((e) => e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target));

  return { nodes, edges };
}
