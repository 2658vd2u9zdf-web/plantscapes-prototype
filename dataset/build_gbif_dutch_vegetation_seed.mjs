import fs from 'node:fs/promises';
import path from 'node:path';

const DATASET_KEY = '740df67d-5663-41a2-9d12-33ec33876c47';
const TARGET_TAXA = 10000;
const FACET_PAGE_SIZE = 1000;
const SNAPSHOT_DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.resolve('Verdant-Test-Package/dataset');
const RAW_DIR = path.join(OUT_DIR, 'raw');
const DERIVED_DIR = path.join(OUT_DIR, 'derived');
const API = 'https://api.gbif.org/v1';
const VERSPREIDINGSATLAS_VASCULAR_TAXA_URL = 'https://www.verspreidingsatlas.nl/taxa/vaatplanten';
const ORANJE_LIJST_FRUIT_SOURCES = [
  { crop: 'Appel', botanical_taxon: 'Malus domestica', query_url: 'https://deoerakker.cgn.wur.nl/or/list.asp?gewassearch=appel' },
  { crop: 'Peer', botanical_taxon: 'Pyrus communis', query_url: 'https://deoerakker.cgn.wur.nl/or/list.asp?gewassearch=peer' },
  { crop: 'Pruim', botanical_taxon: 'Prunus domestica', query_url: 'https://deoerakker.cgn.wur.nl/or/list.asp?gewassearch=pruim' },
  { crop: 'Kers', botanical_taxon: 'Prunus spp.', query_url: 'https://deoerakker.cgn.wur.nl/or/list.asp?gewassearch=kers' },
];
const SUPPLEMENTARY_TEST_TAXA = [
  { scientific_name: 'Chamerion angustifolium', input_name: 'fireweed' },
  { scientific_name: 'Calamagrostis arundinacea', input_name: 'Metskastik' },
  { scientific_name: 'Lathyrus odoratus', input_name: 'sweet pea' },
  { scientific_name: 'Salix × sepulcralis', input_name: 'weeping willow' },
  { scientific_name: 'Ceanothus thyrsiflorus', input_name: 'blueblossom' },
  { scientific_name: 'Tridens flavus', input_name: 'purpletop tridens' },
  { scientific_name: 'Coreopsis verticillata', input_name: 'whorled tickseed' },
];

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function getText(url) {
  const response = await fetch(url, { headers: { Accept: 'application/xml, text/xml;q=0.9, text/plain;q=0.8' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function decodeXml(value) {
  const trimmed = value.trim();
  const cdata = trimmed.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  const text = cdata ? cdata[1] : trimmed;
  return text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').trim();
}

function xmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1]) : '';
}

function normaliseName(value) {
  return String(value ?? '').toLowerCase().replaceAll('×', 'x').replace(/\s+/g, ' ').trim();
}

function parseVerspreidingsatlasTaxa(xml) {
  return [...xml.matchAll(/<taxon>([\s\S]*?)<\/taxon>/g)].map((match) => {
    const block = match[1];
    const dataObject = block.match(/<dataObject>([\s\S]*?)<\/dataObject>/)?.[1] ?? '';
    return {
      verspreidingsatlas_taxon_number: xmlTag(block, 'taxonNumber'),
      family: xmlTag(block, 'dwc:Family'),
      scientific_name: xmlTag(block, 'dwc:ScientificName'),
      scientific_name_authorship: xmlTag(block, 'dwc:scientificNameAuthorship'),
      vernacular_nl: xmlTag(block, 'dwc:vernacularName'),
      species_page_url: xmlTag(block, 'dc:source'),
      ndff_identity_url: xmlTag(block, 'dc:identifier'),
      map_url: xmlTag(dataObject, 'dc:identifier'),
      map_license: xmlTag(dataObject, 'dc:rights'),
    };
  }).filter((taxon) => taxon.scientific_name);
}

function htmlText(value) {
  return decodeXml(value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', ' ')
    .replace(/\s+/g, ' '));
}

function parseOranjeLijstFruitCultivars(html, source) {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => {
    const row = match[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
    const detailNumber = row.match(/detail\.asp\?Nr=(\d+)/i)?.[1] ?? '';
    if (cells.length !== 7 || !detailNumber || htmlText(cells[1]).toLowerCase() !== source.crop.toLowerCase()) return null;
    return {
      oranje_lijst_number: detailNumber,
      cultivar_name: htmlText(cells[0]),
      crop: htmlText(cells[1]),
      synonyms: htmlText(cells[2]),
      historic_use_type: htmlText(cells[3]),
      historic_year_or_date_text: htmlText(cells[4]),
      listed_in_trade: htmlText(cells[5]),
      listed_in_genebank: htmlText(cells[6]),
      source_record_url: `https://deoerakker.cgn.wur.nl/or/detail.asp?Nr=${detailNumber}`,
      botanical_taxon: source.botanical_taxon,
    };
  }).filter(Boolean);
}

async function mapConcurrent(items, maxConcurrent, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(maxConcurrent, items.length) }, worker));
  return results;
}

