"""Show compact source-specific research aids from the temporary working copies."""
import json, sys
from collect_sources import CACHE, plain

def main():
    rows=json.loads((CACHE/'retrieved.json').read_text(encoding='utf-8'))
    lo,hi=(int(x) for x in sys.argv[1:3]) if len(sys.argv)>2 else (0,60)
    for r in rows[lo:hi]:
        print(r['fixture_id'],r['fixture_scientific_name'])
        if r.get('ncsu_opened'):
            t=plain((CACHE/(r['fixture_id']+'-ncsu.html')).read_text(encoding='utf-8'))
            t=t.split('Attributes:',1)[-1].split('Download Print-Friendly',1)[0]
            print(t[:10000].encode('ascii','backslashreplace').decode())
        if r.get('va_sections'):
            s=r['va_sections']
            print('VA',json.dumps({k:v[:350] for k,v in s.items() if k!='status'},ensure_ascii=True))

if __name__=='__main__': main()
