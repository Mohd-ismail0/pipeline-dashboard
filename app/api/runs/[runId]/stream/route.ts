import { requireOperatorAuth } from "@/lib/auth/apiAuth";
import { runEventService } from "@/lib/services/runEventService";
import { readAppState } from "@/lib/store/appStore";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ runId: string }> };

/** SSE: emits new run events as they appear (polls Prisma every 2s). */
export async function GET(req: Request, ctx: RouteParams) {
  const deny = requireOperatorAuth(req);
  if (deny) return deny;
  const { runId } = await ctx.params;
  const state = await readAppState();
  const log = state.runLogs.find((r) => r.id === runId);
  if (!log) {
    return new Response("not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let lastSeq = -1;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let id: ReturnType<typeof setInterval> | null = null;
      const tick = async () => {
        try {
          const events = await runEventService.listByRunId(runId);
          for (const e of events) {
            if (e.seq > lastSeq) {
              lastSeq = e.seq;
              controller.enqueue(
                encoder.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`),
              );
            }
          }
        } catch {
          if (id) {
            clearInterval(id);
            id = null;
          }
          controller.close();
        }
      };

      void tick();
      id = setInterval(() => void tick(), 2000);

      req.signal.addEventListener("abort", () => {
        if (id) {
          clearInterval(id);
          id = null;
        }
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
