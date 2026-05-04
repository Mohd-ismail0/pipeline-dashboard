import { allowInProcessScheduler } from "@/lib/env/execution";

import { runPipelineForConfig } from "./pipelineRunner";
import { queueService } from "./queueService";
import { schedulerService } from "./schedulerService";

declare global {
  var __pipelineDashboardSchedulerBooted: boolean | undefined;
}

export function ensureSchedulerBooted() {
  if (!allowInProcessScheduler()) return;
  if (globalThis.__pipelineDashboardSchedulerBooted) return;
  globalThis.__pipelineDashboardSchedulerBooted = true;

  queueService.subscribe((msg) => {
    if (msg.type !== "run-pipeline" || msg.triggerType !== "cron") return;
    void runPipelineForConfig({
      configId: msg.configId,
      triggerType: "cron",
    });
  });

  schedulerService.start();
}
