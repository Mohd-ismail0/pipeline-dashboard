import { NextResponse } from "next/server";

import { blobService } from "@/lib/services/blobService";

type RouteParams = {
  params: Promise<{ id: string; docId: string }>;
};

export async function GET(_req: Request, ctx: RouteParams) {
  const { id, docId } = await ctx.params;
  const doc = await blobService.getById(docId);
  if (!doc || doc.configId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(doc.body, {
    status: 200,
    headers: {
      "Content-Type": doc.contentType || "text/plain",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
    },
  });
}
