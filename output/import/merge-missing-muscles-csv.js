const fs = require('fs');
const path = require('path');

const csvPath = 'C:/Users/kj/.codex/codex-remote-attachments/01a0004f-cde6-76b2-b25a-95e97b3e6b24/F21D94DC-F55B-416C-9195-F5CB640AA4B7/1-missing-muscles-import.csv';
const beforePath = 'output/import/muscles-before-missing-import-2026-08-16.json';
const outPath = 'output/import/muscles-after-missing-import-2026-08-16.json';
const reportPath = 'output/import/missing-muscles-import-report-2026-08-16.csv';

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

function parseTriggerpoints(value, fallback) {
  if (!value || value.trim() === '' || value.trim() === '[]') return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function defaultCourse(row) {
  return row.course || `${row.name} (${row.description || row.bodyArea || 'Anatomie'}). Verlauf und Detailbeschreibung noch ergaenzen.`;
}

function defaultExplanation(row) {
  return row.explanation || `Importierter Grunddatensatz fuer ${row.description || row.name}; klinische Beschreibung und Triggerpunktdaten noch pruefen und ergaenzen.`;
}

function muscleFromRow(row, existing) {
  const painRegions = splitList(row.painRegions);
  const segments = splitList(row.segments);
  return {
    ...existing,
    id: row.id || existing.id,
    name: row.name || existing.name,
    bodyArea: row.bodyArea || existing.bodyArea || '',
    course: defaultCourse(row) || existing.course || '',
    explanation: defaultExplanation(row) || existing.explanation || '',
    painRegions: painRegions.length ? painRegions : existing.painRegions || [],
    triggerpoints: parseTriggerpoints(row.triggerpoints, existing.triggerpoints || []),
    referralArea: row.referralArea || existing.referralArea || '',
    referralPath: row.referralPath || existing.referralPath || '',
    segments: segments.length ? segments : existing.segments,
    movement: row.movement || existing.movement,
    description: row.description || existing.description,
    mapPath: row.mapPath || existing.mapPath,
    sourceFile: row.sourceFile || existing.sourceFile,
    sourcePage: row.sourcePage ? Number(row.sourcePage) : existing.sourcePage,
    reviewStatus: row.reviewStatus || existing.reviewStatus || 'draft',
    notes: row.notes || existing.notes || '',
  };
}

const current = readJsonMaybeUtf16(beforePath);
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8')).filter(r => r.collection === 'muscles' && r.id);
const merged = { ...current };
const report = [['id','status','name','bodyArea','triggerpoints_before','triggerpoints_after','sourcePage']];
for (const row of rows) {
  const before = merged[row.id] || {};
  const after = muscleFromRow(row, before);
  merged[row.id] = after;
  report.push([row.id, before.id ? 'updated' : 'created', after.name || '', after.bodyArea || '', String((before.triggerpoints || []).length), String((after.triggerpoints || []).length), String(after.sourcePage || '')]);
}
const muscles = Object.values(merged);
const triggerpoints = muscles.reduce((s,m)=>s+((m.triggerpoints||[]).length),0);
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
fs.writeFileSync(reportPath, report.map(line => line.map(v => '"' + String(v ?? '').replace(/"/g,'""') + '"').join(',')).join('\n'), 'utf8');
console.log(JSON.stringify({csvRows: rows.length, musclesBefore: Object.keys(current).length, musclesAfter: Object.keys(merged).length, created: report.filter((r,i)=>i>0&&r[1]==='created').length, updated: report.filter((r,i)=>i>0&&r[1]==='updated').length, triggerpointsAfter: triggerpoints, outPath, reportPath}, null, 2));
