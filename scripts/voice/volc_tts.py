#!/usr/bin/env python3
"""
构建期配音：调用火山引擎「豆包语音合成大模型」(HTTP Chunked 单向流式 V3)，把游戏台词预先合成为 mp3。
复用内容工作流项目的用户级配置 ~/.config/volcengine/config.json（可用 VOLCENGINE_CONFIG 指定）：
  - 优先使用 services.speech_tts.credential_ref；没有时沿用 services.speech_asr.credential_ref（同一把豆包语音 Key）
  - 密钥只在本进程内存中使用，不打印、不写入项目
用法：
  python3 scripts/voice/volc_tts.py smoke                      一次 2 字的连通性测试
  python3 scripts/voice/volc_tts.py build voice/lines.json     批量合成（已存在的跳过）
"""
import base64, hashlib, json, os, sys, time, uuid, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

ENDPOINT = "https://openspeech.bytedance.com/api/v3/tts/unidirectional"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "voice")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")
RECEIPTS = os.path.join(ROOT, "scripts", ".cache", "tts-receipts.jsonl")


def api_key():
    path = os.environ.get("VOLCENGINE_CONFIG", os.path.expanduser("~/.config/volcengine/config.json"))
    with open(path) as f:
        cfg = json.load(f)
    svc = cfg.get("services", {})
    ref = (svc.get("speech_tts") or {}).get("credential_ref") or (svc.get("speech_asr") or {}).get("credential_ref")
    key = cfg.get("credentials", {}).get(ref)
    if not key:
        sys.exit("未找到豆包语音凭据（services.speech_tts / speech_asr 的 credential_ref）")
    return key


def synth(key, text, speaker, resource="seed-tts-2.0", rate=0, pitch=0, context=None, loudness=0):
    params = {
        "text": text,
        "speaker": speaker,
        "audio_params": {"format": "mp3", "sample_rate": 24000, "bit_rate": 32000, "speech_rate": rate, "loudness_rate": loudness},
    }
    additions = {"disable_markdown_filter": False, "disable_default_bit_rate": True}
    if pitch:
        additions["post_process"] = {"pitch": pitch}
    if context:
        additions["context_texts"] = [context]
    params["additions"] = json.dumps(additions, ensure_ascii=False)
    body = json.dumps({"user": {"uid": "pokepal-build"}, "req_params": params}, ensure_ascii=False).encode()
    req = urllib.request.Request(ENDPOINT, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "X-Api-Key": key,
        "X-Api-Resource-Id": resource,
        "X-Api-Request-Id": str(uuid.uuid4()),
        "X-Control-Require-Usage-Tokens-Return": "text_words",
    })
    audio = bytearray()
    usage = None
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            logid = resp.headers.get("X-Tt-Logid", "")
            buf = b""
            for chunk in iter(lambda: resp.read(4096), b""):
                buf += chunk
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    if not line.strip():
                        continue
                    msg = json.loads(line)
                    code = msg.get("code", 0)
                    if code not in (0, 20000000):
                        return None, {"code": code, "message": str(msg.get("message", ""))[:120], "logid": logid}
                    if msg.get("data"):
                        audio += base64.b64decode(msg["data"])
                    if msg.get("usage"):
                        usage = msg["usage"]
            if buf.strip():
                msg = json.loads(buf)
                if msg.get("data"):
                    audio += base64.b64decode(msg["data"])
        return bytes(audio), {"code": 20000000, "logid": logid, "usage": usage}
    except urllib.error.HTTPError as e:
        detail = e.read()[:200].decode(errors="ignore")
        return None, {"http": e.code, "detail": detail}
    except (TimeoutError, OSError, ValueError) as e:
        # 网络读取超时 / 连接中断 / 半截 JSON：交给上层重试，不要让整个批量任务崩掉
        return None, {"net": type(e).__name__}


def line_file(line):
    h = hashlib.sha1(f"{line['lang']}|{line['text']}|{line['voice']}|{line.get('pitch',0)}|{line.get('rate',0)}".encode()).hexdigest()[:16]
    return f"{h}.mp3"


def build(lines_path, workers=4, normalize=True):
    key = api_key()
    with open(lines_path) as f:
        lines = json.load(f)
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(RECEIPTS), exist_ok=True)
    manifest = {}
    if os.path.exists(MANIFEST):
        manifest = json.load(open(MANIFEST))
    todo = [l for l in lines if not os.path.exists(os.path.join(OUT_DIR, line_file(l)))]
    print(f"台词 {len(lines)} 条，需新合成 {len(todo)} 条，字符约 {sum(len(l['text']) for l in todo)}")
    done = fail = 0
    chars = 0

    def job(l):
        for attempt in range(3):
            audio, info = synth(key, l["text"], l["voice"], l.get("resource", "seed-tts-2.0"), l.get("rate", 0), l.get("pitch", 0), l.get("context"))
            if audio:
                return l, audio, info
            if info.get("http") in (429, 500, 502, 503, 504) or info.get("code") in (45000292,) or info.get("net"):
                time.sleep(2 + attempt * 3)
                continue
            return l, None, info
        return l, None, info

    with ThreadPoolExecutor(max_workers=workers) as ex, open(RECEIPTS, "a") as rec:
        for future in as_completed([ex.submit(job, l) for l in todo]):
            l, audio, info = future.result()
            if audio:
                with open(os.path.join(OUT_DIR, line_file(l)), "wb") as f:
                    f.write(audio)
                done += 1
                chars += (info.get("usage") or {}).get("text_words", len(l["text"]))
            else:
                fail += 1
                print(f"  ✗ [{l['lang']}] {l['text'][:30]} → {info}")
            rec.write(json.dumps({"t": time.time(), "text_sha1": hashlib.sha1(l["text"].encode()).hexdigest()[:12], "voice": l["voice"], "file": line_file(l), "provider": "volcengine", "ok": bool(audio), **{k: v for k, v in info.items() if k != 'detail'}}, ensure_ascii=False) + "\n")
            if (done + fail) % 50 == 0:
                rec.flush()
                print(f"  进度 {done + fail}/{len(todo)}，成功 {done}，失败 {fail}", flush=True)
    # 清单只登记实际存在的文件
    manifest = {f"{l['lang']}|{l['text']}": line_file(l) for l in lines if os.path.exists(os.path.join(OUT_DIR, line_file(l)))}
    with open(MANIFEST + ".tmp", "w") as f:
        json.dump(manifest, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(MANIFEST + ".tmp", MANIFEST)
    print(f"完成：新合成 {done} 条，失败 {fail} 条，计费字符约 {chars}，清单 {len(manifest)} 条")
    # 新合成的配音做响度标准化（中英文音量一致）
    import subprocess
    if normalize:
        subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "normalize.py")], check=True)
    if fail:
        raise SystemExit(1)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "smoke"
    if cmd == "smoke":
        audio, info = synth(api_key(), "你好", "zh_female_xiaoxue_uranus_bigtts")
        print({"ok": bool(audio), "bytes": len(audio or b""), **info})
        if audio:
            os.makedirs(os.path.join(ROOT, "scripts", ".cache"), exist_ok=True)
            open(os.path.join(ROOT, "scripts", ".cache", "smoke.mp3"), "wb").write(audio)
    elif cmd == "build":
        build(sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "voice", "lines.json"), workers=int(sys.argv[3]) if len(sys.argv) > 3 else 4, normalize="--skip-normalize" not in sys.argv)
