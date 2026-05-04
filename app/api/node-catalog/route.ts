import { NextResponse } from "next/server";

import { listNodeCatalog } from "@/lib/nodeCatalog/service";

export async function GET() {
  const entries = await listNodeCatalog();
  return NextResponse.json({ entries });
}
