export type ConfigStatus = "Active" | "Paused" | "Error";

export type Archetype = "static" | "spa" | "shadow_dom";

export interface ScrapingConfig {
  id: string;
  country: string;
  target_url: string;
  archetype: Archetype;
  cron: string;
  status: ConfigStatus;
}

export interface ExecutionInput {
  target_url: string;
}

export interface ExecutionContext {
  input: ExecutionInput;
  /** Accumulated named outputs (optional extension point) */
  output: Record<string, unknown>;
}

export interface NodeRunResult {
  nodeId: string;
  type: string;
  ok: boolean;
  output?: unknown;
  error?: string;
}

export interface PipelineRunResult {
  configId: string;
  ok: boolean;
  orderedNodeIds: string[];
  nodeResults: NodeRunResult[];
  finalOutput?: unknown;
}