await fs.mkdir(RAW_DIR, { recursive: true });
await fs.mkdir(DERIVED_DIR, { recursive: true });

const dataset = await getJson(`${API}/dataset/${DATASET_KEY}`);
const verspreidingsatlasTaxa = parseVerspreidingsatlasTaxa(await getText(VERSPREIDINGSATLAS_VASCULAR_TAXA_URL));
const oranjeLijstFruitCultivars = (await Promise.all(ORANJE_LIJST_FRUIT_SOURCES.map(async (source) => (
  parseOranjeLijstFruitCultivars(await getText(source.query_url), source)
)))).flat();
if (!verspreidingsatlasTaxa.length) throw new Error('Verspreidingsatlas response did not contain vascular-plant taxa.');
if (!oranjeLijstFruitCultivars.length) throw new Error('Oranje Lijst response did not contain historic fruit cultivar records.');
const supplementaryTaxa = await mapConcurrent(SUPPLEMENTARY_TEST_TAXA, 4, async (entry) => {
  const match = await getJson(`${API}/species/match?${new URLSearchParams({ name: entry.scientific_name })}`);
  const taxonKey = match.usageKey ?? match.speciesKey ?? match.acceptedUsageKey;
  if (!taxonKey) throw new Error(`GBIF could not resolve supplementary taxon: ${entry.scientific_name}`);
  const [taxon, occurrence] = await Promise.all([
    getJson(`${API}/species/${encodeURIComponent(taxonKey)}`),
    getJson(`${API}/occurrence/search?${new URLSearchParams({ taxonKey: String(taxonKey), country: 'NL', limit: '0' })}`),
  ]);
  return {
    input_name: entry.input_name,
    scientific_name: entry.scientific_name,
    gbif_species_key: String(taxonKey),
    canonical_name: taxon.canonicalName ?? '',
    taxon_rank: taxon.rank ?? '',
    family: taxon.family ?? '',
    netherlands_occurrence_count: occurrence.count ?? 0,
    source_record_url: `https://www.gbif.org/species/${taxonKey}`,
  };
});
let occurrenceSummary;
let facetCounts = [];
for (let facetOffset = 0; facetCounts.length < TARGET_TAXA; facetOffset += FACET_PAGE_SIZE) {
  const page = await getJson(
    `${API}/occurrence/search?datasetKey=${DATASET_KEY}&limit=0&facet=speciesKey&facetLimit=${FACET_PAGE_SIZE}&facetOffset=${facetOffset}`,
  );
  occurrenceSummary ??= page;
  const facet = page.facets?.find((entry) => entry.field === 'SPECIES_KEY');
  if (!facet?.counts?.length) break;
  facetCounts.push(...facet.counts);
  if (facet.counts.length < FACET_PAGE_SIZE) break;
}
if (!facetCounts.length) throw new Error('GBIF response did not contain SPECIES_KEY facet counts.');

