import { NextResponse } from "next/server";
import { z } from "zod";

import { requireInternalAuth } from "@/lib/auth/apiAuth";
import { executeSingleNode } from "@/lib/pipeline/executor";
import { configSchema, pipelineNodeSchema } from "@/types/contracts";

const bodySchema = z.object({
  config: configSchema,
  node: pipelineNodeSchema,
  upstream: z.unknown().optional(),
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
  const { config, node, upstream } = parsed.data;
  const out = await executeSingleNode({ config, node, upstream });
  return NextResponse.json(out);
}
