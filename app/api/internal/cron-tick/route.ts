import { NextResponse } from "next/server";

import { runSchedulerTickOnce } from "@/lib/services/schedulerService";

function authorize(req: Request) {
  const expected = process.env.INTERNAL_API_SECRET?.trim();
  const got = req.headers.get("x-internal-secret")?.trim();
  return Boolean(expected && got === expected);
}

/** Azure Timer Trigger (or external scheduler) calls this to enqueue due cron runs. */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await runSchedulerTickOnce();
  return NextResponse.json({ ok: true });
}
