import { NextResponse } from "next/server";

import { compareWithDiffService, type DiffStructure } from "@/lib/services/diffCheckerService";

interface DiffRequestBody {
  previous?: DiffStructure;
  current?: DiffStructure;
}

export async function POST(req: Request) {
  let body: DiffRequestBody;

  try {
    body = (await req.json()) as DiffRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!Object.prototype.hasOwnProperty.call(body, "previous")) {
    return NextResponse.json(
      { error: "Missing required field: previous." },
      { status: 400 },
    );
  }

  if (!Object.prototype.hasOwnProperty.call(body, "current")) {
    return NextResponse.json(
      { error: "Missing required field: current." },
      { status: 400 },
    );
  }

  const diff = await compareWithDiffService({
    previous: body.previous,
    current: body.current,
  });

  return NextResponse.json(diff);
}
