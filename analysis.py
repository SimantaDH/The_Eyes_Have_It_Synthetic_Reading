"""
STEP 6 — COMPUTATION AND VISUALISATION

Counts every phrase of the researcher-annotated lexicon (Theme_JSON.py) across N equal narrative
segments, compares the result with the verified LLM extraction, and draws eight figures —
each saved as an interactive HTML file (Plotly) AND as a JPG image (matplotlib; no browser needed).

Counting rules:
  * case-insensitive; curly quotes and dashes normalised; whole-phrase matches only
    (a phrase never matches inside a word or a contraction);
  * longest match wins: a phrase inside a longer matched phrase is not counted again;
  * segments are equal blocks of consecutive sentences in story order.

Outputs (folder `outputs/` for 20 segments, `outputs_10_segments/` for the robustness check):
  figures/fig1 … fig8 .jpg          static images (for GitHub, the report and the website)
  interactive/fig1 … fig8 .html     interactive versions (hover for exact counts)
  theme_counts_by_segment.csv       theme × segment counts (the numbers behind Figs. 1–5)
  dimension_counts_by_segment.csv   dimension × segment counts (Figs. 6–7)
  llm_dimension_counts_by_segment.csv  same, from the verified LLM items (Fig. 8)
  segments.csv                      the sentence range of each segment
  items_not_found.txt               lexicon phrases that do not occur verbatim (should be none)
  results.json                      every number above, for the website

Usage:
  python analysis.py                  # 20 segments (as in the reference study)
  python analysis.py --segments 10    # robustness check
  python analysis.py --site docs      # also copy figures + results.json into the website folder
"""

import argparse
import csv
import datetime as dt
import importlib.util
import json
import re
import shutil
from pathlib import Path

import pandas as pd

from common import CFG, CORPUS, HERE, equal_parts, normalise, phrase_pattern, sentences

STAGE_NAMES = dict(CFG["stages"])
DIMENSION_NAMES = dict(CFG["dimensions"])
DIM_ORDER = list(DIMENSION_NAMES)

