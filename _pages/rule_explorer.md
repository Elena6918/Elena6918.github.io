---
layout: page
title: Detection Rule Explorer
permalink: /rule-explorer/
description: Explore how Sigma detection rules evolve over time — compare any two versions side by side.
nav: false
---

<!-- External deps (CDN) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html@3.4.52/bundles/css/diff2html.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsdiff/5.1.0/diff.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/diff2html@3.4.52/bundles/js/diff2html.min.js"></script>

<style>
/* ── CSS custom properties (light + dark aware) ── */
:root {
  --re-dot-default: #adb5bd;
  --re-dot-a:       #3b82f6;
  --re-dot-b:       #22c55e;
  --re-axis-color:  #ced4da;
  --re-label-color: #6c757d;
  --re-band-color:  rgba(59,130,246,0.10);
  --re-hover-bg:    #f8f9fa;
  --re-border:      #dee2e6;
  --re-card-bg:     #ffffff;
  --re-shadow:      0 1px 4px rgba(0,0,0,0.08);
}
html[data-theme="dark"], .dark-mode {
  --re-dot-default: #6c757d;
  --re-axis-color:  #495057;
  --re-label-color: #adb5bd;
  --re-band-color:  rgba(59,130,246,0.18);
  --re-hover-bg:    #2a2d31;
  --re-border:      #3a3d41;
  --re-card-bg:     #212529;
}

/* ── layout ── */
#rule-explorer { max-width: 900px; margin: 0 auto; }

/* ── repo switcher ── */
.re-repo-switcher {
  display: flex; gap: .4rem; margin-bottom: 1rem;
}
.re-repo-btn {
  padding: .4rem .9rem; border: 1px solid var(--re-border); border-radius: 20px;
  background: transparent; color: var(--re-label-color); cursor: pointer;
  font-size: .85rem; transition: all .15s;
}
.re-repo-btn:hover { border-color: var(--re-dot-a); color: var(--re-dot-a); }
.re-repo-btn.active {
  background: var(--re-dot-a); border-color: var(--re-dot-a);
  color: #fff; font-weight: 600;
}

/* ── search ── */
#re-search-wrapper { position: relative; margin-bottom: 1rem; }
.re-search-row { display: flex; gap: .5rem; }
#re-search-input {
  flex: 1; padding: .6rem 1rem;
  border: 1px solid var(--re-border); border-radius: 6px;
  font-size: 1rem; background: var(--re-card-bg);
  color: inherit; outline: none;
  transition: border-color .15s, box-shadow .15s;
}
#re-search-input:focus {
  border-color: var(--re-dot-a);
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}
.re-browse-toggle {
  padding: .6rem 1rem; border: 1px solid var(--re-border); border-radius: 6px;
  background: var(--re-card-bg); color: inherit; cursor: pointer; white-space: nowrap;
  font-size: .9rem; transition: background .15s;
}
.re-browse-toggle:hover { background: var(--re-hover-bg); }

/* ── browse panel ── */
#re-browse-panel {
  border: 1px solid var(--re-border); border-radius: 8px;
  background: var(--re-card-bg); margin-bottom: 1.5rem; overflow: hidden;
}
.re-filters {
  display: flex; flex-wrap: wrap; gap: .5rem;
  padding: .75rem 1rem; border-bottom: 1px solid var(--re-border);
  background: var(--re-hover-bg);
}
.re-filters select {
  padding: .35rem .6rem; border: 1px solid var(--re-border); border-radius: 5px;
  background: var(--re-card-bg); color: inherit; font-size: .82rem; cursor: pointer;
}
.re-browse-count {
  padding: .4rem 1rem; font-size: .8rem; color: var(--re-label-color);
  border-bottom: 1px solid var(--re-border);
}
#re-browse-list { max-height: 360px; overflow-y: auto; }
.re-browse-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: .45rem 1rem; cursor: pointer; gap: .5rem;
  border-bottom: 1px solid var(--re-border); transition: background .1s;
}
.re-browse-row:last-child { border-bottom: none; }
.re-browse-row:hover { background: var(--re-hover-bg); }
.re-browse-name { font-size: .88rem; font-weight: 500; word-break: break-all; flex: 1; }
.re-browse-meta { display: flex; align-items: center; gap: .6rem; flex-shrink: 0; font-size: .78rem; }
.re-browse-cat  { color: var(--re-label-color); }
.re-browse-n    { color: var(--re-label-color); }
.re-browse-years{ color: var(--re-label-color); }
.re-cbadge      { font-weight: 600; white-space: nowrap; }
.re-browse-more {
  display: block; width: 100%; padding: .5rem; border: none; border-top: 1px solid var(--re-border);
  background: var(--re-hover-bg); color: var(--re-label-color); cursor: pointer;
  font-size: .82rem; transition: background .15s;
}
.re-browse-more:hover { background: var(--re-border); }
#re-search-dropdown {
  position: absolute; left: 0; right: 0; z-index: 100;
  background: var(--re-card-bg); border: 1px solid var(--re-border);
  border-top: none; border-radius: 0 0 6px 6px;
  max-height: 320px; overflow-y: auto;
  box-shadow: var(--re-shadow);
}
.re-dropdown-item {
  padding: .45rem 1rem; cursor: pointer;
  display: flex; flex-direction: column; gap: 2px;
}
.re-dropdown-item:hover, .re-dropdown-item.active { background: var(--re-hover-bg); }
.re-item-name { font-size: .9rem; font-weight: 500; }
.re-item-name mark { background: rgba(59,130,246,.2); border-radius: 2px; }
.re-item-meta { font-size: .78rem; color: var(--re-label-color); }

