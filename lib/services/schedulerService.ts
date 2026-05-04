import type { ScheduleRegistration } from "@/lib/store/appState";
import { readAppState, updateAppState } from "@/lib/store/jsonStore";
import type { ScrapingConfig } from "@/types/config";

/**
 * Mock scheduler — persists registrations; no real timers (Azure Timer/Functions later).
 */
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
};
