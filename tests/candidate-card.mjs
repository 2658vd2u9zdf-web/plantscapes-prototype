/* Candidate cards: plain-language collapsed rows, graphical criteria, labelled flower colour, accessible toggle.
   Rendered in Node from the same modules the browser loads; layout at 375 px is checked in the browser. */
import assert from 'node:assert/strict';
import {loadDemo,read,canonicalZones,baseProject,openClayZone,visibleText} from './project-demo-harness.mjs';

const {R,C,window:w}=await loadDemo();
const {zones}=await canonicalZones();
let cards=0;
const technical=/v0\.3|production|eligib|confidence|capped|\braw\b|synthetic|fallback|SPACE-01|claim|\bH\d{2}\b|[a-z]+_[a-z]+|\d+\.\d{3,}|\bundefined\b|\bNaN\b|\bnull\b/i;
const split=html=>{const at=html.indexOf('<div class="plant-detail');return {row:html.slice(0,at),detail:html.slice(at)};};
/* Source panels are hidden disclosures; the card's own reading text is checked without them. */
function panels(html){
  const found=[];let at;
  while((at=html.indexOf('<div class="source-panel"'))>=0){
    let depth=0,i=at;
    for(;i<html.length;i++){if(html.startsWith('<div',i))depth++;else if(html.startsWith('</div>',i)&&--depth===0){i+=6;break;}}
    found.push(html.slice(at,i));html=html.slice(0,at)+html.slice(i);
  }
  return {without:html,panels:found};
}
const scenarios=[[zones,baseProject],[[openClayZone],{...baseProject,rewilding:true}],[[openClayZone],{...baseProject,publicAccess:false,maintenance:'low',vigourControl:'yes'}],[[zones[2]],{...baseProject,publicHarvest:true,support:true}]];
for(const [zoneList,project] of scenarios){
  const items=[...R.candidates(zoneList,project),...R.showcase(zoneList,project)];
  for(const item of items){
    const example=item.id.startsWith('uncertainty-'),html=C.cardHtml(item,{removable:!example}),{row,detail:fullDetail}=split(html),rowText=visibleText(row),{without:detail,panels:sourcePanels}=panels(fullDetail),detailText=visibleText(detail);
    // Every criterion row and the flowering block carry one "?" source button that controls its own hidden panel.
    const buttons=[...fullDetail.matchAll(/<button type="button" class="source-button" data-source-toggle aria-expanded="false" aria-controls="([^"]+)" aria-label="Where the [^"]+ information comes from"/g)].map(m=>m[1]);
    assert.equal(buttons.length,(fullDetail.match(/<li class="criterion /g)||[]).length+(Number.isInteger(item.from)?1:0),item.id+' one source button per criterion');
    assert.equal(new Set(buttons).size,buttons.length,item.id+' duplicate source panel IDs');
    for(const id of buttons)assert.ok(fullDetail.includes('<div class="source-panel" id="'+id+'" hidden>'),item.id+' panel '+id+' missing or open');
    for(const panel of sourcePanels){const text=visibleText(panel);assert.ok(text.length>20&&!/[a-z]+_[a-z]+|claim|\b[A-Z]+-\d{2}\b|\bundefined\b|\bnull\b/i.test(text),item.id+' unreadable source panel: '+text.slice(0,160));}
    cards++;
    // Collapsed row: icon/initial, names, one role line, one plain state, expand and remove buttons. No technical summary.
    assert.ok(!technical.test(rowText),item.id+' collapsed row is technical: '+rowText);
    assert.ok(rowText.includes(item.name)&&rowText.includes(item.latin),item.id+' names');
    assert.ok(Object.values(R.states).some(s=>rowText.includes(s.label)),item.id+' state label');
    assert.equal((row.match(/class="fit-badge/g)||[]).length,1,item.id+' exactly one state');
    assert.equal((row.match(/class="candidate-role"/g)||[]).length,1,item.id+' one role line');
    assert.ok(/class="candidate-avatar"/.test(row),item.id+' avatar');
    assert.match(row,new RegExp('data-expand="[^"]+" aria-expanded="false" aria-controls="'+(example?'example':'candidate')+'-detail-[^"]+" aria-label="Show details for '),item.id+' accessible toggle');
    assert.equal(/data-override-plant=/.test(row),example&&item.recommendation.override.allowed,item.id+' Add anyway only on addable examples');
    assert.ok(row.includes('<svg'),item.id+' chevron icon, not colour alone');
    assert.equal(/data-remove-plant=/.test(row),!example,item.id+' remove button only on palette plants');
    if(!example)assert.match(row,/class="candidate-remove plant-control" data-remove-plant="[^"]+" aria-label="Remove [^"]+ from the palette"/,item.id+' distinct remove control');
    assert.ok(detail.includes(' hidden>'),item.id+' starts collapsed');
    // Expanded card: summary, at most one constraint, grouped criteria with icon and text, labelled flower colour, size and role.
    assert.ok(!technical.test(detailText),item.id+' expanded card is technical: '+detailText.match(technical)?.[0]);
    assert.match(detailText,/Why it (fits|needs attention|is not suitable|is excluded):/,item.id+' summary');
    assert.ok((detail.match(/class="candidate-constraint/g)||[]).length<=1,item.id+' more than one constraint panel');
    for(const group of ['Growing conditions','Space and care','Project fit','Safety and rules'])assert.ok(detailText.includes(group),item.id+' missing '+group);
    const criteria=[...detail.matchAll(/<li class="criterion criterion-(\w+)"><span class="criterion-label">([^<]+)<\/span><span class="criterion-status"><span class="criterion-icon" aria-hidden="true">([^<]+)<\/span>([^<]+)<\/span>/g)];
    assert.ok(criteria.length>=12,item.id+' criteria grid too small');
    for(const [, tone,label,icon,text] of criteria){
      assert.ok(['✓','~','×','?','—'].includes(icon),item.id+' '+label+' icon');
      assert.ok(text.trim().length>1,item.id+' '+label+' needs text, not only colour');
      assert.equal({ok:'✓',partial:'~',bad:'×',unknown:'?',none:'—'}[tone],icon,item.id+' '+label+' icon and tone agree');
    }
    for(const label of ['Soil','Moisture','Light','Water levels','Mature size','Spacing','Maintenance','Native status','Provenance','Regional occurrence','Invasive / legal status','Public contact','Toxicity','Thorns'])
      assert.ok(criteria.some(c=>c[2]===label),item.id+' missing criterion '+label);
    if(Number.isInteger(item.from)){
      assert.match(detailText,/Flower colour: [a-z]/,item.id+' flower colour label');
      assert.match(detail,/class="flower-swatch[^"]*" style="--flower:#[0-9a-f]{6}"/,item.id+' colour swatch');
      assert.match(detail,/role="img" aria-label="Flowers from [A-Z][a-z]+/,item.id+' month strip has a text alternative');
      assert.ok(detailText.includes('drawn in its flower colour'),item.id+' month colour meaning stated');
      assert.equal((detail.match(/month-on/g)||[]).length,((item.to-item.from+12)%12)+1,item.id+' highlighted months');
    }
    for(const k of ['Height','Spread','Spacing','Role','Maintenance'])assert.ok(detailText.includes(k),item.id+' size table '+k);
    assert.ok(!/\d+\.\d{2,} m/.test(detailText.replace(/0\.\d5 m|0\.\d0 m/g,'')),item.id+' unnecessary decimal precision');
    assert.ok(!detail.includes('Technical details'),item.id+' developer trace must be off by default');
    assert.ok(detailText.length<2600,item.id+' expanded card is a text wall ('+detailText.length+' chars)');
    if(example)assert.ok(detailText.includes('About this example'),item.id+' example explanation');
    // A hard-gate or policy failure produces one short explanation.
    const r=item.recommendation;
    if(['not_suitable','excluded_project_rule','excluded_missing_information'].includes(r.state))assert.ok(r.constraint.text.split(/\.\s/).length<=2&&r.constraint.text.length<170,item.id+' long gate explanation');
  }
}
// "Add anyway": labelled button on the example, a confirmation once added, and an "Added by you" tag in the palette.
{
  const id='uncertainty-01-native-status',plain=R.showcase([openClayZone],baseProject).find(p=>p.id===id);
  const offered=C.cardHtml(plain,{removable:false});
  assert.match(offered,/<button type="button" class="candidate-override" data-override-plant="uncertainty-01-native-status" aria-label="Add Pijpenstrootje to your selection anyway, although information is missing">Add anyway<\/button>/);
  assert.ok(visibleText(offered).includes('you can add it to your selection anyway'));
  const added=R.showcase([openClayZone],{...baseProject,overrideIds:[id]}).find(p=>p.id===id);
  const inExamples=C.cardHtml(added,{removable:false,selected:true}),inPalette=C.cardHtml(added);
  assert.ok(!inExamples.includes('data-override-plant')&&visibleText(inExamples).includes('In your selection'),'example shows it was added');
  assert.ok(inPalette.includes('class="override-tag">Added by you<')&&inPalette.includes('data-remove-plant'),'palette card marks the override and can be removed');
  assert.ok(visibleText(inPalette).includes('Added by you: Although information is missing'),'override explained in the card');
  assert.ok(!technical.test(visibleText(inPalette)),'override card stays plain');
  assert.notEqual(inPalette.match(/id="([^"]+)" hidden/)[1],inExamples.match(/id="([^"]+)" hidden/)[1],'palette and example cards use different detail IDs');
  const blocked=R.showcase([openClayZone],{...baseProject,character:'open'}).find(p=>p.id==='uncertainty-03-public-contact');
  const refused=C.cardHtml(blocked,{removable:false});
  assert.ok(!refused.includes('data-override-plant')&&visibleText(refused).includes('cannot be added anyway'),'no override for a project-rule exclusion');
}

// Source panels distinguish published, derived, placeholder, demo-filled and removed values, and link real sources.
{
  const sorbus=R.candidates([openClayZone],baseProject).find(p=>p.id==='demo-core-47');
  const panel=key=>{const html=C.cardHtml(sorbus),at=html.indexOf('id="candidate-src-demo-core-47-'+key+'"');return panels(html.slice(html.lastIndexOf('<div',at))).panels[0];};
  assert.match(panel('soil'),/Derived from published sources[\s\S]*The source says: sand, loam, peat[\s\S]*href="https:\/\/www\.verspreidingsatlas\.nl\/1227[^"]*"[\s\S]*href="https:\/\/plants\.ces\.ncsu\.edu\/plants\/sorbus-aucuparia/);
  assert.match(panel('light'),/From published sources[\s\S]*full sun, partial shade/);
  assert.match(panel('size'),/Mature height[\s\S]*The source says: 9 m/);
  assert.match(panel('hydrology'),/Demo placeholder[\s\S]*No source states this value[\s\S]*Related sources consulted/);
  assert.match(panel('regional-occurrence'),/Demo placeholder[\s\S]*Placeholder until occurrence data/);
  assert.match(panel('toxicity'),/From published sources[\s\S]*weakly toxic reported/);
  assert.match(panel('flowering'),/Flowering start[\s\S]*The source says: May/);
  assert.match(panel('soil'),/target="_blank" rel="noopener noreferrer"/,'external links open safely');
  const zone={...openClayZone,conditions:{...openClayZone.conditions,field_origins:{soil:'user_selected',light:'synthetic_fallback'}}};
  const local=R.candidates([zone],baseProject).find(p=>p.id==='demo-core-47'),html=C.cardHtml(local);
  const sitePanel=key=>panels(html.slice(html.lastIndexOf('<div',html.indexOf('id="candidate-src-demo-core-47-'+key+'"')))).panels[0];
  assert.match(sitePanel('soil'),/Site value \(soil\): entered by you/);
  assert.match(sitePanel('light'),/Site value \(light\): suggested starting value, not yet checked/);
  const example=R.showcase([openClayZone],baseProject).find(p=>p.id==='uncertainty-06-hydrology'),eh=C.cardHtml(example,{removable:false});
  assert.match(panels(eh.slice(eh.lastIndexOf('<div',eh.indexOf('id="example-src-uncertainty-06-hydrology-hydrology"')))).panels[0],/Not provided[\s\S]*removed for this example/);
  // Not everything is synthetic: most plants have published light, moisture and height data with links.
  const linked=field=>R.records.filter(r=>{const f=R.sources(r.fixture_id,field).fields[0];return ['sourced','derived'].includes(f.kind)&&f.sources.some(s=>s.link);}).length;
  assert.ok(linked('light')>=58&&linked('moisture')>=56&&linked('size')>=59&&linked('soil')>=50,'published sources are linked for most plants');
  assert.equal(linked('hydrology'),2,'hydrology is mostly a placeholder and says so');
  // The "?" toggle opens and closes its own panel.
  const panelStub={hidden:true},attrs={'aria-expanded':'false'},button={getAttribute:k=>attrs[k],setAttribute:(k,v)=>{attrs[k]=v;},parentElement:{querySelector:()=>panelStub}};
  C.toggleSource(button);assert.equal(attrs['aria-expanded'],'true');assert.equal(panelStub.hidden,false);
  C.toggleSource(button);assert.equal(attrs['aria-expanded'],'false');assert.equal(panelStub.hidden,true);
}

// Hidden plants list: one plain reason per plant.
const screened=R.screen(zones,{...baseProject,rewilding:true}),hiddenHtml=C.hiddenHtml(screened.hidden),hiddenText=visibleText(hiddenHtml);
assert.ok(screened.hidden.length>0&&!technical.test(hiddenText),'hidden list is technical');
assert.equal((hiddenHtml.match(/class="not-shown-reason"/g)||[]).length,screened.hidden.length,'one reason per hidden plant');
assert.ok(hiddenText.includes('Excluded by project rule')&&hiddenText.includes('Not suitable'),'hidden list names both kinds of exclusion');

// Toggle: chevron state, aria-expanded and label change; colour is not the only signal.
const attributes={'aria-expanded':'false','aria-label':'Show details for Wilde lijsterbes'},detail={hidden:true,classList:{remove(){}}};
const card={classList:{value:new Set(),toggle(c,on){on?this.value.add(c):this.value.delete(c);}},querySelector:()=>detail};
const button={getAttribute:k=>attributes[k],setAttribute:(k,v)=>{attributes[k]=v;},closest:()=>card};
C.toggle(button);
assert.equal(attributes['aria-expanded'],'true');assert.equal(attributes['aria-label'],'Hide details for Wilde lijsterbes');assert.equal(detail.hidden,false);assert.ok(card.classList.value.has('is-open'));
C.toggle(button);
assert.equal(attributes['aria-expanded'],'false');assert.equal(attributes['aria-label'],'Show details for Wilde lijsterbes');assert.equal(detail.hidden,true);

// Developer view only with ?debug=1, and it keeps the internal trace.
w.location={search:'?debug=1'};
const debugHtml=C.cardHtml(R.candidates([openClayZone],baseProject)[0]);
assert.ok(debugHtml.includes('Technical details (developer view)')&&debugHtml.includes('v03_reference')&&debugHtml.includes('demo_fill_rules'),'developer trace keeps internal data');
delete w.location;

// CSS: lime marks the open state together with a rotated chevron; large tap targets; focus; narrow screens.
const css=await read('website/candidate-card.css');
assert.match(css,/\.candidate-toggle\[aria-expanded=true\]\{background:var\(--leaf\)/);
assert.match(css,/\.candidate-toggle\[aria-expanded=true\] svg\{transform:rotate\(180deg\)\}/);
assert.match(css,/\.candidate-toggle,\.candidate-remove\{width:44px;height:44px/);
assert.match(css,/:focus-visible/);
assert.match(css,/@media \(max-width:420px\)/);
assert.ok(!/:hover[^{]*\{[^}]*display/.test(css),'nothing is revealed only on hover');

// The page loads the modules and app.js no longer renders the technical wall.
const index=await read('website/index.html'),app=await read('website/app.js');
for(const f of ['data/project-demo-v0.3.generated.js','project-policies.js','recommender-stages.js','candidate-card.js','candidate-card.css'])assert.ok(index.includes(f),'index.html loads '+f);
for(const old of ['Field origins and derivations','Safety and policy:','v0.3 demonstration · ','/100 capped'])assert.ok(!app.includes(old),'app.js still renders '+old);
assert.ok(app.includes('Show missing-information examples'),'uncertainty showcase control');

console.log(JSON.stringify({status:'passed',cardsChecked:cards}));