# colour-blind-safe categorical slots (validated set) + neutral chrome
STAGE_COLOURS = {"I": "#2a78d6", "II": "#eb6834", "III": "#1baf7a"}
SERIES = {"curated": "#2a78d6", "llm": "#eb6834"}
DIVERGE = {"neg": "#e34948", "pos": "#2a78d6"}
INK, INK_2, MUTED, GRID, SURFACE = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#fcfcfb"
HEAT = ["#f4f3f0", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"]


# ------------------------------------------------------------------ data
def load_themes(path: Path = HERE / "Theme_JSON.py") -> dict:
    spec = importlib.util.spec_from_file_location("Theme_JSON", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.themes


def theme_parts(key: str) -> tuple[str, str]:
    _, stage, dim = key.split("_", 2)
    return stage, dim


def theme_label(key: str) -> str:
    stage, dim = theme_parts(key)
    return f"{DIMENSION_NAMES.get(dim, dim.upper())}: {STAGE_NAMES.get(stage, stage)} ({stage})"


def count(phrase_to_keys: dict, segs: list[str], keys: list[str]) -> tuple[pd.DataFrame, dict]:
    """Longest-match counting of phrases in each segment; each hit credited to all keys of the phrase."""
    alts = sorted(phrase_to_keys, key=len, reverse=True)
    counts = pd.DataFrame(0, index=keys, columns=range(1, len(segs) + 1))
    hits = {a: 0 for a in alts}
    if not alts:
        return counts, hits
    pat = re.compile(r"(?<!\w)(?<!\w')(" + "|".join(re.escape(a) for a in alts) + r")(?!\w)(?!'\w)")
    for n, seg in enumerate(segs, start=1):
        for m in pat.finditer(normalise(seg)):
            hits[m.group(1)] += 1
            for k in phrase_to_keys[m.group(1)]:
                counts.loc[k, n] += 1
    return counts, hits


def curated_counts(themes: dict, segs: list[str]):
    p2k = {}
    for key, items in themes.items():
        for it in items:
            p2k.setdefault(normalise(it), []).append(key)
    return count(p2k, segs, list(themes))


def llm_counts(segs: list[str]):
    """Dimension × segment counts from the verbatim-verified LLM items (None if no extraction yet)."""
    f = HERE / "llm_items_verified.csv"
    if not f.exists():
        return None
    p2k = {}
    with f.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if r["verbatim"] == "True" and r["dimension"] in DIMENSION_NAMES:
                keys = p2k.setdefault(normalise(r["item"]), [])
                if r["dimension"] not in keys:
                    keys.append(r["dimension"])
    if not p2k:
        return None
    counts, _ = count(p2k, segs, DIM_ORDER)
    return counts


def pearson(a, b):
    a, b = pd.Series(list(a), dtype=float), pd.Series(list(b), dtype=float)
    if a.std() == 0 or b.std() == 0:
        return None
    return round(float(a.corr(b)), 2)


def lexicon_overlap(themes: dict) -> dict | None:
    """Which lexicon phrases the LLM also extracted (exactly, or as a longer/shorter phrase)."""
    f = HERE / "llm_items_verified.csv"
    if not f.exists():
        return None
    with f.open(encoding="utf-8") as fh:
        llm_items = {normalise(r["item"]) for r in csv.DictReader(fh) if r["verbatim"] == "True"}
    rows, exact, partial = [], 0, 0
    for key, items in themes.items():
        stage, dim = theme_parts(key)
        for it in items:
            n = normalise(it)
            if n in llm_items:
                match = "exact"; exact += 1
            elif any(phrase_pattern(n).search(l) or phrase_pattern(l).search(n) for l in llm_items):
                match = "partial"; partial += 1
            else:
                match = "no"
            rows.append({"stage": stage, "dimension": dim, "phrase": it, "extracted_by_llm": match})
    pd.DataFrame(rows).to_csv(HERE / "lexicon_llm_overlap.csv", index=False)
    total = len(rows)
    return {"lexicon_phrases": total, "exact": exact, "partial": partial,
            "covered_pct": round(100 * (exact + partial) / total, 1) if total else 0}


def llm_paragraph(res: dict) -> str:
    llm = res["llm"]
    if not llm["available"]:
        return ""
    run_ = llm.get("run") or {}
    ver = llm.get("verification") or {}
    r = llm.get("overall_r")
    strength = ("closely" if r is not None and r >= 0.7 else "broadly" if r is not None and r >= 0.4 else
                "only weakly, so the counts above depend on the researcher's lexicon and should be read with that caution")
    fmt = lambda v: "n/a" if v is None else f"{v:.2f}"
    ag = llm.get("agreement_r") or {}
    cov = llm.get("lexicon_coverage") or {}
    return (f"**LLM replication (Fig. 8).** The local model ({run_.get('model', 'model not recorded')}"
            f"{', run through ' + run_['engine'] if run_.get('engine') else ''}"
            f"{', in ' + str(run_['chunks']) + ' chunks' if run_.get('chunks') else ''}) extracted {ver.get('items', '?')} phrases. "
            f"{ver.get('verbatim_pct', '?')}% occur verbatim in the story, and {ver.get('in_sentence_pct', '?')}% occur in the sentence "
            f"the model named. Counted across the same {res['meta']['segments']} segments, the verified extraction reproduces "
            f"the lexicon's distribution {strength} (overall r = {fmt(r)}; sight {fmt(ag.get('Sight'))}, other senses "
            f"{fmt(ag.get('Senses'))}, performance {fmt(ag.get('Performance'))}, imagination {fmt(ag.get('Imagination'))}). "
            f"The model also extracted {cov.get('exact', 0) + cov.get('partial', 0)} of the {cov.get('lexicon_phrases', '?')} "
            f"lexicon phrases ({cov.get('covered_pct', '?')}%), either exactly or as a longer or shorter phrase "
            f"(`lexicon_llm_overlap.csv`).")


def update_interpretation(res: dict, path: Path = HERE / "interpretation.md") -> bool:
    """Write the LLM replication paragraph between the markers in interpretation.md."""
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    start, end = "<!-- LLM_REPLICATION -->", "<!-- /LLM_REPLICATION -->"
    if start not in text:
        return False
    para = llm_paragraph(res)
    block = f"{start}\n{para}\n{end}" if para else start
    if end in text:
        text = text[:text.index(start)] + block + text[text.index(end) + len(end):]
    else:
        text = text.replace(start, block, 1)
    path.write_text(text, encoding="utf-8")
    return bool(para)


# ------------------------------------------------------------------ plotly (interactive)
def _layout(fig, title, x_title, y_title, height):
    fig.update_layout(
        title=dict(text=title, x=0, xanchor="left", font=dict(size=16, color=INK)),
        font=dict(family="system-ui, -apple-system, Segoe UI, sans-serif", size=12, color=INK_2),
        plot_bgcolor=SURFACE, paper_bgcolor=SURFACE, height=height, width=1100,
        margin=dict(l=20, r=20, t=80, b=60), hoverlabel=dict(bgcolor="white", font=dict(color=INK)))
    fig.update_xaxes(title=x_title, gridcolor=GRID, linecolor="#c3c2b7", tickfont=dict(color=MUTED), dtick=1)
    fig.update_yaxes(title=y_title, gridcolor=GRID, linecolor="#c3c2b7", tickfont=dict(color=INK_2))
    return fig


def p_heatmap(c, title):
    import plotly.graph_objects as go
    labels = [theme_label(k) for k in c.index]
    scale = [[i / (len(HEAT) - 1), col] for i, col in enumerate(HEAT)]
    fig = go.Figure(go.Heatmap(z=c.values, x=list(c.columns), y=labels, colorscale=scale, xgap=2, ygap=2,
                               text=c.where(c > 0, "").astype(str).values, texttemplate="%{text}",
                               colorbar=dict(title="Hits", outlinewidth=0),
                               hovertemplate="%{y}<br>Segment %{x}: %{z} hit(s)<extra></extra>"))
    _layout(fig, title, "Narrative segment (story order)", "", 140 + 36 * len(labels))
    fig.update_yaxes(autorange="reversed", showgrid=False); fig.update_xaxes(showgrid=False)
    return fig


def p_bubble(c, keys, title):
    import plotly.graph_objects as go
    fig = go.Figure()
    for st in STAGE_NAMES:
        rows = [k for k in keys if theme_parts(k)[0] == st]
        xs, ys, ss = [], [], []
        for k in rows:
            for seg, v in c.loc[k].items():
                if v > 0:
                    xs.append(seg); ys.append(theme_label(k)); ss.append(int(v))
        if rows:
            fig.add_trace(go.Scatter(x=xs, y=ys, mode="markers", name=f"Stage {st}: {STAGE_NAMES[st]}",
                                     marker=dict(size=[9 + 8 * s for s in ss], color=STAGE_COLOURS[st], opacity=0.85,
                                                 line=dict(color=SURFACE, width=2)),
                                     customdata=ss, hovertemplate="%{y}<br>Segment %{x}: %{customdata} hit(s)<extra></extra>"))
    order = [theme_label(k) for k in keys]
    _layout(fig, title, "Narrative segment (story order)", "", 150 + 40 * len(keys))
    fig.update_yaxes(categoryorder="array", categoryarray=order[::-1])
    fig.update_xaxes(range=[0.3, c.shape[1] + 0.7])
    fig.update_layout(legend=dict(orientation="h", y=1.02, yanchor="bottom", x=0))
    return fig


def p_stage_share(st_counts, title):
    import plotly.graph_objects as go
    share = (st_counts / st_counts.sum().replace(0, 1) * 100).round(1)
    fig = go.Figure()
    for st in STAGE_NAMES:
        fig.add_trace(go.Bar(x=list(share.columns), y=share.loc[st], name=f"Stage {st}: {STAGE_NAMES[st]}",
                             marker=dict(color=STAGE_COLOURS[st], line=dict(color=SURFACE, width=2)),
                             customdata=st_counts.loc[st],
                             hovertemplate=f"Stage {st}<br>Segment %{{x}}: %{{y}}% (%{{customdata}} hits)<extra></extra>"))
    _layout(fig, title, "Narrative segment (story order)", "Share of matched phrases (%)", 460)
    fig.update_layout(barmode="stack", bargap=0.15, legend=dict(orientation="h", y=1.02, yanchor="bottom", x=0))
    fig.update_yaxes(range=[0, 100])
    return fig


def p_dominant(st_counts, title):
    import plotly.graph_objects as go
    dom = st_counts.idxmax().where(st_counts.sum() > 0)
    fig = go.Figure()
    for st in STAGE_NAMES:
        segs = [s for s in st_counts.columns if dom[s] == st]
        fig.add_trace(go.Scatter(x=segs, y=[f"Stage {st}: {STAGE_NAMES[st]}"] * len(segs), mode="markers", name=st,
                                 marker=dict(size=[12 + 3 * int(st_counts.loc[st, s]) for s in segs],
                                             color=STAGE_COLOURS[st], line=dict(color=SURFACE, width=2)),
                                 customdata=[int(st_counts.loc[st, s]) for s in segs],
                                 hovertemplate="Segment %{x}: dominant = %{y} (%{customdata} hits)<extra></extra>"))
    _layout(fig, title, "Narrative segment (story order)", "", 330)
    fig.update_yaxes(categoryorder="array", categoryarray=[f"Stage {s}: {n}" for s, n in reversed(STAGE_NAMES.items())])
    fig.update_xaxes(range=[0.3, st_counts.shape[1] + 0.7]); fig.update_layout(showlegend=False)
    return fig


def p_dimensions(dim_counts, title, llm=None):
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    fig = make_subplots(rows=len(DIM_ORDER), cols=1, shared_xaxes=True, vertical_spacing=0.07,
                        subplot_titles=[f"{DIMENSION_NAMES[d]} — {int(dim_counts.loc[d].sum())} hits"
                                        + (f" (LLM: {int(llm.loc[d].sum())})" if llm is not None else "")
                                        for d in DIM_ORDER])
    for r, d in enumerate(DIM_ORDER, start=1):
        fig.add_trace(go.Bar(x=list(dim_counts.columns), y=dim_counts.loc[d], name="Researcher lexicon",
                             marker=dict(color=SERIES["curated"], line=dict(color=SURFACE, width=2)),
                             showlegend=(r == 1 and llm is not None),
                             hovertemplate=f"{DIMENSION_NAMES[d]} (lexicon)<br>Segment %{{x}}: %{{y}}<extra></extra>"), row=r, col=1)
        if llm is not None:
            fig.add_trace(go.Scatter(x=list(llm.columns), y=llm.loc[d], name="LLM extraction (verified)",
                                     mode="lines+markers", line=dict(color=SERIES["llm"], width=2),
                                     marker=dict(size=8, line=dict(color=SURFACE, width=2)), showlegend=(r == 1),
                                     hovertemplate=f"{DIMENSION_NAMES[d]} (LLM)<br>Segment %{{x}}: %{{y}}<extra></extra>"),
                          row=r, col=1)
    _layout(fig, title, "", "", 160 + 150 * len(DIM_ORDER))
    fig.update_xaxes(title_text="Narrative segment (story order)", row=len(DIM_ORDER), col=1)
    fig.update_yaxes(rangemode="tozero")
    fig.update_layout(bargap=0.2, showlegend=llm is not None, legend=dict(orientation="h", y=1.03, yanchor="bottom", x=0))
    for a in fig.layout.annotations:
        a.update(x=0, xanchor="left", font=dict(size=13, color=INK))
    return fig


def p_balance(dim_counts, title):
    import plotly.graph_objects as go
    bal = dim_counts.loc["Senses"] - dim_counts.loc["Sight"]
    fig = go.Figure(go.Bar(x=list(bal.index), y=bal.values,
                           marker=dict(color=[DIVERGE["pos"] if v > 0 else DIVERGE["neg"] for v in bal.values],
                                       line=dict(color=SURFACE, width=2)),
                           customdata=list(zip(dim_counts.loc["Senses"], dim_counts.loc["Sight"])),
                           hovertemplate="Segment %{x}<br>other senses %{customdata[0]} − sight %{customdata[1]} = %{y}<extra></extra>"))
    _layout(fig, title, "Narrative segment (story order)", "Other senses minus sight (hits)", 420)
    fig.add_hline(y=0, line_color="#c3c2b7")
    return fig


# ------------------------------------------------------------------ matplotlib (JPG)
def _mpl():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.edgecolor": "#c3c2b7",
                         "axes.labelcolor": INK_2, "xtick.color": MUTED, "ytick.color": INK_2,
                         "axes.titleweight": "bold", "axes.titlesize": 12, "axes.titlelocation": "left",
                         "figure.facecolor": "white", "axes.facecolor": SURFACE, "savefig.facecolor": "white"})
    return plt


