#!/usr/bin/env python3
"""Fail the build if any current spoken line lacks a verified Volcengine recording."""
import hashlib, json, os, sys
from pathlib import Path
from volc_tts import line_file
ROOT = Path(__file__).resolve().parents[2]
lines = json.loads((ROOT / 'voice/lines.json').read_text())
manifest = json.loads((ROOT / 'public/voice/manifest.json').read_text())
receipts = [json.loads(l) for l in (ROOT / 'scripts/.cache/tts-receipts.jsonl').read_text().splitlines() if l.strip()]
proof = {(r.get('text_sha1'), r.get('voice')) for r in receipts if r.get('ok') and r.get('code') == 20000000}
normalized = json.loads((ROOT / 'scripts/.cache/normalized.json').read_text())
issues = []
for l in lines:
    key = f"{l['lang']}|{l['text']}"
    file = line_file(l)
    p = ROOT / 'public/voice' / file
    if manifest.get(key) != file: issues.append({'kind':'manifest', 'key':key}); continue
    if not p.is_file() or p.stat().st_size < 100: issues.append({'kind':'file', 'key':key}); continue
    data = p.read_bytes()
    if (hashlib.sha1(l['text'].encode()).hexdigest()[:12], l['voice']) not in proof: issues.append({'kind':'provider-receipt', 'key':key})
    if normalized.get(file) != hashlib.sha1(data).hexdigest(): issues.append({'kind':'normalization', 'key':key})
for p in (ROOT / 'src').rglob('*'):
    if p.suffix in ('.ts','.tsx') and any(api in p.read_text() for api in ['speechSynthesis', 'SpeechSynthesisUtterance']):
        issues.append({'kind':'system-tts', 'file':str(p.relative_to(ROOT))})
report = {'provider':'volcengine', 'lines':len(lines), 'issues':issues, 'passed':not issues}
if '--report' in sys.argv:
    dest = Path(sys.argv[sys.argv.index('--report')+1]); dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(f"火山配音校验：{len(lines)} 条，问题 {len(issues)} 个")
for issue in issues[:10]: print(issue)
sys.exit(1 if issues else 0)
