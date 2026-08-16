const fs = require('fs');

const csvPath = 'C:/Users/kj/.codex/codex-remote-attachments/01a0004f-cde6-76b2-b25a-95e97b3e6b24/DA4B0C28-4666-4C83-8D90-C792B185ABE4/1-triggerpoints-import.csv';
const beforePath = 'output/import/muscles-before-triggerpoints-import-2026-08-16.json';
const outPath = 'output/import/muscles-after-triggerpoints-import-2026-08-16.json';
const reportPath = 'output/import/triggerpoints-import-report-2026-08-16.csv';

function readJsonMaybeUtf16(filePath) {
  const raw = fs.readFileSync(filePath);
  let text = raw.toString('utf8');
  if (text.includes('\u0000')) text = raw.toString('utf16le');
  text = text.replace(/^\uFEFF/, '').trim();
  if (!text || text === 'null') return {};
  return JSON.parse(text);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i++;
      row.push(cell);
      if (row.some(v => v.length > 0)) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}

function splitList(value) {
  return String(value || '').split(/[;,|]/).map(v => v.trim()).filter(Boolean);
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildPoint(row) {
  return {
    id: row.triggerpointId,
    label: row.label || row.triggerpointId,
    x: asNumber(row.x, 200),
    y: asNumber(row.y, 200),
    bodySide: row.bodySide || 'unknown',
    anatomicalLocation: row.anatomicalLocation || '',
    painRegions: splitList(row.painRegions),
    referralArea: row.referralArea || '',
    sourceFile: row.sourceFile || '',
    sourcePage: row.sourcePage ? Number(row.sourcePage) : undefined,
    reviewStatus: row.reviewStatus || 'draft',
    notes: row.notes || ''
  };
}

const muscles = readJsonMaybeUtf16(beforePath);
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8')).filter(r => r.muscleId && r.triggerpointId);
const report = [['muscleId','triggerpointId','status','muscleExists','pointsBefore','pointsAfter','label','sourcePage']];
const missingMuscles = new Set();
let created = 0;
let updated = 0;

for (const row of rows) {
  const muscle = muscles[row.muscleId];
  if (!muscle) {
    missingMuscles.add(row.muscleId);
    report.push([row.muscleId, row.triggerpointId, 'skipped', 'no', '0', '0', row.label || '', row.sourcePage || '']);
    continue;
  }
  const before = Array.isArray(muscle.triggerpoints) ? muscle.triggerpoints : [];
  const point = buildPoint(row);
  const index = before.findIndex(p => p && p.id === point.id);
  let after;
  let status;
  if (index >= 0) {
    after = before.map((p, i) => i === index ? { ...p, ...point } : p);
    status = 'updated';
    updated++;
  } else {
    after = [...before, point];
    status = 'created';
    created++;
  }
  muscle.triggerpoints = after;
  const existingPain = new Set(Array.isArray(muscle.painRegions) ? muscle.painRegions : []);
  for (const region of point.painRegions) existingPain.add(region);
  muscle.painRegions = Array.from(existingPain);
  if (!muscle.referralArea && point.referralArea) muscle.referralArea = point.referralArea;
  report.push([row.muscleId, row.triggerpointId, status, 'yes', String(before.length), String(after.length), point.label, String(point.sourcePage || '')]);
}

const muscleList = Object.values(muscles);
const triggerpointCount = muscleList.reduce((sum, muscle) => sum + ((muscle.triggerpoints || []).length), 0);
fs.writeFileSync(outPath, JSON.stringify(muscles, null, 2), 'utf8');
fs.writeFileSync(reportPath, report.map(line => line.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n'), 'utf8');
console.log(JSON.stringify({csvRows: rows.length, muscles: muscleList.length, created, updated, skipped: missingMuscles.size, missingMuscles: Array.from(missingMuscles), triggerpointCount, outPath, reportPath}, null, 2));