def _save(plt, fig, path: Path):
    fig.savefig(path, dpi=200, bbox_inches="tight", pil_kwargs={"quality": 92})
    plt.close(fig)


def m_heatmap(c, title, path):
    plt = _mpl()
    from matplotlib.colors import LinearSegmentedColormap
    cmap = LinearSegmentedColormap.from_list("seq", HEAT)
    labels = [theme_label(k) for k in c.index]
    fig, ax = plt.subplots(figsize=(13, 0.42 * len(labels) + 1.6))
    ax.imshow(c.values, aspect="auto", cmap=cmap, vmin=0)
    ax.set_xticks(range(c.shape[1]), [str(x) for x in c.columns]); ax.set_yticks(range(len(labels)), labels)
    for (i, j), v in pd.DataFrame(c.values).stack().items():
        if v:
            ax.text(j, i, str(v), ha="center", va="center", fontsize=8.5, color="white" if v >= c.values.max() * 0.5 else INK)
    ax.set_xticks([x - 0.5 for x in range(1, c.shape[1])], minor=True)
    ax.set_yticks([y - 0.5 for y in range(1, len(labels))], minor=True)
    ax.grid(which="minor", color="white", linewidth=2); ax.tick_params(which="minor", length=0)
    ax.set_xlabel("Narrative segment (story order)"); ax.set_title(title)
    for s in ax.spines.values():
        s.set_visible(False)
    _save(plt, fig, path)


