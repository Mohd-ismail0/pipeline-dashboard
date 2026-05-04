import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { AppState } from "./appState";
import { createSeedState } from "./appState";

function normalizeAppState(parsed: unknown): AppState {
  const seed = createSeedState();
  if (!parsed || typeof parsed !== "object") return seed;
  const o = parsed as Partial<AppState>;
  return {
    configs: Array.isArray(o.configs) && o.configs.length ? o.configs : seed.configs,
    pipelines:
      o.pipelines && typeof o.pipelines === "object"
        ? (o.pipelines as AppState["pipelines"])
        : seed.pipelines,
    documents: Array.isArray(o.documents) ? o.documents : [],
    lastSnapshots:
      o.lastSnapshots && typeof o.lastSnapshots === "object"
        ? o.lastSnapshots
        : {},
    schedules: Array.isArray(o.schedules) ? o.schedules : seed.schedules,
    runLogs: Array.isArray(o.runLogs)
      ? (o.runLogs as AppState["runLogs"]).map((r) => ({
          ...r,
          pipelineSnapshot:
            "pipelineSnapshot" in (r as object) ? (r as { pipelineSnapshot?: unknown }).pipelineSnapshot : undefined,
        }))
      : [],
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

let writeChain: Promise<void> = Promise.resolve();

function serialize(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readAppState(): Promise<AppState> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    return normalizeAppState(JSON.parse(raw));
  } catch {
    const seed = createSeedState();
    await ensureDataDir();
    await writeFile(STORE_PATH, serialize(seed), "utf-8");
    return seed;
  }
}

export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function writeAppState(state: AppState): Promise<void> {
  await ensureDataDir();
  await writeFile(STORE_PATH, serialize(state), "utf-8");
}

export async function updateAppState(
  mutator: (draft: AppState) => void,
): Promise<AppState> {
  return withWriteLock(async () => {
    const current = await readAppState();
    mutator(current);
    await writeAppState(current);
    return current;
  });
}
