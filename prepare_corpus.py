"""
STEP 3 — PRE-PROCESSING (removing noise)

Builds the research corpus for Ruskin Bond's "The Eyes Have It" from the web page
named in project.json (or from a copy you saved yourself: .html or .txt).

Noise removed:
  * everything outside the story: site header, blog title, "Posted on" line,
    author signature ("RUSKIN BOND") and everything after it (author photo caption,
    blogger's note, comments, share buttons, cookie banner, footer);
  * image file names / captions left inside the text (e.g. "train-in-the-mountains-wallpaper-1");
  * empty and whitespace-only lines, non-breaking spaces, repeated spaces.
Kept exactly as published on the source page: every word of the story, its punctuation and
quotation marks. Known transcription slips on the source page (a few missing quotation marks)
are NOT silently corrected; they are listed in corpus_info.json.
Not done, on purpose: lower-casing, stemming, stop-word removal (the LLM must see the text as
written, and every extracted phrase is verified against this wording).

Outputs:
  source_the_eyes_have_it.html|txt   the untouched download / upload      (NOT pushed to GitHub)
  corpus_the_eyes_have_it.txt        the cleaned story                     (NOT pushed to GitHub)
  corpus_info.json                   word/sentence counts + SHA-256 hash  (pushed: lets anyone verify
                                     they hold the identical text without the text being published)

Usage:
  python prepare_corpus.py                     # download from the URL in project.json
  python prepare_corpus.py --raw saved_page.html
  python prepare_corpus.py --raw story.txt
"""

import argparse
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html import unescape
from pathlib import Path

HERE = Path(__file__).parent
CFG = json.loads((HERE / "project.json").read_text(encoding="utf-8"))
CORPUS = HERE / CFG["corpus_file"]
INFO = HERE / "corpus_info.json"

IMAGE_LINE = re.compile(r"^[\w.-]+-[\w.-]+$|\.(jpe?g|png|gif|webp)$", re.I)  # hyphenated tokens, no spaces


def html_to_lines(html: str) -> list[str]:
    """Story paragraphs from a WordPress page (entry-content), one per line."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        node = soup.select_one("div.entry-content") or soup.body or soup
        for bad in node.select("script, style, noscript, div.sharedaddy, div#jp-post-flair, "
                               "div.jp-relatedposts, figure, img"):
            bad.decompose()
        for br in node.find_all("br"):
            br.replace_with("\n")
        blocks = node.find_all(["p", "h1", "h2", "h3", "h4", "li"]) or [node]
        return [line for b in blocks for line in b.get_text().split("\n")]
    except ImportError:  # minimal fallback without BeautifulSoup
        body = re.search(r'<div class="entry-content">(.*?)</div>', html, re.S)
        html = body.group(1) if body else html
        html = re.sub(r"(?is)<(script|style).*?</\1>", " ", html)
        html = re.sub(r"(?i)</p>|<br\s*/?>", "\n", html)
        return [unescape(re.sub(r"<[^>]+>", " ", l)) for l in html.splitlines()]


def clean(lines: list[str]) -> tuple[list[str], dict]:
    lines = [re.sub(r"\s+", " ", l.replace(" ", " ")).strip() for l in lines]
    title = CFG["title"]
    start = 0
    for i, l in enumerate(lines):                 # blog metadata line, if present
        if l.lower().startswith("posted on"):
            start = i + 1
            break
    else:
        for i, l in enumerate(lines):             # otherwise: after the title line
            if title.lower() in l.lower() and len(l) < 80:
                start = i + 1
                break
    end = len(lines)
    for i in range(start, len(lines)):            # author signature ends the story
        if lines[i].strip().upper() == CFG["author"].upper():
            end = i
            break
    removed_images = [l for l in lines[start:end] if l and IMAGE_LINE.search(l)]
    paras = [l for l in lines[start:end] if l and not IMAGE_LINE.search(l)]
    return paras, {"image_lines_removed": removed_images,
                   "lines_before_story": start, "lines_after_story": len(lines) - end}


def quote_issues(paras: list[str]) -> list[str]:
    """Paragraphs whose quotation marks do not pair up (reported, not corrected)."""
    out = []
    for p in paras:
        opens = p.count("‘") + p.count("“")
        closes = len(re.findall(r"’(?!\w)", p)) + p.count("”")
        if opens != closes:
            out.append(p[:60] + ("…" if len(p) > 60 else ""))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, help="a saved copy of the page (.html) or of the story (.txt)")
    args = ap.parse_args()

    if args.raw:
        raw = args.raw.read_text(encoding="utf-8-sig", errors="replace")
        is_html = args.raw.suffix.lower() in (".html", ".htm") or "<html" in raw[:2000].lower()
        source = HERE / ("source_the_eyes_have_it.html" if is_html else "source_the_eyes_have_it.txt")
        origin = f"uploaded file: {args.raw.name}"
    else:
        req = urllib.request.Request(CFG["source_url"], headers={"User-Agent": "Mozilla/5.0 (research)"})
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode("utf-8", errors="replace")
        is_html, source, origin = True, HERE / CFG["source_file"], CFG["source_url"]
    source.write_text(raw, encoding="utf-8")

    lines = html_to_lines(raw) if is_html else raw.splitlines()
    paras, report = clean(lines)
    if len(paras) < 10:
        raise SystemExit("Story not found in the source — check the file or the URL.")

    corpus = f"{CFG['title']}\n\nby {CFG['author']}\n\n\n" + "\n\n".join(paras) + "\n"
    CORPUS.write_text(corpus, encoding="utf-8")

    words = len(re.findall(r"[A-Za-z’']+", "\n".join(paras)))
    info = {
        "title": CFG["title"], "author": CFG["author"], "source": origin,
        "prepared_at": dt.datetime.now().isoformat(timespec="seconds"),
        "paragraphs": len(paras), "words": words,
        "corpus_sha256": hashlib.sha256(corpus.encode("utf-8")).hexdigest(),
        "noise_removed": report,
        "quotation_mark_issues_not_corrected": quote_issues(paras),
        "note": "The story is in copyright; the corpus is not redistributed. "
                "Recreate it with prepare_corpus.py and compare corpus_sha256.",
    }
    INFO.write_text(json.dumps(info, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Corpus: {len(paras)} paragraphs, ~{words} words")
    print(f"Removed: {report['lines_before_story']} lines before the story, "
          f"{report['lines_after_story']} lines after it, {len(report['image_lines_removed'])} image caption line(s)")
    print(f"Quotation-mark slips on the source page (kept as published): {len(info['quotation_mark_issues_not_corrected'])}")
    print(f"SHA-256: {info['corpus_sha256'][:16]}…  -> corpus_info.json")


if __name__ == "__main__":
    main()
