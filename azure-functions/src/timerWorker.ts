import type { InvocationContext } from "@azure/functions";

export async function invokeCronTick(context: InvocationContext) {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
  const secret = process.env.INTERNAL_API_SECRET;
  if (!base || !secret) {
    context.log("APP_BASE_URL or INTERNAL_API_SECRET missing; skip cron tick");
    return;
  }
  const res = await fetch(`${base}/api/internal/cron-tick`, {
    method: "POST",
    headers: { "x-internal-secret": secret },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`cron-tick ${res.status}: ${text.slice(0, 300)}`);
  }
  context.log(`cron-tick ok: ${text}`);
}
