const fs = require('fs');
const csvPath = 'C:\\Users\\kj\\.codex\\codex-remote-attachments\\01a0004f-cde6-76b2-b25a-95e97b3e6b24\\A2770F4D-7F63-4E34-9D9C-CED58F5D0815\\1-body-map-blocks.csv';
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.some((v) => v.trim())).map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}
function list(value) { return (value || '').split(/[|,;]/).map((item) => item.trim()).filter(Boolean); }
const blocks = {};
for (const row of parseCsv(fs.readFileSync(csvPath, 'utf8'))) {
  if (row.collection !== 'muscles' || !row.id) continue;
  blocks[row.id] = {
    id: row.id,
    name: row.name,
    bodyArea: row.bodyArea,
    course: row.course,
    explanation: row.explanation,
    painRegions: list(row.painRegions),
    referralArea: row.referralArea,
    referralPath: row.referralPath || '',
    sourceFile: row.sourceFile,
    sourcePage: Number(row.sourcePage) || row.sourcePage,
    reviewStatus: row.reviewStatus || 'draft',
    notes: row.notes || ''
  };
}
const out = 'output/import/body-map-blocks.json';
fs.writeFileSync(out, JSON.stringify(blocks, null, 2), 'utf8');
console.log(JSON.stringify({out, blocks:Object.keys(blocks).length, ids:Object.keys(blocks)}, null, 2));