def m_bubble(c, keys, title, path):
    plt = _mpl()
    labels = [theme_label(k) for k in keys]
    fig, ax = plt.subplots(figsize=(13, 0.45 * len(keys) + 1.8))
    for y, k in enumerate(keys):
        st = theme_parts(k)[0]
        xs = [s for s, v in c.loc[k].items() if v > 0]
        ss = [int(c.loc[k, s]) for s in xs]
        ax.scatter(xs, [y] * len(xs), s=[40 + 70 * v for v in ss], color=STAGE_COLOURS[st], alpha=0.85,
                   edgecolors="white", linewidths=1.5, zorder=3)
    ax.set_yticks(range(len(keys)), labels); ax.invert_yaxis()
    ax.set_xticks(list(c.columns)); ax.set_xlim(0.3, c.shape[1] + 0.7)
    ax.grid(color=GRID, linewidth=0.8, zorder=0); ax.set_xlabel("Narrative segment (story order)")
    handles = [plt.Line2D([], [], marker="o", ls="", color=STAGE_COLOURS[s], markersize=9, label=f"Stage {s}: {n}")
               for s, n in STAGE_NAMES.items() if any(theme_parts(k)[0] == s for k in keys)]
    ax.legend(handles=handles, loc="lower left", bbox_to_anchor=(0, 1.01), ncol=3, frameon=False)
    ax.set_title(title, pad=30)
    _save(plt, fig, path)


