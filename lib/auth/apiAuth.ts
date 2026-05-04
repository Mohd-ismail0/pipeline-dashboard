import { NextResponse } from "next/server";

function bearerFrom(req: Request): string | null {
  const raw = req.headers.get("authorization")?.trim();
  if (!raw) return null;
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim();
}

export function requireOperatorAuth(req: Request): NextResponse | null {
  const configured = process.env.OPERATOR_API_TOKEN?.trim();
  if (!configured) return null;
  const got = bearerFrom(req);
  if (!got || got !== configured) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireInternalAuth(req: Request): NextResponse | null {
  const configured = process.env.INTERNAL_API_SECRET?.trim();
  if (!configured) {
    return NextResponse.json({ error: "Internal auth not configured" }, { status: 500 });
  }
  const got = req.headers.get("x-internal-secret")?.trim();
  if (!got || got !== configured) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

