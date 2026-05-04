import { executePipeline } from "@/lib/pipeline/executor";
import { remoteOrchestratorStartUrl, useLocalExecutor } from "@/lib/env/execution";
import { EMPTY_PIPELINE } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/appStore";
import type { PipelinePersist } from "@/types/pipeline";
import type { PipelineRunResult, RunTriggerType } from "@/types/config";

import { runLogService } from "./runLogService";

function pickDocumentId(result: PipelineRunResult): string | undefined {
  for (const item of result.nodeResults) {
    const output = item.output as Record<string, unknown> | undefined;
    if (output && typeof output.documentId === "string") {
      return output.documentId;
    }
  }
  return undefined;
}

/** Persist run outcome + config status + run log + optional fal-style events (Prisma). */
export async function persistPipelineRun(args: {
  configId: string;
  triggerType: RunTriggerType;
  startedAt: string;
  result: PipelineRunResult;
  pipelineSnapshot?: PipelinePersist;
}): Promise<{ logId: string }> {
  const { configId, triggerType, startedAt, result, pipelineSnapshot } = args;
  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - new Date(startedAt).getTime();

  await updateAppState((s) => {
    const idx = s.configs.findIndex((c) => c.id === configId);
    if (idx < 0) return;
    if (!result.ok) {
      s.configs[idx] = { ...s.configs[idx], status: "Error" };
      return;
    }
    if (s.configs[idx].status === "Error") {
      s.configs[idx] = { ...s.configs[idx], status: "Active" };
    }
  });

  const log = await runLogService.append({
    configId,
    triggerType,
    startedAt,
    endedAt,
    durationMs,
    ok: result.ok,
    error: result.ok ? undefined : result.nodeResults.find((r) => !r.ok)?.error,
    orderedNodeIds: result.orderedNodeIds,
    nodeResults: result.nodeResults,
    documentId: pickDocumentId(result),
    pipelineSnapshot,
    finalOutput: result.finalOutput,
  });

  return { logId: log.id };
}

export async function runPipelineForConfig(args: {
  configId: string;
  triggerType: RunTriggerType;
}): Promise<{ result: PipelineRunResult; logId: string }> {
  const start = Date.now();
  const startedAt = new Date(start).toISOString();
  const state = await readAppState();
  const config = state.configs.find((c) => c.id === args.configId);
  if (!config) {
    throw new Error("Config not found");
  }
  const pipeline = state.pipelines[args.configId] ?? EMPTY_PIPELINE;

  const remoteUrl = remoteOrchestratorStartUrl();
  if (!useLocalExecutor() && remoteUrl) {
    const res = await fetch(remoteUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config,
        pipeline,
        triggerType: args.triggerType,
        startedAt,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Orchestrator error ${res.status}: ${text.slice(0, 500)}`);
    }
    const body = (await res.json()) as { logId: string; result: PipelineRunResult };
    return { result: body.result, logId: body.logId };
  }

  const result = await executePipeline({ config, pipeline });
  const { logId } = await persistPipelineRun({
    configId: args.configId,
    triggerType: args.triggerType,
    startedAt,
    result,
    pipelineSnapshot: pipeline,
  });
  return { result, logId };
}