def m_stage_share(st, title, path):
    plt = _mpl()
    share = st / st.sum().replace(0, 1) * 100
    fig, ax = plt.subplots(figsize=(13, 4.8))
    bottom = pd.Series(0.0, index=share.columns)
    for s in STAGE_NAMES:
        ax.bar(share.columns, share.loc[s], bottom=bottom, color=STAGE_COLOURS[s], edgecolor="white", linewidth=1.5,
               label=f"Stage {s}: {STAGE_NAMES[s]}", width=0.82)
        bottom += share.loc[s]
    ax.set_ylim(0, 100); ax.set_xticks(list(share.columns)); ax.set_ylabel("Share of matched phrases (%)")
    ax.set_xlabel("Narrative segment (story order)"); ax.grid(axis="y", color=GRID); ax.set_axisbelow(True)
    ax.legend(loc="lower left", bbox_to_anchor=(0, 1.01), ncol=3, frameon=False); ax.set_title(title, pad=30)
    _save(plt, fig, path)


def m_dominant(st, title, path):
    plt = _mpl()
    dom = st.idxmax().where(st.sum() > 0)
    names = list(STAGE_NAMES)
    fig, ax = plt.subplots(figsize=(13, 3.2))
    for s in names:
        xs = [x for x in st.columns if dom[x] == s]
        ax.scatter(xs, [names.index(s)] * len(xs), s=[80 + 25 * int(st.loc[s, x]) for x in xs],
                   color=STAGE_COLOURS[s], edgecolors="white", linewidths=1.5, zorder=3)
    ax.set_yticks(range(len(names)), [f"Stage {s}: {STAGE_NAMES[s]}" for s in names]); ax.invert_yaxis()
    ax.set_xticks(list(st.columns)); ax.set_xlim(0.3, st.shape[1] + 0.7); ax.set_ylim(len(names) - 0.4, -0.6)
    ax.grid(color=GRID, zorder=0); ax.set_xlabel("Narrative segment (story order)"); ax.set_title(title)
    _save(plt, fig, path)


