/**
 * Runtime flags for local vs Azure execution paths.
 */
import { isEnvTrue, readEnvTrimmed } from "@/lib/env/runtime";

/** When false, prefer queue or `RUN_PIPELINE_ORCHESTRATION_URL` instead of in-process runner. */
export function localPipelineExecutionEnabled(): boolean {
  return readEnvTrimmed("USE_LOCAL_EXECUTOR") !== "false";
}

/**
 * Backward-compatible alias for older callsites during hot-reload / stale graph states.
 * Remove once all imports are normalized to localPipelineExecutionEnabled.
 */
export function useLocalExecutor(): boolean {
  return localPipelineExecutionEnabled();
}

/** When set, POST manual/cron runs to this durable HTTP starter URL (full URL). */
export function remoteOrchestratorStartUrl(): string | undefined {
  const u = readEnvTrimmed("RUN_PIPELINE_ORCHESTRATION_URL");
  return u || undefined;
}

/** In-process cron + queue consumer (dev). Disable in production Azure. */
export function allowInProcessScheduler(): boolean {
  if (isEnvTrue("DISABLE_IN_PROCESS_SCHEDULER")) return false;
  if (isEnvTrue("AZURE_TIMER_SCHEDULE_ENABLED")) return false;
  return true;
}

export function azureStorageConfigured(): boolean {
  return Boolean(readEnvTrimmed("AZURE_STORAGE_CONNECTION_STRING"));
}

export function azureRunQueueName(): string {
  return readEnvTrimmed("AZURE_STORAGE_QUEUE_NAME") || "pipeline-runs";
}
