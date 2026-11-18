#!/usr/bin/env python3
"""
Correct read-along word timings against the final (normalized) audio.

The TTS provider's word times keep good spacing inside a phrase, but drift across sentence breaks and misplace
low-confidence words such as names. Volcengine speech recognition on the finished audio never drifts but starts
each word a little late. Each phrase (split after , ; : . ! ?) keeps the provider's spacing and is shifted by the
median recognition offset of its confident words; unsure words take the recognition time directly.

Raw provider data is kept under "raw" so the step can be rerun. Recognition results are cached by audio hash, so
only new or changed recordings are sent (a small paid call per clip).
Usage: python3 scripts/voice/align_timings.py
"""
import base64, difflib, hashlib, json, os, re, statistics, subprocess, sys, uuid, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VOICE = os.path.join(ROOT, "public", "voice")
TIMINGS = os.path.join(VOICE, "timings.json")
CACHE = os.path.join(ROOT, "scripts", ".cache", "asr-word-times.json")
ASR = "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash"
CONFIDENT = 0.7
OUTLIER = 0.3
PHRASE_END = re.compile(r"[,;:.!?][\"”’']?$")


def letters(word):
    return re.sub(r"[^a-z]", "", word.lower())


def asr_key():
    cfg = json.load(open(os.environ.get("VOLCENGINE_CONFIG", os.path.expanduser("~/.config/volcengine/config.json"))))
    return cfg["credentials"][cfg["services"]["speech_asr"]["credential_ref"]]


def recognize(key, audio):
    body = {"user": {"uid": "pokepal-build"}, "audio": {"data": base64.b64encode(audio).decode(), "format": "mp3"},
            "request": {"model_name": "bigmodel", "enable_punc": True, "show_utterances": True}}
    req = urllib.request.Request(ASR, data=json.dumps(body).encode(), headers={
        "Content-Type": "application/json", "X-Api-Key": key, "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
        "X-Api-Request-Id": str(uuid.uuid4()), "X-Api-Sequence": "-1"})
    with urllib.request.urlopen(req, timeout=45) as r:
        result = json.loads(r.read()).get("result", {})
    return [[w["text"], w["start_time"] / 1000] for u in result.get("utterances", []) for w in u.get("words", []) if letters(w.get("text", "")) and w.get("start_time", -1) >= 0]


def sentence_words(text):
    """Same rule as storyTokens/storyWordKey in src/lib/storyWords.ts: whitespace tokens with outer punctuation removed."""
    out = []
    for token in text.split():
        word = re.sub(r"^[^A-Za-z]+|[^A-Za-z]+$", "", token.replace("’", "'")).lower()
        if word:
            out.append((word, bool(PHRASE_END.search(token))))
    return out


def merge(raw, words):
    """Provider pieces -> sentence words (a contraction can arrive as two pieces). None if they do not line up."""
    merged, j = [], 0
    for word, _ in words:
        need, got, first = letters(word), "", None
        while len(got) < len(need) and j < len(raw["w"]):
            if letters(raw["w"][j]):
                first = j if first is None else first
                got += letters(raw["w"][j])
            j += 1
        if got != need:
            return None
        merged.append({"t": raw["t"][first], "e": raw["e"][j - 1], "c": min(raw["c"][first:j])})
    return merged


def similarity(a, b):
    return difflib.SequenceMatcher(a=letters(a), b=letters(b)).ratio()


def matches(words, heard):
    """Order-preserving best match of sentence words to recognized words: word index -> (start, similarity)."""
    n, m = len(words), len(heard)
    score = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for k in range(m - 1, -1, -1):
            sim = similarity(words[i], heard[k][0])
            score[i][k] = max(score[i + 1][k], score[i][k + 1], (sim + score[i + 1][k + 1]) if sim >= 0.5 else 0)
    found, i, k = {}, 0, 0
    while i < n and k < m:
        sim = similarity(words[i], heard[k][0])
        if sim >= 0.5 and abs(score[i][k] - (sim + score[i + 1][k + 1])) < 1e-9:
            found[i] = (heard[k][1], sim)
            i, k = i + 1, k + 1
        elif score[i][k] == score[i + 1][k]:
            i += 1
        else:
            k += 1
    return found


