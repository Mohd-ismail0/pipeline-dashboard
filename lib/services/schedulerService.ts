import { CronExpressionParser } from "cron-parser";

import type { ScheduleRegistration } from "@/lib/store/appState";
import { allowInProcessScheduler } from "@/lib/env/execution";
import { readAppState, updateAppState } from "@/lib/store/appStore";
import type { ScrapingConfig } from "@/types/config";

import { queueService } from "./queueService";

/**
 * Mock scheduler — persists registrations and simulates due cron ticks.
 */
const lastEvaluated = new Map<string, number>();

let intervalRef: ReturnType<typeof setInterval> | null = null;
let running = false;

/** Single evaluation pass (used by Azure Timer hitting internal API). */
export async function runSchedulerTickOnce() {
  await tickScheduler();
}

async function tickScheduler() {
  if (running) return;
  running = true;
  try {
    const now = Date.now();
    const state = await readAppState();
    for (const schedule of state.schedules) {
      const config = state.configs.find((c) => c.id === schedule.configId);
      if (!config || config.status !== "Active") continue;
      const last = lastEvaluated.get(schedule.configId) ?? now - 30_000;
      try {
        const expression = CronExpressionParser.parse(schedule.cron, {
          currentDate: new Date(last),
        });
        const nextAt = expression.next().toDate().getTime();
        if (nextAt <= now) {
          const pipeline = state.pipelines[schedule.configId];
          await queueService.enqueue({
            type: "run-pipeline",
            configId: schedule.configId,
            triggerType: "cron",
            enqueuedAt: new Date().toISOString(),
            scheduledAt: new Date(nextAt).toISOString(),
            pipelineSnapshot: pipeline,
          });
        }
      } catch {
        // ignore invalid schedule at runtime; cron validation already happens on write
      }
      lastEvaluated.set(schedule.configId, now);
    }
  } finally {
    running = false;
  }
}

export const schedulerService = {
  async upsertFromConfig(config: ScrapingConfig): Promise<ScheduleRegistration> {
    const reg: ScheduleRegistration = {
      configId: config.id,
      cron: config.cron,
      updatedAt: new Date().toISOString(),
    };
    await updateAppState((s) => {
      const idx = s.schedules.findIndex((m) => m.configId === config.id);
      if (idx >= 0) s.schedules[idx] = reg;
      else s.schedules.push(reg);
    });
    return reg;
  },

  async list(): Promise<ScheduleRegistration[]> {
    const s = await readAppState();
    return s.schedules;
  },

  start() {
    if (!allowInProcessScheduler()) return;
    if (intervalRef) return;
    intervalRef = setInterval(() => {
      void tickScheduler();
    }, 15_000);
  },
};