/* ── rule panel ── */
#re-rule-panel { margin-bottom: 1.5rem; }
.re-rule-name { margin: 0 0 .2rem; font-size: 1.1rem; font-weight: 600; word-break: break-all; }
.re-rule-path { word-break: break-all; }
.re-badge {
  display: inline-block; padding: .2em .55em;
  background: rgba(59,130,246,.12); color: var(--re-dot-a);
  border-radius: 20px; font-size: .78rem; font-weight: 600;
}
.re-stat-range { margin-left: .5rem; color: var(--re-label-color); }

/* ── timeline ── */
#re-timeline-wrapper {
  position: relative;
  margin: 1.2rem 0 .4rem;
  padding: .5rem 0;
  border: 1px solid var(--re-border);
  border-radius: 8px;
  background: var(--re-card-bg);
  overflow: visible;
}
#re-timeline { display: block; width: 100%; overflow: visible; }
#re-tooltip {
  position: absolute; display: none; pointer-events: none;
  background: #1e1e1e !important; color: #f0f0f0 !important;
  padding: .4rem .7rem; border-radius: 5px;
  font-size: .8rem; line-height: 1.5; max-width: 230px;
  white-space: normal; z-index: 200;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
#re-tooltip strong { color: #fff !important; }
#re-tooltip .re-tt-date { color: #aaa !important; font-size: .75rem; }
#re-tooltip .re-tt-subject { color: #ddd !important; }
#re-hint {
  font-size: .85rem; color: var(--re-label-color);
  text-align: center; margin: .5rem 0 0;
  display: flex; align-items: center; justify-content: center; gap: .6rem; flex-wrap: wrap;
}
.re-compare-btn {
  padding: .3rem .9rem; border: none; border-radius: 5px; cursor: pointer;
  background: var(--re-dot-a); color: #fff; font-size: .82rem; font-weight: 600;
  transition: opacity .15s;
}
.re-compare-btn:hover { opacity: .85; }
.re-reset-btn {
  padding: .3rem .7rem; border: 1px solid var(--re-border); border-radius: 5px;
  cursor: pointer; background: transparent; color: var(--re-label-color); font-size: .82rem;
  transition: background .15s;
}
.re-reset-btn:hover { background: var(--re-hover-bg); }

/* ── diff panel ── */
#re-diff-panel {
  border: 1px solid var(--re-border); border-radius: 8px;
  background: var(--re-card-bg); overflow: hidden;
}
.re-diff-header-bar {
  padding: .7rem 1rem;
  border-bottom: 1px solid var(--re-border);
  background: var(--re-hover-bg);
}
.re-diff-versions {
  display: flex; align-items: center; gap: .6rem;
  font-size: .92rem; font-weight: 500;
}
.re-diff-ver { padding: .15em .55em; border-radius: 4px; }
.re-diff-ver-a { background: rgba(59,130,246,.12); color: var(--re-dot-a); }
.re-diff-ver-b { background: rgba(34,197,94,.12);  color: var(--re-dot-b); }
.re-diff-arrow { color: var(--re-label-color); }
.re-diff-subjects { color: var(--re-label-color); }

