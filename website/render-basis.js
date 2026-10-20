/* Local, metre-based render handoff. No provider calls. */
(()=>{
  'use strict';
  let mode='eye',bounds=null;
  const ready=()=>state.generated&&!state.planDirty&&currentCamera();
  const controls=document.querySelector('.camera-controls');
  field('placeViewpoint').hidden=true;
  controls.insertAdjacentHTML('afterbegin',`<div class="camera-editor"><div class="toolrow" aria-label="Camera placement"><button id="cameraEye" type="button" class="button button-secondary" aria-pressed="true">1 · Camera position</button><button id="cameraAim" type="button" class="button button-secondary" aria-pressed="false">2 · Look towards</button><button id="exportScene" type="button" class="button button-secondary">Export render scene</button></div><p id="cameraEditStatus" role="status" class="compact-note">Generate a plan to position the camera.</p><svg id="cameraPlan" viewBox="0 0 600 300" role="img" aria-label="Camera placement plan: paths, open ground, water, camera and viewing direction" style="width:100%;max-height:300px;background:#f2f5ed;border:1px solid #a5b6a6;border-radius:8px;touch-action:manipulation"></svg><p class="compact-note">Filled dot: camera · outlined dot: target · shaded fan: field of view. Use presets below for keyboard placement.</p></div>`);
  field('cameraHelp').hidden=true;
  function choose(next){mode=next;field('cameraEye').setAttribute('aria-pressed',String(mode==='eye'));field('cameraAim').setAttribute('aria-pressed',String(mode==='target'));field('cameraEditStatus').textContent=mode==='eye'?(state.sketches.some(s=>s.type==='path')?'Click a path below to place the camera.':'Click below to place the camera freely. No paths are required.'):'Click the place you want to look towards.';}
  field('cameraEye').onclick=()=>choose('eye');field('cameraAim').onclick=()=>choose('target');
  const metric=p=>latLngToMetric(p,state.planAudit.origin);
  function refresh(){
    const active=!!ready();['cameraEye','cameraAim','exportScene'].forEach(id=>field(id).disabled=!active);
    if(!active){field('cameraPlan').innerHTML='';bounds=null;return;}
    const poly=state.plotBoundary.map(metric),camera=currentCamera(),all=poly;
    const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
    const scale=Math.min(550/Math.max(1,maxX-minX),250/Math.max(1,maxY-minY));bounds={cx:(maxX+minX)/2,cy:(maxY+minY)/2,scale};
    const project=p=>[300+(p[0]-bounds.cx)*scale,150-(p[1]-bounds.cy)*scale],points=ps=>ps.map(p=>project(p).join(',')).join(' ');
    const surfaces=state.sketches.filter(s=>s.type!=='camera').sort((a,b)=>Number(a.type==='path')-Number(b.type==='path')).map(s=>s.type==='path'?`<polyline points="${points(s.points.map(metric))}" fill="none" stroke="#9b7952" stroke-width="${Math.max(3,PATH_WIDTH*scale)}"/>`:`<polygon points="${points(s.points.map(metric))}" fill="${({water:'#acd6df',open:'#eee0a9',planting:'#c6d9b9'})[s.type]||'#c6d9b9'}" stroke="#71856e"/>`).join('')+state.placements.filter(p=>p.tree).map(p=>{const q=project(p.xy);return `<circle cx="${q[0]}" cy="${q[1]}" r="${Math.max(3,p.spread*scale/2)}" fill="#527848" fill-opacity=".5"><title>Tree canopy</title></circle>`;}).join('');
    if(field('cameraEditStatus').textContent==='Generate a plan to position the camera.')choose('eye');
    const eye=project(camera.eye),target=project(camera.target),a=Math.atan2(target[1]-eye[1],target[0]-eye[0]),half=Math.atan(450/550),r=Math.min(95,Math.hypot(target[0]-eye[0],target[1]-eye[1]));
    const fan=[eye,[eye[0]+Math.cos(a-half)*r,eye[1]+Math.sin(a-half)*r],[eye[0]+Math.cos(a+half)*r,eye[1]+Math.sin(a+half)*r]];
    const colour=new Map(planPlantKey().map(k=>[k.plant.id,k.colour]));
    const dots=state.placements.filter(p=>!p.tree&&engine.inside(p.xy,poly)).map(p=>{const q=project(p.xy);return `<circle cx="${q[0]}" cy="${q[1]}" r="${Math.max(1,Math.min(4,p.spread*scale/2))}" fill="${colour.get(p.plantId)||'#698347'}" opacity=".8"/>`;}).join('');
    field('cameraPlan').innerHTML=`<defs><clipPath id="camera-plot-clip"><polygon points="${points(poly)}"/></clipPath></defs><polygon points="${points(poly)}" fill="#e2ead9" stroke="#345744"/><g clip-path="url(#camera-plot-clip)">${surfaces}${dots}<polygon points="${fan.map(p=>p.join(',')).join(' ')}" fill="#356b86" fill-opacity=".2"/><path d="M${eye}L${target}" stroke="#235870" stroke-width="2" stroke-dasharray="5 3"/><circle cx="${eye[0]}" cy="${eye[1]}" r="7" fill="#173e34" stroke="white" stroke-width="2"/><circle cx="${target[0]}" cy="${target[1]}" r="7" fill="white" stroke="#235870" stroke-width="2"/></g>`;
  }
  field('cameraPlan').addEventListener('click',e=>{
    if(!ready()||!bounds)return;
    const svg=field('cameraPlan'),pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),xy=[bounds.cx+(pt.x-300)/bounds.scale,bounds.cy-(pt.y-150)/bounds.scale],point=metricToLatLng(xy,state.planAudit.origin),camera=currentCamera();
    if(!engine.inside(xy,state.plotBoundary.map(metric)))return;
    let eye=metricToLatLng(camera.eye,state.planAudit.origin),target=metricToLatLng(camera.target,state.planAudit.origin);
    if(mode==='eye'){
      const snapped=nearestPathPoint(point);if(snapped&&snapped.distance>Math.max(5,10/bounds.scale)){field('cameraEditStatus').textContent='Choose a point closer to a path.';return;}eye=snapped?snapped.point:point;
      // Preserve the viewing direction when moving the camera.
      const next=metric(eye);target=metricToLatLng(next.map((v,i)=>v+camera.target[i]-camera.eye[i]),state.planAudit.origin);
    }else target=point;
    if(Math.hypot(...metric(target).map((v,i)=>v-metric(eye)[i]))<2){field('cameraEditStatus').textContent='Choose a target at least 2 m from the camera.';return;}
    state.cameraDraft=eye;addCamera(target);if(mode==='eye')choose('target');else field('cameraEditStatus').textContent='View updated below. Camera height: 1.6 m.';
  });
  function scene(){
    if(!ready())throw Error('Generate an up-to-date plan first.');
    const a=state.planAudit,c=currentCamera(),xyz=p=>[p[0],p[1],0];
    return {schema:'plantscapes-render-scene/1',units:'metres',coordinates:{axes:'X east, Y north, Z up',originWGS84:a.origin,terrain:'flat assumed; no surveyed elevation'},camera:{projection:'perspective',position:[...c.eye,c.eyeHeight],target:[...c.target,c.eyeHeight],up:[0,0,1],imageSize:[900,550],focalPixels:550,principalPoint:[450,260],horizontalFovDegrees:2*Math.atan(450/550)*180/Math.PI,nearClipMetres:.8},view:{season:field('viewSeason').value,ageYears:Number(field('viewAge').value),selectedPreview:field('viewAngle').value},geometry:{boundary:state.plotBoundary.map(p=>xyz(metric(p))),surfaces:state.sketches.filter(s=>s.type!=='camera').map(s=>({type:s.type,zoneId:s.zoneId,points:s.points.map(p=>xyz(metric(p))),...(s.type==='path'?{widthMetres:PATH_WIDTH}:{})}))},plants:state.selected.map(p=>({id:p.id,name:p.name,latin:p.latin,group:p.group,heightMetres:p.height,spreadMetres:p.spread,floweringMonths:[p.from,p.to],colour:p.colour,asset:null,evidence:p.demo?'synthetic_demo':'requires_review'})),instances:state.placements.map((p,i)=>({id:p.id||'sample-'+i,plantId:p.plantId,position:xyz(p.xy),heightMetres:p.height,spreadMetres:p.spread,communityId:p.communityId,representation:p.preview?'display_sample':'individual'})),communities:(a.communities||[]).map(c=>({id:c.id,areaSquareMetres:c.area,density:c.density,estimatedTotal:c.total,shares:c.rows.map(r=>({plantId:r.plantId,percentage:r.percentage,count:r.count})),cells:c.cells.map(cell=>cell.polygon.map(xyz))})),limitations:['Display samples are not all estimated plants. A renderer must instance community recipes within their cells and retain stable positions across seasons.','Plant assets, terrain, seasonal appearance and growth remain unvalidated.','Camera parameters describe path perspective; side/elevated previews use a different projection.']};
  }
  field('exportScene').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(scene())],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='plantscapes-render-scene.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);field('cameraEditStatus').textContent='Scene exported: camera, geometry, plant samples and full-area recipes.';};
  const previous=PlantscapesAI.refresh;PlantscapesAI.refresh=function(){previous();refresh();};
  window.PlantscapesRender={scene,refresh};refresh();
})();
