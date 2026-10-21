"""Read-only botanical retrieval. Full page working copies stay in the OS temp folder.
Run from the repository root. Never writes the national catalogue or application.
"""
import csv, hashlib, html, json, re, subprocess, tempfile, time
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
CACHE = Path(tempfile.gettempdir()) / 'plantscapes-demo-research-v0_2'
CACHE.mkdir(exist_ok=True)

def get(url, filename):
    path = CACHE / filename
    if path.exists():
        return path.read_text(encoding='utf-8')
    request = Request(url, headers={'User-Agent': 'PlantscapesResearchPrototype/0.2 (botanical evidence review; no images)'})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=45) as response:
                data = response.read().decode('utf-8')
            path.write_text(data, encoding='utf-8')
            return data
        except Exception:
            if attempt == 2: raise
            time.sleep(1 + attempt)

def plain(data):
    class Text(HTMLParser):
        def __init__(self): super().__init__(convert_charrefs=True); self.parts=[]; self.ignore=0
        def handle_starttag(self,tag,attrs):
            if tag in ('script','style'): self.ignore+=1
        def handle_endtag(self,tag):
            if tag in ('script','style'): self.ignore=max(0,self.ignore-1)
        def handle_data(self,data):
            if not self.ignore: self.parts.append(data)
    parser=Text(); parser.feed(data)
    return re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()

def main():
    script = "const fs=require('fs'),vm=require('vm');let window={};vm.runInNewContext(fs.readFileSync('website/data/demo-data.js','utf8'),{window});console.log(JSON.stringify(window.PLANTSCAPES_DEMO))"
    demo = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT, encoding='utf-8'))
    fixtures = [{'fixture_id': f'demo-{track}-{i+1:02d}', 'fixture_track': track, 'fixture_scientific_name': p[0], 'fixture_vernacular_nl': p[1], 'fixture_group': p[2]} for track, key in [('core','plants'), ('ornamental','ornamentals')] for i,p in enumerate(demo[key])]
    assert len(fixtures)==60 and len({x['fixture_scientific_name'] for x in fixtures})==60
    national_path = ROOT/'dataset/derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv'
    national = list(csv.DictReader(national_path.open(encoding='utf-8-sig',newline='')))
    assert len(national)==2443
    # Every national row is read and all fields retained for reconciliation, never modified.
    baseline = {'national_sha256':hashlib.sha256(national_path.read_bytes()).hexdigest(), 'national_records':len(national), 'protected_files':{str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'website/data/demo-data.js',ROOT/'website/planting-engine.js',ROOT/'dataset/schemas/plant-claim.schema.json']}}
    if (OUT/'baseline.json').exists():
        assert json.loads((OUT/'baseline.json').read_text())==baseline, 'Protected inputs changed; preserve initial baseline.'
    else: (OUT/'baseline.json').write_text(json.dumps(baseline,indent=2)+'\n',encoding='utf-8')
    (OUT/'fixtures.json').write_text(json.dumps(fixtures,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    def collect(f):
        name=f['fixture_scientific_name']
        matches=[r for r in national if name in (r['scientific_name'],r['canonical_name'])]
        f['catalogue_candidates']=matches
        url='https://api.gbif.org/v1/species/match?'+urlencode({'name':name,'strict':'true'})
        f['gbif_match_url']=url
        try:
            f['gbif_match']=json.loads(get(url,f["fixture_id"]+'-gbif-match.json'))
            key=f['gbif_match'].get('acceptedUsageKey') or f['gbif_match'].get('usageKey')
            if key:
                f['gbif_record_url']=f'https://api.gbif.org/v1/species/{key}'
                f['gbif_record']=json.loads(get(f['gbif_record_url'],f["fixture_id"]+'-gbif-record.json'))
        except Exception as e: f['gbif_error']=str(e)
        if len(matches)==1 and matches[0]['verspreidingsatlas_taxon_number']:
            number=matches[0]['verspreidingsatlas_taxon_number']
            f['va_url']='https://www.verspreidingsatlas.nl/'+number
            try:
                page=get(f['va_url'],f["fixture_id"]+'-va.html')
                text=plain(page)
                (CACHE/(f["fixture_id"]+'-va.txt')).write_text(text,encoding='utf-8')
                # Parsing is a research aid; these values are reviewed before being claims.
                def between(a,b):
                    return text.split(a,1)[1].split(b,1)[0].strip() if a in text else ''
                f['va_sections']={
                    'status':between('Voorkomen in Nederland','Monitoring'),
                    'environment':between('Bodem','Groeiplaats'),
                    'ecology':between('Biotoopvoorkeur:','Literatuur'),
                    'dimensions':between('Hoogte:','Type vrucht:'),
                    'toxicity':between('Toxiciteit:','Voorkomen in Nederland'),
                }
            except Exception as e: f['va_error']=str(e)
        print(f['fixture_id'],name,'GBIF',f.get('gbif_match',{}).get('matchType'),'VA',bool(f.get('va_sections')),flush=True)
        return f
    with ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(collect,fixtures))
    # Working extracts: restricted, not a redistributable source export.
    (CACHE/'retrieved.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Temporary working extracts:',CACHE/'retrieved.json')

if __name__=='__main__': main()
