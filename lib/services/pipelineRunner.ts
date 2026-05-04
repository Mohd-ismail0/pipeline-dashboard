import { executePipeline } from "@/lib/pipeline/executor";
import { EMPTY_PIPELINE } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/jsonStore";
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
  const result = await executePipeline({ config, pipeline });

  await updateAppState((s) => {
    const idx = s.configs.findIndex((c) => c.id === args.configId);
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
    configId: args.configId,
    triggerType: args.triggerType,
    startedAt,
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    ok: result.ok,
    error: result.ok ? undefined : result.nodeResults.find((r) => !r.ok)?.error,
    orderedNodeIds: result.orderedNodeIds,
    nodeResults: result.nodeResults,
    documentId: pickDocumentId(result),
  });

  return { result, logId: log.id };
}
