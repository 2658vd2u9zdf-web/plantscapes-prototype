/* Shared plan notation and metric, elevated illustration. No ecological simulation. */
(function(root){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const patterns=['M0 10L10 0','M0 0L10 10','M0 5H10','M5 0V10','M0 5H10M5 0V10','M0 0L10 10M0 10L10 0','M0 8L5 3L10 8','M0 3H4M6 7H10'];
  function pattern(index,colour,id){
    const n=(index-1)%9,scale=1+Math.floor((index-1)/22)*.35;
    return '<pattern id="'+id+'" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="scale('+scale+')"><rect width="10" height="10" fill="#fbfcf7"/><rect width="10" height="10" fill="'+colour+'" fill-opacity=".18"/>'+(n===8?'<circle cx="5" cy="5" r="1.8" fill="'+colour+'"/>':'<path d="'+patterns[n]+'" fill="none" stroke="'+colour+'" stroke-width="1.5"/>')+'</pattern>';
  }
  function swatch(entry,prefix='key'){
    const id=prefix+'-'+entry.index;
    return '<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><defs>'+pattern(entry.index,entry.colour,id)+'</defs><rect x="1" y="1" width="30" height="30" rx="3" fill="url(#'+id+')" stroke="'+entry.colour+'"/></svg>';
  }
  const notation='<div class="notation-key"><span><i class="notation-tree"></i>Tree centre</span><span><i class="notation-shrub"></i>Shrub centre</span><span><i class="notation-accent"></i>Sample perennial</span><span><i class="notation-crown"></i>Mature crown envelope</span><span><i class="notation-review"></i>Visibility review</span><span><i class="notation-path"></i>Path</span><span><i class="notation-open"></i>Open ground</span><span><i class="notation-water"></i>Water</span><p>Pattern + number identify species. Hatch strips show cell mixtures, not single-species beds. Small circles sample perennial positions.</p></div>';
  function elevated({boundary,sketches,placements,plants,masses,keys,direction,season,age,angle,camera,pathWidth,colours}){
    const byId=new Map(plants.map(p=>[p.id,p])),colourById=new Map(keys.map(k=>[k.plant.id,k.colour]));
    const turn=({south:0,east:Math.PI/2,north:Math.PI,west:-Math.PI/2}[direction]||0)+(angle==='side'?0:Math.PI/6);
    const rotate=p=>[p[0]*Math.cos(turn)-p[1]*Math.sin(turn),p[0]*Math.sin(turn)+p[1]*Math.cos(turn)];
    const rotated=boundary.map(rotate),minX=Math.min(...rotated.map(p=>p[0])),maxX=Math.max(...rotated.map(p=>p[0])),minY=Math.min(...rotated.map(p=>p[1])),maxY=Math.max(...rotated.map(p=>p[1]));
    const tilt=angle==='side'?.035:.65,scale=Math.min(770/Math.max(1,maxX-minX),270/Math.max(1,(maxY-minY)*tilt)),centre=(minX+maxX)/2;
    const perspective=angle==='path'&&camera;
    const delta=perspective?camera.target.map((n,i)=>n-camera.eye[i]):[0,1],length=Math.hypot(...delta)||1,forward=delta.map(n=>n/length);
    const depth=p=>perspective?(p[0]-camera.eye[0])*forward[0]+(p[1]-camera.eye[1])*forward[1]:rotate(p)[1];
    const pixelScale=p=>perspective?550/Math.max(.8,depth(p)):scale;
    const project=p=>{if(perspective){const dx=p[0]-camera.eye[0],dy=p[1]-camera.eye[1],s=pixelScale(p);return [450+(dx*forward[1]-dy*forward[0])*s,260+camera.eyeHeight*s];}const q=rotate(p);return [450+(q[0]-centre)*scale,465-(q[1]-minY)*scale*tilt];};
    // Clip surfaces at the near plane; never mirror geometry behind the camera.
    function clip(poly){if(!perspective)return poly;const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=depth(a),db=depth(b);if(da>=.8)result.push(a);if((da>=.8)!==(db>=.8)){const t=(.8-da)/(db-da);result.push(a.map((n,j)=>n+t*(b[j]-n)));}}return result;}
    const pts=poly=>clip(poly).map(p=>project(p).map(n=>n.toFixed(2)).join(',')).join(' ');
    const rect=(x,y,w,h,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="'+fill+'"/>';
    const surfaces=sketches.filter(s=>s.type!=='camera'&&s.type!=='path').map(s=>'<polygon data-surface="'+s.type+'" points="'+pts(s.points)+'" fill="'+({planting:'#d8e5c9',open:'#efe3ac',water:'#afd7dd'}[s.type]||'#d8e5c9')+'" stroke="'+({planting:'#9db389',open:'#baa35d',water:'#5595a1'}[s.type])+'" stroke-width="1.5"/>').join('');
    const patches=''; // Plant glyphs show the mixture; no single-species checkerboard in the spatial view.
    const paths=sketches.filter(s=>s.type==='path').map(s=>perspective?s.points.slice(1).map((b,i)=>{const a=s.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,n=[-(b[1]-a[1])/len*pathWidth/2,(b[0]-a[0])/len*pathWidth/2],ribbon=[a.map((v,j)=>v+n[j]),b.map((v,j)=>v+n[j]),b.map((v,j)=>v-n[j]),a.map((v,j)=>v-n[j])];return '<polygon data-surface="path" points="'+pts(ribbon)+'" fill="#b5916a"/>';}).join(''):'<polyline data-surface="path" points="'+pts(s.points)+'" fill="none" stroke="#b5916a" stroke-width="'+Math.max(2,pathWidth*scale*tilt)+'" stroke-linejoin="round" stroke-linecap="round"/>').join('');
    const stride=perspective?1:Math.max(1,Math.ceil(placements.filter(p=>!p.tree&&!p.accent).length/1200));
    const items=placements.filter((p,i)=>p.tree||byId.get(p.plantId)?.group==='Shrubs'||i%stride===0).filter(p=>!perspective||depth(p.xy)>=.8).map(p=>({...p,plant:byId.get(p.plantId),pos:project(p.xy),depth:depth(p.xy)})).filter(p=>p.plant).sort((a,b)=>b.depth-a.depth);
    const month={spring:4,summer:7,autumn:10,winter:1}[season],growth={1:.4,5:.65,15:.9,30:1}[age]||1;
    // One common vertical scale preserves relative heights; discrete growth is a mock multiplier.
    const tallest=Math.max(1,...items.map(p=>p.height||p.plant.height||1)),vertical=Math.min(scale*.8,145/tallest);
    const glyphs=items.map(p=>{
      const [x,y]=p.pos,group=p.plant.group,woody=['Trees','Shrubs'].includes(group),seasonHeight=woody?1:({spring:.65,summer:1,autumn:.9,winter:.65}[season]);
      const h=Math.max(2,(p.height||p.plant.height||.3)*(perspective?pixelScale(p.xy):vertical)*(woody?growth:1)*seasonHeight),radius=Math.max(2,(p.spread||.4)*(perspective?pixelScale(p.xy):scale)*.32*(woody?growth:1));
      const bloom=month>=p.plant.from&&month<=p.plant.to,flower=bloom?(colours[p.plant.colour]||'#ead179'):'#7b9771';
      let shape='';
      if(group==='Trees')shape='<path d="M'+x+' '+y+'v-'+h+'M'+x+' '+(y-h*.45)+'l'+(-radius*.75)+' '+(-h*.3)+'M'+x+' '+(y-h*.6)+'l'+radius*.8+' '+(-h*.25)+'" stroke="#705a45" stroke-width="2" fill="none"/>'+(season==='winter'?'':'<ellipse cx="'+x+'" cy="'+(y-h*.8)+'" rx="'+radius+'" ry="'+Math.max(4,h*.22)+'" fill="'+(season==='autumn'?'#b29a60':'#557a55')+'" fill-opacity=".7" stroke="#476947"/>');
      else if(group==='Shrubs')shape='<ellipse cx="'+x+'" cy="'+(y-h/2)+'" rx="'+radius+'" ry="'+(h/2)+'" fill="'+(season==='winter'?'#99987c':'#76925f')+'" fill-opacity=".8" stroke="#4d6c44" stroke-width=".7"/>';
      else if(group==='Grasses, sedges & rushes'){
        const colour=['autumn','winter'].includes(season)?'#ae9665':'#698347';
        shape=Array.from({length:7},(_,i)=>{const dx=(i-3)*Math.min(2,radius*.35),top=y-h*(.65+(i%3)*.15);return '<path d="M'+x+' '+y+'Q'+(x+dx*.3)+' '+(y-h*.55)+' '+(x+dx)+' '+top+'" stroke="'+colour+'" fill="none" stroke-width=".9"/>'+(season==='spring'?'':'<ellipse cx="'+(x+dx)+'" cy="'+top+'" rx="1" ry="2.3" fill="'+colour+'"/>');}).join('');
      }else {
        const foliage=season==='winter'?'#998969':season==='autumn'?'#8b8b59':'#6e8c50',body=Math.max(2,h*.35);
        shape='<ellipse cx="'+x+'" cy="'+(y-body*.65)+'" rx="'+radius+'" ry="'+body+'" fill="'+foliage+'" opacity=".85"/>';
        for(let stem=0;stem<5;stem++){const dx=(stem-2)*radius*.38,top=y-h*(.78+(stem%3)*.11);shape+='<path d="M'+x+' '+y+'Q'+(x+dx*.6)+' '+(y-h*.55)+' '+(x+dx)+' '+top+'" stroke="'+foliage+'" fill="none" stroke-width="1"/><ellipse cx="'+(x+dx)+'" cy="'+top+'" rx="'+Math.max(1,bloom?radius*.24:radius*.1)+'" ry="'+Math.max(1,bloom?h*.035:h*.02)+'" fill="'+(season==='winter'?'#8e795b':flower)+'"/>';}
      }
      return '<g data-plant-form="'+(group==='Grasses, sedges & rushes'?'grass-tuft':woody?'woody':'perennial')+'"><title>'+esc(p.plant.name)+' · mock mature height '+p.plant.height+' m</title>'+shape+'</g>';
    }).join('');
    const cameraMarker=perspective?'':sketches.filter(s=>s.type==='camera').map(s=>{const [x,y]=project(s.points[0]);return '<g><rect x="'+(x-5)+'" y="'+(y-4)+'" width="10" height="8" fill="#173e34"/><text x="'+(x+9)+'" y="'+y+'" font-size="11">Camera marker</text></g>';}).join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 550" role="img" aria-label="'+(perspective?'Eye-level path perspective':'Metric mock plan view')+'"><defs><clipPath id="view-frame"><rect x="0" y="75" width="900" height="415"/></clipPath></defs><rect width="900" height="550" fill="#f2f5ed"/>'+(perspective?'<rect y="75" width="900" height="185" fill="#e2edf0"/>':'')+'<g clip-path="url(#view-frame)"><polygon points="'+pts(boundary)+'" fill="#ecf0e5" stroke="#294c3c" stroke-dasharray="5 4"/>'+surfaces+patches+paths+glyphs+cameraMarker+'</g><g font-family="Segoe UI, sans-serif" fill="#183d32"><text x="28" y="35" font-size="18" font-weight="600">'+(perspective?'Path perspective · eye height 1.6 m':angle==='side'?'Side view':'Elevated view')+' · '+esc(season)+' · year '+age+(perspective?'':' · from '+direction)+'</text><text x="28" y="56" font-size="12">Actual drawn geometry · illustrative heights and seasonal states</text>'+rect(28,509,14,10,'#b5916a')+'<text x="50" y="519" font-size="12">Path</text>'+rect(135,509,14,10,'#efe3ac')+'<text x="157" y="519" font-size="12">Open ground</text>'+rect(275,509,14,10,'#afd7dd')+'<text x="297" y="519" font-size="12">Water</text><text x="420" y="519" font-size="12">Shrubs and trees use relative fixture height / spread</text></g></svg>';
    return {svg,sample:items.length};
  }
  root.PlantscapesGraphics={pattern,swatch,notation,elevated};
})(typeof window==='undefined'?globalThis:window);
