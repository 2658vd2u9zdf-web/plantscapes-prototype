"""Distil scoped facts from opened sources. No full web pages enter the repository.
Requires beautifulsoup4. Output is the inspectable, offline input to build_demo_dataset.py.
All botanical interpretations remain provisional pending independent expert review.
"""
import csv, hashlib, json, re
from bs4 import BeautifulSoup
from collect_sources import CACHE, OUT, plain
from model import DATE, ROOT

def jsave(path,value): path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def between(text,left,right):
    return text.split(left,1)[1].split(right,1)[0].strip() if left in text else ''

def attrs(page):
    soup=BeautifulSoup(page,'html.parser'); result={}
    for dt in soup.select('dt'):
        key=dt.get_text(' ',strip=True);values=[]
        for sibling in dt.find_next_siblings():
            if sibling.name=='dt':break
            if sibling.name=='dd':values.append(sibling.get_text(' ',strip=True))
        result[key]=values
    return result

def main():
    rows=json.loads((CACHE/'retrieved.json').read_text(encoding='utf-8'))
    supplemental=json.loads((CACHE/'supplement.json').read_text(encoding='utf-8'))
    supplements={r['source_id']:r for r in supplemental}
    national=list(csv.DictReader((ROOT/'dataset/derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv').open(encoding='utf-8-sig',newline='')))
    sources=[]; plants=[]
    def source(sid,title,publisher,kind,url,rights='unknown',notes='',version='live page, snapshot 2026-10-13',geography='international', rights_status='internal_reference_only',rights_url=None):
        entry={'source_id':sid,'title':title,'creator_or_publisher':publisher,'source_type':kind,'publication_or_release_date':'unknown','edition_or_version':version,'url_or_identifier':url,'licence_or_rights':rights,'permitted_use':'Rights unresolved: limited internal research facts and citations only; redistribution permission not established.','attribution_text':publisher+'; '+title,'access_date':DATE,'review_notes':notes,'geographic_scope':geography,'rights_status':rights_status,'rights_evidence_url':rights_url or '', 'content_sha256':''}
        if rights_status=='open':entry['permitted_use']='Reuse subject to the recorded licence and attribution; no source images copied.'
        sources.append(entry);return sid
    catalogue_id=source('national-catalogue-v0_2','Plantscapes national taxonomy backbone v0.2','Plantscapes / NDFF / GBIF','local_taxonomy_snapshot','dataset/derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv',notes='Existing 2,443 records, read in full; identity and identifiers only. Do not infer traits.',version='0.2.0; generated 2026-09-10',geography='NL')
    union_id=source('nvwa-union-list','Unielijst invasieve exoten','NVWA','official_policy_list',supplements['nvwa-union-list']['url'],'CC0 except expressly excluded materials','Checked terrestrial and aquatic plant tables, including the 7 August 2025 additions. Name-screen result is not a general invasive or protected-status determination.',geography='EU; NL competent authority',rights_status='open',rights_url='https://www.nvwa.nl/copyright')
    source('nvwa-rights','Copyright','NVWA','rights_notice','https://www.nvwa.nl/copyright','CC0 text; media excluded',rights_status='open')
    source('gbif-backbone-metadata','GBIF Backbone Taxonomy dataset metadata','GBIF Secretariat','dataset_metadata','https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c','CC BY 4.0',version='Metadata accessed 2026-10-13',rights_status='open',rights_url='https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c')
    union_text=plain((CACHE/'nvwa-union-list.html').read_text(encoding='utf-8'))
    union_plants=between(union_text,'Terrestrische planten','Zoogdieren')
    assert 'Fallopia' in union_plants and 'Crassula helmsii' in union_plants, 'Cannot confirm complete plant tables.'
    for raw in rows:
        fixture={k:raw[k] for k in ['fixture_id','fixture_track','fixture_scientific_name','fixture_vernacular_nl','fixture_group']}
        name=fixture['fixture_scientific_name']; fid=fixture['fixture_id'];obs=[];attempts=[]
        plant={'fixture':fixture,'observations':obs,'searches':attempts,'taxonomic_notes':[]}
        def add(field,value,sid,origin,locator,scope,context,rank=30):
            if value is not None and value!=[] and value!='':obs.append({'field':field,'value':value,'source_id':sid,'origin':origin,'locator':locator,'geographic_scope':scope,'qualifier':context,'resolution_priority':rank})
        def attempt(url,result,areas,notes=''): attempts.append({'url':url,'result':result,'areas':areas,'accessed_on':DATE,'notes':notes})
        candidates=raw['catalogue_candidates']
        gbif=raw.get('gbif_record')
        if name=='Salix alba':
            gbif=supplements['gbif-salix-alba']['data']
            plant['taxonomic_notes'].append('Strict GBIF match returned multiple equal matches. Existing catalogue key 5372513 was opened directly and confirmed as accepted Salix alba L.; no fuzzy match accepted.')
        assert gbif and gbif['taxonomicStatus']=='ACCEPTED',name
        assert gbif['canonicalName'].replace('×','').replace('  ',' ')==name.replace('×','').replace('  ',' '),name
        accepted=name if name=='Nepeta × faassenii' else gbif['canonicalName']
        plant['plant_id']=candidates[0]['plant_id'] if len(candidates)==1 else 'demo-taxon:gbif:'+str(gbif['key'])
        plant['taxon_match_type']='exact' if len(candidates)==1 else 'unmatched'
        if name=='Nepeta × faassenii':
            plant['taxon_match_type']='cultivar or hybrid match'
            plant['taxonomic_notes'].append('Hybrid retained with multiplication sign, corroborated by RHS species-level hybrid record. GBIF canonicalName omits the sign and scientificName contains a mojibake sign; it is not interpreted as a non-hybrid species. No named cultivar is specified.')
        plant['identity_status']='resolved_catalogue' if len(candidates)==1 else 'resolved_external'
        narrower=[r for r in national if r['scientific_name'].startswith(name+' ')] if not candidates else []
        plant['catalogue_candidate_ids']=[r['plant_id'] for r in candidates+narrower]
        if narrower:plant['taxonomic_notes'].append('Catalogue has narrower taxonomic ranks: '+', '.join(r['scientific_name'] for r in narrower)+'. Species fixture retained; no variety/subspecies identity or traits transferred.')
        gbif_url='https://api.gbif.org/v1/species/'+str(gbif['key'])
        sid=source('gbif-'+str(gbif['key']),gbif['scientificName'],'GBIF Secretariat','official_taxonomy_record',gbif_url,'CC BY 4.0',notes='GBIF accepted taxon; name-match endpoint '+raw['gbif_match_url']+'. Synonym list is bounded to the first 5 entries, never claimed exhaustive.',version='GBIF Backbone; lastInterpreted '+gbif.get('lastInterpreted','unknown'),rights_status='open',rights_url='https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c')
        attempt(raw['gbif_match_url'],'opened','identity','matchType '+raw['gbif_match'].get('matchType','unknown'))
        attempt(gbif_url,'opened','identity')
        for field,value in {'accepted_scientific_name':accepted,'canonical_name':gbif['canonicalName'],'family':gbif['family'],'scientific_name_authorship':gbif.get('authorship'),'gbif_species_key':str(gbif['key']),'taxonomic_authority':'GBIF Backbone Taxonomy (authority-specific accepted usage)'}.items():
            add(field,value,sid,'sourced_official_database',gbif_url+'#'+field,'global','Accepted record, exact species/hybrid scope; not ecological evidence.',1)
        synonyms=[r['scientificName'] for r in raw.get('gbif_synonyms',{}).get('results',[])]
        if synonyms:
            add('synonyms',synonyms,sid,'sourced_official_database',raw['gbif_synonyms_url'],'global','First five synonym records only; not an exhaustive nomenclatural list.',1)
        if len(candidates)==1:
            c=candidates[0]
            for field in ['vernacular_nl','verspreidingsatlas_taxon_number','family','scientific_name_authorship']:
                add(field,c[field] or None,catalogue_id,'sourced_official_database',catalogue_id+'#plant_id='+c['plant_id'],'NL','Original catalogue identity fields; accepted current GBIF family takes priority over legacy family if different.',5)
            if name in ['Caltha palustris','Salix cinerea','Festuca rubra','Rosa canina','Centaurea jacea','Valeriana officinalis']:
                plant['taxonomic_notes'].append('National record has broad/aggregate or variable species scope; planting stock and infraspecific identity need checking. Fixture common name is retained separately.')
        va_file=CACHE/(fid+'-va.html')
        va_url=raw.get('va_url')
        if name=='Myosotis scorpioides':va_file=CACHE/'va-myosotis-species.html';va_url='https://www.verspreidingsatlas.nl/0844'
        if va_file.exists():
            text=plain(va_file.read_text(encoding='utf-8'))
            assert name in text,name
            number=va_url.rsplit('/',1)[1]
            vsid=source('va-'+number,name+' — NDFF Verspreidingsatlas','NDFF / FLORON; section-specific contributors','official_flora_record',va_url,'Mixed rights: Wilde-planten/Klaas Dijkstra ecology CC BY-NC-SA 3.0 NL; some René van Moorsel contributions CC BY-SA 3.0; taxonomy, BBR, Red List and hazard compilation reuse rights unresolved.','Record contains Standaardlijst 2020 native status and, where available, Rode Lijst 2012. Hazard section attributes Heukels 24th ed. 2020 with FLORON additions. No map, trend graph or image copied.',geography='NL',rights_status='restricted')
            attempt(va_url,'opened','identity|nl_status|occurrence|environment|dimensions|safety|seasonal','Sections inspected; source occurrence graphics not digitised.')
            add('verspreidingsatlas_taxon_number',number,vsid,'sourced_official_database',va_url+'#taxonomie','NL','Direct taxon page identifier; not a provincial occurrence claim.',2)
            if name=='Myosotis scorpioides':add('vernacular_nl','Moeras- / Weidevergeet-mij-nietje',vsid,'sourced_official_database',va_url+'#taxonomie','NL','Species aggregate Dutch name; do not narrow to subsp. scorpioides.',2)
            status=between(text,'Voorkomen in Nederland','Ecologie')
            if 'oorspronkelijk inheems' in status:add('native_status_nl','native_original',vsid,'sourced_official_database',va_url+'#Indigeniteit','NL','Standaardlijst 2020 as displayed; not proof of local autochthonous stock.',1)
            if 'Niet bedreigd' in status:red='not_threatened_2012'
            elif 'Rode Lijst: Kwetsbaar' in status:red='vulnerable_2012'
            elif 'Rode Lijst: Gevoelig' in status:red='sensitive_2012'
            else:red=None
            add('red_list_status_nl',red,vsid,'sourced_official_database',va_url+'#Status','NL','Rode Lijst Vaatplanten 2012, historical assessment; not current protection law.',1)
            env=between(text,'Bodem','Groeiplaats')
            if env:
                low=env.lower();textures=[]
                # Do not admit excluded or explicitly extra-NL conditions into the preferred NL envelope.
                low=low.replace('(in midden-europa ook op droge)','')
                tolerance_text=re.split(r',?\s*(?:maar niet|behalve|minder op|weinig op|zelden op)\b',low)[0]
                if 'dus niet al te voedselarme' in low:tolerance_text=re.sub(r'\([^)]*\)','',low)
                for pattern,value in [('zand','sand'),('leem|lemig','loam'),('klei','clay'),('veen|venig','peat'),('löss','loess'),('mergel|kalkgrond','calcareous_substrate'),('stenig|rots','rocky'),('zavel','sandy_loam')]:
                    if re.search(pattern,tolerance_text):textures.append(value)
                if re.search(r'(?:alle|meeste) grondsoorten',tolerance_text):textures=['unspecified_multiple']
                add('soil_textures',textures,vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Direct substrate description, coarse vocabulary; exclusion phrases are not added as tolerated textures.',1)
                lights=[]
                if 'zonnig' in low:lights.append('full_sun')
                if re.search(r'(?:licht|half|matig).*?beschaduwd|halfbeschaduwd',low):lights.append('partial_shade')
                if 'beschaduwde' in low and not re.search(r'(?:licht|half|matig).*?beschaduwde|halfbeschaduwde',low):lights.append('shade')
                if 'full_sun' in lights and 'shade' in lights and 'tot' in low:lights=['full_sun','partial_shade','shade']
                add('light_regimes',lights,vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Explicit light range. Rare/sometimes conditions included provisionally; not an irradiance threshold.',1)
                moisture=[]
                if 'zeer droge' in low:moisture.append('very_dry')
                if re.search(r'droog|droge|droger',tolerance_text) and not re.search(r'droogvallend',tolerance_text):moisture.append('dry')
                if 'vochtig' in low:moisture.append('moist')
                if re.search(r'natte|nat blijv|vrij nat|nat water',low):moisture.append('wet')
                if 'ondiep' in low and 'water' in low:moisture.append('shallow_water')
                if 'dry' in moisture and 'wet' in moisture and 'tot' in tolerance_text and 'moist' not in moisture:moisture.insert(moisture.index('wet'),'moist')
                add('moisture_regimes',moisture,vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Explicit qualitative moisture envelope; intermediate moist class included in stated dry-to-wet gradients. Shallow water has no inferred depth.',1)
                nutrient=[value for pattern,value in [('(?<!matig )(?<!vrij )voedselarm','low'),('matig voedselarm|vrij voedselarm','moderately_low'),('matig voedselrijk|matig tot (?:zeer )?voedselrijk','moderate'),('(?<!matig )(?<!zeer )voedselrijk|voedselijke','high'),('zeer voedselrijk|zeer voedselijke','very_high')] if re.search(pattern,tolerance_text)]
                order=['low','moderately_low','moderate','high','very_high'];nutrient=sorted(set(nutrient),key=order.index)
                if nutrient:
                    add('nutrient_tolerance_min',nutrient[0],vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Ordered source descriptors, not soil nutrient concentrations or Ellenberg scores.',1)
                    add('nutrient_tolerance_max',nutrient[-1],vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Ordered source descriptors, not soil nutrient concentrations or Ellenberg scores.',1)
                ph=[]
                if re.search(r'(?<!zwak )(?<!vrij )zure|zuur',low):ph.append('acid')
                if re.search(r'zwak zur|zwak zuur',low):ph.append('slightly_acid')
                if 'neutraal' in low:ph.append('neutral')
                if 'basisch' in low:ph.append('alkaline')
                if re.search(r'kalkhoudend|kalkrijk',low):ph.append('calcareous')
                add('soil_ph_classes',ph,vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Qualitative chemistry descriptors only. No numerical pH limits inferred.',1)
                if re.search(r'goed doorlatend|goed doorlucht',low):add('drainage_tolerance',['well_drained'],vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Explicit soil aeration/drainage statement.',1)
                if 'zwak brak' in low:salinity='weak_brackish_reported'
                elif 'brak' in low:salinity='brackish_reported'
                else:salinity=None
                add('salinity_tolerance',salinity,vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','No salt concentration, irrigation threshold or road-salt equivalence established.',1)
                if 'matig' in low and 'betreding' in low:add('compaction_tolerance','moderate_trampling_reported',vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Moderate trampling tolerance only; no bulk-density threshold.',1)
                if 'droogvallende' in low and 'nat blijvende' in low:add('seasonal_drawdown_tolerance','tolerates_if_substrate_stays_wet',vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','Exposure of bed allowed only while substrate remains wet.',1)
                if 'langdurige overstromingen' in low:add('inundation_duration','prolonged_qualitative',vsid,'sourced_secondary',va_url+'#Ecologie-Bodem','NL','No day count or depth specified.',1)
            ec=between(text,'Biotoopvoorkeur:','Literatuur')
            life=re.search(r'Levensduur: (.*?) Levensvorm',ec)
            if life:
                value={'overblijvend':'perennial','tweejarig':'biennial','eenjarig':'annual','langlevend':'long_lived'}.get(life[1])
                add('lifecycle',[value] if value else None,vsid,'sourced_official_database',va_url+'#Ecologie-Botanisch-Basisregister','NL','Botanisch Basisregister with additions; life stage and variable longevity need review.',1)
            form=re.search(r'Levensvorm: (.*?)(?: Zaadbank| Bloeitijd)',ec)
            if form:
                value={'hemicryptofyt':'hemicryptophyte','geofyt':'geophyte','phanerofyt':'phanerophyte','helofyt':'helophyte','hydrofyt':'hydrophyte','houtige chamaefyt':'woody_chamaephyte'}.get(form[1])
                add('growth_form',[value] if value else None,vsid,'sourced_official_database',va_url+'#Ecologie-Botanisch-Basisregister','NL','Life-form classification as stated; never used alone to infer environmental or safety traits.',2)
            months={'januari':1,'februari':2,'maart':3,'april':4,'mei':5,'juni':6,'juli':7,'augustus':8,'september':9,'oktober':10,'november':11,'december':12}
            bloom=ec.split('Bloeitijd:',1)[-1].strip() if 'Bloeitijd:' in ec else ''
            if bloom:
                tokens=bloom.split(' - ')
                add('flower_start_month',months.get(tokens[0]),vsid,'sourced_official_database',va_url+'#Bloeitijd','NL','Botanical register flowering envelope; not current-year prediction.',1)
                add('flower_end_month',months.get(tokens[-1]),vsid,'sourced_official_database',va_url+'#Bloeitijd','NL','Autumn has no numerical month conversion; endpoint stays unknown if stated only as a season.',1)
                add('flowering_context','NL botanical register; annual weather and site variation unresolved',vsid,'sourced_official_database',va_url+'#Bloeitijd','NL','Context of the linked month claims.',1)
            height=re.search(r'Hoogte:\s*([0-9,]+)-([0-9,]+)(?:\(-([0-9,]+)\))? m',text)
            if height:
                lower=float(height[1].replace(',','.'));upper=float((height[3] or height[2]).replace(',','.'))
                add('mature_height_min_m',lower,vsid,'sourced_official_database',va_url+'#Kenmerken-Hoogte','NL','Floristic height envelope; maturity and age unstandardised. Parenthesised exceptional maximum retained where present.',1)
                add('mature_height_max_m',upper,vsid,'sourced_official_database',va_url+'#Kenmerken-Hoogte','NL','Floristic height envelope; not an age-specific cultivated crown model.',1)
                add('dimension_context','NL floristic height; spread from separately cited horticultural profile where available; age unspecified',vsid,'sourced_official_database',va_url+'#Kenmerken-Hoogte','NL','No numerical target age inferred.',1)
                add('height_upper_bound_open',False,vsid,'sourced_official_database',va_url+'#Kenmerken-Hoogte','NL','Source gives a bounded range, not a physiological universal maximum.',1)
            colour=re.search(r'Bloemkleur: (.*?)(?: Type vrucht| Geslachtsverdeling| Feedback)',text)
            if colour:
                values=[v for term,v in [('wit','white'),('rood','red'),('roze','pink'),('paars','purple'),('blauw','blue'),('geel','yellow'),('groen','green'),('bruin','brown'),('doorschijnend','transparent')] if term in colour[1]]
                add('flower_colour',values,vsid,'sourced_official_database',va_url+'#Kenmerken-Bloemkleur','NL','Register colour alternatives, no genotype-specific colour forecast.',1)
            tox=between(text,'Toxiciteit:','Voorkomen in Nederland')
            if tox:
                value='strongly_toxic_reported' if 'Zeer giftige' in tox else 'weakly_toxic_reported' if 'Zwak giftige' in tox else 'toxic_reported' if 'Giftige' in tox else None
                add('toxicity_status',value,vsid,'sourced_official_database',va_url+'#Toxiciteit','NL','Heukels Flora 24th ed. 2020 with FLORON additions; reported hazard only, not dose or public-access clearance.',1)
                part=tox.split('plant (',1)[1].rstrip(')') if 'plant (' in tox else ''
                parts=[]
                for term,value in [('hele plant','whole_plant'),('jonge bladeren','young_leaves'),('onrijpe eikels','unripe_acorns'),('onrijpe bessen','unripe_berries'),('bessen','berries'),('schors','bark'),('bast','bark'),('bladeren','leaves'),('blad','leaves'),('pitten','seeds'),('twijgen','twigs'),('vruchten','fruits')]:
                    if term in part and not (term in ['blad','bladeren'] and 'jonge bladeren' in part) and not (term=='bessen' and 'onrijpe bessen' in part):parts.append(value)
                add('toxic_parts',sorted(set(parts)),vsid,'sourced_official_database',va_url+'#Toxiciteit','NL','Only expressly identified hazardous parts; silence about other parts is not safety evidence.',1)
            description=between(text,'Beschrijving','Kenmerken')
            if 'worteluitlopers' in description:add('suckering_or_spreading_method',['root_suckers'],vsid,'sourced_secondary',va_url+'#Beschrijving-Stengels','NL','Explicit root suckers; no spread rate or root-infrastructure risk inferred.',1)
            elif 'wortelstok' in description:add('suckering_or_spreading_method',['rhizomes'],vsid,'sourced_secondary',va_url+'#Beschrijving-Stengels','NL','Explicit rhizome description; no spread rate inferred.',1)
            elif 'bovengrondse uitlopers' in description:add('suckering_or_spreading_method',['runners'],vsid,'sourced_secondary',va_url+'#Beschrijving-Stengels','NL','Explicit aboveground runners; no spread radius or competitive strength inferred.',1)
            if name in ('Prunus spinosa','Crataegus monogyna') and 'doorn' in description.lower():add('thorns_or_spines','thorns_present',vsid,'sourced_secondary',va_url+'#Beschrijving-Stengels','NL','Explicit morphology of this species, not genus-based inference.',1)
            if name=='Rosa canina' and 'stekel' in description.lower():add('thorns_or_spines','prickles_present',vsid,'sourced_secondary',va_url+'#Beschrijving-Stengels','NL','Prickles distinguished from botanical thorns.',1)
        if raw.get('ncsu_opened'):
            nsid=source('ncsu-'+fid,name+' — Extension Gardener Plant Toolbox','NC State University / N.C. Cooperative Extension','institutional_horticulture_database',raw['ncsu_url'],'unknown; per-image licences do not establish text/database reuse rights.','Species page may discuss cultivars and US invasiveness; retain geographic and cultivation context. Rights policy lookup /about/ returned 404; no open text licence established.',geography='US, primarily North Carolina')
            attempt(raw['ncsu_url'],'opened','environment|dimensions|safety|seasonal|establishment|maintenance','Species header and attribute section inspected; cultivar text not elevated to species safety.')
            a=attrs((CACHE/(fid+'-ncsu.html')).read_text(encoding='utf-8'))
            def nc(field,value,label,rank=20,context='US horticultural profile; species-level attribute, cultivar-inclusive where stated. Transfer to NL remains provisional.'):
                add(field,value,nsid,'sourced_secondary',raw['ncsu_url']+'#'+label,'US-NC',context,rank)
            simple={'Growth Rate:':('growth_rate',{'Slow':'slow','Medium':'moderate','Rapid':'rapid'}),'Maintenance:':('maintenance_demand',{'Low':'low','Medium':'moderate','High':'high'}),'Recommended Propagation Strategy:':('suitable_establishment_methods',{'Division':'division','Seed':'seed','Stem Cutting':'stem_cuttings','Root Cutting':'root_cuttings','Layering':'layering','Grafting':'grafting'}),'Life Cycle:':('lifecycle',{'Annual':'annual','Biennial':'biennial','Perennial':'perennial'}),'Woody Plant Leaf Characteristics:':('evergreen_status',{'Deciduous':'deciduous','Broadleaf Evergreen':'evergreen','Semi-evergreen':'semi_evergreen'}),'Soil Texture:':('soil_textures',{'Clay':'clay','Loam (Silt)':'loam','Sand':'sand','Shallow Rocky':'rocky'}),'Soil Drainage:':('drainage_tolerance',{'Good Drainage':'well_drained','Moist':'moist_drained','Occasionally Wet':'periodically_wet','Frequent Standing Water':'standing_water','Occasional Flooding':'periodic_flooding','Very Dry':'very_dry'}),'Flower Inflorescence:':('flower_form',{'Head':'head','Umbel':'umbel','Corymb':'corymb','Spike':'spike','Panicle':'panicle','Cyme':'cyme','Raceme':'raceme','Catkin':'catkin','Insignificant':'insignificant'})}
            for label,(field,mapping) in simple.items():
                values=list(dict.fromkeys(mapping[x] for x in a.get(label,[]) if x in mapping))
                if field=='evergreen_status':
                    for value in values:nc(field,value,label,context='US foliage retention; cold-climate NL applicability unresolved.')
                else:nc(field,values,label)
            forms=[v for k,v in {'Tree':'tree','Shrub':'shrub','Vine':'climber','Herbaceous Perennial':'herb','Ornamental Grasses and Sedges':'grass_sedge_rush','Water Plant':'aquatic_herb'}.items() if k in a.get('Plant Type:',[])]
            nc('growth_form',forms,'Plant-Type',1)
            lights=[v for term,v in [('Full sun','full_sun'),('Partial Shade','partial_shade'),('Deep shade','shade'),('Dappled Sunlight','dappled_shade')] if any(x.startswith(term) for x in a.get('Light:',[]))]
            nc('light_regimes',lights,'Light')
            if 'dappled_shade' in lights:nc('canopy_compatibility','dappled_canopy_shade_reported','Light',context='NCSU explicitly defines dappled sunlight as shade through upper canopy; not a root competition assessment.')
            ph=[v for term,v in [('Acid','acid'),('Neutral','neutral'),('Alkaline','alkaline')] if any(x.startswith(term) for x in a.get('Soil pH:',[]))]
            nc('soil_ph_classes',ph,'Soil-pH',context='Broad NCSU soil-pH class only; source category boundaries are not physiological limits.')
            moisture=[v for term,v in [('Very Dry','very_dry'),('Occasionally Dry','dry'),('Moist','moist'),('Occasionally Wet','wet'),('Frequent Standing Water','standing_water_unspecified_depth')] if term in a.get('Soil Drainage:',[])]
            nc('moisture_regimes',moisture,'Soil-Drainage',context='US qualitative drainage labels mapped to moisture categories, with no depth, duration or Dutch suitability inference.')
            if 'Occasional Flooding' in a.get('Soil Drainage:',[]):nc('inundation_frequency','occasional_qualitative','Soil-Drainage',context='Qualitative US flooding label; no recurrence interval or hydroperiod inferred.')
            if 'Frequent Standing Water' in a.get('Soil Drainage:',[]):nc('inundation_frequency','frequent_qualitative','Soil-Drainage',context='Qualitative US standing-water label; no depth or flooded days inferred.')
            dimensions=between(plain((CACHE/(fid+'-ncsu.html')).read_text(encoding='utf-8')),'Dimensions:','Whole Plant Traits:')
            for label,field in [('Height','mature_height'),('Width','mature_spread')]:
                match=re.search(label+r':\s*(\d+) ft\. (\d+) in\.\s*-\s*(\d+) ft\. (\d+) in\.',dimensions)
                if match:
                    low=(int(match[1])*12+int(match[2]))*.0254;high=(int(match[3])*12+int(match[4]))*.0254
                    nc(field+'_min_m',round(low,4),'Dimensions',context='Published feet/inches converted exactly by 1 inch = 0.0254 m. Horticultural size; age, stock and cultivar envelope unstandardised.')
                    nc(field+'_max_m',round(high,4),'Dimensions',context='Exact unit conversion does not imply measurement precision or NL-specific size.')
                    if field=='mature_spread':nc('spread_upper_bound_open',False,'Dimensions')
            if dimensions:nc('dimension_context','US horticultural height/spread envelope; maturity age and cultivar unspecified','Dimensions')
            resistance=a.get('Resistance To Challenges:',[])
            for term,field,value in [('Drought','drought_tolerance','tolerant_unquantified'),('Salt','salinity_tolerance','salt_tolerant_unquantified'),('Pollution','pollution_tolerance','tolerant_unquantified'),('Heat','heat_tolerance','tolerant_unquantified')]:
                if term in resistance:nc(field,value,'Resistance-To-Challenges',context='US database resistance tag; no threshold or demonstrated Dutch exposure. Salt tag never converted to road-salt tolerance.')
            if a.get('Poison Severity:'):nc('toxicity_status','toxic_reported','Poison-Severity',context='Institutional poison section reports a hazard; low severity is not non-toxic. Source severity is '+','.join(a['Poison Severity:'])+'.')
            parts=[v for k,v in {'Leaves':'leaves','Roots':'roots','Seeds':'seeds','Stems':'stems','Flowers':'flowers','Fruits':'fruits','Sap/Juice':'sap'}.items() if k in a.get('Poison Part:',[])]
            nc('toxic_parts',parts,'Poison-Part',context='Only expressly listed poisonous parts; missing part entries stay unknown.')
            if a.get('Causes Contact Dermatitis:'):
                nc('contact_irritation_status','reported' if 'Yes' in a['Causes Contact Dermatitis:'] else 'not_reported_by_this_source','Causes-Contact-Dermatitis',context='Source-specific contact dermatitis statement; a No entry does not establish universal absence, safe sap, or public-contact clearance.')
            if 'Sap/Juice' in a.get('Poison Part:',[]) and 'Yes' in a.get('Causes Contact Dermatitis:',[]):nc('irritant_sap','reported','Poison-Part',context='Source explicitly identifies sap/juice as a hazard and contact dermatitis; no allergy probability inferred.')
            positive_edibility={
                'Achillea millefolium':['leaves','flowers'],'Leucanthemum vulgare':['leaves'],
                'Alliaria petiolata':['whole_plant'],'Valeriana officinalis':['root'],
                'Daucus carota':['leaves','root','flowers','seeds'],'Trifolium pratense':['leaves','flowers'],
                'Viburnum opulus':['fruit'],'Corylus avellana':['nuts'],'Sambucus nigra':['flowers','berries'],
                'Betula pendula':['sap'],'Sorbus aucuparia':['fruit'],'Humulus lupulus':['fruiting_cones'],
                'Echinacea purpurea':['herbaceous_parts'],
            }
            if name in positive_edibility and a.get('Edibility:'):
                nc('edible_parts',positive_edibility[name],'Edibility',context='Explicit named part(s) in the institutional Edibility field. Preparation, amounts, maturity and identification must be reviewed; this is not dietary advice.')
                nc('edibility_evidence_status','part_specific_provisional','Edibility',context='Part-specific use reported by institutional source; no public harvesting approval.')
                nc('food_safety_note','Part-specific use is reported; toxic parts, maturity, dose, allergies and preparation have not been independently cleared.','Edibility',context='Conservative evidence-scope note; not a claim that unmentioned hazards are absent.')
            if name=='Caltha palustris':
                nc('preparation_required','conditional_preparation','Poison-Symptoms',context='Source expressly forbids eating any part raw. A safe preparation method is not specified or established by this record.')
                nc('food_safety_note','Source forbids raw ingestion and reports poisoning; a reviewed preparation protocol is missing.','Poison-Symptoms',context='No spring-green part inferred from the vague edibility entry.')
            if name=='Iris pseudacorus':
                nc('inundation_depth_max_cm',25.4,'Description',context='Species description states water up to 10 inches deep, converted exactly; US cultivation report, not a Dutch hydrological trial. Minimum, duration, frequency and drawdown remain separate.')
                nc('suckering_or_spreading_method',['rhizomes'],'Description',context='Species description expressly reports spread by rhizomes; its US invasive classification is not Dutch legal status.')
            if name=='Hedera helix':nc('allergen_risk','reported','Poison-Symptoms',context='Source expressly states allergens may affect humans; sensitisation prevalence and pollen risk are unspecified.')
            if 'Weedy' in a.get('Problems:',[]):
                nc('vigour_or_spread_risk','weedy_reported','Problems',context='US horticultural weediness report, not Dutch invasive/legal classification.')
                nc('management_warnings',['weedy_us_scope'],'Problems')
            wildlife=' '.join(a.get('Wildlife Value:',[]))
            # These endpoints are explicitly numeric month names in the species flower descriptions.
            # Do not turn generic summer/autumn labels into month numbers.
            ncsu_months={'Echinacea purpurea':(6,8),'Rudbeckia fulgida':(8,10),'Panicum virgatum':(6,10),'Hakonechloa macra':(7,8)}
            if name in ncsu_months:
                start,end=ncsu_months[name]
                nc('flower_start_month',start,'Flower-Description',context='Explicit species flower-description months; US-NC climate, not a Dutch prediction.')
                nc('flower_end_month',end,'Flower-Description',context='Explicit species flower-description months; broad cultivar/season fields retained separately.')
                nc('flowering_context','US-NC species flower description; NL phenology unreviewed','Flower-Description')
            if re.search(r'nectar|pollinator|bees|butterfl',wildlife,re.I):nc('pollinator_value',['pollinator_visitation_reported'],'Wildlife-Value',context='Qualitative US visitation/nectar report, not quantified biodiversity value or NL faunal benefit.')
            habitat=[]
            if 'seeds' in wildlife and re.search(r'bird|goldfinch',wildlife,re.I):habitat.append('bird_seed_food_reported')
            if 'stem-nesting bees' in wildlife:habitat.append('stem_nesting_bees_reported')
            nc('other_habitat_functions',habitat,'Wildlife-Value',context='US species interactions. No assumption that the same fauna occur in NL.')
            hosts=re.findall(r'\(([A-Z][a-z]+ [a-z]+)\)',wildlife)
            nc('host_species_or_group',hosts,'Wildlife-Value',context='Named US larval hosts; no NL presence or availability inferred.')
        else:attempt(raw.get('ncsu_url',''),'not_opened: '+raw.get('ncsu_error','not_attempted'),'environment|dimensions|safety|seasonal|establishment|maintenance','No claims from failed URLs.')
        rhsfile=CACHE/(fid+'-rhs.html');rhsurl=raw.get('rhs_url')
        extras={'Lotus corniculatus':'rhs-lotus','Crataegus monogyna':'rhs-crataegus','Clematis vitalba':'rhs-clematis','Hakonechloa macra':'rhs-hakonechloa','Carex pendula':'rhs-carex-pendula'}
        if name in extras:
            key=extras[name];rhsfile=CACHE/(key+'.html');rhsurl=supplements.get(key,{}).get('url')
        if rhsfile.exists():
            text=plain(rhsfile.read_text(encoding='utf-8'))
            rsid=source('rhs-'+fid,name+' — RHS Plant Profile','Royal Horticultural Society','institutional_horticulture_profile',rhsurl,'Copyright RHS; no open text/database redistribution licence verified.','UK horticultural conditions; cultivar-free record selected. Size classes are envelopes and open upper bounds remain open.',geography='UK')
            attempt(rhsurl,'opened','identity|environment|dimensions|safety|seasonal|establishment|maintenance')
            def rhs(field,value,label,priority=10,context='UK RHS species/hybrid profile; horticultural classes, pending NL review.'):
                add(field,value,rsid,'sourced_secondary',rhsurl+'#'+label,'UK',context,priority)
            for label,field in [('Max Height','mature_height'),('Max Spread','mature_spread'),('Ultimate height','mature_height'),('Ultimate spread','mature_spread')]:
                match=re.search(label+r'\s+(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?) metres',text)
                if match:
                    rhs(field+'_min_m',float(match[1]),label);rhs(field+'_max_m',float(match[2]),label)
                    rhs('height_upper_bound_open' if field=='mature_height' else 'spread_upper_bound_open',False,label)
                openbound=re.search(label+r'\s+(?:Higher than|wider than)\s+(\d+(?:\.\d+)?) metres',text,re.I)
                if openbound:
                    rhs(field+'_min_m',float(openbound[1]),label,context='Open lower threshold only; no upper limit supplied. See upper_bound_open flag.')
                    rhs('height_upper_bound_open' if field=='mature_height' else 'spread_upper_bound_open',True,label)
            rhs('dimension_context','UK RHS horticultural envelope; height and spread may differ from floristic records; target age unresolved','Size')
            for field,left,right,mapping in [
                ('soil_textures','Soil Types','Max Height',{'Chalk':'calcareous_substrate','Clay':'clay','Loam':'loam','Sand':'sand'}),
                ('drainage_tolerance','Moisture','pH',{'Well–drained':'well_drained','Moist but well–drained':'moist_drained','Poorly–drained':'poorly_drained'}),
                ('soil_ph_classes','pH','Position',{'Acid':'acid','Alkaline':'alkaline','Neutral':'neutral'}),
                ('light_regimes','Position','Aspect',{'Full sun':'full_sun','Partial shade':'partial_shade','Full shade':'shade'})]:
                section=between(text,left,right)
                rhs(field,[v for k,v in mapping.items() if k in section],left)
            foliage=between(text,'Foliage','Habit')
            if 'Deciduous' in foliage:rhs('evergreen_status','deciduous','Foliage')
            if 'Evergreen' in foliage:rhs('evergreen_status','evergreen','Foliage')
            if 'Herbaceous Perennial' in text:rhs('growth_form',['herb'],'Plant-type',priority=1);rhs('lifecycle',['perennial'],'Plant-type')
            if name=='Hakonechloa macra':rhs('growth_form',['grass_sedge_rush'],'Description',priority=1);rhs('lifecycle',['perennial'],'Description');rhs('autumn_interest',['foliage_colour_reported'],'Description');rhs('winter_structure',['persistent_foliage_reported'],'Description')
            if name=='Quercus robur':rhs('mature_height_min_m',20.,'Description',12,'UK descriptive mature height, distinct from open size category.');rhs('mature_height_max_m',40.,'Description',12,'UK descriptive mature height, not age-standardised.');rhs('toxicity_status','harmful_to_dogs_reported','Potentially-harmful',context='Explicit dogs-only hazard, not a human-toxicological classification.')
            propagation=between(text,'Propagation','Suggested planting locations')
            methods=[v for term,v in [('seed','seed'),('division','division'),('Divide','division'),('cuttings','stem_cuttings'),('root cuttings','root_cuttings'),('Layering','layering'),('grafting','grafting')] if term.lower() in propagation.lower()]
            if 'root_cuttings' in methods and not re.search(r'softwood|semi-ripe',propagation,re.I):methods=[m for m in methods if m!='stem_cuttings']
            rhs('suitable_establishment_methods',list(dict.fromkeys(methods)),'Propagation')
            if name=='Lotus corniculatus':rhs('pollinator_value',['nectar_reported'],'Description');rhs('host_species_or_group',['moths_unspecified'],'Description');rhs('mowing_or_cutback_regime','no_pruning_required','Pruning')
            if name=='Echinacea purpurea':rhs('mowing_or_cutback_regime','cut_back_faded_stems','Pruning');rhs('flower_colour',['pink','purple'],'Description')
            if name=='Rudbeckia fulgida':rhs('drought_tolerance','tolerant_once_established','Cultivation');rhs('mowing_or_cutback_regime','autumn_optional_cutback','Pruning');rhs('winter_structure',['persistent_stems_reported','persistent_seedheads_reported'],'Pruning');rhs('seedhead_persistence','winter_reported','Pruning');rhs('flower_colour',['yellow'],'Description')
            if name=='Nepeta × faassenii':rhs('mowing_or_cutback_regime','cut_after_flowering','Pruning');rhs('flower_colour',['blue','purple'],'Description');rhs('flower_form',['lipped','tubular'],'Description')
            if name=='Carex pendula':rhs('growth_form',['grass_sedge_rush'],'Description',priority=1);rhs('vigour_or_spread_risk','vigorous_reported','Description');rhs('suckering_or_spreading_method',['self_seeding'],'Pruning');rhs('mowing_or_cutback_regime','remove_flower_stems_to_limit_seeding','Pruning')
            if name=='Crataegus monogyna':rhs('growth_form',['tree'],'Plant-type',priority=1);rhs('thorns_or_spines','thorns_present','Description');rhs('toxicity_status','toxic_reported','Potentially-harmful',context='Seeds expressly reported to contain toxins; fruit flesh statement does not clear seeds or pet ingestion.');rhs('toxic_parts',['seeds'],'Potentially-harmful');rhs('edible_parts',['fruit_flesh'],'Description',context='Fruit use conditional on removal of toxic seeds; not harvesting advice.');rhs('preparation_required','remove_seeds','Potentially-harmful');rhs('edibility_evidence_status','part_specific_provisional','Description');rhs('mowing_or_cutback_regime','hedge_trim_after_flowering_or_autumn','Pruning')
            if name=='Clematis vitalba':rhs('vigour_or_spread_risk','vigorous_reported','Description');rhs('management_warnings',['vigorous_growth_reported','contact_irritation_handling'],'Description-and-Potentially-harmful');rhs('contact_irritation_status','reported','Potentially-harmful');rhs('seedhead_persistence','long_lasting_reported','Description');rhs('growth_form',['climber'],'Plant-type',priority=1)
        checked_names=[name,accepted,gbif['canonicalName']]+synonyms
        present=[n for n in checked_names if n.replace('×','x') in union_plants.replace('×','x')]
        add('eu_union_concern_status','listed_snapshot' if present else 'not_listed_snapshot',union_id,'sourced_official_database',supplements['nvwa-union-list']['url']+'#Terrestrische-planten-and-Waterplanten','EU','NVWA displayed complete terrestrial/aquatic list, accessed 2026-10-13. Exact fixture/accepted name plus first five GBIF synonyms screened; full synonym/legal review pending. Not a general invasive-status clearance.',1)
        attempt(supplements['nvwa-union-list']['url'],'opened; exact names screened','legal|invasive','No match among: '+' | '.join(checked_names) if not present else 'Listed name '+','.join(present))
        if name=='Quercus robur':
            qid=source('quercus-rassenlijst','Quercus robur — Rassenlijst Bomen','Rassenlijst Bomen / Centre for Genetic Resources, the Netherlands (CGN)','official_forest_reproductive_material_profile',supplements['quercus-rassenlijst']['url'],'unknown; no reuse licence established.','Species-specific forestry profile, not a local-site survey; age-specific seedling constraints retained.',geography='NL')
            attempt(supplements['quercus-rassenlijst']['url'],'opened','environment|dimensions|establishment|maintenance|provenance','No project-specific provenance requirement inferred from reference seed-source categories.')
            for field,value,context in [
                ('mature_height_min_m',30.,'NL forestry descriptive adult height; differs from botanical register range.'),('mature_height_max_m',40.,'NL forestry adult range, no age specified.'),('growth_rate',['slow','moderate'],'Especially in juvenile phase; source does not support rapid demonstration growth.'),('drought_tolerance','tolerant_unquantified','Forestry source tolerance, not a seedling irrigation exemption.'),('road_salt_tolerance','low_sensitivity_reported','Species described as little sensitive to deicing salt; dose and route unspecified.'),('wind_tolerance','tolerant_unquantified','Good wind resistance; rootability and stock remain site-specific.'),('inundation_duration','temporary_qualitative','Temporary high groundwater and periods of flooding allowed; stagnant water poorly tolerated. No day/depth conversion.'),('management_warnings',['avoid_water_stagnation'],'Temporary inundation is distinct from stagnant permanent water.'),('establishment_notes','Juvenile establishment is sensitive to moisture competition; soil must permit rooting.','Species-specific source statement, paraphrased.'),('seed_or_plant_source_notes','Forestry register lists tested, selected and source-identified categories; stock certificate and project requirement remain unresolved.','Source categories are not invented legal or provenance requirements.')]:
                add(field,value,qid,'sourced_official_database',supplements['quercus-rassenlijst']['url']+'#Klimaat-en-groeiplaatseigenschappen','NL',context,1)
        plants.append(plant)
    # Core handoff contains facts, identifiers, short paraphrases and genuine retrieval failures, never copied pages.
    jsave(OUT/'source-observations.json',{'version':'0.2.0','accessed_on':DATE,'plants':plants,'sources':sources,'supplementary_searches':[{k:v for k,v in r.items() if k!='data'} for r in supplemental]})
    print(json.dumps({'plants':len(plants),'candidate_observations':sum(len(p['observations']) for p in plants),'source_rows':len(sources)},indent=2))

if __name__=='__main__':main()
