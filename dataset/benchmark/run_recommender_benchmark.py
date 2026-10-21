"""Evaluate recommender cases with the Python reference evaluator (no website import).

Run: python dataset/benchmark/run_recommender_benchmark.py [--cases cases.json] [--scorer path]
Prints {"cases": {case_id: {"results": [...], "ranked": [...]}}} to stdout. profile_trace is
omitted because it is a verbatim copy of plant evidence; parity tests check it separately.
Adversarial benchmark variants are in-memory record copies, reported as "<scenario>~<label>".
"""
import argparse,copy,importlib.util,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent

def load_scorer(path):
    spec=importlib.util.spec_from_file_location('plantscapes_benchmark_scorer',path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def variant(plants,spec):
    plant=copy.deepcopy(next(p for p in plants if p['fixture_id']==spec['base_fixture_id']))
    plant.update(spec['set'])
    for f in spec['set']:
        if f in plant['field_origins_json']:plant['field_origins_json'][f]='policy_rule'
    plant['fixture_id']+='~'+spec['label'];return plant

def benchmark_cases(benchmark,plants):
    for s in benchmark['scenarios']:
        yield s['id'],s['zone'],s['project'],plants
        for v in s.get('adversarial_variants',[]):yield s['id']+'~'+v['label'],s['zone'],s['project'],[variant(plants,v)]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cases',help='JSON list of {id, zone, project}; default: the versioned benchmark scenarios.')
    parser.add_argument('--scorer',default=str(HERE.parent/'score_demo_suitability_v0_3.py'))
    args=parser.parse_args()
    scorer=load_scorer(args.scorer);plants=scorer.load_plants()
    if args.cases:cases=[(c['id'],c['zone'],c['project'],plants) for c in json.loads(Path(args.cases).read_text(encoding='utf-8'))]
    else:cases=list(benchmark_cases(json.loads((HERE/'recommender-benchmark-v0_3.json').read_text(encoding='utf-8')),plants))
    out={}
    for case_id,zone,project,records in cases:
        results=[scorer.evaluate(plant,copy.deepcopy(zone),copy.deepcopy(project)) for plant in records]
        for r in results:r.pop('profile_trace')
        out[case_id]={'results':results,'ranked':[r['fixture_id'] for r in scorer.rank(results)]}
    sys.stdout.write(json.dumps({'cases':out},ensure_ascii=False,separators=(',',':')))

if __name__=='__main__':main()
