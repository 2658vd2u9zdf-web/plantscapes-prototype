/* Plain-language candidate cards for the project demo. Pure HTML rendering from recommender results;
   the technical trace appears only in the developer view (?debug=1). */
(function(root){
  'use strict';
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const metres=n=>root.PlantscapesRecommender.format.metres(n);
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const COLOURS={white:'#f4f1e4',cream:'#eee6c0',yellow:'#e8c94f',orange:'#e39a4a',red:'#c8534a',pink:'#df8fab',purple:'#9b79b9',blue:'#799bc7',green:'#8fae6a',brown:'#a78368',transparent:'#d9ddd5'};
  const COLOUR_NAMES={transparent:'inconspicuous (no showy flowers)'};
  const STATUS={
    match:['ok','✓'],partial:['partial','~'],mismatch:['bad','×'],not_suitable:['bad','×'],project_rule:['bad','×'],
    unknown:['unknown','?'],needs_information:['unknown','?'],missing_mandatory:['unknown','?'],review:['unknown','?'],info:['unknown','?'],
    not_entered:['none','—'],not_applicable:['none','—']
  };
  const GROUPS=[['growing','Growing conditions'],['space','Space and care'],['project','Project fit'],['safety','Safety and rules']];
  const STATE_CLASS={strong_fit:'ok',good_fit:'ok',partial_fit:'partial',requires_review:'unknown',needs_information:'unknown',excluded_missing_information:'unknown',excluded_project_rule:'bad',not_suitable:'bad'};
  const CHEVRON='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CROSS='<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5.5 5.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const domId=(id,prefix='candidate')=>prefix+'-detail-'+String(id).replace(/[^a-z0-9-]/gi,'-');
  const debug=()=>!!root.location&&/[?&]debug(=1|&|$)/.test(root.location.search);

  function sizeWord(p){
    if(p.group==='Trees')return p.height<=12?'Small':p.height<=20?'Medium':'Large';
    if(p.group==='Shrubs')return p.height<=3?'Compact':p.height<=6?'Medium':'Large';
    return '';
  }
  function noun(p){
    const genus=String(p.latin).split(' ')[0];
    return {canopy:'tree',shrub:'shrub',herb:'perennial',climber:'climber',water_margin:'waterside plant',graminoid:genus==='Carex'?'sedge':genus==='Juncus'?'rush':'grass'}[p.functionalLayer]||'plant';
  }
  const ROLE={woody_framework:'for woody structure',matrix:'for the base layer',structural_perennial:'for height and structure',seasonal_accent:'for seasonal colour',community_patch:'for wet edges'};
  const ROLE_LABEL={woody_framework:'woody structure',matrix:'base layer',structural_perennial:'height and structure',seasonal_accent:'seasonal colour',community_patch:'wet-edge patch'};
  function roleLine(p){
    if(p.example)return 'Example: '+p.example.title.toLowerCase()+'.';
    const native=['native_original','native_archaeophyte'].includes(p.nativeStatus)?'native':p.nativeStatus==='introduced'?'non-native':'';
    const words=[sizeWord(p),native,noun(p)].filter(Boolean).join(' ');
    return words.charAt(0).toUpperCase()+words.slice(1)+' '+(ROLE[p.role]||'')+'.';
  }
  function badge(r){
    return '<span class="fit-badge fit-'+STATE_CLASS[r.state]+'"><span aria-hidden="true">'+esc(r.icon)+'</span> '+esc(r.label)+'</span>';
  }
  function toggleButton(id,name,prefix){
    return '<button type="button" class="candidate-toggle plant-control" data-expand="'+esc(id)+'" aria-expanded="false" aria-controls="'+domId(id,prefix)+'" aria-label="Show details for '+esc(name)+'">'+CHEVRON+'</button>';
  }
  function removeButton(id,name){
    return '<button type="button" class="candidate-remove plant-control" data-remove-plant="'+esc(id)+'" aria-label="Remove '+esc(name)+' from the palette" title="Remove from palette">'+CROSS+'</button>';
  }
  /* "?" source button and its panel: where each value comes from (published, derived, placeholder or missing). */
  const KIND_CLASS={sourced:'ok',derived:'ok',placeholder:'none',assumption:'none',missing:'unknown',policy:'none'};
  function sourceButton(panelId,label){
    return '<button type="button" class="source-button" data-source-toggle aria-expanded="false" aria-controls="'+panelId+'" aria-label="Where the '+esc(label.toLowerCase())+' information comes from" title="Source of this information"><span aria-hidden="true">?</span></button>';
  }
  function sourcePanel(panelId,p,c){
    let body;
    if(c.id.startsWith('policy:'))body='<p>This row applies the '+esc(c.label.toLowerCase())+' from your project choices. The rule belongs to this demonstration; it is not a legal standard.</p>';
    else{
      const info=root.PlantscapesRecommender.sources(p.id,c.id,p.siteOrigins||{});
      body=info.fields.map(f=>'<div class="source-field"><p><strong>'+esc(f.label)+'</strong> <span class="source-kind source-'+KIND_CLASS[f.kind]+'">'+esc(f.origin)+'</span></p>'+
        (f.explanation?'<p>'+esc(f.explanation)+'</p>':'')+(f.sourceValue?'<p>The source says: '+esc(f.sourceValue)+'</p>':'')+
        (f.sources.length?'<p class="source-list-head">'+(f.sourcesRelated?'Related sources consulted (they do not state this value):':'Sources:')+'</p><ul>'+f.sources.map(s=>'<li>'+(s.link?'<a href="'+esc(s.link)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a>':esc(s.title)+' (internal)')+' · '+esc(s.publisher)+(s.accessed?' · accessed '+esc(s.accessed):'')+'</li>').join('')+'</ul>':'')+'</div>').join('')+
        info.site.map(s=>'<p class="source-site">Site value ('+esc({hydrology:'water levels',waterEdge:'water edge',disturbance:'use',hardscape:'paving'}[s.field]||s.field)+'): '+esc(c.status==='not_entered'?'not entered':s.origin)+'.</p>').join('');
    }
    return '<div class="source-panel" id="'+panelId+'" hidden>'+body+'</div>';
  }
  const panelId=(prefix,id,key)=>prefix+'-src-'+String(id).replace(/[^a-z0-9-]/gi,'-')+'-'+key.replace(/[^a-z0-9-]/gi,'-');
  function criteriaGrid(p,prefix){
    const r=p.recommendation,rows=r.criteria.filter(c=>!(c.id==='climbing_support'&&c.status==='not_applicable'));
    return '<div class="criteria-grid">'+GROUPS.map(([group,title])=>{
      const items=rows.filter(c=>c.group===group);if(!items.length)return '';
      return '<section class="criteria-group" aria-label="'+esc(title)+'"><h5>'+esc(title)+'</h5><ul>'+items.map(c=>{
        const [tone,icon]=STATUS[c.status],id=panelId(prefix,p.id,c.id);
        return '<li class="criterion criterion-'+tone+'"><span class="criterion-label">'+esc(c.label)+'</span><span class="criterion-status"><span class="criterion-icon" aria-hidden="true">'+icon+'</span>'+esc(c.text)+'</span>'+(c.detail?'<span class="criterion-detail">'+esc(c.detail)+'</span>':'')+sourceButton(id,c.label)+sourcePanel(id,p,c)+'</li>';
      }).join('')+'</ul></section>';
    }).join('')+'</div>';
  }
  function toggleSource(button){
    const panel=button.parentElement.querySelector('.source-panel'),open=button.getAttribute('aria-expanded')!=='true';
    button.setAttribute('aria-expanded',String(open));panel.hidden=!open;
  }
  function bloom(p,prefix){
    if(!Number.isInteger(p.from)||!Number.isInteger(p.to))return '';
    const sourceId=panelId(prefix,p.id,'flowering'),flowering={id:'flowering',label:'Flowering',status:'match'};
    const on=m=>p.from<=p.to?m>=p.from&&m<=p.to:m>=p.from||m<=p.to,colour=COLOURS[p.colour]||'#d9ddd5',name=COLOUR_NAMES[p.colour]||p.colour;
    const period=p.from===p.to?MONTHS[p.from-1]:MONTHS[p.from-1]+' to '+MONTHS[p.to-1];
    return '<section class="candidate-bloom" aria-label="Flowering"><div class="bloom-head"><h5>Flowering</h5><span class="bloom-period">'+esc(period)+'</span>'+
      '<span class="flower-colour"><span class="flower-swatch'+(p.colour==='transparent'?' swatch-plain':'')+'" style="--flower:'+colour+'" aria-hidden="true"></span>Flower colour: '+esc(name)+'</span>'+sourceButton(sourceId,'flowering')+sourcePanel(sourceId,p,flowering)+'</div>'+
      '<div class="bloom-months" role="img" aria-label="Flowers from '+esc(period)+'">'+MONTHS.map((m,i)=>'<span class="'+(on(i+1)?'month-on':'month-off')+'"'+(on(i+1)?' style="--flower:'+colour+'"':'')+' aria-hidden="true">'+m[0]+'</span>').join('')+'</div>'+
      '<p class="bloom-note">Filled months show when it flowers, drawn in its flower colour.</p></section>';
  }
  function sizeTable(p){
    const role=[sizeWord(p),p.functionalLayer==='canopy'?'canopy tree':noun(p)].filter(Boolean).join(' ');
    const rows=[['Height',metres(p.height)],['Spread',metres(p.spread)],['Spacing',metres(p.spacing)],['Role',role.charAt(0).toUpperCase()+role.slice(1)+(ROLE_LABEL[p.role]?' · '+ROLE_LABEL[p.role]:'')],['Maintenance',(p.recommendation.criteria.find(c=>c.id==='maintenance')?.detail||'').replace(' care','').replace(/^./,c=>c.toUpperCase())||'Not known']];
    return '<section class="candidate-size" aria-label="Size and role"><h5>Size and role</h5><dl>'+rows.map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+esc(v==='unknown'?'Not known':v)+'</dd></div>').join('')+'</dl><p class="bloom-note">Quantities in plans are prototype estimates.</p></section>';
  }
  function trace(p){
    if(!debug())return '';
    const r=p.recommendation,e=p.evaluation;
    const data={state:r.state,site_score:r.site.score,site_level:r.site.level,footprint_state:r.site.footprint_state,active_policies:r.project.policies.map(x=>x.id),priority:r.project.priority_fields.map((f,i)=>f+'='+r.project.priority[i]),
      design_score:r.design.score,gates:r.gates,data_status:r.data,demo_fill_rules:p.demoFillRules,
      v03_reference:e&&{eligibility_state:e.eligibility_state,raw:e.raw_suitability_score,final:e.final_suitability_score,evidence_confidence:e.evidence_confidence_score,non_passed_gates:e.hard_gate_results.filter(g=>g.state!=='passed').map(g=>g.gate_id+': '+g.state)}};
    return '<details class="candidate-trace"><summary>Technical details (developer view)</summary><pre>'+esc(JSON.stringify(data,null,1))+'</pre></details>';
  }
  /* Missing-information examples: offer "Add anyway" when only information is missing; say why not otherwise. */
  function overrideControl(p,selected){
    const o=p.recommendation.override;
    if(selected)return '<span class="override-added"><span aria-hidden="true">✓</span> In your selection</span>';
    if(!o.allowed)return '';
    return '<button type="button" class="candidate-override" data-override-plant="'+esc(p.id)+'" aria-label="Add '+esc(p.name)+' to your selection anyway, although information is missing">Add anyway</button>';
  }
  function overrideNote(p,selected){
    const o=p.recommendation.override;
    if(o.active)return '<p class="candidate-override-note"><strong>Added by you:</strong> '+esc(o.note.replace(/^Added by you /,'').replace(/^./,c=>c.toUpperCase()))+'</p>';
    if(!p.example||selected)return '';
    return '<p class="candidate-override-note">'+esc(o.allowed?'Only information is missing, so you can add it to your selection anyway. It will be marked as added by you.':'It cannot be added anyway: the problem is not missing information.')+'</p>';
  }
  function cardHtml(p,{removable=true,selected=false}={}){
    const r=p.recommendation,id=p.id,prefix=removable?'candidate':'example';
    const summaryLabel={fits:'Why it fits:',attention:'Why it needs attention:',not_suitable:'Why it is not suitable:',excluded:'Why it is excluded:'}[r.summary.kind];
    const summaryText=r.summary.text.replace(/^Why [^:]+:\s*/,'');
    return '<article class="plant-row candidate-card candidate-'+STATE_CLASS[r.state]+(p.example?' candidate-example':'')+'" data-candidate="'+esc(id)+'" data-state="'+esc(r.state)+'">'+
      '<div class="candidate-row"><span class="candidate-avatar" aria-hidden="true">'+esc(String(p.name).charAt(0).toUpperCase())+'</span>'+
      '<div class="candidate-name"><h4>'+esc(p.name)+'</h4><em lang="la">'+esc(p.latin)+'</em><p class="candidate-role">'+esc(roleLine(p))+'</p>'+badge(r)+(r.override.active?' <span class="override-tag">Added by you</span>':'')+'</div>'+
      '<div class="candidate-actions">'+(p.example&&!removable?overrideControl(p,selected):'')+toggleButton(id,p.name,prefix)+(removable?removeButton(id,p.name):'')+'</div></div>'+
      '<div class="plant-detail candidate-detail" id="'+domId(id,prefix)+'" hidden>'+
      (p.example?'<p class="candidate-example-note"><strong>About this example:</strong> '+esc(p.example.explanation)+'</p>':'')+overrideNote(p,selected)+
      '<p class="candidate-summary"><strong>'+esc(summaryLabel)+'</strong> '+esc(summaryText.charAt(0).toUpperCase()+summaryText.slice(1))+'</p>'+
      (r.constraint?'<p class="candidate-constraint constraint-'+esc(r.constraint.kind)+'"><strong>'+esc(r.constraint.label)+':</strong> '+esc(r.constraint.text)+'</p>':'')+
      criteriaGrid(p,prefix)+bloom(p,prefix)+sizeTable(p)+trace(p)+'</div></article>';
  }
  function hiddenHtml(hidden){
    if(!hidden.length)return '';
    const counts={};hidden.forEach(h=>counts[h.label]=(counts[h.label]||0)+1);
    return '<details class="not-shown"><summary>'+hidden.length+' plant'+(hidden.length===1?'':'s')+' not shown <span>'+esc(Object.entries(counts).map(([k,v])=>v+' '+k.toLowerCase()).join(' · '))+'</span></summary><ul>'+
      hidden.map(h=>'<li><strong>'+esc(h.name)+'</strong> <em lang="la">'+esc(h.latin)+'</em> <span class="fit-badge fit-'+STATE_CLASS[h.state]+'"><span aria-hidden="true">'+esc(h.recommendation.icon)+'</span> '+esc(h.label)+'</span><span class="not-shown-reason">'+esc(h.reason)+'</span></li>').join('')+'</ul></details>';
  }
  function toggle(button){
    const card=button.closest('.plant-row'),detail=card&&card.querySelector('.plant-detail');if(!detail)return;
    const open=button.getAttribute('aria-expanded')!=='true',name=(button.getAttribute('aria-label')||'').replace(/^(Show|Hide) details for /,'');
    button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',(open?'Hide':'Show')+' details for '+name);
    detail.hidden=!open;detail.classList.remove('hidden');card.classList.toggle('is-open',open);
  }
  root.PlantscapesCandidateCard={cardHtml,hiddenHtml,toggle,toggleSource,toggleButton,removeButton,roleLine,colours:COLOURS};
})(typeof window!=='undefined'?window:globalThis);
