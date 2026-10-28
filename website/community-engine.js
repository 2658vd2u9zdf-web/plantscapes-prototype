/* Scalable community recipes. Area/quantity estimates are not a construction specification. */
(function(root){
  'use strict';
  const E=root.PlantscapesEngine,individuals=E.generate;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function generate(input){
    const {boundary,beds=[],waterBeds=[],paths=[],exclusions=[],plants=[],zones=[],project={},pathWidth=1.5,mix={matrix:45,flowers:45,structure:10},recipes={}}=input;
    if(!boundary?.length||!beds.length)return individuals(input);
    const pool=plants.map(E.enrich).filter(p=>E.eligibility(p,project).eligible),zoneMap=new Map(zones.map(z=>[String(z.id),z]));
    // Every valid cell lies inside the plot, so shapes drawn beyond it must not widen the quadrature grid.
    const bounds={minX:Math.min(...boundary.map(p=>p[0])),maxX:Math.max(...boundary.map(p=>p[0])),minY:Math.min(...boundary.map(p=>p[1])),maxY:Math.max(...boundary.map(p=>p[1]))};
    const segments=poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]);
    const lines=paths.flatMap(line=>line.slice(1).map((p,i)=>[line[i],p]));
    const pathDistance=p=>Math.min(...lines.map(([a,b])=>E.distance(p,a,b)))-pathWidth/2;
    const waterFor=p=>waterBeds.slice().reverse().find(b=>E.inside(p,b.polygon));
    const bedFor=p=>waterFor(p)||beds.slice().reverse().find(b=>E.inside(p,b.polygon));
    const valid=p=>E.inside(p,boundary)&&!!bedFor(p)&&!exclusions.some(poly=>E.inside(p,poly))&&pathDistance(p)>=0;
    const shoreDistance=p=>waterBeds.length?Math.min(...waterBeds.flatMap(b=>segments(b.polygon).map(([a,b])=>E.distance(p,a,b)))):Infinity;
    const aquaticFit=(plant,p)=>plant.group==='Aquatic & marginal plants'?shoreDistance(p)<=1.2:!waterFor(p);
    const treePool=pool.filter(p=>p.group==='Trees');
    const woody=treePool.length?individuals({...input,plants:treePool}):{placements:[],visibility:[],warnings:[]};
    const placements=(woody.placements||[]).map(p=>({...p,preview:false}));
    const allBeds=[...beds,...waterBeds],communities=new Map(),cells=[];let netArea=0;
    // Stratified quadrature visits the whole extent. The bound limits work, not plant quantity.
    const step=Math.max(.35,Math.sqrt((bounds.maxX-bounds.minX)*(bounds.maxY-bounds.minY)/40000));
    const byBed=new Map(allBeds.map((b,i)=>{const xs=b.polygon.map(q=>q[0]),ys=b.polygon.map(q=>q[1]);const geometry={available_width_m:Math.max(...xs)-Math.min(...xs),available_length_m:Math.max(...ys)-Math.min(...ys),plantable_area_m2:E.area(b.polygon)};return [b,{index:i,geometry,zone:zoneMap.get(String(b.zoneId)),bedType:waterBeds.includes(b)?'water':'planting',fits:new Map()}];}));
    // Same non-positional rules as the server's AI revalidation. The project-demo recommender is the eligibility
    // source when loaded (browser, server); the v0.3 runtime remains for the audited reference benchmark.
    const operational=new Map(root.PlantscapesSuitabilityV03.plants.map(r=>[r.fixture_id,r])),fitSource=root.PlantscapesRecommender||root.PlantscapesRuntimeV03;
    const fitting=(record,band,shade)=>{const key=band+(shade?'-shade':'');if(!record.fits.has(key))record.fits.set(key,pool.filter(p=>fitSource.communityFit(operational.get(p.id)||{fixture_id:p.id},record.zone,project,record.geometry,{band,shade,bedType:record.bedType,waterPresent:waterBeds.length>0},E.config).fit));return record.fits.get(key);};
    for(let y=bounds.minY;y<bounds.maxY;y+=step)for(let x=bounds.minX;x<bounds.maxX;x+=step){
      const width=Math.min(step,bounds.maxX-x),height=Math.min(step,bounds.maxY-y),xy=[x+width/2,y+height/2];if(!valid(xy))continue;
      netArea+=width*height;
      const bed=bedFor(xy),record=byBed.get(bed),d=pathDistance(xy),band=d<E.config.edgeDepth?'edge':d<E.config.transitionDepth?'transition':'interior';
      const shade=placements.some(t=>t.tree&&Math.hypot(t.xy[0]-xy[0],t.xy[1]-xy[1])<t.spread/2);
      const eligible=fitting(record,band,shade).filter(p=>aquaticFit(p,xy));
      if(!eligible.length)continue;
      const id='community-'+record.index+'-'+band+(shade?'-shade':'');
      let community=communities.get(id);
      if(!community){community={id,bedIndex:record.index,zoneId:bed.zoneId,zone:zoneMap.get(String(bed.zoneId))?.name||'Site',band,shade,area:0,eligible,rows:[],cells:[]};communities.set(id,community);}
      // Further hydrological subzones may have a narrower eligible set; keep their recipes separate.
      // Recipe identity describes space, never the current palette. Otherwise adding
      // or removing a species changes the ID and silently discards its requested mix.
      const habitat=waterFor(xy)?'water':shoreDistance(xy)<=1.2?'shore':'land',fullId=id+'-'+habitat;
      let exact=communities.get(fullId);if(!exact){exact={...community,id:fullId,area:0,rows:[],cells:[],eligible};communities.set(fullId,exact);}
      exact.area+=width*height;const cell={xy,area:width*height,polygon:[[x,y],[x+width,y],[x+width,y+height],[x,y+height]],community:exact};exact.cells.push(cell);cells.push(cell);
    }
    const active=[...communities.values()].filter(c=>c.area>0);
    for(const c of active){
      const override=recipes[c.id];const role=p=>p.role==='matrix'?'matrix':p.role==='woody_framework'||p.role==='structural_perennial'?'structure':'flowers';
      const counts={};c.eligible.forEach(p=>counts[role(p)]=(counts[role(p)]||0)+1);
      let raw=c.eligible.map(p=>({plantId:p.id,plant:p,weight:override?Math.max(0,Number(override[p.id])||0):Math.max(0,Number(mix[role(p)])||0)/counts[role(p)]}));
      let sum=raw.reduce((n,r)=>n+r.weight,0);if(!sum){if(override)return {error:'At least one species share must be positive in '+c.zone+'.'};raw.forEach(r=>r.weight=1);sum=raw.length;}
      raw=raw.filter(r=>r.weight>0);const footprint=raw.reduce((n,r)=>n+r.weight/sum*r.plant.spacing*r.plant.spacing,0);
      c.density=1/Math.max(.04,footprint);c.total=Math.round(c.area*c.density);
      // percentage = share of plant count; spacingAreaShare = share of synthetic SPACE-01 spacing footprint. Neither is visible ground cover.
      c.shareBasis='plant_count';
      c.rows=raw.map(r=>({...r,percentage:r.weight/sum*100,spacingAreaShare:r.weight/sum*r.plant.spacing*r.plant.spacing/footprint*100,count:Math.floor(c.total*r.weight/sum),remainder:c.total*r.weight/sum%1}));
      let remaining=c.total-c.rows.reduce((n,r)=>n+r.count,0);[...c.rows].sort((a,b)=>b.remainder-a.remainder).slice(0,remaining).forEach(r=>r.count++);
    }
    // Area-stratified, fixed-budget preview samples cover every community, including the far end.
    const limit=2400,totalArea=active.reduce((n,c)=>n+c.area,0),hash=(x,y)=>Math.abs(Math.sin(x*12.9898+y*78.233)*43758.5453)%1;
    for(const c of active){
      const n=Math.min(c.total,Math.max(1,Math.floor(limit*c.area/Math.max(1,totalArea)))),previewRows=c.rows.filter(r=>r.count>0),previewWeight=previewRows.reduce((sum,r)=>sum+r.percentage,0);
      const sorted=c.cells;for(let i=0;i<n;i++){
        const cell=sorted[Math.min(sorted.length-1,Math.floor((i+.5)/n*sorted.length))],p=cell.xy;
        let threshold=(input.mode==='formal_blocks'?(p[0]-bounds.minX)/Math.max(.01,bounds.maxX-bounds.minX):hash(p[0]*13+i,p[1]*19))*previewWeight,row=previewRows.at(-1);for(const candidate of previewRows){threshold-=candidate.percentage;if(threshold<=0){row=candidate;break;}}
        const plant=row.plant;placements.push({xy:p.slice(),plantId:plant.id,spacing:plant.spacing,spread:plant.spread,height:plant.height,tree:false,accent:plant.group==='Shrubs',preview:true,communityId:c.id,zoneId:c.zoneId,zone:c.zone,ruleTrace:['G02','S02','S03','D01'],evidenceStatus:plant.demo?'synthetic_demo':'reviewed',reason:'Display sample of '+c.zone+' / '+c.band+'. Recipe share '+row.percentage.toFixed(1)+'%; not an individually specified plant.'});
      }
    }
    const used=new Set([...active.flatMap(c=>c.rows.filter(r=>r.count>0).map(r=>r.plantId)),...placements.map(p=>p.plantId)]);
    const quantities={};active.forEach(c=>c.rows.forEach(r=>quantities[r.plantId]=(quantities[r.plantId]||0)+r.count));placements.filter(p=>p.tree).forEach(p=>quantities[p.plantId]=(quantities[p.plantId]||0)+1);
    const uncovered=Math.max(0,netArea-totalArea);if(uncovered>step*step)woody.warnings=[...(woody.warnings||[]),'About '+Math.round(uncovered)+' m² of drawn net planting area has no compatible understorey recipe. Review its conditions or data coverage.'];
    return {placements,communities:active,cells,quantities,communityMode:true,totalQuantity:Object.values(quantities).reduce((n,q)=>n+q,0),plantableArea:totalArea,netArea,unassignedArea:uncovered,areaMethod:'whole-site centre-point quadrature; approximate',areaResolution:step,area:totalArea,bounds,valid,bedFor,waterFor,shoreDistance,pathDistance,aquaticFit,visibility:woody.visibility||[],plants:pool,ruleVersion:root.PLANTSCAPES_RULEBOOK?.version,config:E.config,algorithmVersion:'community-recipes-v1',decisions:pool.filter(p=>!used.has(p.id)).map(p=>({plantId:p.id,reason:'No compatible community or tree position.',rules:['G02','S02']})),warnings:[...(woody.warnings||[]),'Areas and quantities are estimates from '+step.toFixed(2)+' m quadrature, not surveyed net areas.','Density uses synthetic spacing and count fractions, not reviewed cover or seed rates.','Preview symbols are sampled across the whole site; recipe quantities are not capped at 12,000.','Confirm building and hardscape exclusions, root space, ecology and seasonal traits.']};
  }
  E.generateIndividuals=individuals;E.generate=generate;
})(typeof window==='undefined'?globalThis:window);
