/* Loads the browser modules for the project-demo tests in one VM context, in index.html order. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

export const read=rel=>readFile(new URL('../'+rel,import.meta.url),'utf8');
export async function loadDemo({engines=false}={}){
  const ctx={window:{}};
  const files=['data/operational-v0.3.generated.js','suitability-v0.3.js','runtime-adapter-v0.3.js','data/project-demo-v0.3.generated.js','project-policies.js','recommender-stages.js','candidate-card.js'];
  if(engines)files.push('data/planting-plan-rules.v0.1.js','planting-engine.js','community-engine.js');
  for(const f of files)vm.runInNewContext(await read('website/'+f),ctx);
  const w=ctx.window;
  return {window:w,S:w.PlantscapesSuitabilityV03,A:w.PlantscapesRuntimeV03,D:w.PLANTSCAPES_PROJECT_DEMO,P:w.PLANTSCAPES_PROJECT_POLICIES,R:w.PlantscapesRecommender,C:w.PlantscapesCandidateCard,E:w.PlantscapesEngine};
}
/* The three canonical demonstration zones, as app zones. */
export async function canonicalZones(){
  const fixture=JSON.parse(await read('dataset/research/demo-v0_3/example-inputs.json'));
  return {project:fixture.project,zones:fixture.zones.map((z,i)=>({id:i+1,name:z.zone_id,conditions:{...z,source:'demo'}}))};
}
export const baseProject={type:'landscape',area:1000,maintenance:'moderate',publicAccess:true,publicHarvest:false,sightlines:false,rewilding:false,support:false,character:'mosaic',restorationOrnamentals:false,vigourControl:'no',anchorColours:[],desiredFlowerMonths:[],priorities:[],audience:'public'};
/* A site every uncertainty-example base plant can grow in, so each example shows its own missing fact. */
export const openClayZone={id:1,name:'Open clay',conditions:{soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',canopy:'no',disturbance:'low',hardscape:'no',waterEdge:'no',source:'demo',path_edge:'no',available_width_m:30,available_length_m:30,plantable_area_m2:900,max_plant_height_m:'unknown',support_length_m:'unknown'}};
export const visibleText=html=>html.replace(/<svg[\s\S]*?<\/svg>/g,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
