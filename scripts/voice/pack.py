#!/usr/bin/env python3
"""Bundle immutable MP3 bytes so full offline installation needs only 256 writes."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
voice = ROOT / 'public/voice'
manifest = json.loads((voice / 'manifest.json').read_text())
groups = {}
for file in sorted(set(manifest.values())):
    groups.setdefault(file[:2], []).append(file)
(voice / 'packs').mkdir(exist_ok=True)
index = {'version': 1, 'packs': [], 'files': {}}
for files in groups.values():
    body = bytearray()
    offsets = {}
    for file in files:
        data = (voice / file).read_bytes()
        offsets[file] = [len(body), len(data)]
        body.extend(data)
    name = hashlib.sha256(body).hexdigest()[:24] + '.bin'
    dest = voice / 'packs' / name
    if not dest.exists():
        dest.write_bytes(body)
    packed = dest.read_bytes()
    index['packs'].append({'file': name, 'bytes': len(body)})
    for file, (offset, size) in offsets.items():
        index['files'][file] = [name, offset, size]
        assert packed[offset:offset + size] == (voice / file).read_bytes(), file
(voice / 'pack-index.json').write_text(json.dumps(index, separators=(',', ':')))
print(f"Offline voice packs: {len(index['packs'])}; verified MP3 ranges: {len(index['files'])}")