const keys = facetCounts.slice(0, TARGET_TAXA).map((item) => ({ gbif_species_key: item.name, gbif_occurrence_count: item.count }));
const taxa = await mapConcurrent(keys, 8, async (item) => {
  try {
    const taxon = await getJson(`${API}/species/${encodeURIComponent(item.gbif_species_key)}`);
    return {
      ...item,
      scientific_name: taxon.scientificName ?? '',
      canonical_name: taxon.canonicalName ?? '',
      taxon_rank: taxon.rank ?? '',
      taxonomic_status: taxon.taxonomicStatus ?? '',
      kingdom: taxon.kingdom ?? '',
      phylum: taxon.phylum ?? '',
      class_name: taxon.class ?? '',
      order_name: taxon.order ?? '',
      family: taxon.family ?? '',
      genus: taxon.genus ?? '',
      source_record_url: `https://www.gbif.org/species/${item.gbif_species_key}`,
      lookup_status: 'resolved',
    };
  } catch (error) {
    return {
      ...item,
      scientific_name: '', canonical_name: '', taxon_rank: '', taxonomic_status: '', kingdom: '', phylum: '', class_name: '', order_name: '', family: '', genus: '',
      source_record_url: `https://www.gbif.org/species/${item.gbif_species_key}`,
      lookup_status: `unresolved: ${error.message}`,
    };
  }
});

const rawHeaders = [
  'gbif_species_key', 'gbif_occurrence_count', 'scientific_name', 'canonical_name', 'taxon_rank', 'taxonomic_status',
  'kingdom', 'phylum', 'class_name', 'order_name', 'family', 'genus', 'source_record_url', 'lookup_status',
  'source_dataset_key', 'source_dataset_title', 'source_license', 'retrieved_on',
];
const rawRows = taxa.map((taxon) => [
  taxon.gbif_species_key, taxon.gbif_occurrence_count, taxon.scientific_name, taxon.canonical_name, taxon.taxon_rank, taxon.taxonomic_status,
  taxon.kingdom, taxon.phylum, taxon.class_name, taxon.order_name, taxon.family, taxon.genus, taxon.source_record_url, taxon.lookup_status,
  DATASET_KEY, dataset.title ?? '', dataset.license ?? '', SNAPSHOT_DATE,
]);
await fs.writeFile(path.join(RAW_DIR, 'gbif_dutch_vegetation_all_available_species_facet_taxa.csv'), toCsv(rawHeaders, rawRows), 'utf8');

const verspreidingsatlasHeaders = [
  'verspreidingsatlas_taxon_number', 'scientific_name', 'scientific_name_authorship', 'vernacular_nl', 'family',
  'species_page_url', 'ndff_identity_url', 'map_url', 'map_license', 'retrieved_on',
];
const verspreidingsatlasRows = verspreidingsatlasTaxa.map((taxon) => verspreidingsatlasHeaders.slice(0, -1).map((header) => taxon[header]).concat(SNAPSHOT_DATE));
await fs.writeFile(path.join(RAW_DIR, 'verspreidingsatlas_nl_vascular_taxa.csv'), toCsv(verspreidingsatlasHeaders, verspreidingsatlasRows), 'utf8');

const oranjeLijstHeaders = [
  'oranje_lijst_number', 'cultivar_name', 'crop', 'synonyms', 'historic_use_type', 'historic_year_or_date_text',
  'listed_in_trade', 'listed_in_genebank', 'botanical_taxon', 'source_record_url', 'retrieved_on',
];
const oranjeLijstRows = oranjeLijstFruitCultivars.map((cultivar) => oranjeLijstHeaders.slice(0, -1).map((header) => cultivar[header]).concat(SNAPSHOT_DATE));
await fs.writeFile(path.join(RAW_DIR, 'oranje_lijst_historic_fruit_cultivars.csv'), toCsv(oranjeLijstHeaders, oranjeLijstRows), 'utf8');

