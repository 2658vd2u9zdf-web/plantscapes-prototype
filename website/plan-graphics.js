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
  function elevated({boundary,sketches,placements,plants,masses,keys,direction,season,age,angle,pathWidth,colours}){
    const byId=new Map(plants.map(p=>[p.id,p])),colourById=new Map(keys.map(k=>[k.plant.id,k.colour]));
    const turn=({south:0,east:Math.PI/2,north:Math.PI,west:-Math.PI/2}[direction]||0)+(angle==='side'?0:Math.PI/6);
    const rotate=p=>[p[0]*Math.cos(turn)-p[1]*Math.sin(turn),p[0]*Math.sin(turn)+p[1]*Math.cos(turn)];
    const rotated=boundary.map(rotate),minX=Math.min(...rotated.map(p=>p[0])),maxX=Math.max(...rotated.map(p=>p[0])),minY=Math.min(...rotated.map(p=>p[1])),maxY=Math.max(...rotated.map(p=>p[1]));
    const tilt=angle==='side'?.035:.65,scale=Math.min(770/Math.max(1,maxX-minX),270/Math.max(1,(maxY-minY)*tilt)),centre=(minX+maxX)/2;
    const project=p=>{const q=rotate(p);return [450+(q[0]-centre)*scale,465-(q[1]-minY)*scale*tilt];};
    const pts=poly=>poly.map(p=>project(p).map(n=>n.toFixed(2)).join(',')).join(' ');
    const rect=(x,y,w,h,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="'+fill+'"/>';
    const surfaces=sketches.filter(s=>s.type!=='camera'&&s.type!=='path').map(s=>'<polygon data-surface="'+s.type+'" points="'+pts(s.points)+'" fill="'+({planting:'#d8e5c9',open:'#efe3ac',water:'#afd7dd'}[s.type]||'#d8e5c9')+'" stroke="'+({planting:'#9db389',open:'#baa35d',water:'#5595a1'}[s.type])+'" stroke-width="1.5"/>').join('');
    const patches=''; // Plant glyphs show the mixture; no single-species checkerboard in the spatial view.
    const paths=sketches.filter(s=>s.type==='path').map(s=>'<polyline data-surface="path" points="'+pts(s.points)+'" fill="none" stroke="#b5916a" stroke-width="'+Math.max(2,pathWidth*scale*tilt)+'" stroke-linejoin="round" stroke-linecap="round"/>').join('');
    const stride=Math.max(1,Math.ceil(placements.filter(p=>!p.tree&&!p.accent).length/650));
    const items=placements.filter((p,i)=>p.tree||byId.get(p.plantId)?.group==='Shrubs'||i%stride===0).map(p=>({...p,plant:byId.get(p.plantId),pos:project(p.xy),depth:rotate(p.xy)[1]})).filter(p=>p.plant).sort((a,b)=>b.depth-a.depth);
    const month={spring:4,summer:7,autumn:10,winter:1}[season],growth={1:.4,5:.65,15:.9,30:1}[age]||1;
    // One common vertical scale preserves relative heights; discrete growth is a mock multiplier.
    const tallest=Math.max(1,...items.map(p=>p.height||p.plant.height||1)),vertical=Math.min(scale*.8,145/tallest);
    const glyphs=items.map(p=>{
      const [x,y]=p.pos,group=p.plant.group,woody=['Trees','Shrubs'].includes(group),seasonHeight=woody?1:({spring:.65,summer:1,autumn:.9,winter:.65}[season]);
      const h=Math.max(2,(p.height||p.plant.height||.3)*vertical*(woody?growth:1)*seasonHeight),radius=Math.max(2,(p.spread||.4)*scale*.32*(woody?growth:1));
      const bloom=month>=p.plant.from&&month<=p.plant.to,flower=bloom?(colours[p.plant.colour]||'#ead179'):'#7b9771';
      let shape='';
      if(group==='Trees')shape='<path d="M'+x+' '+y+'v-'+h+'M'+x+' '+(y-h*.45)+'l'+(-radius*.75)+' '+(-h*.3)+'M'+x+' '+(y-h*.6)+'l'+radius*.8+' '+(-h*.25)+'" stroke="#705a45" stroke-width="2" fill="none"/>'+(season==='winter'?'':'<ellipse cx="'+x+'" cy="'+(y-h*.8)+'" rx="'+radius+'" ry="'+Math.max(4,h*.22)+'" fill="'+(season==='autumn'?'#b29a60':'#557a55')+'" fill-opacity=".7" stroke="#476947"/>');
      else if(group==='Shrubs')shape='<ellipse cx="'+x+'" cy="'+(y-h/2)+'" rx="'+radius+'" ry="'+(h/2)+'" fill="'+(season==='winter'?'#99987c':'#76925f')+'" fill-opacity=".8" stroke="#4d6c44" stroke-width=".7"/>';
      else if(group==='Grasses, sedges & rushes'){
        const colour=['autumn','winter'].includes(season)?'#ae9665':'#698347';
        shape=Array.from({length:7},(_,i)=>{const dx=(i-3)*Math.min(2,radius*.35),top=y-h*(.65+(i%3)*.15);return '<path d="M'+x+' '+y+'Q'+(x+dx*.3)+' '+(y-h*.55)+' '+(x+dx)+' '+top+'" stroke="'+colour+'" fill="none" stroke-width=".9"/>'+(season==='spring'?'':'<ellipse cx="'+(x+dx)+'" cy="'+top+'" rx="1" ry="2.3" fill="'+colour+'"/>');}).join('');
      }else shape='<ellipse cx="'+x+'" cy="'+y+'" rx="'+Math.min(4,radius)+'" ry="1.5" fill="#849968" opacity=".6"/><path d="M'+x+' '+y+'v-'+h+'" stroke="'+(season==='winter'?'#998969':'#71895a')+'" stroke-width=".8"/><circle cx="'+x+'" cy="'+(y-h)+'" r="'+(bloom?2.3:1.2)+'" fill="'+(season==='winter'?'#998969':flower)+'"/>';
      return '<g data-plant-form="'+(group==='Grasses, sedges & rushes'?'grass-tuft':woody?'woody':'perennial')+'"><title>'+esc(p.plant.name)+' · mock mature height '+p.plant.height+' m</title>'+shape+'</g>';
    }).join('');
    const camera=sketches.filter(s=>s.type==='camera').map(s=>{const [x,y]=project(s.points[0]);return '<g><rect x="'+(x-5)+'" y="'+(y-4)+'" width="10" height="8" fill="#173e34"/><text x="'+(x+9)+'" y="'+y+'" font-size="11">Camera marker</text></g>';}).join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 550" role="img" aria-label="Elevated metric mock plan view"><rect width="900" height="550" fill="#f2f5ed"/><polygon points="'+pts(boundary)+'" fill="#ecf0e5" stroke="#294c3c" stroke-dasharray="5 4"/>'+surfaces+patches+paths+glyphs+camera+'<g font-family="Segoe UI, sans-serif" fill="#183d32"><text x="28" y="35" font-size="18" font-weight="600">'+(angle==='side'?'Side view':'Elevated view')+' · '+esc(season)+' · year '+age+' · from '+direction+'</text><text x="28" y="56" font-size="12">Actual drawn geometry · illustrative heights and seasonal states</text>'+rect(28,509,14,10,'#b5916a')+'<text x="50" y="519" font-size="12">Path</text>'+rect(135,509,14,10,'#efe3ac')+'<text x="157" y="519" font-size="12">Open ground</text>'+rect(275,509,14,10,'#afd7dd')+'<text x="297" y="519" font-size="12">Water</text><text x="420" y="519" font-size="12">Shrubs and trees use relative fixture height / spread</text></g></svg>';
    return {svg,sample:items.length};
  }
  root.PlantscapesGraphics={pattern,swatch,notation,elevated};
})(typeof window==='undefined'?globalThis:window);
