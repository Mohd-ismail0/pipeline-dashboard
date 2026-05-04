import { NextResponse } from "next/server";
import { z } from "zod";

import { executeSingleNode } from "@/lib/pipeline/executor";
import type { ScrapingConfig } from "@/types/config";
import type { PipelineReactFlowNode } from "@/types/pipeline";

const bodySchema = z.object({
  config: z.custom<ScrapingConfig>(),
  node: z.custom<PipelineReactFlowNode>(),
  upstream: z.unknown().optional(),
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
  const { config, node, upstream } = parsed.data;
  const out = await executeSingleNode({ config, node, upstream });
  return NextResponse.json(out);
}