const schemaHeaders = [
  'plant_id', 'scientific_name', 'canonical_name', 'vernacular_nl', 'scientific_name_authorship', 'verspreidingsatlas_taxon_number',
  'verspreidingsatlas_species_page_url', 'ndff_identity_url', 'gbif_species_key', 'taxon_rank', 'family',
  'gbif_dutch_vegetation_occurrence_count', 'national_taxonomy_status', 'south_holland_presence_status', 'native_status_nl', 'red_list_status_nl', 'distribution_evidence',
  'growth_form', 'mature_height_min_m', 'mature_height_max_m', 'mature_spread_min_m', 'mature_spread_max_m',
  'light', 'soil_texture', 'soil_ph', 'nutrient_tolerance', 'moisture_regime', 'inundation_depth_cm', 'inundation_duration',
  'salinity_tolerance', 'road_salt_tolerance', 'compaction_tolerance', 'drought_tolerance', 'wind_tolerance',
  'flower_start_month', 'flower_end_month', 'flower_colour', 'pollinator_value', 'host_species_or_group',
  'edible_parts', 'edibility_evidence_status', 'preparation_required', 'food_safety_note', 'toxicity', 'thorns_or_spines', 'irritant_or_allergen',
  'fruit_harvest_start_month', 'fruit_harvest_end_month', 'cultivar_name', 'rootstock', 'pollination_group',
  'provenance_requirement', 'seed_or_plant_source', 'planting_density_per_m2', 'establishment_notes', 'maintenance_notes',
  'vigour_or_spread_risk', 'compatible_habitats', 'incompatible_conditions', 'public_contact_suitability',
  'evidence_source_url', 'evidence_source_title', 'evidence_license', 'evidence_retrieved_on', 'evidence_confidence',
  'review_status', 'reviewed_by', 'reviewed_on', 'notes',
];

const gbifByScientificName = new Map();
for (const taxon of taxa) {
  for (const name of [taxon.scientific_name, taxon.canonical_name]) {
    const key = normaliseName(name);
    if (key && !gbifByScientificName.has(key)) gbifByScientificName.set(key, taxon);
  }
}
const curatedRecords = verspreidingsatlasTaxa.map((taxon) => {
  const gbif = gbifByScientificName.get(normaliseName(taxon.scientific_name));
  return {
    plant_id: `verspreidingsatlas:${taxon.verspreidingsatlas_taxon_number}`,
    scientific_name: taxon.scientific_name,
    canonical_name: gbif?.canonical_name ?? '',
    vernacular_nl: taxon.vernacular_nl,
    scientific_name_authorship: taxon.scientific_name_authorship,
    verspreidingsatlas_taxon_number: taxon.verspreidingsatlas_taxon_number,
    verspreidingsatlas_species_page_url: taxon.species_page_url,
    ndff_identity_url: taxon.ndff_identity_url,
    gbif_species_key: gbif?.gbif_species_key ?? '',
    taxon_rank: gbif?.taxon_rank ?? '',
    family: taxon.family || gbif?.family || '',
    gbif_dutch_vegetation_occurrence_count: gbif?.gbif_occurrence_count ?? '',
    national_taxonomy_status: 'listed_in_verspreidingsatlas_vascular_taxa',
    // A national taxonomy entry and a national map URL do not prove occurrence in Zuid-Holland.
    south_holland_presence_status: '',
    native_status_nl: '',
    red_list_status_nl: '',
    distribution_evidence: gbif ? 'Dutch Vegetation Database / GBIF aggregate occurrence count only' : '',
    edible_parts: '',
    edibility_evidence_status: 'not_assessed',
    evidence_source_url: taxon.species_page_url,
    evidence_source_title: 'Verspreidingsatlas vascular-plant taxonomy record',
    evidence_license: 'Public taxonomy feed used for traceability; map images are not copied (map object labelled CC BY-NC-SA 3.0).',
    evidence_retrieved_on: SNAPSHOT_DATE,
    evidence_confidence: 'unreviewed',
    review_status: 'not_recommendable_until_expert_curation',
    reviewed_by: '',
    reviewed_on: '',
    notes: gbif ? 'Exact scientific-name match to GBIF Dutch Vegetation Database taxon.' : 'No exact scientific-name match to the GBIF compact seed.',
  };
});
const mainNames = new Set(curatedRecords.flatMap((record) => [normaliseName(record.scientific_name), normaliseName(record.canonical_name)]).filter(Boolean));
for (const taxon of supplementaryTaxa) {
  if (mainNames.has(normaliseName(taxon.scientific_name)) || mainNames.has(normaliseName(taxon.canonical_name))) continue;
  curatedRecords.push({
    plant_id: `gbif-nl-supplement:${taxon.gbif_species_key}`,
    scientific_name: taxon.scientific_name,
    canonical_name: taxon.canonical_name,
    vernacular_nl: '',
    scientific_name_authorship: '',
    verspreidingsatlas_taxon_number: '',
    verspreidingsatlas_species_page_url: '',
    ndff_identity_url: '',
    gbif_species_key: taxon.gbif_species_key,
    taxon_rank: taxon.taxon_rank,
    family: taxon.family,
    gbif_dutch_vegetation_occurrence_count: '',
    national_taxonomy_status: 'supplementary_gbif_netherlands_occurrence_candidate',
    south_holland_presence_status: '',
    native_status_nl: '',
    red_list_status_nl: '',
    distribution_evidence: `GBIF occurrence search country=NL returned ${taxon.netherlands_occurrence_count} records at retrieval; this is not a native-status or suitability determination.`,
    edible_parts: '',
    edibility_evidence_status: 'not_assessed',
    evidence_source_url: taxon.source_record_url,
    evidence_source_title: 'GBIF Backbone taxonomy and Netherlands occurrence search',
    evidence_license: 'Verify occurrence-record rights before reuse; no individual occurrences are copied.',
    evidence_retrieved_on: SNAPSHOT_DATE,
    evidence_confidence: 'unreviewed',
    review_status: 'not_recommendable_until_expert_curation',
    reviewed_by: '',
    reviewed_on: '',
    notes: `Added after test-gap review for “${taxon.input_name}”.`,
  });
  mainNames.add(normaliseName(taxon.scientific_name));
  mainNames.add(normaliseName(taxon.canonical_name));
}
const curatedRows = curatedRecords.map((record) => schemaHeaders.map((header) => record[header] ?? ''));
await fs.writeFile(path.join(DERIVED_DIR, 'plantscapes_nl_vascular_plant_decision_traits_v0_2.csv'), toCsv(schemaHeaders, curatedRows), 'utf8');

