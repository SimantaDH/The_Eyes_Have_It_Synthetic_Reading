"""Shared helpers: project settings, the story's sentences, normalisation and segmentation."""

import json
import re
from pathlib import Path

HERE = Path(__file__).parent
CFG = json.loads((HERE / "project.json").read_text(encoding="utf-8"))
CORPUS = HERE / CFG["corpus_file"]

ABBREV = re.compile(r"\b(Mr|Mrs|Ms|Dr|St|Mme)\.$")
TAG = re.compile(r"^(I|He|She|They|We)\s+(asked|said|replied|remarked|ventured|answered)\b")
SPLIT = re.compile(r"(?:(?<=[.!?])|(?<=[.!?][”’\"']))\s+(?=[“‘\"'A-Z0-9$])")


def paragraphs(path: Path = CORPUS) -> list[str]:
    """Story paragraphs, without the title and byline (the first two lines of the corpus)."""
    lines = [l.strip() for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    return lines[2:]


def sentences(path: Path = CORPUS) -> list[str]:
    """Rule-based sentence split; each sentence is one 'line' of the method."""
    out = []
    for para in paragraphs(path):
        for piece in SPLIT.split(para):
            piece = piece.strip()
            if not piece:
                continue
            if out and (ABBREV.search(out[-1]) or TAG.match(piece)):
                out[-1] += " " + piece
            else:
                out.append(piece)
    return out


def normalise(s: str) -> str:
    s = s.lower().replace("’", "'").replace("‘", '"').replace("“", '"').replace("”", '"')
    s = s.replace("—", " — ").replace("–", " – ")
    return re.sub(r"\s+", " ", s).strip()


def equal_parts(items: list, n: int) -> list[list]:
    size, rem = divmod(len(items), n)
    out, start = [], 0
    for i in range(n):
        end = start + size + (1 if i < rem else 0)
        out.append(items[start:end])
        start = end
    return out


def segments(n: int, path: Path = CORPUS) -> list[str]:
    return [" ".join(p) for p in equal_parts(sentences(path), n)]


def phrase_pattern(phrase: str) -> re.Pattern:
    """Whole-phrase match: not inside a word, and not part of a contraction (girl's, didn't)."""
    return re.compile(r"(?<!\w)(?<!\w')" + re.escape(normalise(phrase)) + r"(?!\w)(?!'\w)")
