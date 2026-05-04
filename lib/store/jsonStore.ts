import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { AppState } from "./appState";
import { createSeedState } from "./appState";

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
    return JSON.parse(raw) as AppState;
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
