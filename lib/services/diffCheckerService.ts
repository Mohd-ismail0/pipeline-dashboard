export type DiffStructure = unknown;

export interface DiffStats {
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  totalLines: number;
  changedLines: number;
  similarity: number;
  hasChanges: boolean;
}

export interface DiffResult {
  previous: string;
  current: string;
  stats: DiffStats;
  unifiedDiff: string;
  source: "azure" | "local" | "local-fallback";
  warning?: string;
}

interface DiffServiceResponse {
  previous?: string;
  current?: string;
  stats?: DiffStats;
  unifiedDiff?: string;
}

const DEFAULT_TIMEOUT_MS = 8_000;

function stableValue(value: DiffStructure): DiffStructure {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, DiffStructure>;
  return Object.keys(source)
    .sort()
    .reduce<Record<string, DiffStructure>>((acc, key) => {
      acc[key] = stableValue(source[key]);
      return acc;
    }, {});
}

function normalizeStructure(value: DiffStructure): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return JSON.stringify(stableValue(value), null, 2);
}

function buildLineDiff(previous: string, current: string) {
  const oldLines = previous.split("\n");
  const newLines = current.split("\n");
  const table = Array.from(
    { length: oldLines.length + 1 },
    () => new Uint32Array(newLines.length + 1),
  );

  for (let i = oldLines.length - 1; i >= 0; i -= 1) {
    for (let j = newLines.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        oldLines[i] === newLines[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: Array<{ type: "same" | "add" | "remove"; value: string }> = [];
  let addedLines = 0;
  let removedLines = 0;
  let unchangedLines = 0;
  let i = 0;
  let j = 0;

  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      lines.push({ type: "same", value: oldLines[i] });
      unchangedLines += 1;
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ type: "remove", value: oldLines[i] });
      removedLines += 1;
      i += 1;
    } else {
      lines.push({ type: "add", value: newLines[j] });
      addedLines += 1;
      j += 1;
    }
  }

  while (i < oldLines.length) {
    lines.push({ type: "remove", value: oldLines[i] });
    removedLines += 1;
    i += 1;
  }

  while (j < newLines.length) {
    lines.push({ type: "add", value: newLines[j] });
    addedLines += 1;
    j += 1;
  }

  const totalLines = Math.max(oldLines.length, newLines.length);
  const changedLines = addedLines + removedLines;
  const similarity = totalLines === 0 ? 1 : unchangedLines / totalLines;

  return {
    lines,
    stats: {
      addedLines,
      removedLines,
      unchangedLines,
      totalLines,
      changedLines,
      similarity,
      hasChanges: changedLines > 0,
    },
  };
}

export function compareStructures(
  previousInput: DiffStructure,
  currentInput: DiffStructure,
  source: DiffResult["source"] = "local",
  warning?: string,
): DiffResult {
  const previous = normalizeStructure(previousInput);
  const current = normalizeStructure(currentInput);
  const diff = buildLineDiff(previous, current);
  const unifiedBody = diff.lines
    .map((line) => {
      if (line.type === "add") return `+${line.value}`;
      if (line.type === "remove") return `-${line.value}`;
      return ` ${line.value}`;
    })
    .join("\n");

  return {
    previous,
    current,
    stats: diff.stats,
    unifiedDiff: diff.stats.hasChanges
      ? `--- previous\n+++ current\n${unifiedBody}`
      : "No changes",
    source,
    warning,
  };
}

async function postToDiffService(
  url: string,
  previous: DiffStructure,
  current: DiffStructure,
): Promise<DiffServiceResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.DIFF_SERVICE_KEY) {
    headers["x-functions-key"] = process.env.DIFF_SERVICE_KEY;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ previous, current }),
      signal: controller.signal,
    });
    const body = (await res.json()) as DiffServiceResponse & { error?: string };
    if (!res.ok) throw new Error(body.error ?? res.statusText);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function compareWithDiffService(params: {
  previous: DiffStructure;
  current: DiffStructure;
}): Promise<DiffResult> {
  const url = process.env.DIFF_SERVICE_URL;
  if (!url) return compareStructures(params.previous, params.current);

  try {
    const remote = await postToDiffService(url, params.previous, params.current);
    if (!remote.stats || remote.previous === undefined || remote.current === undefined) {
      throw new Error("Diff service returned an invalid response");
    }
    return {
      previous: remote.previous,
      current: remote.current,
      stats: remote.stats,
      unifiedDiff: remote.unifiedDiff ?? "",
      source: "azure",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Diff service request failed";
    return compareStructures(
      params.previous,
      params.current,
      "local-fallback",
      `Azure diff service unavailable: ${message}`,
    );
  }
}
