import { NextResponse } from "next/server";
import { z } from "zod";

import { persistPipelineRun } from "@/lib/services/pipelineRunner";
import type { PipelinePersist } from "@/types/pipeline";
import type { PipelineRunResult, RunTriggerType } from "@/types/config";

const bodySchema = z.object({
  configId: z.string(),
  triggerType: z.enum(["manual", "cron"]),
  startedAt: z.string(),
  result: z.custom<PipelineRunResult>(),
  pipelineSnapshot: z.custom<PipelinePersist>().optional(),
});

function authorize(req: Request) {
  const expected = process.env.INTERNAL_API_SECRET?.trim();
  const got =
    req.headers.get("x-internal-secret")?.trim() ?? new URL(req.url).searchParams.get("secret");
  return Boolean(expected && got === expected);
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { configId, triggerType, startedAt, result, pipelineSnapshot } = parsed.data;
  const { logId } = await persistPipelineRun({
    configId,
    triggerType: triggerType as RunTriggerType,
    startedAt,
    result,
    pipelineSnapshot,
  });
  return NextResponse.json({ ok: true, logId });
}
