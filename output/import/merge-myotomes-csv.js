const fs = require("fs");
const path = require("path");

const csvPath =
  "C:\\Users\\kj\\.codex\\codex-remote-attachments\\01a0004f-cde6-76b2-b25a-95e97b3e6b24\\A02FF0CB-3996-4EFE-8745-7F868C9C2F6B\\1-myotomes.csv";
const beforePath = path.join(__dirname, "myotomes-before-2026-08-15.json");
const outPath = path.join(__dirname, "myotomes-after-2026-08-15.json");
const reportPath = path.join(__dirname, "myotomes-import-report-2026-08-15.csv");

function readJsonMaybeUtf16(filePath) {
  const raw = fs.readFileSync(filePath);
  let text = raw.toString("utf8");
  if (text.includes("\u0000")) text = raw.toString("utf16le");
  text = text.replace(/^\uFEFF/, "").trim();
  if (!text || text === "null") return {};
  return JSON.parse(text);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function splitList(value) {
  return String(value || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function myotomeFromRow(row, existing) {
  const segments = splitList(row.segments);
  return {
    ...existing,
    id: row.id || existing.id,
    name: row.name || existing.name,
    movement: row.movement || existing.movement,
    segments: segments.length ? segments : existing.segments,
    description: row.description || existing.description,
    mapPath: row.mapPath || existing.mapPath,
    sourceFile: row.sourceFile || existing.sourceFile,
    sourcePage: row.sourcePage ? Number(row.sourcePage) : existing.sourcePage,
    reviewStatus: row.reviewStatus || existing.reviewStatus,
    notes: row.notes || existing.notes,
  };
}

const current = readJsonMaybeUtf16(beforePath);
const csvRows = parseCsv(fs.readFileSync(csvPath, "utf8")).filter((row) => row.collection === "myotomes");
const merged = { ...current };
const report = [["id", "status", "segments", "movement", "name"]];

for (const row of csvRows) {
  const before = merged[row.id] || {};
  const after = myotomeFromRow(row, before);
  merged[row.id] = after;
  report.push([row.id, before.id ? "updated" : "created", (after.segments || []).join("|"), after.movement || "", after.name || ""]);
}

fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
fs.writeFileSync(
  reportPath,
  report.map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n"),
);

console.log(JSON.stringify({
  csvRows: csvRows.length,
  myotomesBefore: Object.keys(current).length,
  myotomesAfter: Object.keys(merged).length,
  outPath,
  reportPath,
}, null, 2));
