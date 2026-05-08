/* rule_explorer.js — Detection Rule Timeline & Diff Explorer */
(function () {
  "use strict";

  const DATA_REPO = "https://elena6918.github.io/rule-explorer-data/";
  let activeRepo = "sigma"; // "sigma" | "ssc"

  function dataBase() { return DATA_REPO + activeRepo + "/"; }

  /* ── state ─────────────────────────────────────────────────── */
  let searchIndex = [];   // [{id, name, path, n, from, to, max_delta, cat}]
  let currentRule = null; // loaded rule JSON
  let selA = null;        // version_index of selection A (1-based)
  let selB = null;        // version_index of selection B
  let browseOffset = 0;   // how many browse results are currently shown
  const BROWSE_PAGE = 40;

  /* ── DOM refs (populated on DOMContentLoaded) ──────────────── */
  let $input, $dropdown, $rulePanel, $ruleHeader,
      $timelineSvg, $tooltip, $hint, $diffPanel,
      $diffHeader, $diffContent,
      $browseToggle, $browsePanel,
      $filterCat, $filterVersions, $filterChange, $filterYear,
      $browseCount, $browseList;

  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */
  document.addEventListener("DOMContentLoaded", () => {
    $input       = document.getElementById("re-search-input");
    $dropdown    = document.getElementById("re-search-dropdown");
    $rulePanel   = document.getElementById("re-rule-panel");
    $ruleHeader  = document.getElementById("re-rule-header");
    $timelineSvg = document.getElementById("re-timeline");
    $tooltip     = document.getElementById("re-tooltip");
    $hint        = document.getElementById("re-hint");
    $diffPanel   = document.getElementById("re-diff-panel");
    $diffHeader  = document.getElementById("re-diff-header");
    $diffContent = document.getElementById("re-diff-content");

    $browseToggle  = document.getElementById("re-browse-toggle");
    $browsePanel   = document.getElementById("re-browse-panel");
    $filterCat     = document.getElementById("re-filter-cat");
    $filterVersions= document.getElementById("re-filter-versions");
    $filterChange  = document.getElementById("re-filter-change");
    $filterYear    = document.getElementById("re-filter-year");
    $browseCount   = document.getElementById("re-browse-count");
    $browseList    = document.getElementById("re-browse-list");

    bindRepoSwitch();
    loadIndex();
    bindSearch();
    bindBrowse();
    bindTabs();
    window.addEventListener("resize", () => { if (currentRule) drawTimeline(); });

    // mousemove for tooltip positioning — must bind after $timelineSvg is set
    document.getElementById("re-timeline").addEventListener("mousemove", positionTooltip);
  });

  /* ══════════════════════════════════════════════════════════════
     DATA LOADING
  ══════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════
     REPO SWITCHER
  ══════════════════════════════════════════════════════════════ */
  function bindRepoSwitch() {
    document.querySelectorAll(".re-repo-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.repo === activeRepo) return;
        activeRepo = btn.dataset.repo;
        document.querySelectorAll(".re-repo-btn").forEach(b =>
          b.classList.toggle("active", b.dataset.repo === activeRepo));
        // reset all state for the new repo
        searchIndex = [];
        currentRule = null;
        selA = null; selB = null;
        $input.value = "";
        closeDropdown();
        show($rulePanel,  false);
        show($diffPanel,  false);
        show($browsePanel, false);
        $browseToggle.textContent = "Browse ▾";
        loadIndex();
      });
    });
  }

  function loadIndex() {
    fetch(dataBase() + "index.json")
      .then(r => r.json())
      .then(data => {
        searchIndex = data;
        populateCategoryFilter();
        renderBrowseResults();
      })
      .catch(() => console.error("Could not load rule index."));
  }

  function populateCategoryFilter() {
    const cats = [...new Set(searchIndex.map(r => r.cat))].sort();
    cats.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat + " (" + searchIndex.filter(r => r.cat === cat).length + ")";
      $filterCat.appendChild(opt);
    });
  }

  function loadRule(id) {
    show($rulePanel, false);
    show($diffPanel, false);
    fetch(dataBase() + id + ".json")
      .then(r => r.json())
      .then(data => {
        currentRule = data;
        selA = null;
        selB = null;
        renderRuleHeader();
        drawTimeline();
        updateHint();
        show($rulePanel, true);
      })
      .catch(() => alert("Failed to load rule data."));
  }

  /* ══════════════════════════════════════════════════════════════
     SEARCH
  ══════════════════════════════════════════════════════════════ */
  function bindSearch() {
    $input.addEventListener("input", onSearchInput);
    $input.addEventListener("keydown", onSearchKeydown);
    document.addEventListener("click", e => {
      if (!e.target.closest("#re-search-wrapper")) closeDropdown();
    });
  }

  function onSearchInput() {
    const q = $input.value.trim().toLowerCase();
    if (!q) { closeDropdown(); return; }

    const matches = searchIndex
      .filter(r => r.name.toLowerCase().includes(q))
      .slice(0, 40);

    if (!matches.length) { closeDropdown(); return; }

    $dropdown.innerHTML = matches.map((r, i) =>
      `<div class="re-dropdown-item" data-id="${r.id}" data-idx="${i}">
        <span class="re-item-name">${highlight(r.name, q)}</span>
        <span class="re-item-meta">${r.n} versions · ${r.from} → ${r.to}</span>
       </div>`
    ).join("");
    show($dropdown, true);

    $dropdown.querySelectorAll(".re-dropdown-item").forEach(el => {
      el.addEventListener("mousedown", e => {
        e.preventDefault();
        selectRule(el.dataset.id, el.querySelector(".re-item-name").textContent);
      });
    });
  }

  function onSearchKeydown(e) {
    const items = $dropdown.querySelectorAll(".re-dropdown-item");
    const active = $dropdown.querySelector(".re-dropdown-item.active");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = active ? active.nextElementSibling : items[0];
      if (next) { active && active.classList.remove("active"); next.classList.add("active"); next.scrollIntoView({block:"nearest"}); }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = active ? active.previousElementSibling : items[items.length - 1];
      if (prev) { active && active.classList.remove("active"); prev.classList.add("active"); prev.scrollIntoView({block:"nearest"}); }
    } else if (e.key === "Enter" && active) {
      e.preventDefault();
      selectRule(active.dataset.id, active.querySelector(".re-item-name").textContent);
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  }

  function selectRule(id, displayName) {
    $input.value = displayName.replace(/<[^>]+>/g, ""); // strip highlight tags
    closeDropdown();
    loadRule(id);
  }

  function closeDropdown() { show($dropdown, false); $dropdown.innerHTML = ""; }

  function highlight(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return esc(text);
    return esc(text.slice(0, idx))
      + `<mark>${esc(text.slice(idx, idx + query.length))}</mark>`
      + esc(text.slice(idx + query.length));
  }

  /* ══════════════════════════════════════════════════════════════
     RULE HEADER
  ══════════════════════════════════════════════════════════════ */
  function renderRuleHeader() {
    const r = currentRule;
    $ruleHeader.innerHTML =
      `<h4 class="re-rule-name">${esc(r.display_name)}</h4>
       <div class="re-rule-path text-muted small">${esc(r.rule_canonical)}</div>
       <div class="re-rule-stats small mt-1">
         <span class="badge re-badge">${r.versions.length} version${r.versions.length !== 1 ? "s" : ""}</span>
         <span class="re-stat-range">${r.versions[0].date.slice(0,10)} → ${r.versions[r.versions.length-1].date.slice(0,10)}</span>
       </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     TIMELINE SVG
  ══════════════════════════════════════════════════════════════ */
  const TL = { padL: 40, padR: 40, padTop: 50, padBot: 40, r: 8, minGap: 18 };

  /* map raw d_step (alignment cost, unbounded) to a dot color.
     Thresholds calibrated from sigma distribution:
       p25≈0.8  p50≈2.0  p75≈7.0 among non-noop steps.
     d_step=0 covers both true noops and pre-PGIR versions. */
  function deltaColor(delta) {
    if (delta <= 0)   return "#adb5bd";   // gray  — no change / no PGIR
    if (delta < 1.0)  return "#74c0fc";   // blue  — minor  (single predicate tweak)
    if (delta < 5.0)  return "#ffa94d";   // amber — moderate
    return "#ff6b6b";                     // red   — major
  }

  function deltaLabel(delta) {
    if (delta <= 0)   return "no change";
    if (delta < 1.0)  return "minor change";
    if (delta < 5.0)  return "moderate change";
    return "major change";
  }

  function drawTimeline() {
    const versions = currentRule.versions;
    const container = $timelineSvg.parentElement;
    const W = container.clientWidth || 800;
    const H = TL.padTop + 40 + TL.padBot;  // fixed height

    $timelineSvg.setAttribute("width", W);
    $timelineSvg.setAttribute("height", H);
    $timelineSvg.innerHTML = "";

    const axisY = TL.padTop;
    const axisX0 = TL.padL;
    const axisX1 = W - TL.padR;
    const axisW = axisX1 - axisX0;

    /* date-based x positions */
    const dates = versions.map(v => new Date(v.date).getTime());
    const tMin = dates[0], tMax = dates[dates.length - 1];
    const tRange = tMax - tMin || 1;

    let xs = dates.map(t => axisX0 + ((t - tMin) / tRange) * axisW);

    /* enforce minimum gap (nudge later dots right) */
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] - xs[i - 1] < TL.minGap) xs[i] = xs[i - 1] + TL.minGap;
    }
    /* if last dot overflows, compress the whole range */
    if (xs[xs.length - 1] > axisX1) {
      const newW = xs[xs.length - 1] - axisX0;
      xs = xs.map(x => axisX0 + (x - axisX0) * (axisW / newW));
    }

    const svg = ns => document.createElementNS("http://www.w3.org/2000/svg", ns);

    /* axis line */
    const line = svg("line");
    setAttrs(line, { x1: axisX0, y1: axisY, x2: axisX1, y2: axisY,
                     stroke: "var(--re-axis-color)", "stroke-width": 2 });
    $timelineSvg.appendChild(line);

    /* year labels */
    const years = new Set(versions.map(v => v.date.slice(0, 4)));
    years.forEach(yr => {
      const t = new Date(yr + "-01-01").getTime();
      if (t < tMin || t > tMax) return;
      const x = axisX0 + ((t - tMin) / tRange) * axisW;
      const tick = svg("line");
      setAttrs(tick, { x1: x, y1: axisY + 5, x2: x, y2: axisY + 12,
                       stroke: "var(--re-axis-color)", "stroke-width": 1 });
      $timelineSvg.appendChild(tick);
      const lbl = svg("text");
      setAttrs(lbl, { x, y: axisY + 26, "text-anchor": "middle",
                      "font-size": "11", fill: "var(--re-label-color)" });
      lbl.textContent = yr;
      $timelineSvg.appendChild(lbl);
    });

    /* highlight band between A and B */
    if (selA !== null && selB !== null) {
      const ia = versions.findIndex(v => v.vi === selA);
      const ib = versions.findIndex(v => v.vi === selB);
      if (ia >= 0 && ib >= 0) {
        const band = svg("rect");
        const xlo = Math.min(xs[ia], xs[ib]) - TL.r;
        const xhi = Math.max(xs[ia], xs[ib]) + TL.r;
        setAttrs(band, { x: xlo, y: axisY - TL.r - 2,
                         width: xhi - xlo, height: (TL.r + 2) * 2,
                         fill: "var(--re-band-color)", rx: TL.r });
        $timelineSvg.appendChild(band);
      }
    }

    /* dots */
    versions.forEach((v, i) => {
      const x = xs[i];
      const isA = v.vi === selA;
      const isB = v.vi === selB;
      const baseFill = deltaColor(v.delta ?? 0);
      const fill = isA ? "var(--re-dot-a)" : isB ? "var(--re-dot-b)" : baseFill;
      const r = (isA || isB) ? TL.r + 2 : TL.r;

      const circle = svg("circle");
      setAttrs(circle, { cx: x, cy: axisY, r, fill,
                         stroke: "var(--global-bg-color,#fff)", "stroke-width": 2,
                         style: "cursor:pointer;transition:fill 0.15s,r 0.15s" });
      circle.addEventListener("mouseenter", e => showTooltip(e, v, i));
      circle.addEventListener("mouseleave", hideTooltip);
      circle.addEventListener("click", () => handleDotClick(v.vi));
      $timelineSvg.appendChild(circle);

      /* A / B label */
      if (isA || isB) {
        const lbl = svg("text");
        setAttrs(lbl, { x, y: axisY - r - 4, "text-anchor": "middle",
                        "font-size": "11", "font-weight": "bold",
                        fill: isA ? "var(--re-dot-a)" : "var(--re-dot-b)" });
        lbl.textContent = isA ? "A" : "B";
        $timelineSvg.appendChild(lbl);
      }

      /* version number below */
      const vnum = svg("text");
      setAttrs(vnum, { x, y: axisY - r - (isA || isB ? 18 : 4),
                       "text-anchor": "middle", "font-size": "9",
                       fill: "var(--re-label-color)" });
      vnum.textContent = "v" + v.vi;
      /* show every label when <=15 versions, else every 5th */
      if (versions.length <= 15 || v.vi % 5 === 0 || isA || isB) {
        $timelineSvg.appendChild(vnum);
      }
    });
  }

  /* ── dot click logic ────────────────────────────────────────── */
  function handleDotClick(vi) {
    if (selA === null) {
      selA = vi;
    } else if (selB === null) {
      if (vi === selA) { selA = null; }
      else { selB = vi; if (selB < selA) { [selA, selB] = [selB, selA]; } }
    } else {
      selA = vi; selB = null;
      show($diffPanel, false);
    }
    drawTimeline();
    updateHint();
  }

  /* ── tooltip ────────────────────────────────────────────────── */
  function showTooltip(e, v, i) {
    const dotColor = deltaColor(v.delta ?? 0);
    const deltaHtml = i === 0 ? "" :
      `<br><span style="color:${dotColor};font-weight:600">● ${deltaLabel(v.delta ?? 0)}</span>`;
    $tooltip.innerHTML =
      `<strong>v${v.vi}</strong> &nbsp;<span class="re-tt-date">${v.date.slice(0,10)}</span>` +
      deltaHtml +
      `<br><span class="re-tt-subject">${esc(v.subject || "(no message)")}</span>`;
    $tooltip.style.display = "block";
    positionTooltip(e);
  }

  function hideTooltip() { $tooltip.style.display = "none"; }


  function positionTooltip(e) {
    if ($tooltip.style.display === "none") return;
    const rect = $timelineSvg.parentElement.getBoundingClientRect();
    const x = e.clientX - rect.left + 12;
    const y = e.clientY - rect.top - 10;
    $tooltip.style.left = Math.min(x, rect.width - 220) + "px";
    $tooltip.style.top = y + "px";
  }

  /* ── hint text + compare button ────────────────────────────── */
  function updateHint() {
    if (!selA && !selB) {
      $hint.innerHTML = `<span>Click a dot to select version <strong>A</strong></span>`;
    } else if (selA && !selB) {
      $hint.innerHTML = `<span><strong>A = v${selA}</strong> selected &mdash; click another dot to select <strong>B</strong></span>`;
    } else {
      $hint.innerHTML =
        `<span><strong>A = v${selA}</strong> &nbsp;&rarr;&nbsp; <strong>B = v${selB}</strong></span>` +
        `<button id="re-compare-btn" class="re-compare-btn">Compare versions</button>` +
        `<button id="re-reset-btn" class="re-reset-btn">Reset</button>`;
      document.getElementById("re-compare-btn").addEventListener("click", renderDiff);
      document.getElementById("re-reset-btn").addEventListener("click", () => {
        selA = null; selB = null;
        show($diffPanel, false);
        drawTimeline();
        updateHint();
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     PREDICATE LABEL PARSING
  ══════════════════════════════════════════════════════════════ */

  /* Parse a canonical predicate label into display parts.
     Label format: P:<field>|<op>|<norm_value_repr>|CTX:POS/NEG
     norm_value_repr is Python repr, e.g.:
       ('S', 'value')              → string
       ('X', 42)                   → other literal
       ('L', (('S', 'a'), ...))    → list of values
       ('D', (...))                → complex (dict-like)
  */
  function parsePredLabel(label) {
    if (!label.startsWith("P:")) return { field: label, op: "", val: "", ctx: "" };

    const body = label.slice(2);
    const p1 = body.indexOf("|");
    if (p1 < 0) return { field: body, op: "", val: "", ctx: "" };

    const field = body.slice(0, p1);
    const rest1 = body.slice(p1 + 1);
    const p2 = rest1.indexOf("|");
    if (p2 < 0) return { field, op: rest1, val: "", ctx: "" };

    const op = rest1.slice(0, p2);
    let remainder = rest1.slice(p2 + 1);

    // strip CTX suffix
    let ctx = "";
    if (remainder.endsWith("|CTX:POS")) { ctx = "POS"; remainder = remainder.slice(0, -8); }
    else if (remainder.endsWith("|CTX:NEG")) { ctx = "NEG"; remainder = remainder.slice(0, -8); }

    const val = reprToDisplay(remainder);
    return { field, op: opDisplay(op), val, ctx };
  }

  /* Convert Python repr value tuple to a human-readable string. */
  function reprToDisplay(repr) {
    repr = repr.trim();
    // ('S', 'value')
    const sMatch = repr.match(/^\('S',\s*'(.*)'\)$/s);
    if (sMatch) return sMatch[1].replace(/\\\\n/g, "↵").replace(/\\\\/g, "\\");

    // ('X', value) — numeric or other literal
    const xMatch = repr.match(/^\('X',\s*([^)]+)\)$/);
    if (xMatch) return xMatch[1].trim();

    // ('L', (...)) — list: collect all 'S' values, skip single-char type tags (S/L/X/D/N)
    if (repr.startsWith("('L',")) {
      const strings = [];
      const re = /'((?:[^'\\]|\\.)*)'/g;
      let m;
      while ((m = re.exec(repr)) !== null) {
        const s = m[1];
        if (s.length === 1 && s >= "A" && s <= "Z") continue; // skip type tags
        strings.push(s.replace(/\\\\n/g, "↵").replace(/\\\\/g, "\\"));
      }
      if (strings.length) {
        const preview = strings.slice(0, 4).join(", ");
        return strings.length > 4 ? preview + ` … (+${strings.length - 4})` : preview;
      }
    }

    // ('D', ...) or anything else — strip outer wrapper
    const dMatch = repr.match(/^\('D',\s*(.*)\)$/s);
    if (dMatch) return "[complex]";

    return repr;
  }

  /* Map canonical op names to display-friendly short form. */
  function opDisplay(op) {
    const MAP = {
      EQ: "=", NEQ: "≠",
      CONTAINS: "contains", NOT_CONTAINS: "not contains",
      STARTSWITH: "starts with", ENDSWITH: "ends with",
      MATCHES_REGEX: "~regex", NOT_MATCHES_REGEX: "!~regex",
      IN: "in", NOT_IN: "not in",
      GT: ">", GE: "≥", LT: "<", LE: "≤",
    };
    return MAP[op] || op;
  }

  /* ══════════════════════════════════════════════════════════════
     TREE UTILITIES
  ══════════════════════════════════════════════════════════════ */

  /* Walk backwards from version index `vi` to find the most
     recently stored (non-null) tree in the rule. */
  function getTreeForVersion(rule, vi) {
    const versions = rule.versions;
    const idx = versions.findIndex(v => v.vi === vi);
    for (let i = idx; i >= 0; i--) {
      if (versions[i].tree) return versions[i].tree;
    }
    return null;
  }

  /* Collect all predicate labels reachable from a tree node.
     Returns a Map<label, node_ref> so we can look up labels quickly. */
  function collectPredLabels(node) {
    const out = new Map();  // label → true
    function walk(n) {
      if (!n) return;
      if (n.t.startsWith("P:")) { out.set(n.t, true); return; }
      (n.c || []).forEach(walk);
    }
    walk(node);
    return out;
  }

  /* Extract field|op key from a predicate label (strips value + CTX).
     Used to match "same predicate, different value" for non-adjacent diffs. */
  function predFieldOpKey(label) {
    // label = P:field|op|val|CTX:x  — want "field|op"
    const body = label.startsWith("P:") ? label.slice(2) : label;
    const parts = body.split("|");
    return parts[0] + "|" + (parts[1] || "");
  }

  /* ── Annotation maps ─────────────────────────────────────────
     An annotation map is: Map<label, {status, diffs?}>
     status: "unchanged" | "deleted" | "inserted" | "changed-before" | "changed-after"
     diffs:  ["field"|"op"|"value"] (for changed pairs, which component changed)
  ─────────────────────────────────────────────────────────────── */

  /* Build annotation maps from stored precise adjacent-step alignment. */
  function buildAnnotationAdjacent(align) {
    const forA = new Map();  // labels of vA's predicates
    const forB = new Map();  // labels of vB's predicates

    (align.matched || []).forEach(lbl => {
      forA.set(lbl, { status: "unchanged" });
      forB.set(lbl, { status: "unchanged" });
    });
    (align.changed || []).forEach(({ a, b, diffs }) => {
      forA.set(a, { status: "changed-before", diffs });
      forB.set(b, { status: "changed-after",  diffs });
    });
    (align.deleted  || []).forEach(lbl => forA.set(lbl, { status: "deleted" }));
    (align.inserted || []).forEach(lbl => forB.set(lbl, { status: "inserted" }));

    return { forA, forB };
  }

  /* Build annotation maps via JS label-matching (non-adjacent pairs).
     Less precise than the Python aligner: detects same-field/op as "changed"
     instead of insert+delete, but accurately shows the full vA→vB span. */
  function buildAnnotationNonAdjacent(treeA, treeB) {
    const labelsA = collectPredLabels(treeA);  // Map<label, true>
    const labelsB = collectPredLabels(treeB);

    // Build field|op → label maps for detecting value-shift pairs
    const keyToLabelA = new Map();   // "field|op" → label (first seen)
    const keyToLabelB = new Map();
    labelsA.forEach((_, lbl) => {
      const k = predFieldOpKey(lbl);
      if (!keyToLabelA.has(k)) keyToLabelA.set(k, lbl);
    });
    labelsB.forEach((_, lbl) => {
      const k = predFieldOpKey(lbl);
      if (!keyToLabelB.has(k)) keyToLabelB.set(k, lbl);
    });

    const forA = new Map();
    const forB = new Map();

    labelsA.forEach((_, lbl) => {
      if (labelsB.has(lbl)) {
        forA.set(lbl, { status: "unchanged" });
      } else {
        // Check if same field|op exists in B (value/op changed)
        const key = predFieldOpKey(lbl);
        const counterpart = keyToLabelB.get(key);
        if (counterpart && !labelsB.has(lbl)) {
          forA.set(lbl, { status: "changed-before", diffs: ["value"] });
        } else {
          forA.set(lbl, { status: "deleted" });
        }
      }
    });

    labelsB.forEach((_, lbl) => {
      if (labelsA.has(lbl)) {
        forB.set(lbl, { status: "unchanged" });
      } else {
        const key = predFieldOpKey(lbl);
        const counterpart = keyToLabelA.get(key);
        if (counterpart && !labelsA.has(lbl)) {
          forB.set(lbl, { status: "changed-after", diffs: ["value"] });
        } else {
          forB.set(lbl, { status: "inserted" });
        }
      }
    });

    return { forA, forB };
  }

  /* ── Tree renderer ───────────────────────────────────────────
     Renders a single tree side (vA or vB) as annotated HTML.
     annotMap: Map<label, {status, diffs?}>
     unknownStatus: status to use for nodes not in the map ("unchanged")
  ─────────────────────────────────────────────────────────────── */

  const OP_DISPLAY = { "O:AND": "AND", "O:OR": "OR", "O:NOT": "NOT" };

  function renderTreeAnnotated(node, annotMap, depth) {
    if (!node) return "";
    depth = depth || 0;

    // Predicate leaf
    if (node.t.startsWith("P:")) {
      const ann    = annotMap.get(node.t) || { status: "unchanged" };
      const diffs  = ann.diffs || [];
      const { field, op, val, ctx } = parsePredLabel(node.t);

      const statusClass = {
        "unchanged":      "re-tree-unchanged",
        "deleted":        "re-tree-deleted",
        "inserted":       "re-tree-inserted",
        "changed-before": "re-tree-changed-before",
        "changed-after":  "re-tree-changed-after",
      }[ann.status] || "re-tree-unchanged";

      const ctxBadge = ctx === "NEG"
        ? `<span class="re-pred-ctx re-pred-neg">NOT</span>` : "";

      const fieldHtml = diffs.includes("field")
        ? `<span class="re-pred-field re-pred-hl-field">${esc(field)}</span>`
        : `<span class="re-pred-field">${esc(field)}</span>`;
      const opHtml = diffs.includes("op")
        ? `<span class="re-pred-op re-pred-hl-op">${esc(op)}</span>`
        : `<span class="re-pred-op">${esc(op)}</span>`;
      const valHtml = diffs.includes("value")
        ? `<span class="re-pred-val re-pred-hl-value">${esc(val)}</span>`
        : `<span class="re-pred-val">${esc(val)}</span>`;

      return `<div class="re-tree-node re-tree-leaf ${statusClass}">` +
               ctxBadge + fieldHtml + opHtml + valHtml +
             `</div>`;
    }

    // Operator node
    const opLabel = OP_DISPLAY[node.t] || node.t.replace("O:", "");
    const children = (node.c || []).map(ch => renderTreeAnnotated(ch, annotMap, depth + 1)).join("");

    // For NOT with a single child, keep the operator inline
    const opClass = node.t === "O:NOT" ? "re-tree-op re-tree-not" : "re-tree-op";

    return `<div class="${opClass}">` +
             `<span class="re-tree-op-kw">${opLabel}</span>` +
             `<div class="re-tree-children">${children}</div>` +
           `</div>`;
  }

  /* ── Count annotations in a tree ────────────────────────────── */
  function countAnnotations(tree, annotMap) {
    const counts = { changed: 0, deleted: 0, inserted: 0, unchanged: 0 };
    function walk(n) {
      if (!n) return;
      if (n.t.startsWith("P:")) {
        const st = (annotMap.get(n.t) || { status: "unchanged" }).status;
        if (st === "changed-before" || st === "changed-after") counts.changed++;
        else if (st === "deleted")   counts.deleted++;
        else if (st === "inserted")  counts.inserted++;
        else                         counts.unchanged++;
        return;
      }
      (n.c || []).forEach(walk);
    }
    walk(tree);
    return counts;
  }

  /* ── Top-level predicate diff renderer ──────────────────────── */
  function renderTreeDiff(vA, vB, rule) {
    const treeA = getTreeForVersion(rule, vA.vi);
    const treeB = getTreeForVersion(rule, vB.vi);

    if (!treeA && !treeB) {
      return `<div class="re-pred-unavail">Predicate graph not available for this rule
        <span class="re-pred-unavail-why">(no PGIR coverage)</span></div>`;
    }
    if (!treeA) {
      return `<div class="re-pred-unavail">Predicate graph not available for v${vA.vi}
        <span class="re-pred-unavail-why">(no PGIR coverage before this version)</span></div>`;
    }

    const vIdxA = rule.versions.findIndex(v => v.vi === vA.vi);
    const vIdxB = rule.versions.findIndex(v => v.vi === vB.vi);
    const isAdjacent = (vIdxB - vIdxA) === 1;

    // Build annotation maps
    let forA, forB, methodBadge;
    if (isAdjacent && vB.align && vB.align.matched !== undefined) {
      ({ forA, forB } = buildAnnotationAdjacent(vB.align));
      methodBadge = `<span class="re-pred-method-badge re-pred-method-precise">precise alignment</span>`;
    } else {
      ({ forA, forB } = buildAnnotationNonAdjacent(treeA, treeB || treeA));
      const steps = vIdxB - vIdxA;
      methodBadge = `<span class="re-pred-method-badge re-pred-method-approx">label-match · ${steps} step${steps !== 1 ? "s" : ""}</span>`;
    }

    // Summary counts (use forB as canonical: inserted/changed-after/unchanged live there)
    const countsA = countAnnotations(treeA, forA);
    const countsB = treeB ? countAnnotations(treeB, forB) : countsA;
    const nChanged  = countsA.changed;   // before side
    const nDeleted  = countsA.deleted;
    const nInserted = countsB.inserted;
    const nUnchanged= countsA.unchanged;

    const summaryParts = [];
    if (nChanged)   summaryParts.push(`<span class="re-pred-sum-mod">⬩ ${nChanged} modified</span>`);
    if (nDeleted)   summaryParts.push(`<span class="re-pred-sum-del">− ${nDeleted} deleted</span>`);
    if (nInserted)  summaryParts.push(`<span class="re-pred-sum-ins">+ ${nInserted} inserted</span>`);
    if (nUnchanged) summaryParts.push(`<span class="re-pred-sum-nc">= ${nUnchanged} unchanged</span>`);

    const treeAHtml = renderTreeAnnotated(treeA, forA, 0);
    const treeBHtml = treeB ? renderTreeAnnotated(treeB, forB, 0) : treeAHtml;

    return (
      `<div class="re-pred-summary">${summaryParts.join("  ")} ${methodBadge}</div>` +
      `<div class="re-pred-side-by-side">` +
        `<div class="re-pred-side re-pred-side-a">` +
          `<div class="re-pred-side-header re-pred-side-header-a">` +
            `<span class="re-pred-ver-label re-pred-ver-a">v${vA.vi}</span>` +
            `<span class="re-pred-side-date">${vA.date.slice(0,10)}</span>` +
          `</div>` +
          `<div class="re-pred-tree-wrap">${treeAHtml}</div>` +
        `</div>` +
        `<div class="re-pred-side re-pred-side-b">` +
          `<div class="re-pred-side-header re-pred-side-header-b">` +
            `<span class="re-pred-ver-label re-pred-ver-b">v${vB.vi}</span>` +
            `<span class="re-pred-side-date">${vB.date.slice(0,10)}</span>` +
          `</div>` +
          `<div class="re-pred-tree-wrap">${treeBHtml}</div>` +
        `</div>` +
      `</div>`
    );
  }

  /* ══════════════════════════════════════════════════════════════
     DIFF RENDERING
  ══════════════════════════════════════════════════════════════ */
  let activeTab = "detection";

  function bindTabs() {
    document.addEventListener("click", e => {
      const tab = e.target.closest(".re-tab");
      if (!tab) return;
      activeTab = tab.dataset.tab;
      document.querySelectorAll(".re-tab").forEach(t => t.classList.toggle("active", t === tab));
      renderDiffContent();
    });
  }

  function renderDiff() {
    const vA = currentRule.versions.find(v => v.vi === selA);
    const vB = currentRule.versions.find(v => v.vi === selB);
    if (!vA || !vB) return;

    // Predicate Diff tab is always available (falls back gracefully when no PGIR)
    $diffHeader.innerHTML =
      `<div class="re-diff-versions">
        <span class="re-diff-ver re-diff-ver-a">v${vA.vi} &nbsp;<span class="text-muted">${vA.date.slice(0,10)}</span></span>
        <span class="re-diff-arrow">→</span>
        <span class="re-diff-ver re-diff-ver-b">v${vB.vi} &nbsp;<span class="text-muted">${vB.date.slice(0,10)}</span></span>
      </div>
      ${vA.subject || vB.subject ? `<div class="re-diff-subjects small text-muted mt-1">
        <span>${esc(vA.subject || "")}</span><span class="mx-2">→</span><span>${esc(vB.subject || "")}</span>
      </div>` : ""}
      <div class="re-diff-tabs mt-2">
        <button class="re-tab${activeTab === "detection" ? " active" : ""}" data-tab="detection">Detection Logic</button>
        <button class="re-tab${activeTab === "pred" ? " active" : ""}" data-tab="pred">Predicate Graph</button>
      </div>`;

    renderDiffContent();
    show($diffPanel, true);
    $diffPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderDiffContent() {
    if (!selA || !selB) return;
    const vA = currentRule.versions.find(v => v.vi === selA);
    const vB = currentRule.versions.find(v => v.vi === selB);

    if (activeTab === "pred") {
      $diffContent.innerHTML = renderTreeDiff(vA, vB, currentRule);
      return;
    }

    const textA = vA.detection || "";
    const textB = vB.detection || "";
    const fname = activeRepo === "sigma" ? "detection_block.yaml" : "query.spl";

    /* build unified diff with jsdiff, render with diff2html */
    const patch = Diff.createPatch(fname, textA, textB,
      `v${vA.vi}  (${vA.date.slice(0,10)})`, `v${vB.vi}  (${vB.date.slice(0,10)})`);

    $diffContent.innerHTML = Diff2Html.html(patch, {
      drawFileList: false,
      matching: "lines",
      outputFormat: "side-by-side",
    }) + (activeRepo === "ssc" ? renderMacroPanel(vB) : "");
  }

  /* ── Macro panel (SSC only) ────────────────────────────────── */

  /* Walk backwards from vi to find the most recent stored macros object. */
  function getMacrosForVersion(vi) {
    const versions = currentRule.versions;
    const idx = versions.findIndex(v => v.vi === vi);
    for (let i = idx; i >= 0; i--) {
      if (versions[i].macros) return versions[i].macros;
    }
    return null;
  }

  /* Render a collapsible macro definitions panel below the detection diff. */
  function renderMacroPanel(vB) {
    const macros = getMacrosForVersion(vB.vi);
    if (!macros || Object.keys(macros).length === 0) return "";
    const rows = Object.entries(macros).map(([name, def]) =>
      `<tr>` +
        `<td class="re-macro-name"><code>\`${esc(name)}\`</code></td>` +
        `<td class="re-macro-def"><code>${esc(def)}</code></td>` +
      `</tr>`
    ).join("");
    return (
      `<details class="re-macro-panel">` +
        `<summary class="re-macro-summary">` +
          `Macros used in v${vB.vi} (${Object.keys(macros).length})` +
        `</summary>` +
        `<table class="re-macro-table"><tbody>${rows}</tbody></table>` +
      `</details>`
    );
  }

  /* ══════════════════════════════════════════════════════════════
     BROWSE & FILTER
  ══════════════════════════════════════════════════════════════ */
  function bindBrowse() {
    $browseToggle.addEventListener("click", () => {
      const open = $browsePanel.classList.toggle("hidden");
      $browseToggle.textContent = open ? "Browse ▾" : "Browse ▴";
    });
    [$filterCat, $filterVersions, $filterChange, $filterYear].forEach(el => {
      el.addEventListener("change", () => { browseOffset = 0; renderBrowseResults(); });
    });
    document.getElementById("re-browse-more").addEventListener("click", () => {
      browseOffset += BROWSE_PAGE;
      appendBrowseResults(applyFilters());
    });
    document.getElementById("re-browse-clear").addEventListener("click", () => {
      $filterCat.value = "";
      $filterVersions.value = "";
      $filterChange.value = "";
      $filterYear.value = "";
      browseOffset = 0;
      renderBrowseResults();
    });
  }

  function applyFilters() {
    const cat      = $filterCat.value;
    const minV     = parseInt($filterVersions.value) || 0;
    const change   = $filterChange.value;
    const fromYear = parseInt($filterYear.value) || 0;

    return searchIndex.filter(r => {
      if (cat && r.cat !== cat) return false;
      if (r.n < minV) return false;
      // raw d_step thresholds (same scale as deltaColor)
      if (change === "minor"    && r.max_delta < 0.2)   return false;
      if (change === "moderate" && r.max_delta < 1.0)   return false;
      if (change === "major"    && r.max_delta < 5.0)   return false;
      if (fromYear && parseInt(r.to) < fromYear)        return false;
      return true;
    });
  }

  function renderBrowseResults() {
    const results = applyFilters();
    $browseCount.textContent = results.length.toLocaleString() + " rule" + (results.length !== 1 ? "s" : "") + " match";
    $browseList.innerHTML = "";
    browseOffset = 0;
    appendBrowseResults(results);
  }

  function appendBrowseResults(results) {
    const slice = results.slice(browseOffset, browseOffset + BROWSE_PAGE);
    slice.forEach(r => {
      const row = document.createElement("div");
      row.className = "re-browse-row";
      row.innerHTML =
        `<span class="re-browse-name">${esc(r.name)}</span>` +
        `<span class="re-browse-meta">` +
          `<span class="re-browse-cat">${esc(r.cat)}</span>` +
          `<span class="re-browse-n">${r.n}v</span>` +
          `<span class="re-browse-years">${r.from.slice(0,4)}–${r.to.slice(0,4)}</span>` +
          changeBadge(r.max_delta) +
        `</span>`;
      row.addEventListener("click", () => {
        $input.value = r.name;
        show($browsePanel, true);  // keep open
        loadRule(r.id);
        document.getElementById("re-rule-panel").scrollIntoView({ behavior: "smooth" });
      });
      $browseList.appendChild(row);
    });
    const moreBtn = document.getElementById("re-browse-more");
    const shown = Math.min(browseOffset + BROWSE_PAGE, results.length);
    moreBtn.textContent = `Show more (${shown} of ${results.length})`;
    show(moreBtn, shown < results.length);
  }

  function changeBadge(max_delta) {
    if (max_delta >= 5.0) return `<span class="re-cbadge" style="color:#ff6b6b">● major</span>`;
    if (max_delta >= 1.0) return `<span class="re-cbadge" style="color:#ffa94d">● moderate</span>`;
    if (max_delta >= 0.2) return `<span class="re-cbadge" style="color:#74c0fc">● minor</span>`;
    return `<span class="re-cbadge" style="color:#adb5bd">● no change</span>`;
  }

  /* ══════════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════════ */
  function show(el, visible) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  }

  function setAttrs(el, attrs) {
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

})();
