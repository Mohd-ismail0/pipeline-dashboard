import { getPrisma } from "@/lib/prisma";
import type { PipelineRunLog } from "@/types/config";
import type { PipelinePersist } from "@/types/pipeline";

import type { AppState, ScheduleRegistration, StoredDocument } from "./appState";
import { EMPTY_PIPELINE } from "./appState";

function mapConfig(c: {
  id: string;
  country: string;
  targetUrl: string;
  archetype: string;
  cron: string;
  status: string;
}) {
  return {
    id: c.id,
    country: c.country,
    target_url: c.targetUrl,
    archetype: c.archetype as AppState["configs"][0]["archetype"],
    cron: c.cron,
    status: c.status as AppState["configs"][0]["status"],
  };
}

let writeChain: Promise<void> = Promise.resolve();

export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function readAppState(): Promise<AppState> {
  const prisma = getPrisma();
  const configsDb = await prisma.config.findMany({ orderBy: { id: "asc" } });
  if (configsDb.length === 0) {
    return {
      configs: [],
      pipelines: {},
      documents: [],
      lastSnapshots: {},
      schedules: [],
      runLogs: [],
    };
  }

  const pipelines: Record<string, PipelinePersist> = {};
  const pipelinesDb = await prisma.pipeline.findMany();
  for (const p of pipelinesDb) {
    const raw = p.nodesEdges as unknown;
    if (raw && typeof raw === "object") {
      const o = raw as { nodes?: unknown; edges?: unknown };
      pipelines[p.configId] = {
        nodes: Array.isArray(o.nodes) ? (o.nodes as PipelinePersist["nodes"]) : [],
        edges: Array.isArray(o.edges) ? (o.edges as PipelinePersist["edges"]) : [],
      };
    } else {
      pipelines[p.configId] = { ...EMPTY_PIPELINE };
    }
  }

  const documentsDb = await prisma.document.findMany({ orderBy: { createdAt: "desc" } });
  const documents: StoredDocument[] = documentsDb.map((d) => ({
    id: d.id,
    configId: d.configId,
    name: d.name,
    createdAt: d.createdAt.toISOString(),
    body: d.body,
    contentType: d.contentType,
    blobPath: d.blobPath ?? undefined,
  }));

  const snapshotsDb = await prisma.lastSnapshot.findMany();
  const lastSnapshots: Record<string, string> = {};
  for (const s of snapshotsDb) {
    lastSnapshots[s.configId] = s.body;
  }

  const schedulesDb = await prisma.schedule.findMany();
  const schedules: ScheduleRegistration[] = schedulesDb.map((s) => ({
    configId: s.configId,
    cron: s.cron,
    updatedAt: s.updatedAt.toISOString(),
  }));

  const runsDb = await prisma.run.findMany({
    orderBy: { startedAt: "desc" },
    take: 1000,
  });
  const runLogs: PipelineRunLog[] = runsDb.map((r) => ({
    id: r.id,
    configId: r.configId,
    triggerType: r.triggerType as PipelineRunLog["triggerType"],
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt.toISOString(),
    durationMs: r.durationMs,
    ok: r.ok,
    error: r.error ?? undefined,
    orderedNodeIds: r.orderedNodeIds as string[],
    nodeResults: r.nodeResults as PipelineRunLog["nodeResults"],
    documentId: r.documentId ?? undefined,
    pipelineSnapshot: r.pipelineSnapshot ?? undefined,
  }));

  return {
    configs: configsDb.map(mapConfig),
    pipelines,
    documents,
    lastSnapshots,
    schedules,
    runLogs,
  };
}

