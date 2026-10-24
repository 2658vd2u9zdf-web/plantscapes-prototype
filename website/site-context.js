/* Public lookup: PDOK geocoding and OSM geometry, tested against the plot + 10 m. */
(()=>{
  let version=0,searchTimer=null,searchController=null,lookupKey='',pending=null,controller=null;
  const search=field('location'),row=search.closest('.field-row');row.classList.add('location-picker');
  const button=document.createElement('button');button.id='locationSearch';button.type='button';button.className='button button-secondary';button.textContent='Search';
  const results=document.createElement('div');results.id='locationResults';results.className='search-results';results.hidden=true;
  const status=document.createElement('small');status.id='locationStatus';status.setAttribute('role','status');status.textContent='Type a place or address, then choose a result to move the map.';
  row.append(button,results,status);
  async function findLocation(){
    clearTimeout(searchTimer);const query=search.value.trim(),serial=++version;searchController?.abort();results.hidden=true;results.replaceChildren();
    if(query.length<2){status.textContent='Type at least two characters to search.';return;}
    searchController=new AbortController();const requestController=searchController,timeout=setTimeout(()=>requestController.abort(),12000);status.textContent='Searching locations…';button.disabled=true;
    try{
      const url=new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free');url.searchParams.set('q',query);url.searchParams.set('rows','7');url.searchParams.set('fq','*');
      const response=await fetch(url,{signal:requestController.signal});if(!response.ok)throw Error('Search service unavailable');const data=await response.json();if(serial!==version)return;
      const matches=(data.response?.docs||[]).map(doc=>{const match=doc.centroide_ll?.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);return match&&doc.weergavenaam?{label:doc.weergavenaam,lat:Number(match[2]),lng:Number(match[1])}:null;}).filter(place=>place&&place.lat>=50.5&&place.lat<=53.7&&place.lng>=3.2&&place.lng<=7.3);
      for(const place of matches){const option=document.createElement('button');option.type='button';option.className='search-result';option.textContent=place.label;option.addEventListener('click',()=>{
        search.value=place.label;results.hidden=true;state.selectedLocation={...place,source:'PDOK location search'};
        if(!state.siteMap){status.textContent='Location found, but the scaled map is unavailable. Reload when the map service is reachable to outline a real site.';return;}
        const hadBoundary=state.plotBoundary.length>=3;state.siteMap.setView([place.lat,place.lng],17);clearPlotPreview();state.plotBoundary=[];state.plotDraft=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);drawPlot();
        status.textContent='Map moved to '+place.label+'. '+(hadBoundary?'The previous boundary was cleared. ':'')+'Draw or confirm your plot boundary.';
      });results.append(option);}
      results.hidden=!matches.length;status.textContent=matches.length?'Choose a result to move the map.':'No matching location found. Try a nearby town or use the starting city selector.';
    }catch{if(serial===version)status.textContent='Location search service unavailable. Choose a starting city or move the map manually.';}
    finally{clearTimeout(timeout);if(serial===version)button.disabled=false;}
  }
  search.addEventListener('input',()=>{version++;searchController?.abort();clearTimeout(searchTimer);button.disabled=false;state.selectedLocation=null;results.hidden=true;status.textContent=search.value.trim().length<2?'Type at least two characters to search.':'Searching shortly…';if(search.value.trim().length>=2)searchTimer=setTimeout(findLocation,400);});
  search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findLocation();}});
  button.addEventListener('click',findLocation);
  field('plotAreaReadout').insertAdjacentHTML('afterend','<small id="mapDataStatus" role="status"></small>');
  const segments=poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]);
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function intersects(a,b,c,d){const x=cross(a,b,c),y=cross(a,b,d),u=cross(c,d,a),v=cross(c,d,b);return x*y<=0&&u*v<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));}
  function near(poly,feature,closed,tolerance=10){
    if(!feature.length)return false;const edges=segments(poly),lines=closed?segments(feature):feature.slice(1).map((p,i)=>[feature[i],p]);
    if(feature.some(p=>engine.inside(p,poly))||(closed&&poly.some(p=>engine.inside(p,feature))))return true;
    if(feature.some(p=>edges.some(([a,b])=>engine.distance(p,a,b)<=tolerance)))return true;
    return lines.some(([a,b])=>edges.some(([c,d])=>intersects(a,b,c,d)||engine.distance(c,a,b)<=tolerance||engine.distance(d,a,b)<=tolerance));
  }
  function classify(elements,boundary){
    const origin=boundary[0],poly=boundary.map(p=>latLngToMetric(p,origin));let water=false,waterNearby=false,road=false;
    for(const f of elements){const tags=f.tags||{},isWater=tags.natural==='water'||!!tags.water||['river','stream','canal','ditch','drain','tidal_channel'].includes(tags.waterway)||tags.landuse==='reservoir',isRoad=!!tags.highway&&!['footway','path','steps','cycleway','bridleway'].includes(tags.highway);if(!isWater&&!isRoad)continue;
      const geometries=f.geometry?[f.geometry]:(f.members||[]).filter(m=>m.role!=='inner'&&m.geometry).map(m=>m.geometry);
      for(const geometry of geometries){const points=geometry.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>latLngToMetric([p.lat,p.lon],origin));const closed=points.length>2&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.1;if(near(poly,points,closed)){waterNearby||=isWater;road||=isRoad;}if(isWater&&near(poly,points,closed,0))water=true;}
    }return {water,waterNearby,road};
  }
  async function detect(){
    if(state.plotBoundary.length<3)return;const boundary=structuredClone(state.plotBoundary),key=JSON.stringify(boundary);if(key===lookupKey)return pending;lookupKey=key;controller?.abort();controller=new AbortController();const requestController=controller,signal=controller.signal,timer=setTimeout(()=>requestController.abort(),4000);state.mapEvidence={source:'pending',boundary:key};
    pending=(async()=>{const box=field('mapDataStatus');box.textContent='Checking nearby water and roads…';
      try{const lat=boundary.map(p=>p[0]),lon=boundary.map(p=>p[1]),padY=10/111195,padX=padY/Math.cos(lat[0]*Math.PI/180),bbox=[Math.min(...lat)-padY,Math.min(...lon)-padX,Math.max(...lat)+padY,Math.max(...lon)+padX].join(',');
        if(geographicPolygonAreaM2(boundary)>2000000)throw Error('Large site');
        const query='[out:json][timeout:3];(way[highway]('+bbox+');way[waterway]('+bbox+');way[natural=water]('+bbox+');way[water]('+bbox+');relation[natural=water]('+bbox+'););out geom;';
        const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:new URLSearchParams({data:query}),signal});if(!response.ok)throw Error();const data=await response.json();if(data.remark)throw Error();if(JSON.stringify(state.plotBoundary)!==key)return;
        const result=classify(data.elements||[],boundary);state.mapEvidence={...result,source:'OpenStreetMap / Overpass',checkedAt:new Date().toISOString(),boundary:key};
        if(state.stage<=2){field('featureWater').checked=result.water;state.zones.forEach(z=>z.conditions=null);}
        box.textContent=[result.water?'Mapped water in plot':result.waterNearby?'Water within 10 m, outside plot':'Water not verified',result.road?'Road within 10 m':''].filter(Boolean).join(' · ');box.title='OpenStreetMap suggestions; absence is not verified. Manual corrections are preserved.';
      }catch{if(JSON.stringify(state.plotBoundary)!==key)return;state.mapEvidence={source:'unavailable',boundary:key};box.textContent='Nearby water/road check unavailable. Location search and drawing still work; confirm site features manually.';}finally{clearTimeout(timer);}
    })();return pending;
  }
  const originalDraw=drawPlot;drawPlot=function(){originalDraw();if(state.plotBoundary.length>=3)detect();else{lookupKey='';state.mapEvidence=null;field('featureWater').checked=false;field('featureRoad').checked=false;field('mapDataStatus').textContent='';}};
  // Background lookup never blocks Continue and never overwrites an opened profile.
  const originalDefaults=defaultConditions;defaultConditions=function(){const c=originalDefaults();const e=state.mapEvidence;if(e?.source==='OpenStreetMap / Overpass'&&e.water){c.waterEdge='yes';c.hydrology='edge';}else{c.waterEdge='unknown';c.hydrology='unknown';}return c;};
  window.PlantscapesSiteContext={detect,classify};
})();
