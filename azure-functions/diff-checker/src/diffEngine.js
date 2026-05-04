function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = stableValue(value[key]);
      return acc;
    }, {});
}

function normalizeStructure(value) {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return JSON.stringify(stableValue(value), null, 2);
}

function buildLineDiff(previous, current) {
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

  const lines = [];
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

  return {
    lines,
    stats: {
      addedLines,
      removedLines,
      unchangedLines,
      totalLines,
      changedLines,
      similarity: totalLines === 0 ? 1 : unchangedLines / totalLines,
      hasChanges: changedLines > 0,
    },
  };
}

function compareStructures(previousInput, currentInput) {
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
  };
}

module.exports = {
  compareStructures,
};
