import { NextResponse } from "next/server";
import { z } from "zod";

import { persistRemotePipelineRun } from "@/lib/services/pipelineRunner";
import type { PipelinePersist } from "@/types/pipeline";
import type { PipelineRunResult, RunTriggerType } from "@/types/config";

const bodySchema = z.object({
  secret: z.string(),
  configId: z.string(),
  triggerType: z.enum(["manual", "cron"]),
  startedAt: z.string(),
  result: z.custom<PipelineRunResult>(),
  pipelineSnapshot: z.custom<PipelinePersist>().optional(),
});

function authorize(secret: string) {
  const expected = process.env.INTERNAL_API_SECRET?.trim();
  return Boolean(expected && secret === expected);
}

export async function POST(req: Request) {
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
  if (!authorize(parsed.data.secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { configId, triggerType, startedAt, result, pipelineSnapshot } = parsed.data;
  const { logId } = await persistRemotePipelineRun({
    configId,
    triggerType: triggerType as RunTriggerType,
    startedAt,
    result,
    pipelineSnapshot,
  });
  return NextResponse.json({ ok: true, logId });
}