const heritageCultivarHeaders = [
  'cultivar_id', 'cultivar_name', 'botanical_taxon', 'crop', 'synonyms', 'historic_use_type', 'historic_year_or_date_text',
  'listed_in_trade', 'listed_in_genebank', 'heritage_evidence_status', 'edible_parts', 'edibility_evidence_status',
  'preparation_required', 'food_safety_note', 'source_record_url', 'source_title', 'evidence_retrieved_on',
  'review_status', 'reviewed_by', 'reviewed_on', 'notes',
];
const heritageCultivarRows = oranjeLijstFruitCultivars.map((cultivar) => heritageCultivarHeaders.map((header) => ({
  cultivar_id: `oranje-lijst-${cultivar.crop.toLowerCase()}:${cultivar.oranje_lijst_number}`,
  cultivar_name: cultivar.cultivar_name,
  botanical_taxon: cultivar.botanical_taxon,
  crop: cultivar.crop,
  synonyms: cultivar.synonyms,
  historic_use_type: cultivar.historic_use_type,
  historic_year_or_date_text: cultivar.historic_year_or_date_text,
  listed_in_trade: cultivar.listed_in_trade,
  listed_in_genebank: cultivar.listed_in_genebank,
  heritage_evidence_status: 'listed_in_oranje_lijst_historic_cultivar_register',
  edible_parts: 'fruit',
  edibility_evidence_status: 'crop-level evidence; cultivar identity, botanical taxon and preparation still require review',
  preparation_required: '',
  food_safety_note: 'Historic fruit-crop listing supports fruit use only. Do not infer raw-edibility, allergen profile, food safety, or correct cultivar identity from this register.',
  source_record_url: cultivar.source_record_url,
  source_title: 'CGN/WUR Oranje Lijst historic fruit cultivar record',
  evidence_retrieved_on: SNAPSHOT_DATE,
  review_status: 'heritage_cultivar_needs_identity_and_site_review',
  reviewed_by: '',
  reviewed_on: '',
  notes: 'Historic register scope: cultivars cultivated from 1850 to the Second World War. “In trade” and “in genebank” are source snapshot fields, not availability guarantees.',
})[header] ?? ''));
await fs.writeFile(path.join(DERIVED_DIR, 'plantscapes_heritage_fruit_cultivars_v0_1.csv'), toCsv(heritageCultivarHeaders, heritageCultivarRows), 'utf8');

