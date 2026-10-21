import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=async path=>(await readFile(new URL(path,root),'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const west=await read('tests/west-sites-results.jsonl');
const north=await read('tests/north-sites-results.jsonl');
const east=await read('tests/east-south-results.jsonl');
const [pijnacker]=await read('tests/pijnacker-results.json');
const cityDefaults=await read('tests/city-default-results.jsonl');
const groups=['Trees','Shrubs','Flowers & herbs','Grasses, sedges & rushes','Bulbs / geophytes','Climbers','Aquatic & marginal plants'];
const groupBy=(items,key='group')=>Object.fromEntries(groups.map(group=>[group,items.filter(item=>item[key]===group)]).filter(([,items])=>items.length));
const scenarios=[
  ...west.map(x=>({name:x.scenario.name,region:'West',location:x.scenario.city,area:Math.round(x.site.area),width:x.scenario.width,length:x.scenario.length,soil:x.scenario.soil,moisture:x.scenario.moisture,hydrology:x.scenario.hydrology,light:x.scenario.light,disturbance:x.scenario.disturbance,hardscape:'no',character:'mosaic',path:x.scenario.path,map:!!x.site.mapReady,candidates:groupBy(x.candidates),placed:x.plan.roster,plan:x.plan,errors:x.errors,extra:x.scenario.pathEdge?'Mapped path-edge context: '+x.scenario.pathEdge+'.':''})),
  ...north.map(x=>({name:x.scenario.name,region:'North',location:x.scenario.name.startsWith('Leeuwarden')?'Leeuwarden':'Groningen',area:Math.round(x.site.area),width:x.scenario.width,length:x.scenario.length,soil:x.scenario.soil,moisture:x.scenario.moisture,hydrology:x.scenario.hydrology,light:x.scenario.light,disturbance:x.scenario.disturbance,hardscape:'no',character:x.scenario.character||'mosaic',path:false,map:!!x.site.siteMapReady,candidates:x.palette.groups,placed:x.plan.roster,plan:x.plan,errors:x.errors,extra:x.scenario.method==='map navigation'?'Map navigated to the test coordinates.':''})),
  ...east.map(x=>({name:x.scenario.label,region:'East/South',location:x.scenario.city,area:x.plot?.area,width:x.scenario.width,length:x.scenario.length,soil:x.scenario.soil,moisture:x.scenario.moisture,hydrology:x.scenario.hydrology,light:x.scenario.light,disturbance:x.scenario.disturbance,hardscape:x.scenario.hardscape,character:x.scenario.character,path:true,map:!x.error,candidates:x.candidates?.groups||{},placed:x.plan.roster,plan:{...x.plan,totalQuantity:Number(x.plan?.status.match(/[\d,]+/)?.[0].replaceAll(',',''))},errors:[...(x.errors||[]),...(x.error?[x.error]:[])],extra:x.lookup&&x.lookup!=='not requested'?'Location lookup: '+x.lookup:''})),
  {name:'Pijnacker screenshot-size reproduction',region:'West',location:'Pijnacker',area:pijnacker.area_m2,width:114.72,length:100,soil:'city synthetic fallback',moisture:'city synthetic fallback',hydrology:'city synthetic fallback',light:'city synthetic fallback',disturbance:'unknown',hardscape:'city synthetic fallback',character:'mosaic',path:true,map:true,candidates:groupBy(pijnacker.candidates),placed:pijnacker.plan.roster,plan:{...pijnacker.plan,totalQuantity:Number(pijnacker.plan.status.match(/[\d,]+/)?.[0].replaceAll(',','')),treeCount:pijnacker.plan.trees.length,warnings:pijnacker.plan.warnings},errors:[],extra:'Uses the browser’s synthetic Pijnacker defaults; reproduces an approximately 11,472 m² outline.'}
];
for(const s of scenarios){
  const rosterTotal=s.placed.reduce((sum,p)=>sum+p.estimatedQuantity,0);
  if(rosterTotal!==s.plan.totalQuantity)throw Error(`${s.name}: roster ${rosterTotal} differs from total ${s.plan.totalQuantity}`);
}
const candidateCount=s=>Object.values(s.candidates).reduce((count,items)=>count+items.length,0);
const treeCandidates=s=>s.candidates.Trees?.length||0;
const treePlaced=s=>s.plan?.treeCount??(typeof s.plan?.trees==='number'?s.plan.trees:s.plan?.trees?.length??0);
const esc=value=>String(value??'').replaceAll('|','\\|');
const lines=[
  '# Netherlands site and tree-placement audit — v0.3',
  '',
  'Tested 20 October 2026 against the local website in headless Microsoft Edge with AI disabled. These are **simulated scenario inputs**, not surveys or planting recommendations. All 60 operational plants remain `production_eligible=false`. Counts below are approximate pilot quantities from synthetic spacing, never procurement numbers.',
  '',
  'Each scenario used a rectangular geographic plot and a full-plot planting bed. “Path: yes” means the example cross-path was added. The browser generated candidates, then generated a community plan. The scripts and raw JSON results are in `tests/`.',
  '',
  '| Test | Plot | Conditions | Candidates (trees) | Plan | Trees placed | Approx. plants |',
  '| --- | ---: | --- | ---: | --- | ---: | ---: |',
  ...scenarios.map(s=>`| ${esc(s.name)} | ${s.area?.toLocaleString()} m² | ${s.soil}; ${s.moisture}; disturbance ${s.disturbance}; ${s.character} | ${candidateCount(s)} (${treeCandidates(s)}) | ${s.plan?.generated?'Generated':'Failed'} | ${treePlaced(s)} | ${Number(s.plan?.totalQuantity||0).toLocaleString()} |`),
  '',
  '## Findings',
  '',
  '- Final run: all 11 browser scenarios generated a plan. Delft, Pijnacker, Groningen, Leeuwarden, Maastricht, and moderate-stress Rotterdam placed trees. Explicit high-disturbance Rotterdam and Utrecht excluded every tree; this follows the v0.3 records, whose eight tree disturbance tolerances are all `low`. The Utrecht case also marked hardscape `yes`, conflicting with each tree’s `avoid` tolerance.',
  '- The earlier city presets assigned synthetic `high` disturbance to several urban locations. The website now starts disturbance at `unknown` and asks for a site-based choice. A mapped road alone no longer asserts high plant stress. Explicitly choosing `high` still excludes the operational trees.',
  '- “Mostly open landscape” intentionally places no trees. The first Groningen open-plan run failed because the community engine applied path-edge thorn clearance to pathless interior cells; this was fixed. Its final run produced a low planting plan without trees.',
  '- The preview no longer displays species with an estimated quantity of zero. Small beds may fit only the smallest tree crowns; the 6 × 6 m unit check correctly placed none, while a compatible 100 × 100 m bed placed five.',
  '- The map and public location services require network access. The final geographic browser runs waited for the scaled map and succeeded; the Maastricht search returned “Gemeente Maastricht.” The optional nearby water/road lookup can fail without blocking location selection or plan generation.',
  '',
  '## Per-test results',
  ''
];
for(let i=0;i<scenarios.length;i++){
  const s=scenarios[i],placedGroups=groupBy(s.placed);
  lines.push(`### ${i+1}. ${s.name}`,'',
    `**Input:** ${s.location}; ${s.width} × ${s.length} m (${s.area?.toLocaleString()} m²); soil ${s.soil}, moisture ${s.moisture}, hydrology ${s.hydrology}, light ${s.light}, disturbance ${s.disturbance}, hardscape ${s.hardscape}; spatial character ${s.character}; path ${s.path?'yes':'no'}. Scaled map ${s.map?'loaded':'unavailable'}. ${s.extra||''}`,'',
    `**Candidate list (${candidateCount(s)}):**`,'');
  for(const group of groups)if(s.candidates[group]?.length)lines.push(`- ${group}: ${s.candidates[group].map(p=>`${p.name} (${p.id})`).join(', ')}.`);
  lines.push('',`**Plan:** ${s.plan?.generated?'Generated':'Failed'}; ${treePlaced(s)} ${treePlaced(s)===1?'tree':'trees'}; ${Number(s.plan?.totalQuantity||0).toLocaleString()} approximate plants. ${s.plan?.status||''}`,'',
    `**Placed species and approximate quantities:**`,'');
  for(const group of groups)if(placedGroups[group]?.length)lines.push(`- ${group}: ${placedGroups[group].map(p=>`${p.name} ${Number(p.estimatedQuantity??p.quantity??0).toLocaleString()}`).join(', ')}.`);
  if(!s.placed.length)lines.push('- None.');
  lines.push('',`**Checks:** ${s.errors?.length?`${s.errors.length} browser error(s): ${s.errors.map(esc).join('; ')}`:'No browser script errors.'} ${s.plan?.warnings?.length||0} plan warnings; the full warning text is in the raw result file.`,'');
}
lines.push('## Untouched urban city defaults — candidate-only checks','',
  'These four checks used 30 × 30 m map plots, left the site fields at their initial values, and stopped at the candidate palette. No plan was generated in these diagnostic checks; the 11 full scenarios above cover plan generation. Each city now starts disturbance at `unknown` with origin `unknown`, rather than assuming a level of road stress.','',
  '| City | Disturbance | Tree candidates | Tree list | Plan |',
  '| --- | --- | ---: | --- | --- |',
  ...cityDefaults.map(x=>`| ${x.city} | ${x.conditions.disturbance} (${x.conditions.origin}) | ${x.treeCandidates.length} | ${x.treeCandidates.join(', ')} | Not run in this candidate-only check |`),
  '',
  '## Reproduce','',
  'Start `node server.mjs` from the repository root. Set `NODE_PATH` to the bundled Playwright dependency directory on this machine, then run `node tests/west-location-audit.mjs`, `node tests/north-sites-investigation.mjs`, `node tests/east-south-scenarios.mjs`, `node tests/pijnacker-repro.mjs`, and `node tests/tree-placement.mjs`. The browser scripts print JSON results; `node tests/build-site-report.mjs` rebuilds this report from the saved JSON outputs.','',
  'Raw results: [west](../tests/west-sites-results.jsonl), [north](../tests/north-sites-results.jsonl), [east/south](../tests/east-south-results.jsonl), [Pijnacker](../tests/pijnacker-results.json), [city defaults](../tests/city-default-results.jsonl).','');
const out=new URL('project-information/NETHERLANDS-SITE-TEST-REPORT-v0.3.md',root);
await writeFile(out,lines.join('\n'),'utf8');
console.log(`Wrote ${out.pathname} with ${scenarios.length} scenarios`);
