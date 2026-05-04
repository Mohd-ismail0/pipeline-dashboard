/**
 * Runtime flags for local vs Azure execution paths.
 */
/** When false, prefer queue or `RUN_PIPELINE_ORCHESTRATION_URL` instead of in-process runner. */
export function localPipelineExecutionEnabled(): boolean {
  return process.env.USE_LOCAL_EXECUTOR !== "false";
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
  const u = process.env.RUN_PIPELINE_ORCHESTRATION_URL?.trim();
  return u || undefined;
}

/** In-process cron + queue consumer (dev). Disable in production Azure. */
export function allowInProcessScheduler(): boolean {
  if (process.env.DISABLE_IN_PROCESS_SCHEDULER === "true") return false;
  if (process.env.AZURE_TIMER_SCHEDULE_ENABLED === "true") return false;
  return true;
}

export function azureStorageConfigured(): boolean {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING?.trim());
}

export function azureRunQueueName(): string {
  return process.env.AZURE_STORAGE_QUEUE_NAME?.trim() || "pipeline-runs";
}
