import type { Edge, Node } from "@xyflow/react";

/** Built-in handler ids; catalog may add more at runtime. */
export type PipelineNodeType =
  | "http"
  | "extract"
  | "transform"
  | "diff"
  | "storage"
  | "python_scrape"
  | "browser_scrape"
  | "js_script"
  | "external_api_scrape";

/** Node payload; handlerId pins catalog version for durable runs. */
export interface PipelineNodePayload extends Record<string, unknown> {
  config: Record<string, unknown>;
  handlerId?: string;
  handlerVersion?: string;
}

export type PipelineReactFlowNode = Node<PipelineNodePayload, string>;

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
