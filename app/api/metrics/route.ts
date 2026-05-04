import { NextResponse } from "next/server";

import { requireOperatorAuth } from "@/lib/auth/apiAuth";
import { runLogService } from "@/lib/services/runLogService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";

export async function GET(req: Request) {
  const deny = requireOperatorAuth(req);
  if (deny) return deny;
  ensureSchedulerBooted();
  const metrics = await runLogService.getMetrics();
  return NextResponse.json(metrics);
}
