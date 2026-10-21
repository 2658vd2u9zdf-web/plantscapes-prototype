/* Shared loaders and selectors for the recommender benchmark, parity and audit-snapshot scripts.
   PLANTSCAPES_ENGINE_ROOT points at another checkout (e.g. a pre-change snapshot); default is this repo. */
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';

export const REPO=fileURLToPath(new URL('../',import.meta.url));
export const ENGINE_ROOT=path.resolve(process.env.PLANTSCAPES_ENGINE_ROOT||REPO);
const run=promisify(execFile);

export async function loadRuntime(root=ENGINE_ROOT){
  const ctx={window:{}};
  for(const f of ['data/operational-v0.3.generated.js','suitability-v0.3.js','runtime-adapter-v0.3.js','data/planting-plan-rules.v0.1.js','planting-engine.js','community-engine.js'])vm.runInNewContext(await readFile(path.join(root,'website',f),'utf8'),ctx);
  const w=ctx.window;
  return {S:w.PlantscapesSuitabilityV03,A:w.PlantscapesRuntimeV03,E:w.PlantscapesEngine,window:w};
}
export async function loadServer(root=ENGINE_ROOT){return import(pathToFileURL(path.join(root,'server.mjs')).href);}
export async function readBenchmark(){return JSON.parse(await readFile(path.join(REPO,'dataset/benchmark/recommender-benchmark-v0_3.json'),'utf8'));}
export async function readJSON(rel){return JSON.parse(await readFile(path.join(REPO,rel),'utf8'));}

/* Python reference evaluator through the benchmark runner; cases=[{id,zone,project}] or null for the benchmark. */
export async function runPython(cases,root=ENGINE_ROOT){
  const args=[path.join(REPO,'dataset/benchmark/run_recommender_benchmark.py'),'--scorer',path.join(root,'dataset/score_demo_suitability_v0_3.py')];
  let file;
  if(cases){
    const {mkdtemp,writeFile}=await import('node:fs/promises');const os=await import('node:os');
    file=path.join(await mkdtemp(path.join(os.tmpdir(),'plantscapes-parity-')),'cases.json');await writeFile(file,JSON.stringify(cases));args.push('--cases',file);
  }
  const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
  const {stdout}=await run(python,args,{maxBuffer:512*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'}});
  return JSON.parse(stdout).cases;
}

export function matches(plant,select={}){
  return Object.entries(select).every(([field,rule])=>{
    const v=plant[field];
    if(rule===null||typeof rule!=='object')return v===rule;
    if('includes' in rule)return Array.isArray(v)&&v.includes(rule.includes);
    if('lacks' in rule)return Array.isArray(v)&&!v.includes(rule.lacks);
    if('equals' in rule)return Array.isArray(v)&&v.length===rule.equals.length&&rule.equals.every(x=>v.includes(x));
    if('in' in rule)return rule.in.includes(v);
    if('not_in' in rule)return !rule.not_in.includes(v);
    if('gt' in rule)return v>rule.gt;
    if('lte' in rule)return v<=rule.lte;
    throw Error('Unknown selector '+JSON.stringify(rule));
  });
}
export function variant(plants,spec){
  const base=plants.find(p=>p.fixture_id===spec.base_fixture_id);if(!base)throw Error('Unknown adversarial base '+spec.base_fixture_id);
  const copy=structuredClone(base);Object.assign(copy,spec.set);
  for(const f of Object.keys(spec.set))if(copy.field_origins_json[f]!==undefined)copy.field_origins_json[f]='policy_rule';
  copy.fixture_id=base.fixture_id+'~'+spec.label;return copy;
}
export const gateState=(r,id)=>r.hard_gate_results.find(g=>g.gate_id===id)?.state;
/* Strip verbatim plant evidence before comparing evaluators. */
export const comparable=r=>{const {profile_trace,...rest}=r;return JSON.parse(JSON.stringify(rest));};

/* Mismatches between two JSON values with Python/JS float formatting normalized; returns first path that differs. */
export function firstDifference(a,b,where='$'){
  if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<1e-9?null:where+': '+a+' != '+b;
  if(Array.isArray(a)||Array.isArray(b)){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return where+': array length/type';
    for(let i=0;i<a.length;i++){const d=firstDifference(a[i],b[i],where+'['+i+']');if(d)return d;}return null;
  }
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    const keys=new Set([...Object.keys(a),...Object.keys(b)]);
    for(const k of keys){if(!(k in a)||!(k in b))return where+'.'+k+': missing on one side';const d=firstDifference(a[k],b[k],where+'.'+k);if(d)return d;}return null;
  }
  return a===b?null:where+': '+JSON.stringify(a)+' != '+JSON.stringify(b);
}

/* One rectangular bed with a path along y=0 so edge, transition and interior bands all exist; optional pond strip. */
export function communityInput(zone,project,plants,{water=false}={}){
  const w=zone.available_width_m==='unknown'?20:zone.available_width_m,l=zone.available_length_m==='unknown'?15:zone.available_length_m;
  const boundary=[[0,-1],[w,-1],[w,l],[0,l]],bed=[[0,0],[w,0],[w,l],[0,l]];
  const appZone={id:1,name:zone.zone_id,conditions:zone};
  const input={boundary,beds:[{polygon:bed,zoneId:1}],waterBeds:water?[{polygon:[[0,l*.6],[w,l*.6],[w,l],[0,l]],zoneId:1}]:[],paths:[[[0,-.75],[w,-.75]]],zones:[appZone],plants,project,pathWidth:1.5};
  return {input,appZone};
}
