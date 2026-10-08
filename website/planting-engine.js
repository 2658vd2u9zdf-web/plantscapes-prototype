/* Approved design policy; synthetic traits remain explicitly separate from reviewed data. */
(function(root){
  'use strict';
  const rules=root.PLANTSCAPES_RULEBOOK;
  const parameters=rules?.prototype_parameters||{};
  const config={edgeDepth:parameters.path_edge_depth_m||1.2,transitionDepth:parameters.transition_depth_m||3,edgeHeight:parameters.path_edge_max_height_m||.6,transitionHeight:parameters.transition_max_height_m||1.3,patchSize:parameters.patch_size_m||3,limit:parameters.preview_plant_limit||12000};
  const area=poly=>Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
  const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
  const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
  const segments=poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]);
  const key=(x,y)=>Math.sin(x*12.9898+y*78.233)*43758.5453;
  const hash=(x,y)=>Math.abs(Math.floor(key(x,y)));
  function enrich(plant){
    if(!plant.demo)return plant;
    const woody=['Trees','Shrubs'].includes(plant.group);
    const spread=plant.spread||(plant.group==='Trees'?Math.max(5,plant.height*.42):plant.group==='Shrubs'?Math.max(1.8,plant.height*.7):Math.max(.3,Math.min(.95,plant.height*.42+.2)));
    return {...plant,spread,spacing:woody?spread:spread*.83,soil:plant.soil||(plant.moisture==='dry'?'sand / clay':plant.moisture==='wet'?'peat / clay':'clay / peat / sand'),nativeStatus:plant.nativeStatus||'native_fixture',invasiveStatus:plant.invasiveStatus||'not_invasive_fixture',provenance:'unverified demo provenance',safetyStatus:'unverified demo safety',vigorous:/dominate|strongly|vigorous|thicket|suckering/i.test(plant.caution||''),thorny:/thorn/i.test(plant.caution||''),evidenceStatus:'synthetic_demo',traitSource:'synthetic-geometry-fixture-v0.2'};
  }
  function eligibility(plant,project){
    if(!plant.demo&&plant.traitReviewStatus!=='reviewed')return {eligible:false,reason:'Name or precedent only; reviewed site traits and mature spread missing.',rules:['G04','D01']};
    if(!plant.demo&&(!plant.invasiveStatus||!plant.nativeStatus||!plant.provenance))return {eligible:false,reason:'Native status, invasive status or provenance is missing.',rules:['G04','G05']};
    if(!Number.isFinite(plant.spread)||plant.spread<=0)return {eligible:false,reason:'Mature spread is missing.',rules:['D01']};
    if(['invasive','potentially_invasive'].includes(plant.invasiveStatus))return {eligible:false,reason:'Invasive status excludes planting.',rules:['G04']};
    if(project.rewilding&&!['native','native_fixture'].includes(plant.nativeStatus))return {eligible:false,reason:'Rewilding requires native status and provenance review.',rules:['G05']};
    if(project.type==='restoration'&&!project.restorationOrnamentals&&!['native','native_fixture'].includes(plant.nativeStatus))return {eligible:false,reason:'Restoration needs an explicit designer override for ornamental alternatives.',rules:['G05']};
    if(!plant.demo&&project.publicAccess&&plant.safetyStatus!=='reviewed')return {eligible:false,reason:'Public-contact safety needs review.',rules:['W02']};
    if(plant.group==='Climbers'&&!project.support)return {eligible:false,reason:'No climbing support is mapped.',rules:['S04']};
    return {eligible:true,reason:plant.demo?'Synthetic traits permit a test placement; locality, provenance and safety still need review.':'Reviewed traits permit a concept placement.',rules:['G04','G05']};
  }
  function zoneFit(plant,zone,project){
    const c=zone.conditions||zone;
    if(!c.source||c.source==='unverified')return {fit:false,reason:'Zone conditions have not been confirmed.'};
    if(['soil','moisture','light'].some(k=>!c[k]||c[k]==='unknown'))return {fit:false,reason:'Soil, moisture or light is unknown.'};
    if(c.soil!=='made'&&!String(plant.soil||'').split(/\s*\/\s*/).includes(c.soil))return {fit:false,reason:'Soil tolerance does not match the confirmed zone.'};
    if((c.moisture==='dry'&&plant.moisture==='wet')||(c.moisture==='wet'&&plant.moisture==='dry'))return {fit:false,reason:'Moisture tolerance conflicts with the confirmed zone.'};
    if((c.light==='shade'&&plant.light==='sun')||(c.light==='sun'&&plant.light==='shade'))return {fit:false,reason:'Light tolerance conflicts with the confirmed zone.'};
    if(c.hydrology==='permanent'&&plant.moisture!=='wet')return {fit:false,reason:'Permanent wetness conflicts with the moisture tolerance.'};
    if(plant.group==='Aquatic & marginal plants'&&(c.waterEdge!=='yes'||!['seasonal','long','permanent','edge'].includes(c.hydrology)))return {fit:false,reason:'No confirmed wet edge or water regime.'};
    if(project.maintenance==='low'&&plant.vigorous)return {fit:false,reason:'Spread control exceeds the selected maintenance capacity.'};
    return {fit:true,reason:'Fits the confirmed demo moisture and light; soil and safety remain review items.'};
  }
  function generate(input){
    const {boundary,beds,paths,waterBeds=[],exclusions=[],plants,project,zones,mode='repeated_drifts',pathWidth=1.5,mix={matrix:45,flowers:45,structure:10}}=input;
    const warnings=[],decisions=[],placements=[];
    if(!boundary||boundary.length<3)return {error:'Draw a scaled site boundary first.'};
    if(!paths?.some(line=>line.length>=2))return {error:'Draw and finish the paths before generating your planting plan.'};
    if(!beds?.length)return {error:'Draw a planting zone and link it to confirmed conditions.'};
    if(!rules)return {error:'The approved rulebook could not load. Reload this page.'};
    const mixWeights={matrix:Math.max(0,Number(mix.matrix)||0),flowers:Math.max(0,Number(mix.flowers)||0),structure:Math.max(0,Number(mix.structure)||0)};
    if(mode!=='formal_blocks'&&!Object.values(mixWeights).some(n=>n>0))return {error:'Set at least one planting-mix weight above zero.'};
    const mixRole=p=>p.group==='Grasses, sedges & rushes'?'matrix':p.group==='Shrubs'||p.height>=1.3?'structure':'flowers';
    const weighted=(candidates,seed)=>{
      const roleCounts={};candidates.forEach(p=>{const role=mixRole(p);roleCounts[role]=(roleCounts[role]||0)+1;});
      let entries=candidates.map(p=>({p,w:(mixWeights[mixRole(p)]||0)/roleCounts[mixRole(p)]*(!project.rewilding&&project.anchorColours?.includes(p.colour)?1.15:1)}));
      let sum=entries.reduce((n,e)=>n+e.w,0);if(!sum){entries=entries.map(e=>({...e,w:1}));sum=entries.length;}
      let threshold=(seed%100000)/100000*sum;for(const e of entries){threshold-=e.w;if(threshold<=0)return e.p;}return entries.at(-1)?.p;
    };
    const pool=plants.map(enrich).filter(p=>{const decision=eligibility(p,project);if(!decision.eligible)decisions.push({plantId:p.id,...decision});return decision.eligible;});
    const pathSegments=paths.flatMap(line=>line.slice(1).map((p,i)=>[line[i],p]));
    const pathDistance=p=>Math.min(...pathSegments.map(([a,b])=>distance(p,a,b)))-pathWidth/2;
    const waterFor=p=>waterBeds.slice().reverse().find(b=>inside(p,b.polygon));
    const bedFor=p=>waterFor(p)||beds.slice().reverse().find(b=>inside(p,b.polygon));
    const valid=p=>inside(p,boundary)&&!!bedFor(p)&&!exclusions.some(poly=>inside(p,poly))&&pathDistance(p)>=0;
    const shoreDistance=p=>waterBeds.length?Math.min(...waterBeds.flatMap(b=>segments(b.polygon).map(([a,b])=>distance(p,a,b)))):Infinity;
    const aquaticFit=(plant,p)=>plant.group==='Aquatic & marginal plants'?(!!waterFor(p)||shoreDistance(p)<=1.2)&&(!plant.waterBand||plant.waterBand==='margin'||!!waterFor(p)):!waterFor(p);
    const selectedZones=new Map(zones.map(z=>[String(z.id),z]));
    const allBeds=[...beds,...waterBeds];
    const byBed=new Map(allBeds.map(b=>{
      const zone=selectedZones.get(String(b.zoneId));
      const matches=zone?pool.filter(p=>zoneFit(p,zone,project).fit&&(!waterBeds.includes(b)||p.group==='Aquatic & marginal plants')):[];
      if(!zone||!matches.length)warnings.push('No eligible plants in '+(zone?.name||'unlinked planting zone')+'. Check its conditions or add reviewed data.');
      return [b,matches];
    }));
    if(![...byBed.values()].some(p=>p.length))return {error:'No eligible plants fit the drawn zones. Check confirmed soil, light and moisture; name-only records cannot be placed.',decisions,warnings};
    const bounds={minX:Math.min(...allBeds.flatMap(b=>b.polygon.map(p=>p[0]))),maxX:Math.max(...allBeds.flatMap(b=>b.polygon.map(p=>p[0]))),minY:Math.min(...allBeds.flatMap(b=>b.polygon.map(p=>p[1]))),maxY:Math.max(...allBeds.flatMap(b=>b.polygon.map(p=>p[1])))};
    const bucket=new Map(),bucketSize=2,maxSpacing=Math.max(...pool.map(p=>p.spacing||.5)),reach=Math.ceil(maxSpacing/bucketSize);
    const nearby=p=>{const result=[],gx=Math.floor(p[0]/bucketSize),gy=Math.floor(p[1]/bucketSize);for(let x=gx-reach;x<=gx+reach;x++)for(let y=gy-reach;y<=gy+reach;y++)result.push(...(bucket.get(x+':'+y)||[]));return result;};
    const add=(p,plant,bed,ruleTrace)=>{
      const item={xy:p,plantId:plant.id,spacing:plant.spacing,spread:plant.spread,height:plant.height,tree:plant.group==='Trees',accent:plant.group==='Shrubs',zoneId:bed.zoneId,zone:selectedZones.get(String(bed.zoneId))?.name,ruleTrace,evidenceStatus:plant.demo?'synthetic_demo':'reviewed',reason:'Assigned to '+(selectedZones.get(String(bed.zoneId))?.name||'zone')+'; '+(pathDistance(p)<config.edgeDepth?'low path edge':pathDistance(p)<config.transitionDepth?'middle transition':'interior structure')+'. Spacing '+plant.spacing.toFixed(2)+' m from mature-spread '+plant.spread.toFixed(2)+' m '+(plant.demo?'fixture.':'record.')};
      placements.push(item);const id=Math.floor(p[0]/bucketSize)+':'+Math.floor(p[1]/bucketSize);if(!bucket.has(id))bucket.set(id,[]);bucket.get(id).push(item);
    };
    // Trees are optional; each trial must fit its full mature canopy and usable bed.
    if(project.character!=='open')for(const bed of beds){
      const trees=(byBed.get(bed)||[]).filter(p=>p.group==='Trees');
      if(!trees.length)continue;
      for(let i=0;i<trees.length;i++){
        const plant=trees[i],r=plant.spread/2;
        for(let t=0;t<70;t++){
          const p=[bounds.minX+(hash(i+t,12)%1000)/1000*(bounds.maxX-bounds.minX),bounds.minY+(hash(i+t,28)%1000)/1000*(bounds.maxY-bounds.minY)];
          const ring=Array.from({length:12},(_,n)=>[p[0]+r*Math.cos(n*Math.PI/6),p[1]+r*Math.sin(n*Math.PI/6)]);
          if(bedFor(p)!==bed||!valid(p)||!ring.every(q=>valid(q)&&!waterFor(q)&&bedFor(q)===bed)||nearby(p).some(q=>Math.hypot(q.xy[0]-p[0],q.xy[1]-p[1])<(q.spacing+plant.spacing)/2))continue;
          add(p,plant,bed,['G01','G02','S01','S04','D03']);break;
        }
      }
    }
    const patchPlants=new Map(),minSpacing=Math.min(...pool.filter(p=>p.group!=='Trees').map(p=>p.spacing||.5),.5),step=Math.max(.22,minSpacing);
    const totalCells=((bounds.maxX-bounds.minX)*(bounds.maxY-bounds.minY))/(step*step),sampleStep=totalCells>250000?Math.sqrt((bounds.maxX-bounds.minX)*(bounds.maxY-bounds.minY)/250000):step;
    if(sampleStep>step)warnings.push('Large-site preview samples the area; quantities need subdivision into smaller beds.');
    for(let y=bounds.minY+sampleStep/2;y<bounds.maxY&&placements.length<config.limit;y+=sampleStep){
      const row=Math.floor((y-bounds.minY)/sampleStep);
      for(let x=bounds.minX+sampleStep/2+(row%2)*sampleStep/2;x<bounds.maxX&&placements.length<config.limit;x+=sampleStep){
        const jitter=mode==='formal_blocks'?0:sampleStep*.7;
        const p=[x+((hash(x*113,y*97)%10000)/10000-.5)*jitter,y+((hash(y*127,x*83)%10000)/10000-.5)*jitter];if(!valid(p))continue;const bed=bedFor(p),d=pathDistance(p);
        const zone=selectedZones.get(String(bed.zoneId)),available=(byBed.get(bed)||[]).filter(q=>q.group!=='Trees'&&q.group!=='Climbers'&&aquaticFit(q,p)&&(!waterFor(p)||q.waterBand&&q.waterBand!=='margin'||shoreDistance(p)<=1.2));
        let local=available.filter(q=>d<config.edgeDepth?q.height<=config.edgeHeight&&!q.thorny:d<config.transitionDepth?q.height<=config.transitionHeight&&!q.thorny:project.character==='open'?q.height<=config.transitionHeight:true);
        const tree=placements.find(q=>q.tree&&Math.hypot(q.xy[0]-p[0],q.xy[1]-p[1])<q.spread/2);
        if(tree){local=local.filter(q=>q.light!=='sun');if(zone?.conditions?.light==='sun')warnings.push('Future tree shade changes the understorey check in '+zone.name+'.');}
        if(!local.length)continue;
        const gx=mode==='formal_blocks'?Math.floor((x-bounds.minX)/config.patchSize):Math.floor((x-bounds.minX+(y-bounds.minY)*.38)/config.patchSize),gy=Math.floor((y-bounds.minY)/config.patchSize),band=d<config.edgeDepth?'edge':d<config.transitionDepth?'middle':'inner',patch=bed.zoneId+':'+gx+':'+gy+':'+band;
        const roleCycle=Math.abs(gx+gy)%3;
        const rolePool=local.filter(q=>roleCycle===0?q.group==='Grasses, sedges & rushes':roleCycle===1?q.group==='Flowers & herbs':q.height>=1.1);
        const anchorPool=!project.rewilding&&project.anchorColours?.length?(rolePool.length?rolePool:local).filter(q=>project.anchorColours.includes(q.colour)):[];
        const candidates=anchorPool.length&&Math.abs(gx-gy)%3!==0?anchorPool:rolePool.length?rolePool:local;
        const stable=candidates.slice().sort((a,b)=>a.id.localeCompare(b.id));
        const mixed=local.slice().sort((a,b)=>a.id.localeCompare(b.id));
        const dominant=patchPlants.get(patch)||(mode==='formal_blocks'?stable[hash(gx,gy)%stable.length]:weighted(mixed,hash(gx+bed.zoneId*17,gy+31)));
        patchPlants.set(patch,dominant);
        // Coherent drifting groups with point-wise intermingling, not one species per grid cell.
        const chosen=mode==='formal_blocks'?dominant:(hash(x*57,y*131)%100<55&&local.some(q=>q.id===dominant.id)?dominant:weighted(mixed,hash(x*191,y*137)));
        if(!local.some(q=>q.id===chosen.id))continue;
        if(nearby(p).some(q=>Math.hypot(q.xy[0]-p[0],q.xy[1]-p[1])<(q.tree?Math.max(.75,q.spread*.12):(q.spacing+chosen.spacing)/2)))continue;
        add(p,chosen,bed,['G02','G04','G05','S01','S02','S03','S04','D01','D03','W03']);
      }
    }
    if(waterBeds.length)warnings.push('Water mock: a 1.2 m shoreline band is assumed for marginal plants, not a measured depth profile. Confirm depth, hydroperiod, flow and water quality before specifying aquatic planting. Open water remains clear where suitable aquatic records are absent.');
    const used=new Set(placements.map(p=>p.plantId));
    for(const plant of pool)if(!used.has(plant.id))decisions.push({plantId:plant.id,eligible:true,reason:plant.group==='Aquatic & marginal plants'?'Needs a drawn water polygon, compatible confirmed wet conditions and a shoreline position; it cannot fill an ordinary land bed.':'No compatible position in the available beds; mature size, path edge or zone fit limited placement.',rules:['G02','S02','D03']});
    const months=Array.from({length:12},(_,i)=>({month:i+1,plants:pool.filter(p=>used.has(p.id)&&p.from<=i+1&&p.to>=i+1&&p.group!=='Grasses, sedges & rushes').map(p=>p.id)}));
    const bloomGaps=months.filter(m=>m.month>=3&&m.month<=10&&!m.plants.length).map(m=>m.month);
    if(project.priorities?.includes('pollinators')&&bloomGaps.length)warnings.push('Flowering gap in month(s) '+bloomGaps.join(', ')+'. Check local flowering evidence before adding species.');
    if(placements.length>=config.limit)warnings.push('Preview limit reached; divide the site into smaller plans for complete quantities.');
    if(project.maintenance==='unknown')warnings.push('Maintenance capacity has not been agreed.');
    warnings.push('Municipal review: path junctions, bends and entrances need visibility and accessibility checks.','Local occurrence, public-contact safety, provenance and fixture spacing need specialist review.');
    const visibility=[];
    paths.forEach(line=>line.forEach((p,i)=>{if(i===0||i===line.length-1||line.length>2)visibility.push({xy:p,reason:i===0||i===line.length-1?'Path entrance / end: review visibility and accessibility.':'Path bend: review visibility.'});}));
    pathSegments.forEach(([a,b],i)=>pathSegments.slice(i+1).forEach(([c,d])=>{
      const ab=[b[0]-a[0],b[1]-a[1]],cd=[d[0]-c[0],d[1]-c[1]],den=ab[0]*cd[1]-ab[1]*cd[0];if(Math.abs(den)<1e-9)return;
      const t=((c[0]-a[0])*cd[1]-(c[1]-a[1])*cd[0])/den,u=((c[0]-a[0])*ab[1]-(c[1]-a[1])*ab[0])/den;
      if(t>0&&t<1&&u>0&&u<1)visibility.push({xy:[a[0]+t*ab[0],a[1]+t*ab[1]],reason:'Path crossing: municipality should review visibility.'});
    }));
    return {placements,decisions,warnings:[...new Set(warnings)],months,bounds,valid,bedFor,pathDistance,shoreDistance,waterFor,aquaticFit,visibility,area:area(boundary),ruleVersion:rules.version,algorithmVersion:'intermingled-fixtures-v0.3',mixWeights,config,plants:pool};
  }
  root.PlantscapesEngine={enrich,eligibility,zoneFit,generate,config,inside,distance};
})(typeof window==='undefined'?globalThis:window);
