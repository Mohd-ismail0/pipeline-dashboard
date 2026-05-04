import { NextResponse } from "next/server";

import { runEventService } from "@/lib/services/runEventService";
import { readAppState } from "@/lib/store/appStore";

type RouteParams = { params: Promise<{ runId: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { runId } = await ctx.params;
  const state = await readAppState();
  const log = state.runLogs.find((r) => r.id === runId);
  if (!log) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const events = await runEventService.listByRunId(runId);
  return NextResponse.json({ run: log, events });
}