export async function writeAppState(state: AppState): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const configIds = new Set(state.configs.map((c) => c.id));
    const configIdList = [...configIds];
    if (configIdList.length > 0) {
      await tx.run.deleteMany({
        where: { configId: { notIn: configIdList } },
      });
      await tx.config.deleteMany({
        where: { id: { notIn: configIdList } },
      });
    } else {
      await tx.run.deleteMany();
      await tx.config.deleteMany();
    }

    for (const c of state.configs) {
      await tx.config.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          country: c.country,
          targetUrl: c.target_url,
          archetype: c.archetype,
          cron: c.cron,
          status: c.status,
        },
        update: {
          country: c.country,
          targetUrl: c.target_url,
          archetype: c.archetype,
          cron: c.cron,
          status: c.status,
        },
      });
      const pipe = state.pipelines[c.id] ?? EMPTY_PIPELINE;
      await tx.pipeline.upsert({
        where: { configId: c.id },
        create: { configId: c.id, nodesEdges: pipe as object },
        update: { nodesEdges: pipe as object },
      });
      const sched = state.schedules.find((s) => s.configId === c.id);
      if (sched) {
        await tx.schedule.upsert({
          where: { configId: c.id },
          create: {
            configId: c.id,
            cron: sched.cron,
            updatedAt: new Date(sched.updatedAt),
          },
          update: {
            cron: sched.cron,
            updatedAt: new Date(sched.updatedAt),
          },
        });
      }
    }

    const docIds = new Set(state.documents.map((d) => d.id));
    if (configIdList.length > 0) {
      if (docIds.size > 0) {
        await tx.document.deleteMany({
          where: {
            configId: { in: configIdList },
            id: { notIn: [...docIds] },
          },
        });
      } else {
        await tx.document.deleteMany({
          where: { configId: { in: configIdList } },
        });
      }
    }
    for (const d of state.documents) {
      await tx.document.upsert({
        where: { id: d.id },
        create: {
          id: d.id,
          configId: d.configId,
          name: d.name,
          body: d.body,
          contentType: d.contentType,
          createdAt: new Date(d.createdAt),
          blobPath: d.blobPath ?? null,
        },
        update: {
          name: d.name,
          body: d.body,
          contentType: d.contentType,
          blobPath: d.blobPath ?? null,
        },
      });
    }

    if (configIdList.length > 0) {
      await tx.lastSnapshot.deleteMany({
        where: { configId: { notIn: configIdList } },
      });
    } else {
      await tx.lastSnapshot.deleteMany();
    }
    for (const [configId, body] of Object.entries(state.lastSnapshots)) {
      if (!configIds.has(configId)) continue;
      await tx.lastSnapshot.upsert({
        where: { configId },
        create: { configId, body },
        update: { body },
      });
    }

    const runIds = new Set(state.runLogs.map((r) => r.id));
    if (configIdList.length > 0) {
      await tx.run.deleteMany({
        where: {
          configId: { in: configIdList },
          ...(runIds.size > 0 ? { id: { notIn: [...runIds] } } : {}),
        },
      });
    }
    for (const r of state.runLogs) {
      await tx.run.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          configId: r.configId,
          triggerType: r.triggerType,
          status: "completed",
          startedAt: new Date(r.startedAt),
          endedAt: new Date(r.endedAt),
          durationMs: r.durationMs,
          ok: r.ok,
          error: r.error ?? null,
          orderedNodeIds: r.orderedNodeIds,
          nodeResults: r.nodeResults as object,
          documentId: r.documentId ?? null,
          pipelineSnapshot: (r.pipelineSnapshot ?? null) as object | null,
        },
        update: {
          triggerType: r.triggerType,
          startedAt: new Date(r.startedAt),
          endedAt: new Date(r.endedAt),
          durationMs: r.durationMs,
          ok: r.ok,
          error: r.error ?? null,
          orderedNodeIds: r.orderedNodeIds,
          nodeResults: r.nodeResults as object,
          documentId: r.documentId ?? null,
          pipelineSnapshot: (r.pipelineSnapshot ?? null) as object | null,
        },
      });
    }
  });
}

export async function updateAppState(mutator: (draft: AppState) => void): Promise<AppState> {
  return withWriteLock(async () => {
    const current = await readAppState();
    mutator(current);
    await writeAppState(current);
    return current;
  });
}
