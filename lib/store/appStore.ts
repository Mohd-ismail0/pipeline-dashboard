/**
 * Unified persistence: JSON file (dev) or PostgreSQL via Prisma (production).
 */
import { isPrismaEnabled } from "@/lib/prisma";

import * as jsonStore from "./jsonStore";
import * as prismaStore from "./prismaStore";
import type { AppState } from "./appState";

export { EMPTY_PIPELINE, createSeedState } from "./appState";
export type { AppState, ScheduleRegistration, StoredDocument } from "./appState";

export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  return isPrismaEnabled() ? prismaStore.withWriteLock(fn) : jsonStore.withWriteLock(fn);
}

export async function readAppState(): Promise<AppState> {
  return isPrismaEnabled() ? prismaStore.readAppState() : jsonStore.readAppState();
}

export async function updateAppState(
  mutator: (draft: AppState) => void,
): Promise<AppState> {
  return isPrismaEnabled()
    ? prismaStore.updateAppState(mutator)
    : jsonStore.updateAppState(mutator);
}

export async function writeAppState(state: AppState): Promise<void> {
  if (isPrismaEnabled()) {
    await prismaStore.writeAppState(state);
  } else {
    await jsonStore.writeAppState(state);
  }
}
