import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAuth } from "@/lib/auth/apiAuth";
import { persistPipelineRun } from "@/lib/services/pipelineRunner";
import { pipelinePersistSchema, pipelineRunResultSchema } from "@/types/contracts";
import type { RunTriggerType } from "@/types/config";

const bodySchema = z.object({
  correlationId: z.string().optional(),
  configId: z.string(),
  triggerType: z.enum(["manual", "cron"]),
  startedAt: z.string(),
  result: pipelineRunResultSchema,
  pipelineSnapshot: pipelinePersistSchema.optional(),
});

export async function POST(req: Request) {
  const deny = requireInternalAuth(req);
  if (deny) return deny;
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
  const { correlationId, configId, triggerType, startedAt, result, pipelineSnapshot } = parsed.data;
  const { logId } = await persistPipelineRun({
    correlationId,
    configId,
    triggerType: triggerType as RunTriggerType,
    startedAt,
    result,
    pipelineSnapshot,
  });
  return NextResponse.json({ ok: true, logId });
}
