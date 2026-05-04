const assert = require("node:assert/strict");
const { compareStructures } = require("./diffEngine");

const stringResult = compareStructures("a\nb", "a\nc\nd");
assert.equal(stringResult.stats.addedLines, 2);
assert.equal(stringResult.stats.removedLines, 1);
assert.equal(stringResult.stats.unchangedLines, 1);
assert.equal(stringResult.stats.hasChanges, true);

const objectResult = compareStructures(
  { b: 2, a: { z: true, y: false } },
  { a: { y: false, z: true }, b: 2 },
);
assert.equal(objectResult.stats.hasChanges, false);
assert.equal(objectResult.previous, objectResult.current);

console.log("diffEngine tests passed");
