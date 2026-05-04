import type { RunTriggerType } from "@/types/config";

export type QueueMessage = {
  type: "run-pipeline";
  configId: string;
  triggerType: RunTriggerType;
  enqueuedAt: string;
  scheduledAt?: string;
};

type Listener = (msg: QueueMessage) => void;

const listeners = new Set<Listener>();
const deadLetter: QueueMessage[] = [];

/**
 * Mock Azure Queue — in-process pub/sub + simple dequeue simulation.
 */
export const queueService = {
  async enqueue(message: QueueMessage): Promise<void> {
    listeners.forEach((l) => l(message));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Simulated dequeue for observability / tests */
  async peekDeadLetter(): Promise<QueueMessage[]> {
    return [...deadLetter];
  },

  moveToDeadLetter(msg: QueueMessage) {
    deadLetter.push(msg);
  },
};
