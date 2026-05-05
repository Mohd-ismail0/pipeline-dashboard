import { QueueClient } from "@azure/storage-queue";

import { azureRunQueueName, azureStorageConfigured } from "@/lib/env/execution";
import { readEnv } from "@/lib/env/runtime";

let queueClient: QueueClient | null = null;

function getQueueClient(): QueueClient | null {
  if (!azureStorageConfigured()) return null;
  const conn = readEnv("AZURE_STORAGE_CONNECTION_STRING");
  if (!conn) return null;
  const name = azureRunQueueName();
  if (!queueClient) {
    queueClient = new QueueClient(conn, name);
  }
  return queueClient;
}

export type RunQueueMessage = {
  kind: "RunPipeline";
  idempotencyKey: string;
  correlationId?: string;
  configId: string;
  triggerType: "manual" | "cron";
  enqueuedAt: string;
  /** When set, durable worker uses this snapshot instead of loading latest from DB */
  pipelineSnapshot?: unknown;
};

export async function enqueueRunPipelineMessage(msg: RunQueueMessage): Promise<boolean> {
  const client = getQueueClient();
  if (!client) return false;
  await client.sendMessage(JSON.stringify(msg));
  return true;
}
