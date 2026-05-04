import { z } from "zod";

export const configSchema = z.object({
  id: z.string(),
  country: z.string(),
  target_url: z.string(),
  archetype: z.enum(["static", "spa", "shadow_dom"]),
  cron: z.string(),
  status: z.enum(["Active", "Paused", "Error"]),
});

export const pipelineNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    config: z.record(z.string(), z.unknown()),
    handlerId: z.string().optional(),
    handlerVersion: z.string().optional(),
  }),
});

export const pipelineEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const pipelinePersistSchema = z.object({
  version: z.literal(1).optional(),
  nodes: z.array(pipelineNodeSchema),
  edges: z.array(pipelineEdgeSchema),
});

export const nodeRunResultSchema = z.object({
  nodeId: z.string(),
  type: z.string(),
  ok: z.boolean(),
  output: z.unknown().optional(),
  error: z.string().optional(),
});

export const pipelineRunResultSchema = z.object({
  configId: z.string(),
  ok: z.boolean(),
  orderedNodeIds: z.array(z.string()),
  nodeResults: z.array(nodeRunResultSchema),
  finalOutput: z.unknown().optional(),
});

