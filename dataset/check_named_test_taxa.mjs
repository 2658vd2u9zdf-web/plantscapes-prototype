import fs from 'node:fs/promises';

const TESTS = [
  ['Bärlauch', 'Allium ursinum'],
  ['Mirabelle', 'Prunus domestica subsp. syriaca', 'Prunus domestica'],
  ['Zwetschke', 'Prunus domestica subsp. domestica', 'Prunus domestica'],
  ['Birke', 'Betula pendula', 'Betula pubescens'],
  ['Ulme', 'Ulmus glabra', 'Ulmus laevis', 'Ulmus minor'],
  ['Platane', 'Platanus × hispanica', 'Platanus × acerifolia', 'Platanus hispanica'],
  ['fireweed', 'Chamerion angustifolium', 'Epilobium angustifolium'],
  ['black poplar', 'Populus nigra'],
  ['white melilot', 'Melilotus albus'],
  ['common tansy', 'Tanacetum vulgare'],
  ['field bindweed', 'Convolvulus arvensis'],
  ['wild carrot', 'Daucus carota'],
  ["baby's breath", 'Gypsophila paniculata'],
  ['Metskastik', 'Calamagrostis arundinacea'],
  ['hairy Michaelmas daisy', 'Symphyotrichum novae-angliae', 'Aster novae-angliae'],
  ['cypress spurge', 'Euphorbia cyparissias'],
  ["lamb's ear", 'Stachys byzantina'],
  ['sweet pea', 'Lathyrus odoratus'],
  ['hawthorn', 'Crataegus monogyna', 'Crataegus laevigata'],
  ['weeping willow', 'Salix × sepulcralis', 'Salix babylonica'],
  ['bristly oxtongue', 'Helminthotheca echioides', 'Picris echioides'],
  ['blueblossom', 'Ceanothus thyrsiflorus'],
  ['purpletop tridens', 'Tridens flavus'],
  ['whorled tickseed', 'Coreopsis verticillata'],
  ['garlic mustard', 'Alliaria petiolata'],
  ['large-leaved lime', 'Tilia platyphyllos'],
];
const API = 'https://api.gbif.org/v1';
const CORE_PATH = 'Verdant-Test-Package/dataset/derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv';
const HERITAGE_PATH = 'Verdant-Test-Package/dataset/derived/plantscapes_heritage_fruit_cultivars_v0_1.csv';
const OUTPUT_PATH = 'Verdant-Test-Package/dataset/test_results_named_taxa_gbif_nl.json';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const [core, heritage] = await Promise.all([fs.readFile(CORE_PATH, 'utf8'), fs.readFile(HERITAGE_PATH, 'utf8')]);

async function queryCandidate(name) {
  const match = await (await fetch(`${API}/species/match?${new URLSearchParams({ name })}`)).json();
  const taxonKey = match.usageKey ?? match.speciesKey ?? match.acceptedUsageKey;
  if (!taxonKey) return { queried_name: name, gbif_accepted_name: '', gbif_taxon_key: '', netherlands_occurrence_count: null };
  await sleep(125);
  const occurrence = await (await fetch(`${API}/occurrence/search?${new URLSearchParams({ taxonKey: String(taxonKey), country: 'NL', limit: '0' })}`)).json();
  return {
    queried_name: name,
    gbif_accepted_name: match.scientificName ?? '',
    gbif_taxon_key: taxonKey,
    netherlands_occurrence_count: occurrence.count ?? null,
    core_exact_scientific_name_match: core.includes(`"${name}"`),
    heritage_botanical_taxon_match: heritage.includes(`"${name}"`),
  };
}

const results = [];
for (let index = 0; index < TESTS.length; index += 4) {
  const batch = TESTS.slice(index, index + 4);
  results.push(...await Promise.all(batch.map(async ([input_name, ...candidates]) => ({
    input_name,
    candidates,
    status: candidates.length ? 'queried' : 'needs_spelling_or_name_clarification',
    results: await Promise.all(candidates.map(queryCandidate)),
  }))));
  await sleep(250);
}
await fs.writeFile(OUTPUT_PATH, JSON.stringify({ generated_on: new Date().toISOString(), source: 'GBIF species match and occurrence search (country=NL)', results }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ test_terms: results.length, output: OUTPUT_PATH }, null, 2));
