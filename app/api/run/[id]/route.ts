import { NextResponse } from "next/server";

import { executePipeline } from "@/lib/pipeline/executor";
import { queueService } from "@/lib/services/queueService";
import { EMPTY_PIPELINE } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/jsonStore";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const state = await readAppState();
  const config = state.configs.find((c) => c.id === id);
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await queueService.enqueue({
    type: "run-pipeline",
    configId: id,
    enqueuedAt: new Date().toISOString(),
  });

  const pipeline = state.pipelines[id] ?? EMPTY_PIPELINE;
  const result = await executePipeline({ config, pipeline });

  if (!result.ok) {
    await updateAppState((s) => {
      const idx = s.configs.findIndex((c) => c.id === id);
      if (idx >= 0) s.configs[idx] = { ...s.configs[idx]!, status: "Error" };
    });
  } else {
    await updateAppState((s) => {
      const idx = s.configs.findIndex((c) => c.id === id);
      if (idx >= 0 && s.configs[idx]!.status === "Error") {
        s.configs[idx] = { ...s.configs[idx]!, status: "Active" };
      }
    });
  }

  return NextResponse.json({ result });
}
