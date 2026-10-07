import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const input = resolve(here, 'derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv');
const output = resolve(here, '../website/data/catalogue.js');

function csvRows(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

const rows = csvRows(await readFile(input, 'utf8'));
const columns = rows.shift();
const index = name => columns.indexOf(name);
const data = rows.map(row => ({
  id: row[index('plant_id')],
  latin: row[index('scientific_name')],
  name: row[index('vernacular_nl')] || row[index('scientific_name')],
  url: row[index('verspreidingsatlas_species_page_url')] || ''
})).filter(record => record.id && record.latin);
await mkdir(dirname(output), {recursive: true});
await writeFile(output, '/* Generated taxonomy names only. Not planting recommendations. */\nwindow.PLANTSCAPES_CATALOGUE = ' + JSON.stringify(data) + ';\n', 'utf8');
console.log('Wrote ' + data.length + ' taxonomy names to ' + output);
