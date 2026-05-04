import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireOperatorAuth } from "@/lib/auth/apiAuth";
import { schedulerService } from "@/lib/services/schedulerService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";
import { EMPTY_PIPELINE } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/appStore";
import { isValidCron } from "@/lib/validateCron";
import type { ScrapingConfig } from "@/types/config";

const createSchema = z
  .object({
    id: z.string().min(1).optional(),
    country: z.string().min(1).default(""),
    target_url: z.string().min(1).default("https://example.com"),
    archetype: z.enum(["static", "spa", "shadow_dom"]).default("static"),
    cron: z.string().default("0 * * * *"),
    status: z.enum(["Active", "Paused", "Error"]).default("Active"),
  })
  .strict();

export async function GET(req: Request) {
  const deny = requireOperatorAuth(req);
  if (deny) return deny;
  ensureSchedulerBooted();
  const state = await readAppState();
  return NextResponse.json({ configs: state.configs });
}

export async function POST(req: Request) {
  const deny = requireOperatorAuth(req);
  if (deny) return deny;
  ensureSchedulerBooted();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;
  if (!isValidCron(d.cron)) {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  const id = d.id ?? randomUUID();
  const config: ScrapingConfig = {
    id,
    country: d.country || "New",
    target_url: d.target_url,
    archetype: d.archetype,
    cron: d.cron,
    status: d.status,
  };

  const before = await readAppState();
  if (before.configs.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Config id already exists" }, { status: 409 });
  }

  await updateAppState((s) => {
    s.configs.push(config);
    s.pipelines[id] = {
      nodes: [...EMPTY_PIPELINE.nodes],
      edges: [...EMPTY_PIPELINE.edges],
    };
    s.schedules.push({
      configId: id,
      cron: config.cron,
      updatedAt: new Date().toISOString(),
    });
  });

  await schedulerService.upsertFromConfig(config);
  return NextResponse.json({ config }, { status: 201 });
}
