import { NextResponse } from "next/server";

import { runLogService } from "@/lib/services/runLogService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";

export async function GET() {
  ensureSchedulerBooted();
  const metrics = await runLogService.getMetrics();
  return NextResponse.json(metrics);
}
