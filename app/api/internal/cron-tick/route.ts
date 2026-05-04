import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/auth/apiAuth";
import { runSchedulerTickOnce } from "@/lib/services/schedulerService";

/** Azure Timer Trigger (or external scheduler) calls this to enqueue due cron runs. */
export async function POST(req: Request) {
  const deny = requireInternalAuth(req);
  if (deny) return deny;
  await runSchedulerTickOnce();
  return NextResponse.json({ ok: true });
}
