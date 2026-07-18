import test from "node:test";
import assert from "node:assert/strict";
import { parseSpreadsheetBuffer } from "./parse.js";

test("parses CSV data into a bounded dataset profile", async () => {
  const profile = await parseSpreadsheetBuffer(
    Buffer.from("name,total\nAda,12\nGrace,18\n"),
    "people.csv",
    "text/csv",
  );
  assert.equal(profile.rowCount, 2);
  assert.equal(profile.columnCount, 2);
  assert.equal(profile.columns[1]?.type, "number");
  assert.deepEqual(profile.sampleRows[0], { name: "Ada", total: 12 });
});

test("rejects legacy XLS input instead of using an unpatched parser", async () => {
  await assert.rejects(
    parseSpreadsheetBuffer(Buffer.from("legacy"), "old.xls"),
    /Legacy \.xls files are not accepted securely/,
  );
});
