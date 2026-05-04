import { localPipelineExecutionEnabled } from "@/lib/env/execution";
import type { RunTriggerType } from "@/types/config";

import { enqueueRunPipelineMessage } from "./runEnqueueService";

export type QueueMessage = {
  type: "run-pipeline";
  configId: string;
  triggerType: RunTriggerType;
  enqueuedAt: string;
  scheduledAt?: string;
  pipelineSnapshot?: unknown;
};

type Listener = (msg: QueueMessage) => void;

const listeners = new Set<Listener>();
const deadLetter: QueueMessage[] = [];

/**
 * Run dispatch: optional Azure Storage Queue + in-process listeners (local dev).
 */
export const queueService = {
  async enqueue(message: QueueMessage): Promise<void> {
    const useAzure =
      !localPipelineExecutionEnabled() &&
      (await enqueueRunPipelineMessage({
        kind: "RunPipeline",
        configId: message.configId,
        triggerType: message.triggerType,
        enqueuedAt: message.enqueuedAt,
        pipelineSnapshot: message.pipelineSnapshot,
      }));
    if (!useAzure) {
      listeners.forEach((l) => l(message));
    }
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async peekDeadLetter(): Promise<QueueMessage[]> {
    return [...deadLetter];
  },

  moveToDeadLetter(msg: QueueMessage) {
    deadLetter.push(msg);
  },
};
