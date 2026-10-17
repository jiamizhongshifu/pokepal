"""Inventory a local Pokémon GO APK and extract its original cry audio.

Requires UnityPy==1.25.4. Does not install/run the APK or contact game servers.
Usage: python scripts/extract-pogo-apk.py package.apk output-directory
"""
import collections
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile
import UnityPy

apk, output = Path(sys.argv[1]), Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
unpacked = output / "apk-unpacked"
with zipfile.ZipFile(apk) as archive:
    for name in archive.namelist():
        if name.startswith("assets/bin/Data/") and "/Managed/" not in name:
            target = (unpacked / name).resolve()
            if not target.is_relative_to(unpacked.resolve()):
                raise ValueError(f"Unsafe ZIP member: {name}")
            archive.extract(name, unpacked)
environment = UnityPy.load(str(unpacked / "assets/bin/Data"))
counts, objects, cries = collections.Counter(), [], []
audio_dir = output / "extracted-cries"
audio_dir.mkdir(exist_ok=True)
for obj in environment.objects:
    counts[obj.type.name] += 1
    if obj.type.name not in {"Mesh", "AnimationClip", "Texture2D", "AudioClip", "GameObject"}:
        continue
    data = obj.read()
    objects.append({"type": obj.type.name, "name": data.m_Name,
        "path_id": obj.path_id, "file": obj.assets_file.name})
    if obj.type.name == "AudioClip" and re.fullmatch(r"pv\d{3}", data.m_Name):
        for sample_name, content in data.samples.items():
            target = audio_dir / (data.m_Name + Path(sample_name).suffix)
            target.write_bytes(content)
            cries.append({"id": int(data.m_Name[2:]), "file": str(target.relative_to(output)),
                "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
content = apk.read_bytes()
report = {"apk": {"path": str(apk), "bytes": len(content),
    "md5": hashlib.md5(content).hexdigest(), "sha256": hashlib.sha256(content).hexdigest()},
    "counts": dict(counts), "objects": objects}
(output / "apk-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
(output / "extracted-cries.json").write_text(json.dumps(cries, indent=2))
print(json.dumps({"counts": dict(counts), "extracted_cries": len(cries)}, indent=2))
