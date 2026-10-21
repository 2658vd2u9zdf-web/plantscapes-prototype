"""Targeted direct records for rank, hybrid, safety and Quercus deep review."""
import json
from collect_sources import CACHE, get, plain

EXTRA={
 'rhs-carex-pendula':'https://www.rhs.org.uk/plants/3094/carex-pendula/details',
 'rhs-hakonechloa':'https://www.rhs.org.uk/plants/33668/hakonechloa-macra/details/',
 'nvwa-processionary':'https://www.nvwa.nl/onderwerpen/plant/plantenziekten-en-plagen/eikenprocessierups',
 'va-myosotis-species':'https://www.verspreidingsatlas.nl/0844',
 'rhs-lotus':'https://www.rhs.org.uk/plants/99960/lotus-corniculatus/details',
 'rhs-crataegus':'https://www.rhs.org.uk/plants/4775/crataegus-monogyna/details',
 'rhs-clematis':'https://www.rhs.org.uk/plants/3990/clematis-vitalba/details/',
 'nvwa-union-list':'https://www.nvwa.nl/onderwerpen/plant/invasieve-exoten/unielijst-invasieve-exoten',
 'nvwa-rights':'https://www.nvwa.nl/copyright',
 'gbif-backbone-metadata':'https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c',
 'gbif-salix-alba':'https://api.gbif.org/v1/species/5372513',
 'quercus-rassenlijst':'https://www.rassenlijstbomen.nl/posts/soort-quercus-robur',
 'ncsu-rights':'https://plants.ces.ncsu.edu/about/',
}

def main():
    result=[]
    for key,url in EXTRA.items():
        r={'source_id':key,'url':url}
        try:
            body=get(url,key+('.json' if 'api.gbif' in url else '.html'))
            r['opened']=True
            if 'api.gbif' in url: r['data']=json.loads(body)
            else: (CACHE/(key+'.txt')).write_text(plain(body),encoding='utf-8')
        except Exception as e: r['error']=str(e)
        result.append(r); print(key,r.get('opened',r.get('error')),flush=True)
    (CACHE/'supplement.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    rows=json.loads((CACHE/'retrieved.json').read_text(encoding='utf-8'))
    for r in rows:
        key=r.get('gbif_record',{}).get('key')
        if key:
            url=f'https://api.gbif.org/v1/species/{key}/synonyms?limit=5'
            try:
                r['gbif_synonyms_url']=url
                r['gbif_synonyms']=json.loads(get(url,r['fixture_id']+'-synonyms.json'))
            except Exception as e: r['gbif_synonyms_error']=str(e)
    (CACHE/'retrieved.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

if __name__=='__main__': main()
