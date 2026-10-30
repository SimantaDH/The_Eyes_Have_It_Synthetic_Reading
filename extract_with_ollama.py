"""
STEPS 3–5 — TEXT UPLOAD, QUERY, TARGETED EXTRACTION (local LLM via Ollama) + VERIFICATION

1. Numbers the story's sentences [1]..[N] (the same split used everywhere in the project).
2. Sends prompt.txt + the numbered story to a LOCAL model served by Ollama
   (optionally in several chunks of consecutive sentences, which makes small models more exhaustive).
3. Saves the model's JSON answer untouched, and a run log (model, settings, date, prompt hash).
4. Verifies every extracted item: (a) does it occur verbatim in the story? (b) does it occur in the
   sentence the model named? Unverified items are kept in the raw file but never used in the analysis.

Outputs:
  llm_raw_output.json        the model's answer (merged across chunks, otherwise untouched)
  llm_run_log.json           model, chunks, temperature, seed, context size, date, prompt SHA-256
  llm_items_verified.csv     one row per item: dimension, item, sentence, verbatim, in_sentence
  llm_verification.txt       human-readable report
  llm_verification.json      summary numbers (used by analysis.py and the website)

Usage:
  python extract_with_ollama.py --model qwen2.5:7b --chunks 3
  python extract_with_ollama.py --verify-only        # verify an llm_raw_output.json you obtained elsewhere
"""

import argparse
import csv
import datetime as dt
import hashlib
import json
import re
import urllib.request
from pathlib import Path

from common import CFG, HERE, normalise, phrase_pattern, sentences

PROMPT = HERE / "prompt.txt"
RAW_OUT = HERE / "llm_raw_output.json"
LOG_OUT = HERE / "llm_run_log.json"
CSV_OUT = HERE / "llm_items_verified.csv"
TXT_OUT = HERE / "llm_verification.txt"
JSON_OUT = HERE / "llm_verification.json"
OLLAMA = "http://localhost:11434"


def prompt_body() -> str:
    lines = PROMPT.read_text(encoding="utf-8").splitlines()
    keep = [l for l in lines if l.strip() != "PROMPT" and not l.startswith("Prompt to the")]
    return "\n".join(keep).strip()


def numbered(sents: list[str], start: int, end: int) -> str:
    return "\n".join(f"[{n}] {sents[n - 1]}" for n in range(start, end + 1))


def parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise
        return json.loads(m.group(0))


def call_ollama(model, prompt, text, temperature, ctx, num_predict) -> dict:
    payload = {"model": model, "stream": False, "format": "json",
               "prompt": f"{prompt}\n\n=== TEXT START ===\n{text}\n=== TEXT END ===",
               "options": {"temperature": temperature, "num_ctx": ctx, "num_predict": num_predict, "seed": 42}}
    req = urllib.request.Request(f"{OLLAMA}/api/generate", data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=3600) as r:
        return parse_json(json.loads(r.read().decode("utf-8"))["response"])


def entries(raw: dict):
    """Yield (llm_key, item, sentence_no) from any reasonable answer shape."""
    for key, val in raw.items():
        if not isinstance(val, list):
            continue
        for e in val:
            if isinstance(e, dict):
                item = str(e.get("item") or e.get("text") or e.get("phrase") or "").strip()
                sent = e.get("sentence", e.get("sentence_no", e.get("sentence_number")))
            else:
                item, sent = str(e).strip(), None
            try:
                sent = int(str(sent).strip("[] ")) if sent is not None else None
            except ValueError:
                sent = None
            if item:
                yield key, item, sent


def merge(parts: list[dict]) -> dict:
    merged, seen = {}, set()
    for part in parts:
        for key, item, sent in entries(part):
            k = (key, normalise(item), sent)
            if k not in seen:
                seen.add(k)
                merged.setdefault(key, []).append({"item": item, "sentence": sent})
    return merged


