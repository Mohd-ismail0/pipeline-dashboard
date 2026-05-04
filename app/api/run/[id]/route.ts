import { NextResponse } from "next/server";

import { requireOperatorAuth } from "@/lib/auth/apiAuth";
import {
  azureStorageConfigured,
  localPipelineExecutionEnabled,
  remoteOrchestratorStartUrl,
} from "@/lib/env/execution";
import { runPipelineForConfig } from "@/lib/services/pipelineRunner";
import { enqueueRunPipelineMessage } from "@/lib/services/runEnqueueService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";
import { EMPTY_PIPELINE } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/appStore";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteParams) {
  const deny = requireOperatorAuth(_req);
  if (deny) return deny;
  ensureSchedulerBooted();
  const { id } = await ctx.params;
  const state = await readAppState();
  if (!state.configs.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pipeline = state.pipelines[id] ?? EMPTY_PIPELINE;

  if (!localPipelineExecutionEnabled()) {
    const correlationId = crypto.randomUUID();
    const idempotencyKey = `manual:${id}:${new Date().toISOString().slice(0, 16)}`;
    const enqueued = await enqueueRunPipelineMessage({
      kind: "RunPipeline",
      correlationId,
      idempotencyKey,
      configId: id,
      triggerType: "manual",
      enqueuedAt: new Date().toISOString(),
      pipelineSnapshot: pipeline,
    });
    if (enqueued || azureStorageConfigured() || remoteOrchestratorStartUrl()) {
      return NextResponse.json(
        { accepted: true, queued: true, message: "Run enqueued for orchestrator" },
        { status: 202 },
      );
    }
  }

  try {
    const correlationId = crypto.randomUUID();
    const { result, logId } = await runPipelineForConfig({
      configId: id,
      triggerType: "manual",
      correlationId,
    });
    return NextResponse.json({ result, logId });
  } catch (error) {
    await updateAppState((s) => {
      const idx = s.configs.findIndex((c) => c.id === id);
      if (idx >= 0) {
        s.configs[idx] = { ...s.configs[idx], status: "Error" };
      }
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 },
    );
  }
}
