import { NextResponse } from "next/server";

import { runPipelineForConfig } from "@/lib/services/pipelineRunner";
import { queueService } from "@/lib/services/queueService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";
import { readAppState, updateAppState } from "@/lib/store/jsonStore";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteParams) {
  ensureSchedulerBooted();
  const { id } = await ctx.params;
  const state = await readAppState();
  if (!state.configs.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await queueService.enqueue({
    type: "run-pipeline",
    configId: id,
    triggerType: "manual",
    enqueuedAt: new Date().toISOString(),
  });

  try {
    const { result, logId } = await runPipelineForConfig({
      configId: id,
      triggerType: "manual",
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
