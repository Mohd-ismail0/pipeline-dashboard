import { NextResponse } from "next/server";
import { z } from "zod";

import { executePipeline } from "@/lib/pipeline/executor";
import { persistPipelineRun } from "@/lib/services/pipelineRunner";
import { EMPTY_PIPELINE } from "@/lib/store/appState";
import { readAppState } from "@/lib/store/appStore";

const bodySchema = z.object({
  configId: z.string(),
  triggerType: z.enum(["manual", "cron"]),
  startedAt: z.string().optional(),
});

function authorize(req: Request) {
  const expected = process.env.INTERNAL_API_SECRET?.trim();
  const got = req.headers.get("x-internal-secret")?.trim();
  return Boolean(expected && got === expected);
}

/**
 * Synchronous pipeline run for workers (or tests) when `RUN_PIPELINE_ORCHESTRATION_URL` points here.
 * Azure Durable Functions can call this instead of embedding Cheerio in the Functions host.
 */
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
  const { configId, triggerType } = parsed.data;
  const startedAt = parsed.data.startedAt ?? new Date().toISOString();
  const state = await readAppState();
  const config = state.configs.find((c) => c.id === configId);
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }
  const pipeline = state.pipelines[configId] ?? EMPTY_PIPELINE;
  const result = await executePipeline({ config, pipeline });
  const { logId } = await persistPipelineRun({
    configId,
    triggerType,
    startedAt,
    result,
    pipelineSnapshot: pipeline,
  });
  return NextResponse.json({ result, logId });
}
