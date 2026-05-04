import { NextResponse } from "next/server";

import { requireOperatorAuth } from "@/lib/auth/apiAuth";
import { listNodeCatalog } from "@/lib/nodeCatalog/service";

export async function GET(req: Request) {
  const deny = requireOperatorAuth(req);
  if (deny) return deny;
  const entries = await listNodeCatalog();
  return NextResponse.json({ entries });
}
