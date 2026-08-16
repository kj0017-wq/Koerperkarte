const fs = require('fs');
const { execFileSync } = require('child_process');
const py = 'C:/Users/kj/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const xlsx = 'C:/Users/kj/.codex/codex-remote-attachments/01a0004f-cde6-76b2-b25a-95e97b3e6b24/459A8824-B09E-4141-AF91-08E72C0C2118/1-Wichtige_Muskeln_150.xlsx';
const dbPath = 'output/import/muscles-current-for-150-compare-2026-08-16.json';
function readJsonMaybeUtf16(filePath) {
  const raw = fs.readFileSync(filePath);
  let text = raw.toString('utf8');
  if (text.includes('\u0000')) text = raw.toString('utf16le');
  return JSON.parse(text.replace(/^\uFEFF/, '').trim());
}
const pyCode = `import openpyxl, json\nwb=openpyxl.load_workbook(r'''${xlsx}''', data_only=True)\nws=wb[wb.sheetnames[0]]\nrows=[]\nheaders=[c.value for c in ws[1]]\nfor row in ws.iter_rows(min_row=2, values_only=True):\n    if any(v is not None for v in row):\n        rows.append(dict(zip(headers,row)))\nprint(json.dumps(rows, ensure_ascii=False))`;
const source = JSON.parse(execFileSync(py, ['-c', pyCode], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 5, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }));
const db = readJsonMaybeUtf16(dbPath);
const dbItems = Object.values(db || {});
const alias = new Map([
  ['musculus frontalis', ['occipitofrontalis', 'frontalis']],
  ['musculus occipitalis', ['occipitofrontalis', 'occipitalis']],
  ['musculus trapezius', ['upper-trapezius', 'm. trapezius pars descendens', 'trapezius']],
  ['musculus sternocleidomastoideus', ['sternocleidomastoid', 'scm']],
  ['musculus masseter', ['masseter']],
  ['musculus temporalis', ['temporalis']],
  ['musculus pterygoideus medialis', ['medial-pterygoid', 'pterygoideus medialis']],
  ['musculus pterygoideus lateralis', ['lateral-pterygoid', 'pterygoideus lateralis']],
  ['musculus levator scapulae', ['levator-scapulae']],
  ['musculus scalenus anterior', ['scalene-anterior', 'scalenus anterior']],
  ['musculus scalenus medius', ['scalene-medius', 'scalenus medius']],
  ['musculus scalenus posterior', ['scalene-posterior', 'scalenus posterior']],
  ['musculus rhomboideus minor', ['rhomboid-minor', 'rhomboideus minor']],
  ['musculus rhomboideus major', ['rhomboid-major', 'rhomboideus major']],
  ['musculus deltoideus', ['deltoid', 'deltoideus']],
  ['musculi rotatores', ['cervical-rotatores', 'rotatores cervicis']],
  ['musculus infraspinatus', ['infraspinatus']],
  ['musculus supraspinatus', ['supraspinatus']],
  ['musculus multifidus', ['multifidus']],
  ['musculus piriformis', ['piriformis']],
  ['musculus gastrocnemius', ['gastrocnemius']],
]);
function stripDiacritics(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function norm(s) {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/\bmusculus\b/g, 'm')
    .replace(/\bm\.\b/g, 'm')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function tokens(s) { return new Set(norm(s).split(/\s+/).filter((t) => t && !['m','muscle','musculus','pars'].includes(t))); }
function jaccard(a, b) {
  const A = tokens(a); const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  return hit / new Set([...A, ...B]).size;
}
const dbSearch = dbItems.map((item) => ({
  id: item.id,
  name: item.name || '',
  bodyArea: item.bodyArea || '',
  haystack: [item.id, item.name, item.bodyArea, item.course, item.explanation, item.referralArea].join(' '),
  triggerpoints: (item.triggerpoints || []).length,
}));
function findMatch(row) {
  const latin = row['Lateinischer Name'] || '';
  const german = row['Deutscher Name'] || '';
  const candidates = [latin, german, ...(alias.get(String(latin).toLowerCase()) || [])];
  for (const c of candidates) {
    const n = norm(c);
    const direct = dbSearch.find((item) => norm(item.id) === n || norm(item.name) === n || norm(item.haystack).includes(n));
    if (direct) return { status: 'vorhanden', confidence: 'hoch', matchId: direct.id, matchName: direct.name, triggerpoints: direct.triggerpoints };
  }
  let best = null;
  for (const item of dbSearch) {
    const score = Math.max(...candidates.map((c) => Math.max(jaccard(c, item.name), jaccard(c, item.id))));
    if (!best || score > best.score) best = { ...item, score };
  }
  if (best && best.score >= 0.72) return { status: 'wahrscheinlich vorhanden', confidence: 'mittel', matchId: best.id, matchName: best.name, triggerpoints: best.triggerpoints };
  return { status: 'fehlt', confidence: 'niedrig', matchId: '', matchName: '', triggerpoints: '' };
}
const rows = source.map((row) => ({
  nr: row.ID,
  deutsch: row['Deutscher Name'] || '',
  latein: row['Lateinischer Name'] || '',
  region: row.Region || '',
  ...findMatch(row),
}));
const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
function csvEscape(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }
const outCsv = 'output/import/muscle-150-comparison-2026-08-16.csv';
const header = ['nr','deutsch','latein','region','status','confidence','matchId','matchName','triggerpoints'];
fs.writeFileSync(outCsv, [header.join(','), ...rows.map((r) => header.map((h) => csvEscape(r[h])).join(','))].join('\n'), 'utf8');
const outJson = 'output/import/muscle-150-comparison-2026-08-16.json';
fs.writeFileSync(outJson, JSON.stringify({ counts, rows }, null, 2), 'utf8');
console.log(JSON.stringify({ sourceRows: source.length, dbMuscles: dbItems.length, counts, outCsv, outJson }, null, 2));
console.log('MISSING_SAMPLE');
for (const r of rows.filter((r) => r.status === 'fehlt').slice(0, 40)) console.log(`${r.nr}. ${r.latein} (${r.deutsch}) - ${r.region}`);
console.log('PRESENT_SAMPLE');
for (const r of rows.filter((r) => r.status !== 'fehlt').slice(0, 30)) console.log(`${r.nr}. ${r.latein} -> ${r.matchName} [${r.matchId}]`);
