# Validation runtime for demo v0.2

Executed on 2026-10-13 from the Plantscapes repository root, using the Codex bundled Python 3.12 runtime and Node.js available on PATH. No application dependencies or code were modified.

Python executable used:

`C:\Users\Prianka\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`

Temporary isolated dependency directory:

`C:\Users\Prianka\AppData\Local\Temp\plantscapes-demo-python-deps`

Required packages are pinned in `requirements.txt`. Set `PYTHONPATH` to that isolated directory for this machine; another researcher can install the requirements into a virtual environment and use its Python instead. `PYTHONDONTWRITEBYTECODE=1` prevents incidental repository cache files.

Commands executed in order after source-scope inspection:

```powershell
$env:PYTHONPATH = 'C:\Users\Prianka\AppData\Local\Temp\plantscapes-demo-python-deps'
$env:PYTHONDONTWRITEBYTECODE = '1'
$researchPython = 'C:\Users\Prianka\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $researchPython dataset/build_demo_dataset_v0_2.py
& $researchPython dataset/write_demo_handover_v0_2.py
& $researchPython dataset/validate_demo_dataset_v0_2.py --self-test
git diff --check
```

Results: all profile, original claim and supplementary value schemas passed; all cross-file checks passed; all 12 invalid-data mutation cases were rejected; all 60 production flags remained false. An additional offline rebuild produced byte-identical output across 12 hashed data/report artifacts. The 2,443-row national catalogue, original claim schema, fixture JavaScript and planting engine hashes match the initial baseline. The validation result is `dataset/derived/plantscapes_demo_validation_v0_2.json`.

Research-only HTML/JSON working downloads remain in the OS temporary folder `C:\Users\Prianka\AppData\Local\Temp\plantscapes-demo-research-v0_2`; they are not included in the distributable handover. The committed short observation snapshot is sufficient for the deterministic offline build. Its facts and locators still need independent expert and rights review.
