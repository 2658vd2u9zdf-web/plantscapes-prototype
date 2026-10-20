/* Repeatable display instances from community density, without changing specification counts. */
window.PlantscapesDenseView=function(){
  const audit=state.planAudit,camera=currentCamera();if(!audit?.communityMode||!camera)return state.placements;
  const plants=new Map(state.selected.map(p=>[p.id,engine.enrich(p)]));
  const hash=n=>{let x=Math.imul(n^0x9e3779b9,0x85ebca6b);x^=x>>>13;return (x>>>0)/4294967296;};
  const out=state.placements.filter(p=>!p.preview),delta=camera.target.map((n,i)=>n-camera.eye[i]),len=Math.hypot(...delta)||1,forward=delta.map(n=>n/len);
  const cells=(audit.communities||[]).flatMap((c,ci)=>c.cells.map((cell,i)=>({c,cell,seed:ci*1000003+i*31,d:Math.hypot(cell.xy[0]-camera.eye[0],cell.xy[1]-camera.eye[1])}))).filter(v=>v.d<65).sort((a,b)=>a.d-b.d);
  for(const {c,cell,seed} of cells){if(out.length>=14000)break;const expected=c.density*cell.area,count=Math.floor(expected)+(hash(seed)<expected%1?1:0),xs=cell.polygon.map(p=>p[0]),ys=cell.polygon.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;
    for(let j=0;j<count&&out.length<14000;j++){const xy=[minX+hash(seed+j*103+7)*w,minY+hash(seed+j*103+11)*h],depth=(xy[0]-camera.eye[0])*forward[0]+(xy[1]-camera.eye[1])*forward[1];if(depth<.8||!audit.valid(xy))continue;
      let share=hash(seed+j*103+19)*100,row=c.rows.at(-1);for(const r of c.rows){share-=r.percentage;if(share<=0){row=r;break;}}const p=plants.get(row.plantId);if(!p||!audit.aquaticFit(p,xy))continue;
      out.push({id:'render-'+seed+'-'+j,plantId:p.id,xy,height:p.height,spread:p.spread,tree:false,preview:true,communityId:c.id});
    }
  }return out;
};
