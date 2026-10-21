/* Server-side AI context validation against crafted requests, and HTTP error handling for malformed input.
   The context is built like ai-ui.js context(): community recipes, placed trees and the species they name.
   AI stays off and every provider request fails the test, so no paid call can be made. */
import assert from 'node:assert/strict';
import {loadDemo,baseProject,openClayZone} from './project-demo-harness.mjs';

delete process.env.PLANTSCAPES_AI_ENABLED;delete process.env.OPENAI_API_KEY;
const {createServer,validateContext}=await import('../server.mjs');
const {R,E}=await loadDemo({engines:true});
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{if(String(url).startsWith('https://api.openai.com'))throw Error('Provider must not be contacted');return nativeFetch(url,options);};

const project={...baseProject,area:2400},boundary=[[0,0],[60,0],[60,40],[0,40]],path=[[0,20],[60,20]];
const screened=R.screen([openClayZone],project),pool=screened.candidates;
const plan=E.generate({boundary,beds:[{polygon:boundary,zoneId:1}],waterBeds:[],paths:[path],zones:[openClayZone],plants:pool,project,pathWidth:1.5});
const trees=plan.placements.filter(p=>p.tree).map(p=>({plantId:p.plantId,xy:p.xy}));
assert.ok(plan.communities.length&&trees.length,'the fixture needs communities and placed trees');
const ids=new Set([...plan.communities.flatMap(c=>c.eligible.map(p=>p.id)),...trees.map(t=>t.plantId)]);
const context={version:'test',project:JSON.parse(JSON.stringify(R.project(project,'placement'))),zones:[{id:1,conditions:openClayZone.conditions}],
  geometry:[{type:'boundary',points:boundary},{type:'path',zoneId:null,points:path},{type:'planting',zoneId:1,points:boundary}],trees,
  species:pool.filter(p=>ids.has(p.id)).map(p=>({id:p.id,latin:p.latin})),
  communities:plan.communities.map(c=>({id:c.id,zoneId:c.zoneId,bedIndex:c.bedIndex,zone:c.zone,band:c.band,shade:c.shade,area:c.area,density:c.density,total:c.total,allowedIds:c.eligible.map(p=>p.id),rows:c.rows.map(r=>({plantId:r.plantId,percentage:r.percentage,count:r.count}))}))};
let started=performance.now();
assert.equal(validateContext(context),context,'the browser-built context is accepted');
const validationMs=Math.round(performance.now()-started);

const excluded=screened.hidden.find(h=>!['Trees','Climbers'].includes(h.group)).id,climber=screened.hidden.find(h=>h.group==='Climbers').id;
const rejects=(label,change)=>{const crafted=structuredClone(context);change(crafted);assert.throws(()=>validateContext(crafted),e=>e.status===400,label);};
rejects('excluded plant in a recipe row',c=>c.communities[0].rows.push({plantId:excluded,percentage:0}));
rejects('excluded plant in species',c=>c.species.push({id:excluded}));
rejects('recipe rows missing',c=>delete c.communities[0].rows);
rejects('non-numeric recipe share',c=>c.communities[0].rows[0].percentage='40');
rejects('null species entry',c=>c.species.push(null));
rejects('tree outside every mapped bed',c=>c.trees[0].xy=[500,500]);
rejects('climber without planned support placed individually',c=>c.trees.push({plantId:climber,xy:trees[0].xy}));
rejects('unknown placed plant',c=>c.trees.push({plantId:'invented',xy:trees[0].xy}));
rejects('invalid zone value',c=>c.zones[0].conditions={...c.zones[0].conditions,soil:'lava'});
rejects('project flag as text',c=>c.project.publicAccess='true');
rejects('null community',c=>c.communities.push(null));

const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
try{
  assert.equal((await fetch(base+'/website/%E0%A4%A')).status,400,'malformed escape is a client error');
  assert.equal((await fetch(base+'/website/data')).status,404,'a directory is not a file');
  const status=await(await fetch(base+'/api/status')).json(),headers={'Content-Type':'application/json',Origin:base,'X-Plantscapes-Token':status.nonce};
  const post=body=>fetch(base+'/api/feedback',{method:'POST',headers,body});
  for(const body of ['null','[]','"text"','42'])assert.equal((await post(body)).status,400,'non-object body '+body);
  const crafted=structuredClone(context);crafted.communities[0].rows.push({plantId:excluded,percentage:0});
  assert.equal((await post(JSON.stringify({context:crafted,request:'More flowers'}))).status,400,'crafted context rejected over HTTP');
  started=performance.now();
  const valid=await post(JSON.stringify({context,request:'More flowers'}));
  assert.equal(valid.status,503,'a valid context passes validation and then stops because AI is off');
  console.log(JSON.stringify({status:'passed',communities:context.communities.length,trees:trees.length,species:context.species.length,validateContextMs:validationMs,feedbackRoundTripMs:Math.round(performance.now()-started)}));
}finally{globalThis.fetch=nativeFetch;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
