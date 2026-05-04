import { NextResponse } from "next/server";

import { requireOperatorAuth } from "@/lib/auth/apiAuth";
import { blobService } from "@/lib/services/blobService";
import { runLogService } from "@/lib/services/runLogService";
import { ensureSchedulerBooted } from "@/lib/services/schedulerBootstrap";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const deny = requireOperatorAuth(_req);
  if (deny) return deny;
  ensureSchedulerBooted();
  const { id } = await ctx.params;
  const docs = await blobService.listByConfig(id);
  const logs = await runLogService.list({ configId: id, limit: 200 });
  const logByDoc = new Map(
    logs.filter((l) => l.documentId).map((l) => [l.documentId as string, l]),
  );
  const items = docs.map((d) => ({
    id: d.id,
    name: d.name,
    createdAt: d.createdAt,
    downloadUrl: `/api/documents/${encodeURIComponent(id)}/download/${encodeURIComponent(d.id)}`,
    runId: logByDoc.get(d.id)?.id ?? null,
    triggerType: logByDoc.get(d.id)?.triggerType ?? null,
  }));
  return NextResponse.json({ documents: items });
}
