import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";
import { isEnvTrue, readEnvTrimmed } from "@/lib/env/runtime";

function bearerFrom(req: Request): string | null {
  const raw = req.headers.get("authorization")?.trim();
  if (!raw) return null;
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim();
}

export function requireOperatorAuth(req: Request): NextResponse | null {
  const configured = readEnvTrimmed("OPERATOR_API_TOKEN");
  const mustBeConfigured = isEnvTrue("REQUIRE_OPERATOR_API_TOKEN");
  if (!configured) {
    if (!mustBeConfigured) return null;
    return NextResponse.json(
      { error: "Operator auth not configured" },
      { status: 500 },
    );
  }
  const got = bearerFrom(req);
  if (!got || !safeTokenEqual(got, configured)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireInternalAuth(req: Request): NextResponse | null {
  const configured = readEnvTrimmed("INTERNAL_API_SECRET");
  if (!configured) {
    return NextResponse.json({ error: "Internal auth not configured" }, { status: 500 });
  }
  const got = req.headers.get("x-internal-secret")?.trim();
  if (!got || !safeTokenEqual(got, configured)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function safeTokenEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

