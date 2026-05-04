import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

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

/**
 * Optional HTTP entry for Azure (or tests): same body as queue message.
 * POST JSON { "configId": "...", "triggerType": "manual"|"cron" }
 */
app.http("runPipelineHttp", {
  methods: ["POST"],
  authLevel: "function",
  route: "run-pipeline",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const raw = await request.text();
    try {
      await handleQueueMessage(raw || "{}", context);
      return { status: 200, jsonBody: { ok: true } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      context.log(`runPipelineHttp failed: ${msg}`);
      return { status: 500, jsonBody: { error: msg } };
    }
  },
});
