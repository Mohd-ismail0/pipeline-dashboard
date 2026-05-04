import { NextResponse } from "next/server";

import { runLogService } from "@/lib/services/runLogService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";
import type { RunTriggerType } from "@/types/config";

export async function GET(req: Request) {
  ensureSchedulerBooted();
  const { searchParams } = new URL(req.url);
  const configId = searchParams.get("configId") || undefined;
  const trigger = searchParams.get("triggerType") as RunTriggerType | null;
  const limit = Number(searchParams.get("limit") ?? "50");
  const runs = await runLogService.list({
    configId,
    triggerType: trigger === "cron" || trigger === "manual" ? trigger : undefined,
    limit: Number.isFinite(limit) ? limit : 50,
  });
  return NextResponse.json({ runs });
}
