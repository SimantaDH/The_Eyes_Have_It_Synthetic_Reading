"""
STEP 1 — PARTIAL READING (Synthetic Reading method, Ghosh et al. 2026)

Divides the story into N equal parts (by sentence) and selects 20% of the sentences
("lines") from each part, so that an initial impression can be formed WITHOUT reading
the whole story.

Strategy per part: "first" | "middle" | "last" | "random" (fixed seed -> reproducible).
Default: 3 parts -> Beginning (first 20%), Middle (random 20%), End (last 20%).

Outputs:
  partial_reading.txt         the selected lines with their sentence numbers  (kept private:
                              the story is in copyright, so this file is NOT pushed to GitHub)
  partial_reading_index.json  the design and the sentence numbers only         (pushed)

Usage:
  python partial_reading.py
  python partial_reading.py --parts 4 --strategies first random random last --seed 7
"""

import argparse
import json
import random

from common import CFG, HERE, equal_parts, sentences

FRACTION = 0.20


def select(n_items: int, strategy: str, rng: random.Random) -> list[int]:
    k = max(1, round(n_items * FRACTION))
    idx = list(range(n_items))
    if strategy == "first":
        return idx[:k]
    if strategy == "last":
        return idx[-k:]
    if strategy == "middle":
        start = (n_items - k) // 2
        return idx[start:start + k]
    if strategy == "random":
        return sorted(rng.sample(idx, k))
    raise ValueError(f"Unknown strategy: {strategy}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parts", type=int, default=3)
    ap.add_argument("--strategies", nargs="+", default=["first", "random", "last"])
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    if len(args.strategies) != args.parts:
        raise SystemExit("Give exactly one strategy per part.")

    rng = random.Random(args.seed)
    sents = sentences()
    parts = equal_parts(sents, args.parts)
    names = {0: "Beginning", args.parts - 1: "End"}

    txt = ["PARTIAL READING", "",
           f"Text: “{CFG['title']}” by {CFG['author']}",
           f"Unit of reading: sentence (“line”). Total sentences: {len(sents)}",
           f"Division: {args.parts} equal parts; 20% of the sentences read from each part",
           f"Selection per part: {', '.join(args.strategies)} (random seed = {args.seed})", ""]
    index = {"text": CFG["title"], "author": CFG["author"], "total_sentences": len(sents),
             "parts": args.parts, "fraction_per_part": FRACTION, "seed": args.seed, "selection": []}

    offset, total_read = 0, 0
    for i, part in enumerate(parts):
        chosen = select(len(part), args.strategies[i], rng)
        name = names.get(i, "Middle" if args.parts == 3 else f"Middle {i}")
        nums = [offset + j + 1 for j in chosen]
        txt += [f"{chr(65 + i)}. Part {i + 1} — {name} (sentences {offset + 1}–{offset + len(part)}; "
                f"{len(chosen)} {args.strategies[i]} sentences read)", ""]
        txt += [f"[{n}] {sents[n - 1]}" for n in nums] + [""]
        index["selection"].append({"part": i + 1, "name": name, "sentences": [offset + 1, offset + len(part)],
                                   "strategy": args.strategies[i], "lines_read": nums})
        offset += len(part)
        total_read += len(chosen)
    txt.insert(6, f"Sentences read: {total_read} of {len(sents)}")
    index["lines_read_total"] = total_read

    (HERE / "partial_reading.txt").write_text("\n".join(txt), encoding="utf-8")
    (HERE / "partial_reading_index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"{len(sents)} sentences, {args.parts} parts -> {total_read} lines selected")
    print("Saved partial_reading.txt (private) and partial_reading_index.json (public)")


if __name__ == "__main__":
    main()
