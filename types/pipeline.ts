import type { Edge, Node } from "@xyflow/react";

export type PipelineNodeType =
  | "http"
  | "extract"
  | "transform"
  | "diff"
  | "storage";

/** Strict node payload aligned with execution handlers */
export interface PipelineNodePayload extends Record<string, unknown> {
  config: Record<string, unknown>;
}

export type PipelineReactFlowNode = Node<PipelineNodePayload, PipelineNodeType>;

export interface PipelineEdgePersist {
  source: string;
  target: string;
  id?: string;
}

export interface PipelinePersist {
  nodes: PipelineReactFlowNode[];
  edges: Edge[];
}

export interface HttpNodeConfig {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string> | string;
}

export interface ExtractNodeConfig {
  selector: string;
  attribute: "text" | "html" | string;
}

export type TransformOperation =
  | "regex_replace"
  | "trim"
  | "lowercase";

export interface TransformNodeConfig {
  operation: TransformOperation;
  parameters?: Record<string, unknown>;
}

export interface DiffNodeConfig {
  strategy: "text" | "json";
}

export interface StorageNodeConfig {
  container: string;
  format: "json" | "text";
}