const manifest = {
  dataset_name: 'Plantscapes Netherlands vascular-plant taxonomy and decision-trait scaffold',
  version: '0.2.0',
  generated_on: SNAPSHOT_DATE,
  record_count: curatedRecords.length,
  storage_design: 'Taxon-level compact taxonomy and decision-trait scaffold only; no raw vegetation plots, maps, images or occurrence records are stored.',
  geographic_scope: {
    national_taxonomy: 'Netherlands vascular plants represented by the Verspreidingsatlas vascular-plant taxonomy feed.',
    south_holland: 'A South Holland field is present but intentionally blank: a national taxonomy entry, national map link or GBIF aggregate count does not demonstrate provincial occurrence.',
  },
  primary_source: {
    provider: 'GBIF / Wageningen Environmental Research',
    dataset_key: DATASET_KEY,
    dataset_title: dataset.title,
    dataset_doi: dataset.doi,
    dataset_license: dataset.license,
    dataset_pub_date: dataset.pubDate,
    source_description: dataset.description,
    source_total_occurrences_returned_by_api: occurrenceSummary.count,
    species_selection: `Top ${taxa.length.toLocaleString('en-US')} SPECIES_KEY facet values by occurrence count returned by paginated GBIF occurrence API facets.`,
    important_limitations: [
      'Occurrence count is a sampling-record count, not abundance, suitability, native status, or local availability.',
      'The dataset includes vascular plants, stoneworts, mosses and lichens; it is not restricted to vascular planting taxa.',
      'Some locations for threatened species are obscured in the source metadata.',
      'The source metadata describes data through 2017 and a GBIF publication date of 2018; it is not a live current-flora inventory.',
    ],
  },
  vascular_taxonomy_source: {
    provider: 'Verspreidingsatlas / NDFF',
    api_url: VERSPREIDINGSATLAS_VASCULAR_TAXA_URL,
    taxon_count_returned_by_api: verspreidingsatlasTaxa.length,
    fields_used: ['taxon number', 'scientific name', 'scientific authorship', 'Dutch vernacular name', 'family', 'species page URL', 'NDFF identity URL'],
    fields_not_copied: ['distribution map image'],
    map_rights_notice: 'The source API labels map objects CC BY-NC-SA 3.0; this dataset retains URLs only and does not copy map images.',
  },
  heritage_cultivar_module: {
    provider: 'CGN/WUR Oranje Lijst',
    source_urls: ORANJE_LIJST_FRUIT_SOURCES.map((source) => source.query_url),
    record_count: oranjeLijstFruitCultivars.length,
    scope: 'Historic apple, pear, plum and cherry cultivars recorded as cultivated in the Netherlands from 1850 to the Second World War.',
    botanical_handling: 'Stored in a separate cultivar module so cultivar records are not misrepresented as wild species. Historic “Kers” rows are retained as Prunus spp. pending cultivar-level botanical review.',
    edible_handling: 'Fruit is populated at crop level only; food safety, preparation and cultivar identity remain subject to review.',
  },
  supplementary_test_taxa: {
    source: 'GBIF Backbone taxonomy and occurrence search filtered to country=NL',
    requested_names: SUPPLEMENTARY_TEST_TAXA.map((taxon) => taxon.input_name),
    added_record_count: curatedRecords.filter((record) => record.plant_id.startsWith('gbif-nl-supplement:')).length,
    limitation: 'This is a bounded gap-repair layer. Its presence in the core table does not establish native status, South Holland occurrence or planting suitability.',
  },
  excluded_from_local_copy: [
    { source: 'TRY Plant Trait Database', reason: 'Data-use policy prohibits redistribution through another website/database without an appropriate data-governance arrangement.' },
    { source: 'Digital Plant Atlas images/metadata', reason: 'CC BY-NC-SA and commercial-use restrictions require a separate permission/licence decision.' },
    { source: 'Flora Incognita', reason: 'No public general-purpose database/API licence was verified for ingestion.' },
  ],
  curation_rule: 'Only populate a blank decision-trait or South Holland presence field when a specific source record, licence, retrieval date and reviewer can be recorded.',
};
await fs.writeFile(path.join(OUT_DIR, 'dataset_manifest_v0_2.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ record_count: curatedRecords.length, gbif_compact_seed_count: taxa.length, out_dir: OUT_DIR, source_total_occurrences: occurrenceSummary.count }, null, 2));
