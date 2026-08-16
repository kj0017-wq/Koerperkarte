const fs = require("fs");
const path = require("path");

const csvPath =
  "C:\\Users\\kj\\.codex\\codex-remote-attachments\\01a0004f-cde6-76b2-b25a-95e97b3e6b24\\92A4B831-FDE3-4AEE-8D43-EDEDBC3D5097\\1-body-map-anatomy.csv";
const beforePath = path.join(__dirname, "muscles-before-anatomy-2026-08-15.json");
const outPath = path.join(__dirname, "muscles-after-anatomy-2026-08-15.json");
const reportPath = path.join(__dirname, "anatomy-import-report-2026-08-15.csv");

function readJsonMaybeUtf16(filePath) {
  const raw = fs.readFileSync(filePath);
  let text = raw.toString("utf8");
  if (text.includes("\u0000")) {
    text = raw.toString("utf16le");
  }
  return JSON.parse(text.replace(/^\uFEFF/, ""));
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
      if (row.some((value) => value.length > 0)) rows.push(row);
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

function parseTriggerpoints(value, fallback) {
  if (!value || value.trim() === "" || value.trim() === "[]") return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function muscleFromRow(row, existing) {
  return {
    ...existing,
    id: row.id || existing.id,
    name: row.name || existing.name,
    bodyArea: row.bodyArea || existing.bodyArea,
    course: row.course || existing.course,
    explanation: row.explanation || existing.explanation,
    painRegions: splitList(row.painRegions).length ? splitList(row.painRegions) : existing.painRegions,
    triggerpoints: parseTriggerpoints(row.triggerpoints, existing.triggerpoints || []),
    referralArea: row.referralArea || existing.referralArea,
    referralPath: row.referralPath || existing.referralPath,
    segments: splitList(row.segments).length ? splitList(row.segments) : existing.segments,
    movement: row.movement || existing.movement,
    description: row.description || existing.description,
    mapPath: row.mapPath || existing.mapPath,
    sourceFile: row.sourceFile || existing.sourceFile,
    sourcePage: row.sourcePage ? Number(row.sourcePage) : existing.sourcePage,
    reviewStatus: row.reviewStatus || existing.reviewStatus,
    notes: row.notes || existing.notes,
  };
}

const current = readJsonMaybeUtf16(beforePath);
const csvRows = parseCsv(fs.readFileSync(csvPath, "utf8")).filter((row) => row.collection === "muscles");
const merged = { ...current };
const report = [["id", "status", "triggerpoints_before", "triggerpoints_after", "name"]];

for (const row of csvRows) {
  const before = merged[row.id] || {};
  const after = muscleFromRow(row, before);
  merged[row.id] = after;
  report.push([
    row.id,
    before.id ? "updated" : "created",
    String((before.triggerpoints || []).length),
    String((after.triggerpoints || []).length),
    after.name || "",
  ]);
}

const muscles = Object.values(merged);
const triggerCount = muscles.reduce((sum, item) => sum + ((item.triggerpoints || []).length), 0);

fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
fs.writeFileSync(
  reportPath,
  report.map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n"),
);

console.log(JSON.stringify({
  csvRows: csvRows.length,
  musclesBefore: Object.keys(current).length,
  musclesAfter: Object.keys(merged).length,
  triggerpointsAfter: triggerCount,
  outPath,
  reportPath,
}, null, 2));
