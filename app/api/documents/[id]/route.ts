import { NextResponse } from "next/server";

import { blobService } from "@/lib/services/blobService";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const docs = await blobService.listByConfig(id);
  const items = docs.map((d) => ({
    id: d.id,
    name: d.name,
    createdAt: d.createdAt,
    downloadUrl: `/api/documents/${encodeURIComponent(id)}/download/${encodeURIComponent(d.id)}`,
  }));
  return NextResponse.json({ documents: items });
}
