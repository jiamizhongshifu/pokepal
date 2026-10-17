#!/usr/bin/env python3
"""
配音响度标准化：两遍 loudnorm，把每条配音统一到 -16 LUFS、真峰值 ≤ -1.5 dBTP，
中英文、不同音色之间音量一致。已处理的文件按内容哈希记录，重复运行会跳过。
用法：python3 scripts/voice/normalize.py
"""
import hashlib, json, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VOICE = os.path.join(ROOT, "public", "voice")
DONE = os.path.join(ROOT, "scripts", ".cache", "normalized.json")
TARGET = "I=-16:TP=-1.5:LRA=11"


def sha(path):
    return hashlib.sha1(open(path, "rb").read()).hexdigest()


def normalize(name):
    src = os.path.join(VOICE, name)
    # 第一遍：测量
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        return name, None
    st = json.loads(m.group(0))
    # 太短的片段 loudnorm 测不准时退回单遍
    measured = f":measured_I={st['input_i']}:measured_TP={st['input_tp']}:measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true" if st["input_i"] not in ("-inf", "inf") else ""
    tmp = src + ".tmp.mp3"
    r2 = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af", f"loudnorm={TARGET}{measured}", "-ar", "24000", "-ac", "1", "-b:a", "32k", tmp], capture_output=True, text=True)
    if r2.returncode != 0 or not os.path.exists(tmp):
        return name, None
    os.replace(tmp, src)
    return name, sha(src)


def main():
    os.makedirs(os.path.dirname(DONE), exist_ok=True)
    done = json.load(open(DONE)) if os.path.exists(DONE) else {}
    min_age = float(os.environ.get("NORMALIZE_MIN_AGE_SECONDS", 0))
    files = sorted(f for f in os.listdir(VOICE) if f.endswith(".mp3") and time.time() - os.path.getmtime(os.path.join(VOICE, f)) >= min_age)
    todo = [f for f in files if done.get(f) != sha(os.path.join(VOICE, f))]
    print(f"配音 {len(files)} 条，需标准化 {len(todo)} 条")
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=int(os.environ.get("NORMALIZE_WORKERS", os.cpu_count() or 4))) as ex:
        for name, h in ex.map(normalize, todo):
            if h:
                done[name] = h
                ok += 1
            else:
                fail += 1
                print("  ✗", name, flush=True)
            if (ok + fail) % 250 == 0:
                with open(DONE + ".tmp", "w") as f: json.dump(done, f)
                os.replace(DONE + ".tmp", DONE)
                print(f"  标准化进度 {ok + fail}/{len(todo)}，失败 {fail}", flush=True)
    json.dump(done, open(DONE, "w"))
    print(f"完成：标准化 {ok} 条，失败 {fail} 条")


if __name__ == "__main__":
    main()
