/* The Eyes Have It: a synthetic reading. Site behaviour. */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  // Fallback design, used only if data/results.json cannot be loaded (e.g. opened from disk).
  var DEFAULT_PARTIAL = { total_sentences: 99, selection: [
    { part: 1, name: "Beginning", sentences: [1, 33], strategy: "first", lines_read: [1, 2, 3, 4, 5, 6, 7] },
    { part: 2, name: "Middle", sentences: [34, 66], strategy: "random", lines_read: [35, 38, 41, 42, 57, 62, 66] },
    { part: 3, name: "End", sentences: [67, 99], strategy: "last", lines_read: [93, 94, 95, 96, 97, 98, 99] }
  ]};
  var DEFAULT_FIGURES = ["fig1_heatmap", "fig2_bubble_all_themes", "fig3a_bubble_stage_I", "fig3b_bubble_stage_II",
    "fig3c_bubble_stage_III", "fig4_stage_share", "fig5_dominant_stage_timeline", "fig6_dimensions_by_segment",
    "fig7_senses_vs_sight"].map(function (f) { return { file: f, title: f.replace(/_/g, " ") }; });

  var state = { results: null, results10: null, segments: 20, showLLM: false };

  /* ---------------------------------------------------------------- theme */
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  $("#theme-toggle").addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("eyes-theme", next);
    drawCharts();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (!root.getAttribute("data-theme")) drawCharts();
  });

  /* ---------------------------------------------------------------- top bar over the hero */
  var hero = $(".hero"), topbar = $(".topbar");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      topbar.classList.toggle("on-hero", entries[0].intersectionRatio > 0.12);
    }, { threshold: [0, 0.12, 0.5] }).observe(hero);
  }
  var navObserver = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      $$(".navlinks a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
    });
  }, { rootMargin: "-45% 0px -50% 0px" }) : null;
  if (navObserver) $$(".navlinks a").forEach(function (a) {
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (el) navObserver.observe(el);
  });

  /* ---------------------------------------------------------------- the lamp */
  var title = $(".hero-title");
  var lamp = { x: 0.5, y: 0.5, r: 0, target: null, raf: 0 };
  function restRadius() { return Math.max(title.offsetWidth * 0.78, 260); }
  function pointerRadius() { return Math.min(Math.max(window.innerWidth * 0.2, 170), 300); }
  function applyLamp() {
    var w = title.offsetWidth, h = title.offsetHeight;
    title.style.setProperty("--x", (lamp.x * w).toFixed(1) + "px");
    title.style.setProperty("--y", (lamp.y * h).toFixed(1) + "px");
    title.style.setProperty("--r", lamp.r.toFixed(1) + "px");
  }
  function animateTo(tx, ty, tr, ms, done) {
    cancelAnimationFrame(lamp.raf);
    if (reduceMotion || ms === 0) { lamp.x = tx; lamp.y = ty; lamp.r = tr; applyLamp(); if (done) done(); return; }
    var sx = lamp.x, sy = lamp.y, sr = lamp.r, t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      lamp.x = sx + (tx - sx) * e; lamp.y = sy + (ty - sy) * e; lamp.r = sr + (tr - sr) * e;
      applyLamp();
      if (k < 1) lamp.raf = requestAnimationFrame(step); else if (done) done();
    })(t0);
  }
  var following = false;
  function heroMove(ev) {
    var hr = hero.getBoundingClientRect(), tr = title.getBoundingClientRect();
    hero.style.setProperty("--hx", (ev.clientX - hr.left) + "px");
    hero.style.setProperty("--hy", (ev.clientY - hr.top) + "px");
    var x = (ev.clientX - tr.left) / tr.width, y = (ev.clientY - tr.top) / tr.height;
    if (!following) { following = true; animateTo(x, y, pointerRadius(), 260); return; }
    cancelAnimationFrame(lamp.raf);
    lamp.x = x; lamp.y = y; lamp.r = pointerRadius(); applyLamp();
  }
  function heroLeave() {
    following = false;
    hero.style.setProperty("--hx", "50%"); hero.style.setProperty("--hy", "42%");
    animateTo(0.5, 0.5, restRadius(), 700);
  }
  if (reduceMotion) { animateTo(0.5, 0.5, restRadius(), 0); }
  else {
    // one orchestrated arrival: the lamp sweeps across the title, then settles
    lamp.x = -0.15; lamp.y = 0.5; lamp.r = 120; applyLamp();
    setTimeout(function () {
      animateTo(1.05, 0.5, 200, 1500, function () { if (!following) animateTo(0.5, 0.5, restRadius(), 900); });
    }, 350);
  }
  hero.addEventListener("pointermove", heroMove);
  hero.addEventListener("pointerleave", heroLeave);
  window.addEventListener("resize", function () { if (!following) { lamp.r = restRadius(); applyLamp(); } });

  /* ---------------------------------------------------------------- the train of sentences */
  function buildTrain(el, partial, interactive) {
    el.innerHTML = "";
    var lit = {};
    var order = 0;
    partial.selection.forEach(function (p) { p.lines_read.forEach(function (n) { lit[n] = true; }); });
    partial.selection.forEach(function (p) {
      var car = document.createElement("div");
      car.className = "carriage";
      car.setAttribute("data-label", p.name + " part, sentences " + p.sentences[0] + " to " + p.sentences[1] + " (" + p.strategy + " 20%)");
      for (var n = p.sentences[0]; n <= p.sentences[1]; n++) {
        var w = document.createElement(interactive ? "button" : "span");
        w.className = "win" + (lit[n] ? " lit" : "");
        if (lit[n]) w.style.setProperty("--i", order++);
        if (interactive) {
          w.type = "button";
          w.tabIndex = n === p.sentences[0] ? 0 : -1;
          w.dataset.n = n;
          w.dataset.part = p.name.toLowerCase();
          w.dataset.read = lit[n] ? "1" : "";
          w.setAttribute("aria-label", "Sentence " + n + ", " + p.name.toLowerCase() + " part" + (lit[n] ? ", read before interpretation" : ""));
        }
        car.appendChild(w);
      }
      el.appendChild(car);
    });
    if (!interactive) return;
    var tip = $("#train-tip");
    function describe(w) {
      tip.textContent = "Sentence " + w.dataset.n + " of " + partial.total_sentences + ", in the " + w.dataset.part + " part: " +
        (w.dataset.read ? "read before the interpretation was written." : "not read until after the impression was written.");
    }
    el.addEventListener("pointerover", function (e) { if (e.target.classList.contains("win")) describe(e.target); });
    el.addEventListener("focusin", function (e) { if (e.target.classList.contains("win")) describe(e.target); });
    el.addEventListener("keydown", function (e) {
      var w = e.target;
      if (!w.classList.contains("win")) return;
      var next = e.key === "ArrowRight" ? w.nextElementSibling : e.key === "ArrowLeft" ? w.previousElementSibling : null;
      if (!next) return;
      e.preventDefault();
      w.tabIndex = -1; next.tabIndex = 0; next.focus();
    });
  }

  /* ---------------------------------------------------------------- data binding */
  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function fmt(v) {
    if (typeof v === "number") return v.toLocaleString("en-GB");
    return v == null ? "—" : String(v);
  }
  function fillData(r) {
    if (r.corpus) {
      var n = r.corpus.noise_removed || {};
      r.corpus.noise_total = (n.lines_before_story || 0) + (n.lines_after_story || 0) + ((n.image_lines_removed || []).length);
      r.corpus.corpus_sha256_short = (r.corpus.corpus_sha256 || "").slice(0, 16) + "…";
    }
    try {
      r.meta.generated_at_human = new Date(r.meta.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { r.meta.generated_at_human = r.meta.generated_at; }
    $$("[data-k]").forEach(function (el) {
      var v = get(r, el.getAttribute("data-k"));
      if (v !== undefined && v !== null) el.textContent = fmt(v);
    });
    var llmOn = r.llm && r.llm.available;
    $$(".llm-ready").forEach(function (el) { el.hidden = !llmOn; });
    $$(".llm-empty").forEach(function (el) { el.hidden = !!llmOn; });
    var box = $("#show-llm");
    box.disabled = !llmOn;
    box.parentElement.classList.toggle("disabled", !llmOn);
    if (!llmOn) box.parentElement.title = "Run the extraction in the notebook to add the model's counts.";
    if (llmOn && r.llm.paragraph) {
      $(".llm-paragraph").hidden = false;
      $("#llm-paragraph").innerHTML = r.llm.paragraph
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
    }
  }

  /* ---------------------------------------------------------------- charts */
  function palette() {
    var dark = isDark(), cs = getComputedStyle(root);
    return {
      dark: dark,
      ink: cs.getPropertyValue("--ink").trim(), soft: cs.getPropertyValue("--chart-ink").trim(),
      grid: cs.getPropertyValue("--chart-grid").trim(), paper: cs.getPropertyValue("--paper").trim(),
      curated: dark ? "#3987e5" : "#2a78d6", llm: dark ? "#d95926" : "#eb6834",
      pos: dark ? "#3987e5" : "#2a78d6", neg: dark ? "#e66767" : "#e34948",
      heat: dark ? [[0, cs.getPropertyValue("--paper").trim()], [0.001, "#184f95"], [0.4, "#2a78d6"], [0.7, "#6da7ec"], [1, "#cde2fb"]]
                 : [[0, "#eef0eb"], [0.001, "#cde2fb"], [0.35, "#86b6ef"], [0.6, "#3987e5"], [0.8, "#1c5cab"], [1, "#0d366b"]]
    };
  }
  function baseLayout(c, extra) {
    var l = {
      paper_bgcolor: c.paper, plot_bgcolor: c.paper,
      font: { family: "Literata, Georgia, serif", size: 13, color: c.soft },
      margin: { l: 56, r: 16, t: 30, b: 52 },
      hoverlabel: { bgcolor: c.dark ? "#232a38" : "#ffffff", bordercolor: c.grid, font: { family: "Literata, Georgia, serif", color: c.ink } },
      showlegend: false
    };
    for (var k in extra) l[k] = extra[k];
    return l;
  }
  function nice(label) { label = String(label || ""); return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(); }
  var CONFIG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "toggleSpikelines"] };
  var DIMS = ["Sight", "Senses", "Performance", "Imagination"];
  function current() { return state.segments === 10 && state.results10 ? state.results10 : state.results; }

  function drawDims(c) {
    var r = current(), n = r.meta.segments, xs = [];
    for (var i = 1; i <= n; i++) xs.push(i);
    var traces = [], annotations = [], layout = {};
    var gap = 0.075, h = (1 - gap * 3) / 4;
    var llm = state.showLLM && r.llm && r.llm.available ? r.llm.dimension_counts : null;
    DIMS.forEach(function (d, k) {
      var ax = k === 0 ? "" : String(k + 1);
      var top = 1 - k * (h + gap), bottom = top - h;
      var label = nice(r.dimensions[d] || d);
      traces.push({ type: "bar", x: xs, y: r.dimension_counts[d], xaxis: "x", yaxis: "y" + ax, name: "Researcher lexicon",
        showlegend: k === 0, legendgroup: "lexicon",
        marker: { color: c.curated, line: { color: c.paper, width: 1.5 } },
        hovertemplate: label + "<br>Segment %{x}: %{y} hit(s)<extra>lexicon</extra>" });
      if (llm) traces.push({ type: "scatter", mode: "lines+markers", x: xs, y: llm[d], xaxis: "x", yaxis: "y" + ax, name: "LLM extraction (verified)",
        showlegend: k === 0, legendgroup: "llm",
        line: { color: c.llm, width: 2 }, marker: { size: 7, color: c.llm, line: { color: c.paper, width: 1.5 } },
        hovertemplate: label + "<br>Segment %{x}: %{y} hit(s)<extra>LLM</extra>" });
      layout["yaxis" + ax] = { domain: [bottom, top], anchor: "x", gridcolor: c.grid, zeroline: false, rangemode: "tozero",
        tickfont: { size: 11 }, dtick: 1, fixedrange: true };
      var total = r.dimension_counts[d].reduce(function (a, b) { return a + b; }, 0);
      annotations.push({ text: "<b>" + label + "</b>  " + total + " hits" + (llm ? ", LLM " + llm[d].reduce(function (a, b) { return a + b; }, 0) : ""),
        xref: "paper", yref: "paper", x: 0, y: top + 0.012, xanchor: "left", yanchor: "bottom", showarrow: false,
        font: { size: 12.5, color: c.ink } });
    });
    layout.xaxis = { anchor: "y4", dtick: 1, range: [0.5, n + 0.5], gridcolor: c.grid, title: { text: "Narrative segment (story order)", font: { size: 12 } }, fixedrange: true };
    layout.annotations = annotations;
    layout.bargap = 0.22;
    layout.showlegend = !!llm;
    layout.legend = { orientation: "h", x: 1, xanchor: "right", y: 1.0, yanchor: "bottom", font: { size: 12, color: c.ink }, bgcolor: "rgba(0,0,0,0)" };
    var lay = baseLayout(c, layout);
    if (llm) lay.margin.t = 58;
    Plotly.react("chart-dims", traces, lay, CONFIG);
  }

  function drawBalance(c) {
    var r = current(), xs = r.senses_minus_sight.map(function (_, i) { return i + 1; });
    Plotly.react("chart-balance", [{
      type: "bar", x: xs, y: r.senses_minus_sight,
      marker: { color: r.senses_minus_sight.map(function (v) { return v > 0 ? c.pos : c.neg; }), line: { color: c.paper, width: 1.5 } },
      customdata: xs.map(function (_, i) { return [r.dimension_counts.Senses[i], r.dimension_counts.Sight[i]]; }),
      hovertemplate: "Segment %{x}<br>other senses %{customdata[0]} minus sight %{customdata[1]} = %{y}<extra></extra>"
    }], baseLayout(c, {
      xaxis: { dtick: 1, range: [0.5, xs.length + 0.5], gridcolor: c.grid, title: { text: "Narrative segment (story order)", font: { size: 12 } }, fixedrange: true },
      yaxis: { gridcolor: c.grid, zerolinecolor: c.soft, dtick: 1, title: { text: "Other senses minus sight", font: { size: 12 } }, fixedrange: true },
      bargap: 0.22,
      annotations: [
        { text: "other senses dominate", xref: "paper", yref: "paper", x: 0.005, y: 1, xanchor: "left", yanchor: "top", showarrow: false, font: { size: 11.5, color: c.soft } },
        { text: "sight dominates", xref: "paper", yref: "paper", x: 0.005, y: 0, xanchor: "left", yanchor: "bottom", showarrow: false, font: { size: 11.5, color: c.soft } }
      ]
    }), CONFIG);
  }

  function drawHeat(c) {
    var r = state.results, keys = Object.keys(r.theme_counts), n = r.meta.segments, xs = [];
    for (var i = 1; i <= n; i++) xs.push(i);
    var labels = keys.map(function (k) {
      var p = k.split("_"), st = p[1], d = p.slice(2).join("_");
      return nice(r.dimensions[d] || d) + ": " + (r.stages[st] || st) + " (" + st + ")";
    });
    var z = keys.map(function (k) { return r.theme_counts[k]; });
    var text = z.map(function (row) { return row.map(function (v) { return v ? String(v) : ""; }); });
    Plotly.react("chart-heat", [{
      type: "heatmap", z: z, x: xs, y: labels, colorscale: c.heat, xgap: 2, ygap: 2, showscale: false,
      text: text, texttemplate: "%{text}", textfont: { size: 11 },
      hovertemplate: "%{y}<br>Segment %{x}: %{z} hit(s)<extra></extra>"
    }], baseLayout(c, {
      margin: { l: 10, r: 10, t: 16, b: 52 },
      xaxis: { dtick: 1, title: { text: "Narrative segment (story order)", font: { size: 12 } }, fixedrange: true, showgrid: false },
      yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 11.5, color: c.ink }, fixedrange: true, showgrid: false }
    }), CONFIG);
  }

  function drawCharts() {
    if (!state.results) return;
    if (!window.Plotly) {
      ["chart-dims", "chart-balance", "chart-heat"].forEach(function (id) {
        $("#" + id).innerHTML = '<p class="chart-empty">The interactive chart needs the Plotly library, which loads from the internet. The JPG figures below show the same results.</p>';
      });
      return;
    }
    var c = palette();
    drawDims(c); drawBalance(c); drawHeat(c);
  }

  $$(".seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      var n = Number(b.dataset.seg);
      if (n === 10 && !state.results10) return;
      state.segments = n;
      $$(".seg button").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
      drawCharts();
    });
  });
  $("#show-llm").addEventListener("change", function (e) { state.showLLM = e.target.checked; drawCharts(); });

  /* ---------------------------------------------------------------- gallery + lightbox */
  function buildGallery(figs) {
    var g = $("#gallery"), lb = $("#lightbox");
    g.innerHTML = "";
    figs.forEach(function (f) {
      var b = document.createElement("button");
      b.className = "thumb"; b.type = "button";
      var img = document.createElement("img");
      img.src = "figures/" + f.file + ".jpg"; img.alt = f.title; img.loading = "lazy";
      var s = document.createElement("span"); s.textContent = f.title;
      b.appendChild(img); b.appendChild(s);
      b.addEventListener("click", function () {
        $("#lb-img").src = img.src; $("#lb-img").alt = f.title;
        $("#lb-caption").textContent = f.title;
        $("#lb-html").href = "interactive/" + f.file + ".html";
        $("#lb-jpg").href = img.src;
        if (lb.showModal) lb.showModal(); else window.open(img.src, "_blank");
      });
      g.appendChild(b);
    });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  }

  /* ---------------------------------------------------------------- prompt */
  function showPrompt(text) {
    var lines = text.split(/\r?\n/).filter(function (l, i) {
      return !(l.trim() === "PROMPT" || /^Prompt to the/.test(l));
    });
    $("#prompt-text").textContent = lines.join("\n").trim();
  }
  $("#copy-prompt").addEventListener("click", function () {
    var t = $("#prompt-text").textContent, btn = this;
    var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy prompt"; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () { selectPrompt(); });
    else selectPrompt();
  });
  function selectPrompt() {
    var range = document.createRange(); range.selectNodeContents($("#prompt-text"));
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }

  /* ---------------------------------------------------------------- repository links */
  (function () {
    var host = location.hostname, parts = location.pathname.split("/").filter(Boolean);
    if (/\.github\.io$/.test(host)) {
      var owner = host.split(".")[0], repo = parts.length && !/\.html$/.test(parts[0]) ? parts[0] : host;
      var base = "https://github.com/" + owner + "/" + repo;
      $("#repo-link").href = base;
      $("#notebook-link").href = "https://colab.research.google.com/github/" + owner + "/" + repo + "/blob/main/Synthetic_Reading_The_Eyes_Have_It.ipynb";
      $("#notebook-link").textContent = "Open the notebook in Colab";
    } else {
      $("#repo-link").href = "../README.md";
      $("#notebook-link").href = "../Synthetic_Reading_The_Eyes_Have_It.ipynb";
    }
  })();

  /* ---------------------------------------------------------------- load */
  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  var heroTrain = $("#train-hero");
  buildTrain(heroTrain, DEFAULT_PARTIAL, false);
  buildTrain($("#train-large"), DEFAULT_PARTIAL, true);
  if (!reduceMotion) requestAnimationFrame(function () { heroTrain.classList.add("arrive"); });

  fetch("data/prompt.txt", { cache: "no-cache" }).then(function (r) { return r.ok ? r.text() : Promise.reject(); })
    .then(showPrompt, function () { $("#prompt-text").textContent = "The prompt is in prompt.txt in the repository."; });

  getJSON("data/results.json").then(function (r) {
    state.results = r;
    fillData(r);
    if (r.partial_reading && r.partial_reading.selection) {
      buildTrain($("#train-large"), r.partial_reading, true);
    }
    buildGallery(r.figures && r.figures.length ? r.figures : DEFAULT_FIGURES);
    drawCharts();
    return getJSON("data/results_10.json").then(function (r10) { state.results10 = r10; }, function () {
      var b = $('.seg button[data-seg="10"]'); b.disabled = true; b.title = "The 10-segment results are not available.";
    });
  }).catch(function () {
    buildGallery(DEFAULT_FIGURES);
    ["chart-dims", "chart-balance", "chart-heat"].forEach(function (id) {
      $("#" + id).innerHTML = '<p class="chart-empty">The chart data (data/results.json) could not be loaded. Open the site from GitHub Pages or a local web server.</p>';
    });
  });
})();