def run_extraction(model="qwen2.5:7b", chunks=3, temperature=0.0, ctx=8192, num_predict=4096) -> dict:
    sents = sentences()
    prompt = prompt_body()
    n = len(sents)
    size = -(-n // max(1, chunks))
    ranges = [(s, min(n, s + size - 1)) for s in range(1, n + 1, size)]
    parts = []
    for i, (a, b) in enumerate(ranges, 1):
        print(f"Asking {model}: part {i}/{len(ranges)} (sentences {a}–{b}) ...", flush=True)
        parts.append(call_ollama(model, prompt, numbered(sents, a, b), temperature, ctx, num_predict))
    raw = merge(parts)
    RAW_OUT.write_text(json.dumps(raw, indent=2, ensure_ascii=False), encoding="utf-8")
    LOG_OUT.write_text(json.dumps({
        "model": model, "engine": "Ollama on a local GPU", "chunks": len(ranges), "chunk_ranges": ranges,
        "temperature": temperature, "seed": 42, "num_ctx": ctx, "num_predict": num_predict,
        "run_at": dt.datetime.now().isoformat(timespec="seconds"),
        "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest()}, indent=2), encoding="utf-8")
    print(f"Saved {RAW_OUT.name} and {LOG_OUT.name}")
    return raw


def run_verification() -> dict:
    raw = json.loads(RAW_OUT.read_text(encoding="utf-8"))
    sents = [normalise(s) for s in sentences()]
    whole = " ".join(sents)
    dim_map = CFG["llm_dimension_map"]
    rows, per_dim = [], {}
    for key, item, sent in entries(raw):
        pat = phrase_pattern(item)
        verbatim = bool(pat.search(whole))
        in_sent = bool(sent and 1 <= sent <= len(sents) and pat.search(sents[sent - 1]))
        dim = dim_map.get(key, key)
        rows.append({"dimension": dim, "llm_key": key, "item": item, "sentence": sent,
                     "verbatim": verbatim, "in_sentence": in_sent})
        d = per_dim.setdefault(dim, {"items": 0, "verbatim": 0, "in_sentence": 0})
        d["items"] += 1; d["verbatim"] += verbatim; d["in_sentence"] += in_sent
    with CSV_OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else ["dimension", "item"])
        w.writeheader(); w.writerows(rows)
    total = len(rows)
    ver = sum(r["verbatim"] for r in rows)
    ins = sum(r["in_sentence"] for r in rows)
    summary = {"items": total, "verbatim": ver, "in_named_sentence": ins,
               "verbatim_pct": round(100 * ver / total, 1) if total else 0,
               "in_sentence_pct": round(100 * ins / total, 1) if total else 0,
               "unique_verified_items": len({(r["dimension"], normalise(r["item"])) for r in rows if r["verbatim"]}),
               "per_dimension": per_dim}
    JSON_OUT.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    lines = ["LLM EXTRACTION — VERIFICATION AGAINST THE STORY",
             f"Items extracted: {total}",
             f"Found verbatim in the story: {ver} ({summary['verbatim_pct']}%)",
             f"Found in the sentence the model named: {ins} ({summary['in_sentence_pct']}%)",
             "Only verbatim items are used in the analysis (Fig. 8). Items marked x are not in the story as written.", ""]
    for dim, d in per_dim.items():
        lines.append(f"## {dim}: {d['items']} items, {d['verbatim']} verbatim, {d['in_sentence']} in the named sentence")
        lines += [f"   x {r['item']}" for r in rows if r["dimension"] == dim and not r["verbatim"]]
    TXT_OUT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:4]))
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="qwen2.5:7b")
    ap.add_argument("--chunks", type=int, default=3)
    ap.add_argument("--temperature", type=float, default=0.0)
    ap.add_argument("--ctx", type=int, default=8192)
    ap.add_argument("--num-predict", type=int, default=4096)
    ap.add_argument("--verify-only", action="store_true")
    a = ap.parse_args()
    if not a.verify_only:
        run_extraction(a.model, a.chunks, a.temperature, a.ctx, a.num_predict)
    run_verification()


if __name__ == "__main__":
    main()
