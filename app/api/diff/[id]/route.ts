import { NextResponse } from "next/server";

import { requireOperatorAuth } from "@/lib/auth/apiAuth";
import { blobService } from "@/lib/services/blobService";
import { runLogService } from "@/lib/services/runLogService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const deny = requireOperatorAuth(_req);
  if (deny) return deny;
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