def m_dimensions(dim, title, path, llm=None):
    plt = _mpl()
    fig, axes = plt.subplots(len(DIM_ORDER), 1, figsize=(13, 2.3 * len(DIM_ORDER) + 0.8), sharex=True)
    for ax, d in zip(axes, DIM_ORDER):
        ax.bar(dim.columns, dim.loc[d], color=SERIES["curated"], edgecolor="white", linewidth=1.5, width=0.8,
               label="Researcher lexicon", zorder=3)
        sub = f"{DIMENSION_NAMES[d]} — {int(dim.loc[d].sum())} hits"
        if llm is not None:
            ax.plot(llm.columns, llm.loc[d], color=SERIES["llm"], marker="o", markersize=5, linewidth=2,
                    markeredgecolor="white", label="LLM extraction (verified)", zorder=4)
            sub += f"  (LLM: {int(llm.loc[d].sum())})"
        ax.set_title(sub, fontsize=10.5); ax.grid(axis="y", color=GRID, zorder=0); ax.set_ylim(bottom=0)
        ax.yaxis.get_major_locator().set_params(integer=True)
    axes[-1].set_xticks(list(dim.columns)); axes[-1].set_xlabel("Narrative segment (story order)")
    axes[-1].set_xlim(0.4, dim.shape[1] + 0.6)
    if llm is not None:
        axes[0].legend(loc="lower right", bbox_to_anchor=(1.0, 1.0), frameon=False, ncol=2, fontsize=9)
    fig.suptitle(title, x=0.01, ha="left", fontweight="bold", fontsize=12.5)
    fig.tight_layout()
    _save(plt, fig, path)


def m_balance(dim, title, path):
    plt = _mpl()
    bal = dim.loc["Senses"] - dim.loc["Sight"]
    fig, ax = plt.subplots(figsize=(13, 4.2))
    ax.bar(bal.index, bal.values, color=[DIVERGE["pos"] if v > 0 else DIVERGE["neg"] for v in bal.values],
           edgecolor="white", linewidth=1.5, width=0.8, zorder=3)
    ax.axhline(0, color="#c3c2b7", linewidth=1)
    ax.set_xticks(list(bal.index)); ax.set_xlabel("Narrative segment (story order)")
    ax.set_ylabel("Other senses minus sight (hits)"); ax.grid(axis="y", color=GRID, zorder=0)
    ax.yaxis.get_major_locator().set_params(integer=True)
    lo, hi = min(bal.min(), -1), max(bal.max(), 1)
    ax.set_ylim(lo - 1.6, hi + 1.6); ax.set_xlim(0.4, len(bal) + 0.6)
    ax.text(0.006, 0.97, "▲ above 0: the other senses dominate", transform=ax.transAxes, ha="left", va="top", color=INK_2, fontsize=9)
    ax.text(0.006, 0.03, "▼ below 0: sight dominates", transform=ax.transAxes, ha="left", va="bottom", color=INK_2, fontsize=9)
    ax.set_title(title)
    _save(plt, fig, path)


# ------------------------------------------------------------------ run
FIG_INFO = [
    ("fig1_heatmap", "Fig. 1 — Frequency of each theme across the narrative segments"),
    ("fig2_bubble_all_themes", "Fig. 2 — Thematic distribution across the narrative (bubble size = frequency)"),
    ("fig3a_bubble_stage_I", "Fig. 3a — Stage I: {I}"),
    ("fig3b_bubble_stage_II", "Fig. 3b — Stage II: {II}"),
    ("fig3c_bubble_stage_III", "Fig. 3c — Stage III: {III}"),
    ("fig4_stage_share", "Fig. 4 — Which stage's vocabulary dominates each segment?"),
    ("fig5_dominant_stage_timeline", "Fig. 5 — Dominant stage per segment"),
    ("fig6_dimensions_by_segment", "Fig. 6 — Each dimension across the narrative (independent of the stages)"),
    ("fig7_senses_vs_sight", "Fig. 7 — Where knowledge comes from: other senses minus sight, per segment"),
    ("fig8_llm_replication", "Fig. 8 — Replication: researcher lexicon vs verified LLM extraction"),
]


