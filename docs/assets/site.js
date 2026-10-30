/* The Eyes Have It: a synthetic reading. Site behaviour. */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(hover: none)").matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  // Fallbacks, used only if data/results.json cannot be loaded (e.g. the page opened from disk).
  var DEFAULT_PARTIAL = { total_sentences: 99, selection: [
    { part: 1, name: "Beginning", sentences: [1, 33], strategy: "first", lines_read: [1, 2, 3, 4, 5, 6, 7] },
    { part: 2, name: "Middle", sentences: [34, 66], strategy: "random", lines_read: [35, 38, 41, 42, 57, 62, 66] },
    { part: 3, name: "End", sentences: [67, 99], strategy: "last", lines_read: [93, 94, 95, 96, 97, 98, 99] }
  ]};
  var DEFAULT_FIGURES = ["fig1_heatmap", "fig2_bubble_all_themes", "fig3a_bubble_stage_I", "fig3b_bubble_stage_II",
    "fig3c_bubble_stage_III", "fig4_stage_share", "fig5_dominant_stage_timeline", "fig6_dimensions_by_segment",
    "fig7_senses_vs_sight"].map(function (f) { return { file: f, title: f.replace(/_/g, " ") }; });

  var state = { results: null, results10: null, segments: 20, showLLM: false, figures: [], lbIndex: 0, citeStyle: "mla" };

  /* ================================================================ theme */
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  $("#theme-toggle").addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("eyes-theme", next);
    drawCharts(false);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (!root.getAttribute("data-theme")) drawCharts(false);
  });

  /* ================================================================ top bar, nav, progress, back to top */
  var hero = $(".hero"), topbar = $(".topbar"), heroVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      topbar.classList.toggle("on-hero", entries[0].intersectionRatio > 0.12);
    }, { threshold: [0, 0.12, 0.5] }).observe(hero);

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$(".navlinks a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$(".navlinks a").forEach(function (a) {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      if (el) navObserver.observe(el);
    });

    // a beam of lamplight passes over each section title once
    var sweepObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("lit"); sweepObserver.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -15% 0px" });
    $$("h2.sweep").forEach(function (h) { sweepObserver.observe(h); });
  }

  var bar = $("#progress-bar"), toTop = $("#to-top"), steps = $("#steps");
  var stepItems = steps ? $$("li", steps) : [];
  function onScroll() {
    var doc = document.documentElement, max = doc.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? clamp(scrollY / max, 0, 1) : 0) + ")";
    toTop.classList.toggle("show", scrollY > innerHeight * 0.9);
    if (steps) {
      var r = steps.getBoundingClientRect(), line = innerHeight * 0.62;
      steps.style.setProperty("--fill", clamp((line - r.top) / r.height, 0, 1).toFixed(3));
      stepItems.forEach(function (li) { li.classList.toggle("reached", li.getBoundingClientRect().top < line); });
    }
  }
  var scrollQueued = false;
  addEventListener("scroll", function () {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () { scrollQueued = false; onScroll(); });
  }, { passive: true });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
  onScroll();

  /* ================================================================ spotlight that follows the pointer over panels */
  function addSpot(el) {
    if (coarse || !el || el.dataset.spot) return;
    el.dataset.spot = "1";
    el.classList.add("spot");
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }
  $$(".chart-fig, .verdicts > div, .cite-box, .prompt-wrap").forEach(addSpot);

  var portrait = $("#portrait");
  if (portrait && !coarse) portrait.addEventListener("pointermove", function (e) {
    var r = portrait.getBoundingClientRect();
    portrait.style.setProperty("--mx", (e.clientX - r.left) + "px");
    portrait.style.setProperty("--my", (e.clientY - r.top) + "px");
  });

  /* ================================================================ the lamp */
  var lampTexts = $$(".hero .lamp-text");
  var title = $(".hero-title");
  // lamp position in hero coordinates (px) and radius
  var lamp = { x: 0, y: 0, r: 0, glow: 0.14 };
  var mode = "intro";          // intro | rest | follow | wander
  var target = null, lastMove = 0, raf = 0, t0 = performance.now();

  function heroRect() { return hero.getBoundingClientRect(); }
  function titleCentre() {
    var h = heroRect(), t = title.getBoundingClientRect();
    return { x: t.left - h.left + t.width / 2, y: t.top - h.top + t.height / 2, w: t.width };
  }
  function restRadius() { return Math.max(title.offsetWidth * 0.78, 260); }
  function pointerRadius() { return clamp(innerWidth * 0.2, 170, 300); }

  function applyLamp(flick) {
    var h = heroRect();
    var r = lamp.r * (1 + flick * 0.035);
    hero.style.setProperty("--hx", lamp.x + "px");
    hero.style.setProperty("--hy", lamp.y + "px");
    hero.style.setProperty("--glow", (0.13 + flick * 0.025).toFixed(3));
    lampTexts.forEach(function (el) {
      var b = el.getBoundingClientRect();
      el.style.setProperty("--x", (lamp.x - (b.left - h.left)).toFixed(1) + "px");
      el.style.setProperty("--y", (lamp.y - (b.top - h.top)).toFixed(1) + "px");
      el.style.setProperty("--r", r.toFixed(1) + "px");
    });
    warmWindows(h);
  }

  // train windows warm up as the lamp passes over them
  var heroWins = [];
  function warmWindows(h) {
    if (!heroWins.length) return;
    var reach = lamp.r * 0.9;
    heroWins.forEach(function (w) {
      var b = w.getBoundingClientRect();
      var dx = b.left + b.width / 2 - h.left - lamp.x, dy = b.top + b.height / 2 - h.top - lamp.y;
      var near = clamp(1 - Math.sqrt(dx * dx + dy * dy) / reach, 0, 1);
      var v = near > 0 ? (near * near).toFixed(2) : "0";
      if (w._near !== v) { w._near = v; w.style.setProperty("--near", v); }
    });
  }

  // a gentle flicker, like a flame behind glass
  function flicker(t) {
    if (reduceMotion) return 0;
    return Math.sin(t * 0.0021) * 0.5 + Math.sin(t * 0.0057 + 1.3) * 0.3 + Math.sin(t * 0.013 + 0.4) * 0.2;
  }

  function tick(now) {
    raf = 0;
    if (!heroVisible || document.hidden) return;
    var c = titleCentre();
    if (mode === "intro") {
      var k = clamp((now - t0 - 350) / 1600, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      lamp.x = c.x - c.w * 0.62 + c.w * 1.24 * e; lamp.y = c.y; lamp.r = 130 + 80 * Math.sin(Math.PI * k);
      if (k >= 1) { mode = "rest"; target = { x: c.x, y: c.y, r: restRadius() }; lastMove = now; }
    } else if (mode === "follow" && target) {
      lamp.x += (target.x - lamp.x) * 0.22; lamp.y += (target.y - lamp.y) * 0.22; lamp.r += (target.r - lamp.r) * 0.15;
      if (now - lastMove > 3200 && !coarse) { mode = "rest"; target = { x: c.x, y: c.y, r: restRadius() }; lastMove = now; }
    } else if (mode === "rest" && target) {
      lamp.x += (target.x - lamp.x) * 0.06; lamp.y += (target.y - lamp.y) * 0.06; lamp.r += (target.r - lamp.r) * 0.06;
      if (!reduceMotion && now - lastMove > 4200) { mode = "wander"; t0 = now; }
    } else if (mode === "wander") {
      // the light drifts on its own: across the title, then down over the epigraph and back
      var s = (now - t0) / 1000;
      var epi = $(".epi-quote").getBoundingClientRect(), h = heroRect();
      var ey = epi.top - h.top + epi.height / 2;
      var mid = (c.y + ey) / 2, amp = (ey - c.y) / 2;
      var tx = c.x + Math.sin(s * 0.42) * c.w * 0.38;
      var ty = mid - Math.cos(s * 0.27) * amp;
      lamp.x += (tx - lamp.x) * 0.05; lamp.y += (ty - lamp.y) * 0.05;
      lamp.r += (Math.max(c.w * 0.42, 220) - lamp.r) * 0.04;
    }
    applyLamp(flicker(now));
    raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }

  hero.addEventListener("pointermove", function (ev) {
    var h = heroRect();
    mode = "follow"; lastMove = performance.now();
    target = { x: ev.clientX - h.left, y: ev.clientY - h.top, r: pointerRadius() };
    wake();
  });
  hero.addEventListener("pointerleave", function () {
    var c = titleCentre();
    mode = "rest"; lastMove = performance.now(); target = { x: c.x, y: c.y, r: restRadius() }; wake();
  });
  addEventListener("resize", function () { if (mode === "rest") { var c = titleCentre(); target = { x: c.x, y: c.y, r: restRadius() }; } wake(); });
  document.addEventListener("visibilitychange", wake);
  addEventListener("scroll", function () { if (heroVisible) wake(); }, { passive: true });

  if (reduceMotion) {
    var c0 = titleCentre(); lamp.x = c0.x; lamp.y = c0.y; lamp.r = restRadius(); mode = "rest"; target = { x: c0.x, y: c0.y, r: lamp.r };
    applyLamp(0);
  } else {
    var c1 = titleCentre(); lamp.x = c1.x - c1.w * 0.62; lamp.y = c1.y; lamp.r = 120; applyLamp(0);
  }
  wake();

  /* ================================================================ dust in the lamplight */
  (function motes() {
    var canvas = $("#motes");
    if (!canvas || reduceMotion || !canvas.getContext) return;
    var ctx = canvas.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2), W = 0, H = 0, ps = [];
    function size() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(clamp(W * H / 14000, 28, 90));
      ps = [];
      for (var i = 0; i < n; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.18, ph: Math.random() * 6.28 });
    }
    size(); addEventListener("resize", size);
    function frame(now) {
      if (heroVisible && !document.hidden) {
        ctx.clearRect(0, 0, W, H);
        var R = Math.max(lamp.r * 1.25, 160);
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i];
          p.x += p.vx + Math.sin(now * 0.0004 + p.ph) * 0.08; p.y += p.vy;
          if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
          if (p.x < -5) p.x = W + 5; else if (p.x > W + 5) p.x = -5;
          var dx = p.x - lamp.x, dy = p.y - lamp.y, d = Math.sqrt(dx * dx + dy * dy);
          var a = 0.035 + 0.75 * Math.pow(clamp(1 - d / R, 0, 1), 1.6);
          a *= 0.75 + 0.25 * Math.sin(now * 0.002 + p.ph);
          if (a < 0.03) continue;
          ctx.beginPath();
          ctx.fillStyle = "rgba(244, 220, 168, " + a.toFixed(3) + ")";
          ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ================================================================ the train of sentences */
  function buildTrain(el, partial, interactive) {
    el.innerHTML = "";
    var lit = {}, order = 0;
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
          w.dataset.n = n; w.dataset.part = p.name.toLowerCase(); w.dataset.read = lit[n] ? "1" : "";
          w.setAttribute("aria-label", "Sentence " + n + ", " + p.name.toLowerCase() + " part" + (lit[n] ? ", read before interpretation" : ""));
        }
        car.appendChild(w);
      }
      el.appendChild(car);
    });
    if (!interactive) { heroWins = $$(".win", el); return; }
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
      e.preventDefault(); w.tabIndex = -1; next.tabIndex = 0; next.focus();
    });
  }
  function lightLargeTrainWhenSeen() {
    var el = $("#train-large");
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { el.classList.add("lighting"); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
  }

  /* ================================================================ data binding + counters */
  function get(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function fmt(v) { return typeof v === "number" ? v.toLocaleString("en-GB") : (v == null ? "—" : String(v)); }
  function fillData(r) {
    if (r.corpus) {
      var n = r.corpus.noise_removed || {};
      r.corpus.noise_total = (n.lines_before_story || 0) + (n.lines_after_story || 0) + ((n.image_lines_removed || []).length);
      r.corpus.corpus_sha256_short = (r.corpus.corpus_sha256 || "").slice(0, 16) + "…";
    }
    try { r.meta.generated_at_human = new Date(r.meta.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { r.meta.generated_at_human = r.meta.generated_at; }
    $$("[data-k]").forEach(function (el) {
      var v = get(r, el.getAttribute("data-k"));
      if (v !== undefined && v !== null) el.textContent = fmt(v);
    });
    var llmOn = r.llm && r.llm.available;
    $$(".llm-ready").forEach(function (el) { el.hidden = !llmOn; });
    $$(".llm-empty").forEach(function (el) { el.hidden = !!llmOn; });
    if (llmOn) {
      var run = r.llm.run || {}, local = /ollama/i.test(run.engine || ""), d = $("#llm-run-desc");
      d.textContent = "";
      d.append(document.createTextNode(local ? "The local model " : "The model "));
      var m = document.createElement("strong"); m.textContent = run.model || "(not recorded)"; d.appendChild(m);
      var txt = " was run through " + (run.engine || "an unrecorded interface");
      if (run.chunks) txt += ", in " + run.chunks + " chunks of consecutive sentences";
      if (run.temperature !== undefined) txt += ", at temperature " + run.temperature + (run.seed !== undefined ? " with seed " + run.seed : "");
      d.append(document.createTextNode(txt + "."));
    }
    var box = $("#show-llm");
    box.disabled = !llmOn;
    box.parentElement.classList.toggle("disabled", !llmOn);
    if (!llmOn) box.parentElement.title = "Run the extraction in the notebook to add the model's counts.";
    if (llmOn && r.llm.paragraph) {
      $(".llm-paragraph").hidden = false;
      $("#llm-paragraph").innerHTML = r.llm.paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
    }
  }
  function startCounters() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, final = el.textContent.trim(), num = parseFloat(final.replace(/,/g, ""));
        if (!isFinite(num)) return;
        var dec = (final.split(".")[1] || "").length, start = performance.now();
        (function step(now) {
          var k = clamp((now - start) / 1200, 0, 1), eased = 1 - Math.pow(1 - k, 3);
          el.textContent = k < 1 ? (num * eased).toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : final;
          if (k < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.6 });
    $$(".count").forEach(function (el) { io.observe(el); });
  }

  /* ================================================================ charts */
  function palette() {
    var dark = isDark(), cs = getComputedStyle(root);
    return {
      dark: dark, ink: cs.getPropertyValue("--ink").trim(), soft: cs.getPropertyValue("--chart-ink").trim(),
      grid: cs.getPropertyValue("--chart-grid").trim(), paper: cs.getPropertyValue("--paper").trim(),
      curated: dark ? "#3987e5" : "#2a78d6", llm: dark ? "#d95926" : "#eb6834",
      pos: dark ? "#3987e5" : "#2a78d6", neg: dark ? "#e66767" : "#e34948",
      heat: dark ? [[0, cs.getPropertyValue("--paper").trim()], [0.001, "#184f95"], [0.4, "#2a78d6"], [0.7, "#6da7ec"], [1, "#cde2fb"]]
                 : [[0, "#eef0eb"], [0.001, "#cde2fb"], [0.35, "#86b6ef"], [0.6, "#3987e5"], [0.8, "#1c5cab"], [1, "#0d366b"]]
    };
  }
  function nice(label) { label = String(label || ""); return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(); }
  function baseLayout(c, extra, animate) {
    var l = {
      paper_bgcolor: c.paper, plot_bgcolor: c.paper,
      font: { family: "Literata, Georgia, serif", size: 13, color: c.soft },
      margin: { l: 56, r: 16, t: 30, b: 52 },
      hoverlabel: { bgcolor: c.dark ? "#232a38" : "#ffffff", bordercolor: c.grid, font: { family: "Literata, Georgia, serif", color: c.ink } },
      showlegend: false
    };
    if (animate && !reduceMotion) l.transition = { duration: 550, easing: "cubic-in-out" };
    for (var k in extra) l[k] = extra[k];
    return l;
  }
  var CONFIG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "toggleSpikelines"] };
  var DIMS = ["Sight", "Senses", "Performance", "Imagination"];
  function current() { return state.segments === 10 && state.results10 ? state.results10 : state.results; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  function drawDims(c, animate) {
    var r = current(), n = r.meta.segments, xs = [];
    for (var i = 1; i <= n; i++) xs.push(i);
    var traces = [], annotations = [], layout = {};
    var gap = 0.075, h = (1 - gap * 3) / 4;
    var llm = state.showLLM && r.llm && r.llm.available ? r.llm.dimension_counts : null;
    DIMS.forEach(function (d, k) {
      var ax = k === 0 ? "" : String(k + 1), top = 1 - k * (h + gap), bottom = top - h, label = nice(r.dimensions[d] || d);
      traces.push({ type: "bar", x: xs, y: r.dimension_counts[d], xaxis: "x", yaxis: "y" + ax, name: "Researcher lexicon",
        showlegend: k === 0, legendgroup: "lexicon", marker: { color: c.curated, line: { color: c.paper, width: 1.5 } },
        hovertemplate: label + "<br>Segment %{x}: %{y} hit(s)<extra>lexicon</extra>" });
      if (llm) traces.push({ type: "scatter", mode: "lines+markers", x: xs, y: llm[d], xaxis: "x", yaxis: "y" + ax, name: "LLM extraction (verified)",
        showlegend: k === 0, legendgroup: "llm", line: { color: c.llm, width: 2 }, marker: { size: 7, color: c.llm, line: { color: c.paper, width: 1.5 } },
        hovertemplate: label + "<br>Segment %{x}: %{y} hit(s)<extra>LLM</extra>" });
      layout["yaxis" + ax] = { domain: [bottom, top], anchor: "x", gridcolor: c.grid, zeroline: false, rangemode: "tozero", tickfont: { size: 11 }, dtick: 1, fixedrange: true };
      annotations.push({ text: "<b>" + label + "</b>  " + sum(r.dimension_counts[d]) + " hits" + (llm ? ", LLM " + sum(llm[d]) : ""),
        xref: "paper", yref: "paper", x: 0, y: top + 0.012, xanchor: "left", yanchor: "bottom", showarrow: false, font: { size: 12.5, color: c.ink } });
    });
    layout.xaxis = { anchor: "y4", dtick: 1, range: [0.5, n + 0.5], gridcolor: c.grid, title: { text: "Narrative segment (story order)", font: { size: 12 } }, fixedrange: true };
    layout.annotations = annotations; layout.bargap = 0.22; layout.showlegend = !!llm;
    layout.legend = { orientation: "h", x: 1, xanchor: "right", y: 1.0, yanchor: "bottom", font: { size: 12, color: c.ink }, bgcolor: "rgba(0,0,0,0)" };
    var lay = baseLayout(c, layout, animate);
    if (llm) lay.margin.t = 58;
    Plotly.react("chart-dims", traces, lay, CONFIG);
  }
  function drawBalance(c, animate) {
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
    }, animate), CONFIG);
  }
  function drawHeat(c) {
    var r = state.results, keys = Object.keys(r.theme_counts), n = r.meta.segments, xs = [];
    for (var i = 1; i <= n; i++) xs.push(i);
    var labels = keys.map(function (k) {
      var p = k.split("_"), st = p[1], d = p.slice(2).join("_");
      return nice(r.dimensions[d] || d) + ": " + (r.stages[st] || st) + " (" + st + ")";
    });
    var z = keys.map(function (k) { return r.theme_counts[k]; });
    Plotly.react("chart-heat", [{
      type: "heatmap", z: z, x: xs, y: labels, colorscale: c.heat, xgap: 2, ygap: 2, showscale: false,
      text: z.map(function (row) { return row.map(function (v) { return v ? String(v) : ""; }); }), texttemplate: "%{text}", textfont: { size: 11 },
      hovertemplate: "%{y}<br>Segment %{x}: %{z} hit(s)<extra></extra>"
    }], baseLayout(c, {
      margin: { l: 10, r: 10, t: 16, b: 52 },
      xaxis: { dtick: 1, title: { text: "Narrative segment (story order)", font: { size: 12 } }, fixedrange: true, showgrid: false },
      yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 11.5, color: c.ink }, fixedrange: true, showgrid: false }
    }), CONFIG);
  }
  function drawCharts(animate) {
    if (!state.results) return;
    if (!window.Plotly) {
      ["chart-dims", "chart-balance", "chart-heat"].forEach(function (id) {
        $("#" + id).innerHTML = '<p class="chart-empty">The interactive chart needs the Plotly library, which loads from the internet. The JPG figures below show the same results.</p>';
      });
      return;
    }
    var c = palette();
    drawDims(c, animate); drawBalance(c, animate); drawHeat(c);
  }

  var seg = $(".seg");
  $$(".seg button").forEach(function (b, i) {
    b.addEventListener("click", function () {
      var n = Number(b.dataset.seg);
      if (n === 10 && !state.results10) return;
      state.segments = n;
      seg.style.setProperty("--seg-x", (i * 100) + "%");
      $$(".seg button").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
      drawCharts(true);
    });
  });
  $("#show-llm").addEventListener("change", function (e) { state.showLLM = e.target.checked; drawCharts(true); });

  /* ================================================================ gallery + lightbox */
  var lb = $("#lightbox"), lbImg = $("#lb-img");
  function showFigure(i, swap) {
    var figs = state.figures, f = figs[(i + figs.length) % figs.length];
    state.lbIndex = (i + figs.length) % figs.length;
    var apply = function () {
      lbImg.src = "figures/" + f.file + ".jpg"; lbImg.alt = f.title;
      $("#lb-caption").textContent = f.title;
      $("#lb-count").textContent = "Figure " + (state.lbIndex + 1) + " of " + figs.length;
      $("#lb-html").href = "interactive/" + f.file + ".html";
      $("#lb-jpg").href = lbImg.src;
      lbImg.classList.remove("swap");
    };
    if (swap && !reduceMotion) { lbImg.classList.add("swap"); setTimeout(apply, 180); } else apply();
  }
  function buildGallery(figs) {
    state.figures = figs;
    var g = $("#gallery");
    g.innerHTML = "";
    figs.forEach(function (f, i) {
      var b = document.createElement("button");
      b.className = "thumb"; b.type = "button";
      var frame = document.createElement("div"); frame.className = "frame";
      var img = document.createElement("img");
      img.src = "figures/" + f.file + ".jpg"; img.alt = f.title; img.loading = "lazy";
      frame.appendChild(img);
      var s = document.createElement("span"); s.textContent = f.title;
      b.appendChild(frame); b.appendChild(s);
      b.addEventListener("click", function () {
        showFigure(i, false);
        if (lb.showModal) lb.showModal(); else window.open(img.src, "_blank");
      });
      addSpot(b);
      g.appendChild(b);
    });
  }
  $("#lb-prev").addEventListener("click", function () { showFigure(state.lbIndex - 1, true); });
  $("#lb-next").addEventListener("click", function () { showFigure(state.lbIndex + 1, true); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); showFigure(state.lbIndex - 1, true); }
    if (e.key === "ArrowRight") { e.preventDefault(); showFigure(state.lbIndex + 1, true); }
  });
  lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });

  /* ================================================================ prompt */
  function showPrompt(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return !(l.trim() === "PROMPT" || /^Prompt to the/.test(l)); });
    $("#prompt-text").textContent = lines.join("\n").trim();
  }
  function copyText(btn, plain, html, label) {
    var done = function () { btn.textContent = "Copied"; btn.classList.add("done");
      setTimeout(function () { btn.textContent = label; btn.classList.remove("done"); }, 1800); };
    try {
      if (html && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" })
        })]).then(done, function () { navigator.clipboard.writeText(plain).then(done); });
        return;
      }
      if (navigator.clipboard) { navigator.clipboard.writeText(plain).then(done); return; }
    } catch (e) { /* fall through */ }
  }
  $("#copy-prompt").addEventListener("click", function () { copyText(this, $("#prompt-text").textContent, null, "Copy prompt"); });

  /* ================================================================ citation machine */
  var MLA_M = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  var FULL_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var IEEE_M = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
  function siteURL() {
    var u = location.origin + location.pathname.replace(/index\.html$/, "");
    return /^https?:/.test(u) ? u : "https://<your-username>.github.io/The_Eyes_Have_It_Synthetic_Reading/";
  }
  function citations() {
    var d = new Date(), day = d.getDate(), mo = d.getMonth(), yr = d.getFullYear(), url = siteURL();
    var iso = yr + "-" + String(mo + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    var T = "Synthetic Reading of Ruskin Bond’s “The Eyes Have It”: Sight, the Other Senses and the Performance of Seeing";
    var Tsent = "Synthetic reading of Ruskin Bond’s “The eyes have it”: Sight, the other senses and the performance of seeing";
    var Tharv = "Synthetic reading of Ruskin Bond’s ‘The Eyes Have It’: sight, the other senses and the performance of seeing";
    var inst = "Indian Institute of Technology (ISM) Dhanbad";
    var a = function (h) { return '<a href="' + url + '">' + url + "</a>"; };
    return {
      mla: { html: "Nandi, Simanta. <i>" + T + "</i>. " + inst + ", 2026, " + a() + ". Accessed " + day + " " + MLA_M[mo] + " " + yr + "." },
      apa: { html: "Nandi, S. (2026). <i>" + Tsent + "</i> [Digital humanities project]. " + inst + ". " + a() },
      chicago: { html: "Nandi, Simanta. <i>" + T + "</i>. Dhanbad: " + inst + ", 2026. Accessed " + FULL_M[mo] + " " + day + ", " + yr + ". " + a() + "." },
      harvard: { html: "Nandi, S. (2026) <i>" + Tharv + "</i>. Dhanbad: " + inst + ". Available at: " + a() + " (Accessed: " + day + " " + FULL_M[mo] + " " + yr + ")." },
      ieee: { html: "S. Nandi, “Synthetic reading of Ruskin Bond’s ‘The Eyes Have It’: Sight, the other senses and the performance of seeing,” " + inst + ", 2026. [Online]. Available: " + a() + ". [Accessed: " + IEEE_M[mo] + " " + day + ", " + yr + "]." },
      bibtex: { pre: "@misc{nandi2026eyes,\n  author       = {Nandi, Simanta},\n  title        = {Synthetic Reading of Ruskin Bond's ``The Eyes Have It'': Sight, the Other Senses and the Performance of Seeing},\n  year         = {2026},\n  howpublished = {Digital humanities project, Indian Institute of Technology (ISM) Dhanbad},\n  url          = {" + url + "},\n  note         = {Accessed: " + iso + ". Licensed under CC BY-NC 4.0}\n}" }
    };
  }
  var citeText = $("#cite-text");
  function renderCite(style, fade) {
    state.citeStyle = style;
    var c = citations()[style];
    var put = function () {
      if (c.pre) { citeText.innerHTML = ""; var pre = document.createElement("pre"); pre.textContent = c.pre; citeText.appendChild(pre); }
      else citeText.innerHTML = c.html;
      citeText.classList.remove("fade");
    };
    if (fade && !reduceMotion) { citeText.classList.add("fade"); setTimeout(put, 160); } else put();
  }
  $$(".cite-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".cite-tabs button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      renderCite(b.dataset.style, true);
    });
  });
  $(".cite-tabs").addEventListener("keydown", function (e) {
    var tabs = $$(".cite-tabs button"), i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      var n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); n.click();
    }
  });
  $("#cite-copy").addEventListener("click", function () {
    var c = citations()[state.citeStyle];
    if (c.pre) copyText(this, c.pre, null, "Copy citation");
    else copyText(this, citeText.innerText.trim(), "<p>" + c.html + "</p>", "Copy citation");
  });
  renderCite("mla", false);

  /* ================================================================ repository links */
  (function () {
    var host = location.hostname, parts = location.pathname.split("/").filter(Boolean);
    if (/\.github\.io$/.test(host)) {
      var owner = host.split(".")[0], repo = parts.length && !/\.html$/.test(parts[0]) ? parts[0] : host;
      $("#repo-link").href = "https://github.com/" + owner + "/" + repo;
      $("#notebook-link").href = "https://colab.research.google.com/github/" + owner + "/" + repo + "/blob/main/Synthetic_Reading_The_Eyes_Have_It.ipynb";
      $("#notebook-link").textContent = "Open the notebook in Colab";
    } else {
      $("#repo-link").href = "../README.md";
      $("#notebook-link").href = "../Synthetic_Reading_The_Eyes_Have_It.ipynb";
    }
  })();

  /* ================================================================ load */
  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  var heroTrain = $("#train-hero");
  buildTrain(heroTrain, DEFAULT_PARTIAL, false);
  buildTrain($("#train-large"), DEFAULT_PARTIAL, true);
  lightLargeTrainWhenSeen();
  if (!reduceMotion) requestAnimationFrame(function () { heroTrain.classList.add("arrive"); });

  fetch("data/prompt.txt", { cache: "no-cache" }).then(function (r) { return r.ok ? r.text() : Promise.reject(); })
    .then(showPrompt, function () { $("#prompt-text").textContent = "The prompt is in prompt.txt in the repository."; });

  getJSON("data/results.json").then(function (r) {
    state.results = r;
    fillData(r);
    if (r.partial_reading && r.partial_reading.selection) buildTrain($("#train-large"), r.partial_reading, true);
    buildGallery(r.figures && r.figures.length ? r.figures : DEFAULT_FIGURES);
    drawCharts(false);
    startCounters();
    return getJSON("data/results_10.json").then(function (r10) { state.results10 = r10; }, function () {
      var b = $('.seg button[data-seg="10"]'); b.disabled = true; b.title = "The 10-segment results are not available.";
    });
  }).catch(function () {
    buildGallery(DEFAULT_FIGURES);
    startCounters();
    ["chart-dims", "chart-balance", "chart-heat"].forEach(function (id) {
      $("#" + id).innerHTML = '<p class="chart-empty">The chart data (data/results.json) could not be loaded. Open the site from GitHub Pages or a local web server.</p>';
    });
  });
})();
