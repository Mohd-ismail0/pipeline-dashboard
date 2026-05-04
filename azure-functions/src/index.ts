import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as df from "durable-functions";

import { handleQueueMessage } from "./queueWorker";
import { invokeCronTick } from "./timerWorker";

app.storageQueue("pipelineRunQueue", {
  queueName: process.env.PIPELINE_QUEUE_NAME ?? "pipeline-runs",
  connection: "AzureWebJobsStorage",
  handler: async (message: unknown, context: InvocationContext) => {
    context.log(`Queue message: ${String(message)}`);
    await handleQueueMessage(String(message), context);
  },
});

app.timer("pipelineCronTimer", {
  schedule: "0 */1 * * * *",
  handler: async (_timer, context: InvocationContext) => {
    context.log("Timer: cron tick");
    await invokeCronTick(context);
  },
});

df.app.activity("ExecutePipelineHttp", {
  handler: async (input: {
    configId: string;
    triggerType: "manual" | "cron";
    startedAt: string;
  }) => {
    const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
    const secret = process.env.INTERNAL_API_SECRET;
    if (!base || !secret) {
      throw new Error("APP_BASE_URL and INTERNAL_API_SECRET must be set");
    }
    const res = await fetch(`${base}/api/internal/run-pipeline-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({
        configId: input.configId,
        triggerType: input.triggerType,
        startedAt: input.startedAt,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`run-pipeline-sync failed ${res.status}: ${text.slice(0, 500)}`);
    }
    return JSON.parse(text) as { result: unknown; logId: string };
  },
});

const orchestrator: df.OrchestrationHandler = function* (context) {
  const input = context.df.getInput() as {
    configId: string;
    triggerType: "manual" | "cron";
    startedAt: string;
  };
  const out = yield context.df.callActivity("ExecutePipelineHttp", input);
  return out;
};

df.app.orchestration("RunPipelineOrchestration", orchestrator);

app.http("startRunPipeline", {
  methods: ["POST"],
  authLevel: "function",
  route: "orchestrators/RunPipeline/start",
  extraInputs: [df.input.durableClient()],
  handler: async (
    request: HttpRequest,
    ctx: InvocationContext,
    client: df.DurableClient,
  ): Promise<HttpResponseInit> => {
    let body: { configId?: string; triggerType?: "manual" | "cron"; startedAt?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON" } };
    }
    if (!body.configId) {
      return { status: 400, jsonBody: { error: "configId required" } };
    }
    const triggerType = body.triggerType ?? "manual";
    const startedAt = body.startedAt ?? new Date().toISOString();
    const instanceId = await client.startNew("RunPipelineOrchestration", {
      input: { configId: body.configId, triggerType, startedAt },
    });
    const status = await client.waitForCompletionOrCreateCheckStatusResponse(request, instanceId);
    return { status: status.status, jsonBody: await status.json() };
  },
});
