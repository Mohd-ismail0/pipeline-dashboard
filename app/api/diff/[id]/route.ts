import { NextResponse } from "next/server";

import { blobService } from "@/lib/services/blobService";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { id } = await ctx.params;
  const { previous, current } = await blobService.getPreviousAndCurrentBodies(id);
  return NextResponse.json({
    previous: previous ?? "",
    current: current ?? "",
  });
}
