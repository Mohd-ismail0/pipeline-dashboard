import { NextResponse } from "next/server";
import { z } from "zod";

import { schedulerService } from "@/lib/services/schedulerService";
import { EMPTY_PIPELINE } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/jsonStore";
import { isValidCron } from "@/lib/validateCron";
import type { Archetype, ConfigStatus, ScrapingConfig } from "@/types/config";
import type { PipelinePersist } from "@/types/pipeline";

const patchSchema = z
  .object({
    country: z.string().min(1).optional(),
    target_url: z.string().min(1).optional(),
    archetype: z.enum(["static", "spa", "shadow_dom"]).optional(),
    cron: z.string().optional(),
    status: z.enum(["Active", "Paused", "Error"]).optional(),
    pipeline: z
      .object({
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
      })
      .optional(),
  })
  .strict();

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const state = await readAppState();
  const config = state.configs.find((c) => c.id === id);
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const pipeline = state.pipelines[id] ?? EMPTY_PIPELINE;
  return NextResponse.json({ config, pipeline });
}

export async function PATCH(req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch = parsed.data;
  if (patch.cron !== undefined && !isValidCron(patch.cron)) {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  const before = await readAppState();
  if (!before.configs.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const next = await updateAppState((s) => {
    const idx = s.configs.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const cur = s.configs[idx]!;
    const merged: ScrapingConfig = {
      ...cur,
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.target_url !== undefined ? { target_url: patch.target_url } : {}),
      ...(patch.archetype !== undefined
        ? { archetype: patch.archetype as Archetype }
        : {}),
      ...(patch.cron !== undefined ? { cron: patch.cron } : {}),
      ...(patch.status !== undefined ? { status: patch.status as ConfigStatus } : {}),
    };
    s.configs[idx] = merged;

    if (patch.pipeline) {
      s.pipelines[id] = {
        nodes: patch.pipeline.nodes as PipelinePersist["nodes"],
        edges: patch.pipeline.edges as PipelinePersist["edges"],
      };
    }
  });

  const config = next.configs.find((c) => c.id === id);
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await schedulerService.upsertFromConfig(config);

  return NextResponse.json({
    config,
    pipeline: next.pipelines[id] ?? EMPTY_PIPELINE,
  });
}

export async function DELETE(_req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const before = await readAppState();
  if (!before.configs.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await updateAppState((s) => {
    s.configs = s.configs.filter((c) => c.id !== id);
    delete s.pipelines[id];
    s.documents = s.documents.filter((d) => d.configId !== id);
    s.schedules = s.schedules.filter((x) => x.configId !== id);
    delete s.lastSnapshots[id];
  });

  return NextResponse.json({ ok: true });
}
