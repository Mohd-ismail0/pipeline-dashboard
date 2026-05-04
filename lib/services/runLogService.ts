import { randomUUID } from "crypto";

import { readAppState, updateAppState } from "@/lib/store/appStore";
import { runEventService } from "@/lib/services/runEventService";
import type { PipelineRunLog, PipelineRunResult, RunTriggerType } from "@/types/config";

export interface CreateRunLogInput {
  configId: string;
  triggerType: RunTriggerType;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  ok: boolean;
  error?: string;
  orderedNodeIds: string[];
  nodeResults: PipelineRunLog["nodeResults"];
  documentId?: string;
  pipelineSnapshot?: unknown;
  finalOutput?: unknown;
}

export const runLogService = {
  async append(input: CreateRunLogInput): Promise<PipelineRunLog> {
    const { finalOutput, ...rest } = input;
    const log: PipelineRunLog = {
      id: randomUUID(),
      ...rest,
    };
    await updateAppState((s) => {
      s.runLogs.push(log);
      s.runLogs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      if (s.runLogs.length > 1000) {
        s.runLogs = s.runLogs.slice(0, 1000);
      }
    });
    const result: PipelineRunResult = {
      configId: input.configId,
      ok: input.ok,
      orderedNodeIds: input.orderedNodeIds,
      nodeResults: input.nodeResults,
      finalOutput,
    };
    await runEventService.recordFromPipelineResult({
      runId: log.id,
      result,
      log,
    });
    return log;
  },

  async list(args?: {
    configId?: string;
    triggerType?: RunTriggerType;
    limit?: number;
  }): Promise<PipelineRunLog[]> {
    const state = await readAppState();
    let out = [...state.runLogs];
    if (args?.configId) out = out.filter((r) => r.configId === args.configId);
    if (args?.triggerType) out = out.filter((r) => r.triggerType === args.triggerType);
    const limit = Math.max(1, Math.min(200, args?.limit ?? 50));
    return out.slice(0, limit);
  },

  async getMetrics() {
    const state = await readAppState();
    const logs = state.runLogs;
    const cron = logs.filter((l) => l.triggerType === "cron");
    const manual = logs.filter((l) => l.triggerType === "manual");
    const cronSuccess = cron.filter((l) => l.ok).length;
    const cronFailed = cron.length - cronSuccess;
    return {
      totalRuns: logs.length,
      totalCronRuns: cron.length,
      cronSuccess,
      cronFailed,
      manualRuns: manual.length,
      lastRunAt: logs[0]?.endedAt ?? null,
      recentFailures: logs.filter((l) => !l.ok).slice(0, 5),
    };
  },
};
