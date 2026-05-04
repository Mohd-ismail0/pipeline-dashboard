export type ConfigStatus = "Active" | "Paused" | "Error";

export type Archetype = "static" | "spa" | "shadow_dom";

export type RunTriggerType = "manual" | "cron";

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

export interface PipelineRunLog {
  id: string;
  configId: string;
  triggerType: RunTriggerType;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  ok: boolean;
  error?: string;
  orderedNodeIds: string[];
  nodeResults: NodeRunResult[];
  documentId?: string;
  /** Immutable graph + handler pins at run start (production / durable). */
  pipelineSnapshot?: unknown;
}