/* tabs */
.re-tabs {
  display: flex; border-bottom: 1px solid var(--re-border);
  padding: 0 1rem;
}
.re-tab {
  padding: .45rem .9rem; background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-size: .85rem; color: var(--re-label-color);
  margin-bottom: -1px; transition: color .12s, border-color .12s;
}
.re-tab:hover { color: inherit; }
.re-tab.active { border-bottom-color: var(--re-dot-a); color: var(--re-dot-a); font-weight: 600; }

/* diff2html overrides */
#re-diff-content { overflow-x: auto; }
#re-diff-content .d2h-wrapper { margin: 0; }
#re-diff-content .d2h-file-header { display: none; }
#re-diff-content .d2h-code-side-linenumber { min-width: 2rem; }
#re-diff-content .d2h-file-diff { border-radius: 0; border: none; }

/* legend */
.re-legend {
  display: flex; gap: .9rem; justify-content: center;
  font-size: .78rem; color: var(--re-label-color);
  margin: .3rem 0 0; flex-wrap: wrap;
}
.re-legend-item { display: flex; align-items: center; gap: .3rem; }

/* utility */
.hidden { display: none !important; }
</style>

<div id="rule-explorer">

  <!-- ── Repo switcher ── -->
  <div class="re-repo-switcher">
    <button class="re-repo-btn active" data-repo="sigma">Sigma</button>
    <button class="re-repo-btn" data-repo="ssc">Splunk Security Content</button>
  </div>

  <!-- ── Search + Browse toggle ── -->
  <div id="re-search-wrapper">
    <div class="re-search-row">
      <input id="re-search-input" type="text"
             placeholder="Search by rule name (e.g. psexec, mimikatz, powershell)…"
             autocomplete="off" spellcheck="false">
      <button id="re-browse-toggle" class="re-browse-toggle">Browse ▾</button>
    </div>
    <div id="re-search-dropdown" class="hidden"></div>
  </div>

  <!-- ── Browse panel ── -->
  <div id="re-browse-panel" class="hidden">
    <div class="re-filters">
      <select id="re-filter-cat">
        <option value="">All categories</option>
      </select>
      <select id="re-filter-versions">
        <option value="">Any version count</option>
        <option value="3">≥ 3 versions</option>
        <option value="5">≥ 5 versions</option>
        <option value="10">≥ 10 versions</option>
        <option value="20">≥ 20 versions</option>
      </select>
      <select id="re-filter-change">
        <option value="">Any change level</option>
        <option value="minor">Has minor change</option>
        <option value="moderate">Has moderate change</option>
        <option value="major">Has major change</option>
      </select>
      <select id="re-filter-year">
        <option value="">Any period</option>
        <option value="2023">Active since 2023</option>
        <option value="2024">Active since 2024</option>
        <option value="2025">Active since 2025</option>
      </select>
      <button id="re-browse-clear" class="re-reset-btn">Clear</button>
    </div>
    <div id="re-browse-count" class="re-browse-count"></div>
    <div id="re-browse-list"></div>
    <button id="re-browse-more" class="re-browse-more hidden">Show more</button>
  </div>

  <!-- ── Rule panel ── -->
  <div id="re-rule-panel" class="hidden">
    <div id="re-rule-header"></div>
    <div id="re-timeline-wrapper">
      <svg id="re-timeline"></svg>
      <div id="re-tooltip"></div>
    </div>
    <div class="re-legend">
      <span class="re-legend-item"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#adb5bd"/></svg> no change</span>
      <span class="re-legend-item"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#74c0fc"/></svg> minor</span>
      <span class="re-legend-item"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#ffa94d"/></svg> moderate</span>
      <span class="re-legend-item"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#ff6b6b"/></svg> major</span>
    </div>
    <p id="re-hint"></p>
  </div>

  <!-- ── Diff panel ── -->
  <div id="re-diff-panel" class="hidden">
    <div class="re-diff-header-bar">
      <div id="re-diff-header"></div>
    </div>
    <div class="re-tabs">
      <button class="re-tab active" data-tab="detection">Detection Logic (YAML)</button>
      <button class="re-tab" data-tab="spl">SPL</button>
    </div>
    <div id="re-diff-content"></div>
  </div>

</div>

<script src="{{ '/assets/js/rule_explorer.js' | relative_url }}"></script>