def correct(words, merged, heard, lag, duration, onset):
    found = matches([w for w, _ in words], heard)
    t, offset, i = [], 0.0, 0
    while i < len(words):
        phrase = []
        while i < len(words):
            phrase.append(i)
            i += 1
            if words[i - 1][1]:
                break
        sure = [found[k][0] - lag - merged[k]["t"] for k in phrase if k in found and found[k][1] >= 0.8 and merged[k]["c"] >= CONFIDENT]
        if sure:
            offset = statistics.median(sure)
        for k in phrase:
            if merged[k]["c"] >= CONFIDENT or k not in found:
                start = merged[k]["t"] + offset
                if merged[k]["c"] < CONFIDENT:
                    start = min(start, merged[k - 1]["e"] + offset) if k > 0 else onset
            else:
                start = found[k][0] - lag
            # Recognition is only a little late; a clearly heard word far from the provider estimate means the provider slipped.
            if k in found and found[k][1] >= 0.8 and abs(start - (found[k][0] - lag)) > OUTLIER:
                start = found[k][0] - lag
            t.append(round(min(max(start, t[-1] if t else 0.0, 0.0), duration - 0.05), 3))
    end = min(duration, max(merged[-1]["e"] + offset, t[-1] + 0.2))
    return t, round(end, 3)


def first_speech(path):
    """Start of the first audible frame (10 ms frames, threshold relative to the loud end of the clip)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"], capture_output=True, check=True).stdout
    samples = [int.from_bytes(raw[i:i + 2], "little", signed=True) for i in range(0, len(raw) - 1, 2)]
    levels = [(sum(x * x for x in samples[i:i + 80]) / max(1, len(samples[i:i + 80]))) ** 0.5 for i in range(0, len(samples), 80)]
    threshold = max(300.0, sorted(levels)[int(len(levels) * 0.95)] * 0.08) if levels else 0
    return next((i * 0.01 for i, level in enumerate(levels) if level >= threshold), 0.0)


def duration_of(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout
    return float(out)


def main():
    timings = json.load(open(TIMINGS))
    manifest = json.load(open(os.path.join(VOICE, "manifest.json")))
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    key = None
    heard = {}
    for name, entry in timings.items():
        raw = entry.get("raw") or {k: entry[k] for k in ("w", "t", "e", "c")}
        entry.clear()
        entry["raw"] = raw
        audio = open(os.path.join(VOICE, manifest[name]), "rb").read()
        digest = hashlib.sha1(audio).hexdigest()
        if digest not in cache:
            key = key or asr_key()
            cache[digest] = recognize(key, audio)
        heard[name] = cache[digest]
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE, "w") as f:
        json.dump(cache, f, separators=(",", ":"))
    words = {name: sentence_words(name.split("|", 1)[1]) for name in timings}
    merged = {name: merge(timings[name]["raw"], words[name]) for name in timings}
    broken = [name for name, m in merged.items() if m is None]
    if broken:
        sys.exit(f"Provider words do not match the sentence: {broken[:3]}")
    # Recognition starts words late by a fairly constant amount; measure it where the provider is reliable:
    # confident, clearly recognized words in each line's first phrase, before any sentence-break drift.
    lags = []
    for name in timings:
        found = matches([w for w, _ in words[name]], heard[name])
        for k, (word, last) in enumerate(words[name]):
            if k in found and found[k][1] >= 0.8 and merged[name][k]["c"] >= CONFIDENT:
                lags.append(found[k][0] - merged[name][k]["t"])
            if last:
                break
    lag = round(statistics.median(lags), 3)
    for name, entry in timings.items():
        entry["w"] = [w for w, _ in words[name]]
        path = os.path.join(VOICE, manifest[name])
        entry["t"], entry["end"] = correct(words[name], merged[name], heard[name], lag, duration_of(path), first_speech(path))
    with open(TIMINGS + ".tmp", "w") as f:
        json.dump(timings, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(TIMINGS + ".tmp", TIMINGS)
    print(f"Read-along timings aligned: {len(timings)} lines, recognition lag {lag}s from {len(lags)} words")


if __name__ == "__main__":
    sys.exit(main())
