/* Project-demo project policies as data. recommender-stages.js interprets them; no policy logic lives here.
   Each rule maps a plant value to an outcome. Outcomes, from mild to severe:
   not_applicable, match, info, partial, review, needs_information, missing_mandatory, project_rule, not_suitable.
   'info' shows a question mark but never changes the plant's state. Values in the unknown set read as 'unknown'. */
(function(root){
  'use strict';
  const unknownNative={outcome:'needs_information',text:'Information needed',message:'Native status is needed before this plant can be used here.'};
  const provenancePreference={field:'provenance_status',criterion:'provenance',values:{
    regional_stock:{outcome:'match',text:'Regional stock'},reviewed_for_project:{outcome:'match',text:'Reviewed stock'},
    nursery_stock:{outcome:'partial',text:'General nursery stock',message:'This project prefers regional-origin planting stock.'},
    unknown:{outcome:'review',text:'Information needed',message:'The origin of the planting stock is not given.'}}};
  const occurrencePreference={field:'regional_occurrence_nl',criterion:'regional_occurrence',values:{
    widespread:{outcome:'match',text:'Occurs widely'},planted_only:{outcome:'partial',text:'Only where planted',message:'This plant does not occur naturally in the Netherlands.'},
    unknown:{outcome:'review',text:'Information needed',message:'Where this plant occurs in the Netherlands is not known.'}}};
  root.PLANTSCAPES_PROJECT_POLICIES={
    version:'project-demo-policies-1.0.0',
    unknown_values:['unknown','not_reviewed','not_assessed','conflicting'],
    /* Matches planting-engine transition_max_height_m, so palette and community placement agree. */
    open_view_height_m:1.3,
    criteria:{
      native_status:{label:'Native status',group:'project'},
      provenance:{label:'Provenance',group:'project'},
      regional_occurrence:{label:'Regional occurrence',group:'project'},
      height_limit:{label:'Height for open views',group:'project'},
      invasive_legal:{label:'Invasive / legal status',group:'safety'},
      public_contact:{label:'Public contact',group:'safety'},
      toxicity:{label:'Toxicity',group:'safety'},
      thorns:{label:'Thorns',group:'safety'},
      edible_use:{label:'Edible use',group:'safety'},
      maintenance:{label:'Maintenance',group:'space'},
      vigour:{label:'Spread',group:'space'},
      climbing_support:{label:'Climbing support',group:'space'}
    },
    /* Ranking inside the same fit level and site score: lower tier first. */
    priority_tiers:{
      native_status_nl:{native_original:0,native_archaeophyte:0,unknown:1,introduced:2},
      provenance_status:{regional_stock:0,reviewed_for_project:0,nursery_stock:1,unknown:2},
      regional_occurrence_nl:{widespread:0,planted_only:1,unknown:2}
    },
    policies:[
      {id:'baseline',label:'Every project',always:true,showRow:false,priority:['native_status_nl'],rules:[
        {field:'invasive_status',criterion:'invasive_legal',values:{
          listed_nl:{outcome:'not_suitable',text:'Listed as invasive',message:'This plant is on the Dutch invasive species list.'},
          listed_eu:{outcome:'not_suitable',text:'Listed as invasive',message:'This plant is on the EU invasive species list.'},
          invasive_elsewhere:{outcome:'not_suitable',text:'Invasive elsewhere',message:'This plant is invasive elsewhere and is not used.'},
          not_listed:{outcome:'match',text:'Not listed'},
          unknown:{outcome:'missing_mandatory',text:'Information needed',message:'Invasive and legal status must be known before any project can use this plant.'}}},
        {field:'protected_or_legal_status',criterion:'invasive_legal',values:{
          legally_prohibited:{outcome:'not_suitable',text:'Legally prohibited',message:'This plant may not legally be planted.'},
          protected:{outcome:'review',text:'Protected',message:'This plant is protected; planting needs permission.'},
          not_protected_snapshot:{outcome:'match',text:'Not listed'},
          unknown:{outcome:'missing_mandatory',text:'Information needed',message:'Invasive and legal status must be known before any project can use this plant.'}}},
        {field:'native_status_nl',criterion:'native_status',values:{
          native_original:{outcome:'match',text:'Native'},native_archaeophyte:{outcome:'match',text:'Native (long established)'},
          introduced:{outcome:'partial',text:'Not native',message:'Not native to the Netherlands. It is allowed here, but native plants rank first.'},
          unknown:{outcome:'review',text:'Information needed',message:'Native status is unknown, so this plant needs review before use.'}}},
        {field:'provenance_status',criterion:'provenance',values:{
          regional_stock:{outcome:'match',text:'Regional stock'},nursery_stock:{outcome:'match',text:'Nursery stock'},reviewed_for_project:{outcome:'match',text:'Reviewed stock'},
          unknown:{outcome:'review',text:'Information needed',message:'The origin of the planting stock is not given.'}}},
        {field:'regional_occurrence_nl',criterion:'regional_occurrence',values:{
          widespread:{outcome:'match',text:'Occurs widely'},planted_only:{outcome:'not_applicable',text:'Only where planted'},
          unknown:{outcome:'info',text:'Information needed',message:'Where this plant occurs in the Netherlands is not known. This project type does not depend on it.'}}},
        {field:'public_contact_status',criterion:'public_contact',values:{
          '*':{outcome:'not_applicable',text:'Not needed',detail:'no public access'},
          unknown:{outcome:'info',text:'Information needed',message:'Public-contact suitability has not been provided. It matters only when the public has access.'}}},
        {field:'toxicity_status',criterion:'toxicity',values:{
          '*':{outcome:'not_applicable',text:'Not needed',detail:'no public access'},
          unknown:{outcome:'info',text:'Information needed',message:'Toxicity has not been provided. It matters for public and harvesting projects.'}}},
        {field:'thorns_or_spines',criterion:'thorns',values:{
          '*':{outcome:'not_applicable',text:'Not needed',detail:'no public access'},
          unknown:{outcome:'info',text:'Information needed',message:'Whether it has thorns has not been provided. It matters beside public paths.'}}},
        {field:'climbing_support_required',criterion:'climbing_support',when:{project:{support:[false]}},values:{
          true:{outcome:'not_suitable',text:'Support missing',message:'This climber needs a climbing support, but none is planned.'},false:{outcome:'not_applicable',text:'Not needed'}}},
        {field:'climbing_support_required',criterion:'climbing_support',when:{project:{support:[true]}},values:{
          true:{outcome:'match',text:'Support planned'},false:{outcome:'not_applicable',text:'Not needed'}}}
      ]},
      {id:'public_access',label:'Public access',activatedBy:{publicAccess:[true]},showRow:false,rules:[
        {field:'public_contact_status',criterion:'public_contact',values:{
          suitable:{outcome:'match',text:'Suitable'},reviewed_for_project:{outcome:'match',text:'Suitable'},
          suitable_with_conditions:{outcome:'partial',text:'Suitable with care',message:'Suitable for public access with care: keep it back from paths and play areas.'},
          unsuitable:{outcome:'project_rule',text:'Not for public contact',message:'This plant is not suitable where the public can touch it.'},
          unknown:{outcome:'review',text:'Information needed',message:'Public-contact suitability has not been provided.'}}},
        {field:'toxicity_status',criterion:'toxicity',values:{
          no_known_hazard:{outcome:'match',text:'No known hazard'},no_hazard_reviewed_for_use:{outcome:'match',text:'No known hazard'},
          weakly_toxic_reported:{outcome:'match',text:'Acceptable',detail:'mildly toxic if eaten'},
          toxic_reported:{outcome:'partial',text:'Toxic if eaten',message:'Toxic if eaten. Keep it away from play and picnic areas.'},
          harmful_to_dogs_reported:{outcome:'partial',text:'Harmful to dogs',message:'Harmful to dogs. Keep it away from dog walking routes.'},
          strongly_toxic_reported:{outcome:'partial',text:'Strongly toxic if eaten',message:'Strongly toxic if eaten. Keep it away from play areas.'},
          unknown:{outcome:'review',text:'Information needed',message:'Toxicity has not been provided.'}}},
        {field:'thorns_or_spines',criterion:'thorns',values:{
          absent_reported:{outcome:'match',text:'No thorns'},
          thorns_present:{outcome:'partial',text:'Has thorns',message:'Has thorns. Keep it back from paths.'},
          prickles_present:{outcome:'partial',text:'Has prickles',message:'Has prickles. Keep it back from paths.'},
          unknown:{outcome:'review',text:'Information needed',message:'Whether it has thorns has not been provided.'}}},
        {field:'thorns_or_spines',criterion:'thorns',when:{zone:{path_edge:['yes']}},values:{
          thorns_present:{outcome:'project_rule',text:'Thorns beside a path',message:'Has thorns, and this area lies along a public path.'},
          prickles_present:{outcome:'project_rule',text:'Prickles beside a path',message:'Has prickles, and this area lies along a public path.'},
          '*':{outcome:'match',text:'No thorns'},unknown:{outcome:'review',text:'Information needed',message:'Whether it has thorns has not been provided, and this area lies along a public path.'}}}
      ]},
      {id:'children',label:'Children and schools',activatedBy:{audience:['students']},showRow:true,rules:[
        {field:'public_contact_status',criterion:'public_contact',values:{
          suitable:{outcome:'match',text:'Suitable'},reviewed_for_project:{outcome:'match',text:'Suitable'},
          suitable_with_conditions:{outcome:'project_rule',text:'Not for children',message:'Not suitable where children play.'},
          unsuitable:{outcome:'project_rule',text:'Not for children',message:'Not suitable where children play.'},
          unknown:{outcome:'missing_mandatory',text:'Information needed',message:'Public-contact suitability must be known for a children’s site.'}}},
        {field:'toxicity_status',criterion:'toxicity',values:{
          toxic_reported:{outcome:'project_rule',text:'Toxic',message:'Toxic if eaten, so it is kept out of a children’s site.'},
          strongly_toxic_reported:{outcome:'project_rule',text:'Strongly toxic',message:'Strongly toxic if eaten, so it is kept out of a children’s site.'},
          weakly_toxic_reported:{outcome:'partial',text:'Mildly toxic if eaten',message:'Mildly toxic if eaten. Avoid play areas.'},
          '*':{outcome:'match',text:'No known hazard'},
          unknown:{outcome:'missing_mandatory',text:'Information needed',message:'Toxicity must be known for a children’s site.'}}},
        {field:'thorns_or_spines',criterion:'thorns',values:{
          thorns_present:{outcome:'project_rule',text:'Has thorns',message:'Has thorns, so it is kept out of a children’s site.'},
          prickles_present:{outcome:'project_rule',text:'Has prickles',message:'Has prickles, so it is kept out of a children’s site.'},
          '*':{outcome:'match',text:'No thorns'},
          unknown:{outcome:'missing_mandatory',text:'Information needed',message:'Thorns must be known for a children’s site.'}}}
      ]},
      {id:'rewilding',label:'Rewilding policy',activatedBy:{rewilding:[true]},showRow:true,priority:['native_status_nl','provenance_status','regional_occurrence_nl'],rules:[
        {field:'native_status_nl',criterion:'native_status',values:{
          native_original:{outcome:'match',text:'Meets rewilding policy'},native_archaeophyte:{outcome:'match',text:'Meets rewilding policy'},
          introduced:{outcome:'project_rule',text:'Not native',message:'Rewilding allows native plants only, and this plant is not native.'},
          unknown:{...unknownNative,message:'Native status is needed before this plant can be used for rewilding.'}}},
        provenancePreference,occurrencePreference
      ]},
      {id:'restoration',label:'Restoration policy',activatedBy:{type:['restoration'],restorationOrnamentals:[false]},showRow:true,priority:['native_status_nl','provenance_status','regional_occurrence_nl'],rules:[
        {field:'native_status_nl',criterion:'native_status',values:{
          native_original:{outcome:'match',text:'Meets restoration policy'},native_archaeophyte:{outcome:'match',text:'Meets restoration policy'},
          introduced:{outcome:'project_rule',text:'Ornamental not allowed',message:'Restoration projects exclude non-native ornamental plants.'},
          unknown:{...unknownNative,message:'Native status is needed before this plant can be used for restoration.'}}},
        provenancePreference,occurrencePreference
      ]},
      {id:'restoration_exception',label:'Restoration with ornamental exception',activatedBy:{type:['restoration'],restorationOrnamentals:[true]},showRow:true,priority:['native_status_nl','provenance_status','regional_occurrence_nl'],rules:[
        {field:'native_status_nl',criterion:'native_status',values:{
          native_original:{outcome:'match',text:'Meets restoration policy'},native_archaeophyte:{outcome:'match',text:'Meets restoration policy'},
          introduced:{outcome:'partial',text:'Allowed by exception',message:'Not native. Allowed only because the restoration ornamental exception is switched on.'},
          unknown:{...unknownNative,message:'Native status is needed before this plant can be used for restoration.'}}},
        provenancePreference,occurrencePreference
      ]},
      {id:'low_maintenance',label:'Low-maintenance policy',activatedBy:{maintenance:['low']},showRow:true,rules:[
        {field:'maintenance_demand',criterion:'maintenance',values:{
          high:{outcome:'project_rule',text:'Needs more care than planned',message:'Needs more maintenance than a low-maintenance project provides.'},'*':{outcome:'match',text:'Suitable'}}},
        {field:'vigour_or_spread_risk',criterion:'vigour',when:{project:{vigourControl:['no','unknown']}},values:{
          high:{outcome:'project_rule',text:'Spreads strongly',message:'Spreads strongly, and the low-maintenance plan has no active spread control.'},'*':{outcome:'match',text:'Suitable'}}},
        {field:'vigour_or_spread_risk',criterion:'vigour',when:{project:{vigourControl:['yes']}},values:{
          high:{outcome:'partial',text:'Needs spread control',message:'Spreads strongly. Allowed only with the planned active spread control.'},'*':{outcome:'match',text:'Suitable'}}}
      ]},
      {id:'open_views',label:'Open-views policy',activatedBy:{any:[{sightlines:[true]},{character:['open']}]},showRow:true,rules:[
        {kind:'max_height',field:'mature_height_m',criterion:'height_limit',
          above:{outcome:'project_rule',text:'Too tall for open views',message:'Grows to {height}; open views keep planting at or below {limit}.'},
          within:{outcome:'match',text:'Low enough'}}
      ]},
      {id:'public_harvest',label:'Public-harvesting policy',activatedBy:{publicHarvest:[true]},showRow:true,rules:[
        {field:'toxicity_status',criterion:'toxicity',values:{
          toxic_reported:{outcome:'project_rule',text:'Toxic',message:'Toxic if eaten, so it is kept out of a public harvesting project.'},
          strongly_toxic_reported:{outcome:'project_rule',text:'Strongly toxic',message:'Strongly toxic if eaten, so it is kept out of a public harvesting project.'},
          weakly_toxic_reported:{outcome:'partial',text:'Mildly toxic if eaten',message:'Mildly toxic if eaten. Do not harvest it.'},
          '*':{outcome:'match',text:'No known hazard'},
          unknown:{outcome:'missing_mandatory',text:'Information needed',message:'Toxicity must be known for a public harvesting project.'}}},
        {field:'edible_use_status',criterion:'edible_use',values:{
          edible_parts_reported:{outcome:'match',text:'Edible parts reported',detail:'identify before eating'},
          reviewed_for_requested_use:{outcome:'match',text:'Edible use reviewed'},
          not_a_food_plant:{outcome:'not_applicable',text:'Not a food plant'},
          prohibited:{outcome:'project_rule',text:'Not to be eaten',message:'This plant must not be eaten.'},
          unknown:{outcome:'review',text:'Information needed',message:'Edible use has not been provided.'}}}
      ]}
    ]
  };
})(typeof window!=='undefined'?window:globalThis);
