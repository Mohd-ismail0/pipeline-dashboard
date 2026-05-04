import { NextResponse } from "next/server";

import { blobService } from "@/lib/services/blobService";
import { runLogService } from "@/lib/services/runLogService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  ensureSchedulerBooted();
  const { id } = await ctx.params;
  const { previous, current } = await blobService.getPreviousAndCurrentBodies(id);
  const logs = await runLogService.list({ configId: id, limit: 2 });
  return NextResponse.json({
    previous: previous ?? "",
    current: current ?? "",
    runs: logs,
  });
}
