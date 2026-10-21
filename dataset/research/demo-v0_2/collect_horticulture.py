"""Bounded supplemental research; run after collect_sources.py. No application writes."""
import json, re
from concurrent.futures import ThreadPoolExecutor
from collect_sources import CACHE, get, plain

RHS = {
 'Echinacea purpurea':'https://www.rhs.org.uk/plants/41568/echinacea-purpurea/details',
 'Rudbeckia fulgida':'https://www.rhs.org.uk/plants/112261/rudbeckia-fulgida/details',
 'Nepeta × faassenii':'https://www.rhs.org.uk/plants/52221/nepeta-%C3%97-faassenii/details',
 'Quercus robur':'https://www.rhs.org.uk/plants/14294/quercus-robur/details',
}

def main():
    rows=json.loads((CACHE/'retrieved.json').read_text(encoding='utf-8'))
    def one(row):
        slug=row['fixture_scientific_name'].lower().replace(' × ', '-x-').replace(' ','-')
        url='https://plants.ces.ncsu.edu/plants/'+slug+'/'
        for prefix,u in [('ncsu',url)]+([('rhs',RHS[row['fixture_scientific_name']])] if row['fixture_scientific_name'] in RHS else []):
            row[prefix+'_url']=u
            try:
                page=get(u,row['fixture_id']+'-'+prefix+'.html')
                text=plain(page)
                (CACHE/(row['fixture_id']+'-'+prefix+'.txt')).write_text(text,encoding='utf-8')
                row[prefix+'_opened']=True
            except Exception as e: row[prefix+'_error']=str(e)
        print(row['fixture_id'],'NCSU',row.get('ncsu_opened',row.get('ncsu_error')),'RHS',row.get('rhs_opened',row.get('rhs_error','not attempted')),flush=True)
        return row
    with ThreadPoolExecutor(max_workers=2) as pool: rows=list(pool.map(one,rows))
    (CACHE/'retrieved.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__': main()
