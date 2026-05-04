import { NextResponse } from "next/server";
import { z } from "zod";

import { executeSingleNode } from "@/lib/pipeline/executor";
import type { ScrapingConfig } from "@/types/config";
import type { PipelineReactFlowNode } from "@/types/pipeline";

const bodySchema = z.object({
  secret: z.string(),
  config: z.custom<ScrapingConfig>(),
  node: z.custom<PipelineReactFlowNode>(),
  upstream: z.unknown().optional(),
});

function authorize(secret: string) {
  const expected = process.env.INTERNAL_API_SECRET?.trim();
  if (!expected || secret !== expected) {
    return false;
  }
  return true;
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
  const { config, node, upstream } = parsed.data;
  const out = await executeSingleNode({ config, node, upstream });
  return NextResponse.json(out);
}