def run(n_segments: int | None = None, out_dir: Path | None = None, site_dir: Path | None = None,
        show: bool = False) -> dict:
    n = n_segments or CFG["segments"]
    out = Path(out_dir) if out_dir else HERE / ("outputs" if n == CFG["segments"] else f"outputs_{n}_segments")
    (out / "figures").mkdir(parents=True, exist_ok=True)
    (out / "interactive").mkdir(parents=True, exist_ok=True)

    themes = load_themes()
    sents = sentences()
    parts = equal_parts(list(range(1, len(sents) + 1)), n)
    segs = [" ".join(sents[i - 1] for i in p) for p in parts]
    c, hits = curated_counts(themes, segs)
    keys = list(themes)
    st = c.groupby(lambda k: theme_parts(k)[0]).sum().reindex(list(STAGE_NAMES)).fillna(0).astype(int)
    dim = c.groupby(lambda k: theme_parts(k)[1]).sum().reindex(DIM_ORDER).fillna(0).astype(int)
    llm = llm_counts(segs)

    # ---- tables
    table = c.copy(); table.index = [theme_label(k) for k in keys]
    table.to_csv(out / "theme_counts_by_segment.csv", index_label="theme")
    dim.to_csv(out / "dimension_counts_by_segment.csv", index_label="dimension")
    if llm is not None:
        llm.to_csv(out / "llm_dimension_counts_by_segment.csv", index_label="dimension")
    pd.DataFrame({"segment": range(1, n + 1), "first_sentence": [p[0] for p in parts],
                  "last_sentence": [p[-1] for p in parts], "sentences": [len(p) for p in parts]}
                 ).to_csv(out / "segments.csv", index=False)
    missing = [i for i, h in hits.items() if h == 0]
    (out / "items_not_found.txt").write_text("Lexicon phrases that never occur verbatim in the story:\n" +
                                             ("\n".join(f"  - {m}" for m in missing) if missing else "  (none)"),
                                             encoding="utf-8")

    # ---- figures
    T = {k: t.format(**STAGE_NAMES) for k, t in FIG_INFO}
    figs = {}
    figs["fig1_heatmap"] = p_heatmap(c, T["fig1_heatmap"]); m_heatmap(c, T["fig1_heatmap"], out / "figures/fig1_heatmap.jpg")
    figs["fig2_bubble_all_themes"] = p_bubble(c, keys, T["fig2_bubble_all_themes"])
    m_bubble(c, keys, T["fig2_bubble_all_themes"], out / "figures/fig2_bubble_all_themes.jpg")
    for letter, s in zip("abc", STAGE_NAMES):
        name = f"fig3{letter}_bubble_stage_{s}"
        rows = [k for k in keys if theme_parts(k)[0] == s]
        figs[name] = p_bubble(c, rows, T[name]); m_bubble(c, rows, T[name], out / f"figures/{name}.jpg")
    figs["fig4_stage_share"] = p_stage_share(st, T["fig4_stage_share"]); m_stage_share(st, T["fig4_stage_share"], out / "figures/fig4_stage_share.jpg")
    figs["fig5_dominant_stage_timeline"] = p_dominant(st, T["fig5_dominant_stage_timeline"])
    m_dominant(st, T["fig5_dominant_stage_timeline"], out / "figures/fig5_dominant_stage_timeline.jpg")
    figs["fig6_dimensions_by_segment"] = p_dimensions(dim, T["fig6_dimensions_by_segment"])
    m_dimensions(dim, T["fig6_dimensions_by_segment"], out / "figures/fig6_dimensions_by_segment.jpg")
    figs["fig7_senses_vs_sight"] = p_balance(dim, T["fig7_senses_vs_sight"])
    m_balance(dim, T["fig7_senses_vs_sight"], out / "figures/fig7_senses_vs_sight.jpg")
    if llm is not None:
        figs["fig8_llm_replication"] = p_dimensions(dim, T["fig8_llm_replication"], llm)
        m_dimensions(dim, T["fig8_llm_replication"], out / "figures/fig8_llm_replication.jpg", llm)
    for name, fig in figs.items():
        fig.write_html(out / "interactive" / f"{name}.html", include_plotlyjs="cdn")

    # ---- results.json
    verif = HERE / "llm_verification.json"
    runlog = HERE / "llm_run_log.json"
    info = HERE / "corpus_info.json"
    pr = HERE / "partial_reading_index.json"
    agreement = {d: pearson(dim.loc[d], llm.loc[d]) for d in DIM_ORDER} if llm is not None else None
    overall = pearson(dim.values.flatten(), llm.values.flatten()) if llm is not None else None
    results = {
        "meta": {"title": CFG["title"], "author": CFG["author"], "sentences": len(sents), "segments": n,
                 "lexicon_items": sum(len(v) for v in themes.values()), "hits": int(c.values.sum()),
                 "items_not_found": missing, "generated_at": dt.datetime.now().isoformat(timespec="seconds")},
        "corpus": json.loads(info.read_text(encoding="utf-8")) if info.exists() else None,
        "partial_reading": json.loads(pr.read_text(encoding="utf-8")) if pr.exists() else None,
        "stages": STAGE_NAMES, "dimensions": DIMENSION_NAMES, "stage_sentences": CFG.get("stage_sentences"),
        "segment_ranges": [[p[0], p[-1]] for p in parts],
        "theme_counts": {k: [int(v) for v in c.loc[k]] for k in keys},
        "theme_sizes": {k: len(v) for k, v in themes.items()},
        "stage_counts": {s: [int(v) for v in st.loc[s]] for s in STAGE_NAMES},
        "dimension_counts": {d: [int(v) for v in dim.loc[d]] for d in DIM_ORDER},
        "dominant_stage": [None if pd.isna(x) else x for x in st.idxmax().where(st.sum() > 0)],
        "senses_minus_sight": [int(v) for v in (dim.loc["Senses"] - dim.loc["Sight"])],
        "llm": {"available": llm is not None,
                "run": json.loads(runlog.read_text(encoding="utf-8")) if runlog.exists() else None,
                "verification": json.loads(verif.read_text(encoding="utf-8")) if verif.exists() else None,
                "dimension_counts": {d: [int(v) for v in llm.loc[d]] for d in DIM_ORDER} if llm is not None else None,
                "agreement_r": agreement, "overall_r": overall, "lexicon_coverage": lexicon_overlap(themes)},
        "figures": [{"file": k, "title": T[k]} for k in figs],
    }
    results["llm"]["paragraph"] = llm_paragraph(results)
    (out / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    if n == CFG["segments"]:
        update_interpretation(results)

    if site_dir:
        site = Path(site_dir)
        (site / "figures").mkdir(parents=True, exist_ok=True)
        (site / "interactive").mkdir(parents=True, exist_ok=True)
        (site / "data").mkdir(parents=True, exist_ok=True)
        suffix = "" if n == CFG["segments"] else f"_{n}"
        for jpg in (out / "figures").glob("*.jpg"):
            shutil.copy(jpg, site / "figures" / (jpg.stem + suffix + ".jpg"))
        for html in (out / "interactive").glob("*.html"):
            shutil.copy(html, site / "interactive" / (html.stem + suffix + ".html"))
        shutil.copy(out / "results.json", site / "data" / f"results{suffix}.json")
        if (HERE / "prompt.txt").exists():
            shutil.copy(HERE / "prompt.txt", site / "data" / "prompt.txt")
        (site / ".nojekyll").write_text("", encoding="utf-8")

    print(f"{len(sents)} sentences -> {n} segments | {results['meta']['lexicon_items']} lexicon phrases, "
          f"{results['meta']['hits']} hits | {len(missing)} not found | "
          f"LLM: {'yes, overall r = ' + str(overall) if llm is not None else 'no extraction yet'}")
    print(f"Saved {len(list((out / 'figures').glob('*.jpg')))} JPG figures in {out / 'figures'}")
    if show:
        for f in figs.values():
            f.update_layout(width=None).show()
    return {"figures": figs, "counts": table, "dimensions": dim, "stages": st, "llm": llm, "results": results}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--segments", type=int, default=None)
    ap.add_argument("--site", type=Path, default=None, help="website folder to update (e.g. docs)")
    a = ap.parse_args()
    run(a.segments, site_dir=a.site)


if __name__ == "__main__":
    main()
