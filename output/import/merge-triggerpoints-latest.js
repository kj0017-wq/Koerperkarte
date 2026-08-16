const fs = require('fs');
const { execFileSync } = require('child_process');

const csvPath = 'C:\\Users\\kj\\.codex\\codex-remote-attachments\\01a0004f-cde6-76b2-b25a-95e97b3e6b24\\75F6B776-BDC9-474D-B92F-3A4F63B312F6\\1-triggerpoints-bodymap.csv';
const outDir = 'output/import';
fs.mkdirSync(outDir, { recursive: true });

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const headers = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.some((v) => v.trim())).map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

function titleFromId(id) {
  const preserve = new Set(['scm', 'tfl']);
  return id.split('-').map((part) => preserve.has(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function parseList(value) {
  return (value || '').split(/[|,;]/).map((item) => item.trim()).filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'de'));
}

const faceMuscles = ['masseter', 'temporalis', 'pterygoid', 'digastric', 'occipitofrontalis', 'suboccipital'];
const faceAreas = ['kopf', 'gesicht'];
function inferBodyArea(muscleId, painRegions) {
  const joined = [muscleId, ...painRegions].join(' ').toLowerCase();
  if (faceMuscles.some((item) => joined.includes(item)) || painRegions.some((item) => ['face', 'jaw', 'tmj', 'ear', 'teeth', 'eye', 'orbit', 'temple', 'forehead'].includes(item))) return 'Kopf / Gesicht';
  if (painRegions.some((item) => ['hip', 'buttock', 'groin', 'thigh', 'knee', 'calf', 'ankle'].includes(item))) return 'Rumpf / Becken / Bein';
  if (painRegions.some((item) => ['shoulder', 'upper-arm', 'forearm', 'hand', 'elbow'].includes(item))) return 'Schulter / Arm';
  if (painRegions.some((item) => ['low-back', 'sacrum', 'coccyx'].includes(item))) return 'Rumpf / Becken';
  return 'Koerper';
}

function inferMapType(muscleId, muscle, row) {
  const anatomical = `${row.anatomicalLocation || ''} ${muscle?.bodyArea || ''}`.toLowerCase();
  const name = `${muscleId} ${muscle?.name || ''}`.toLowerCase();
  if (faceAreas.some((item) => anatomical.includes(item))) return 'face';
  if (faceMuscles.some((item) => name.includes(item))) return 'face';
  return 'body';
}

function makePoint(row, muscle) {
  const painRegions = parseList(row.painRegions);
  const x = Number(row.x);
  const y = Number(row.y);
  return {
    id: row.triggerpointId || `${row.muscleId}-tp-${Date.now()}`,
    label: row.label || 'TP',
    x: Number.isFinite(x) ? x : 200,
    y: Number.isFinite(y) ? y : 200,
    mapType: inferMapType(row.muscleId, muscle, row),
    bodySide: row.bodySide || 'unknown',
    anatomicalLocation: row.anatomicalLocation || '',
    painRegions,
    referralArea: row.referralArea || '',
    sourceFile: row.sourceFile || '',
    sourcePage: row.sourcePage ? Number(row.sourcePage) || row.sourcePage : '',
    reviewStatus: row.reviewStatus || 'draft',
    notes: row.notes || ''
  };
}

const currentText = execFileSync('firebase.cmd', ['database:get', '/muscles', '--project', 'koerperkarte'], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const muscles = JSON.parse(currentText || '{}');
const beforeMuscles = Object.keys(muscles).length;
const beforePoints = Object.values(muscles).reduce((sum, item) => sum + ((item.triggerpoints || []).length), 0);
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));

let addedMuscles = 0;
let addedPoints = 0;
let updatedPoints = 0;
let skippedRows = 0;
const touched = new Set();
const newMuscles = [];

for (const row of rows) {
  const muscleId = row.muscleId;
  if (!muscleId || !row.triggerpointId) {
    skippedRows++;
    continue;
  }
  const rowPainRegions = parseList(row.painRegions);
  if (!muscles[muscleId]) {
    muscles[muscleId] = {
      id: muscleId,
      name: `M. ${titleFromId(muscleId)}`,
      bodyArea: inferBodyArea(muscleId, rowPainRegions),
      course: 'Noch zu ergaenzen.',
      explanation: 'Draft-Datensatz aus Triggerpunkt-Import; anatomische Detailbeschreibung noch pruefen und ergaenzen.',
      painRegions: rowPainRegions,
      triggerpoints: [],
      referralArea: row.referralArea || '',
      referralPath: '',
      reviewStatus: row.reviewStatus || 'draft',
      sourceFile: row.sourceFile || '',
      sourcePage: row.sourcePage ? Number(row.sourcePage) || row.sourcePage : '',
      notes: 'Automatisch aus Triggerpunkt-CSV angelegt; Muskelverlauf und Beschreibung fachlich nachpflegen.'
    };
    addedMuscles++;
    newMuscles.push(muscleId);
  }

  const muscle = muscles[muscleId];
  muscle.painRegions = unique([...(muscle.painRegions || []), ...rowPainRegions]);
  if (!muscle.referralArea && row.referralArea) muscle.referralArea = row.referralArea;
  if (!muscle.sourceFile && row.sourceFile) muscle.sourceFile = row.sourceFile;
  if (!muscle.sourcePage && row.sourcePage) muscle.sourcePage = Number(row.sourcePage) || row.sourcePage;
  if (!Array.isArray(muscle.triggerpoints)) muscle.triggerpoints = [];

  const point = makePoint(row, muscle);
  const existingIndex = muscle.triggerpoints.findIndex((item) => item.id === point.id);
  if (existingIndex >= 0) {
    muscle.triggerpoints[existingIndex] = { ...muscle.triggerpoints[existingIndex], ...point };
    updatedPoints++;
  } else {
    muscle.triggerpoints.push(point);
    addedPoints++;
  }
  touched.add(muscleId);
}

for (const muscle of Object.values(muscles)) {
  if (Array.isArray(muscle.triggerpoints)) {
    muscle.triggerpoints.sort((a, b) => String(a.id).localeCompare(String(b.id), 'de'));
  }
}

const outJson = `${outDir}/muscles-merged-${Date.now()}.json`;
fs.writeFileSync(outJson, JSON.stringify(muscles, null, 2), 'utf8');
execFileSync('firebase.cmd', ['database:set', '/muscles', outJson, '--project', 'koerperkarte', '--force'], { stdio: 'inherit', maxBuffer: 50 * 1024 * 1024 });

const afterMuscles = Object.keys(muscles).length;
const afterPoints = Object.values(muscles).reduce((sum, item) => sum + ((item.triggerpoints || []).length), 0);
const reportRows = [
  ['metric', 'value'],
  ['csv_rows', rows.length],
  ['muscles_before', beforeMuscles],
  ['triggerpoints_before', beforePoints],
  ['muscles_after', afterMuscles],
  ['triggerpoints_after', afterPoints],
  ['new_muscles', addedMuscles],
  ['new_triggerpoints', addedPoints],
  ['updated_triggerpoints', updatedPoints],
  ['skipped_rows', skippedRows],
  ['touched_muscles', touched.size],
  ['new_muscle_ids', newMuscles.join('|')]
];
const reportPath = `${outDir}/triggerpoints-import-report-${Date.now()}.csv`;
fs.writeFileSync(reportPath, reportRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), 'utf8');
console.log(JSON.stringify({ csvRows: rows.length, beforeMuscles, beforePoints, afterMuscles, afterPoints, addedMuscles, addedPoints, updatedPoints, skippedRows, touchedMuscles: touched.size, newMuscles, reportPath }, null, 2));

