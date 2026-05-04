import type { InvocationContext } from "@azure/functions";

type RunMessage = {
  kind?: string;
  configId: string;
  triggerType?: "manual" | "cron";
  enqueuedAt?: string;
};

export async function handleQueueMessage(raw: string, context: InvocationContext) {
  let msg: RunMessage;
  try {
    msg = JSON.parse(raw) as RunMessage;
  } catch {
    context.log(`Invalid queue JSON: ${raw.slice(0, 200)}`);
    return;
  }
  if (msg.kind && msg.kind !== "RunPipeline") {
    context.log(`Unknown kind ${msg.kind}`);
    return;
  }
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
  const secret = process.env.INTERNAL_API_SECRET;
  if (!base || !secret) {
    throw new Error("APP_BASE_URL and INTERNAL_API_SECRET must be set for queue worker");
  }
  const res = await fetch(`${base}/api/internal/run-pipeline-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify({
      configId: msg.configId,
      triggerType: msg.triggerType ?? "cron",
      startedAt: msg.enqueuedAt ?? new Date().toISOString(),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`run-pipeline-sync ${res.status}: ${text.slice(0, 500)}`);
  }
  context.log(`Pipeline run ok for ${msg.configId}: ${text.slice(0, 200)}`);
}
