const fs = require('fs');
const path = 'output/import/verify-muscles.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '').replace(/\u0000/g, ''));
const faceMusclePatterns = ['masseter', 'temporalis', 'pterygoid', 'digastric', 'occipitofrontalis', 'suboccipital'];
let body = 0;
let face = 0;
for (const muscle of Object.values(data)) {
  const idName = `${muscle.id || ''} ${muscle.name || ''}`.toLowerCase();
  const mapType = faceMusclePatterns.some((pattern) => idName.includes(pattern)) ? 'face' : 'body';
  for (const point of muscle.triggerpoints || []) {
    point.mapType = mapType;
    if (mapType === 'face') face++; else body++;
  }
}
const out = 'output/import/muscles-maptype-corrected-202608151348.json';
fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf8');
console.log(JSON.stringify({ out, body, face, muscles: Object.keys(data).length, triggerpoints: body + face }, null, 2));
