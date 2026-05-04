import { getPrisma, isPrismaEnabled } from "@/lib/prisma";
import type { PipelineRunLog, PipelineRunResult } from "@/types/config";

export type RunEventType = "submit" | "completion" | "error" | "output";

export interface RunEventRecord {
  id: string;
  runId: string;
  seq: number;
  type: RunEventType;
  nodeId: string | null;
  payload: unknown;
  createdAt: string;
}

export const runEventService = {
  async listByRunId(runId: string): Promise<RunEventRecord[]> {
    if (!isPrismaEnabled()) return [];
    const prisma = getPrisma();
    const rows = await prisma.runEvent.findMany({
      where: { runId },
      orderBy: { seq: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      runId: r.runId,
      seq: r.seq,
      type: r.type as RunEventType,
      nodeId: r.nodeId,
      payload: r.payload ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  async recordFromPipelineResult(args: {
    runId: string;
    result: PipelineRunResult;
    log: PipelineRunLog;
  }): Promise<void> {
    if (!isPrismaEnabled()) return;
    const prisma = getPrisma();
    const { runId, result, log } = args;
    const events: { seq: number; type: RunEventType; nodeId: string | null; payload: unknown }[] =
      [];
    let seq = 0;
    events.push({
      seq: seq++,
      type: "submit",
      nodeId: null,
      payload: { triggerType: log.triggerType, orderedNodeIds: result.orderedNodeIds },
    });
    for (const nr of result.nodeResults) {
      events.push({
        seq: seq++,
        type: nr.ok ? "completion" : "error",
        nodeId: nr.nodeId,
        payload: nr.ok ? { output: nr.output } : { error: nr.error },
      });
    }
    events.push({
      seq: seq++,
      type: "output",
      nodeId: null,
      payload: { ok: result.ok, finalOutput: result.finalOutput },
    });
    await prisma.runEvent.deleteMany({ where: { runId } });
    await prisma.runEvent.createMany({
      data: events.map((e) => ({
        runId,
        seq: e.seq,
        type: e.type,
        nodeId: e.nodeId,
        payload: e.payload as object,
      })),
    });
  },
};
