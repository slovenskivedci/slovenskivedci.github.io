/* Compact list: "zoskupiť podľa oblasti" — split the list into one sub-list per oblasť.
   Areas in Slovak alphabetical order; within an area the current order is kept
   (default = h-index descending; a column sort re-sorts inside the groups).
   Rank numbers restart in every area and count only the people currently shown
   (competition ranking by h-index: equal h = same rank). */
(function () {
  if (window.SV && window.SV.compactGroupBound) return;
  window.SV = window.SV || {};
  window.SV.compactGroupBound = true;

  var on = false;

  function listRoot() {
    return document.querySelector(".content-wrapper .w-dyn-list") ||
      document.querySelector(".w-dyn-list");
  }
  function entries(root) {
    return Array.prototype.slice.call(root.querySelectorAll(":scope > .entry"));
  }
  function areaName(entry) {
    var b = entry.querySelector(".compact-col-area .filter-link, .compact-col-area");
    return b ? (b.textContent || "").replace(/\s+/g, " ").trim() : "";
  }
  function hOf(entry) {
    var el = entry.querySelector(".compact-h");
    var n = el ? parseInt(el.textContent, 10) : NaN;
    return isNaN(n) ? -1 : n;
  }
  function isShown(entry) {
    return entry.classList.contains("showed");
  }
  function ensureRankCell(entry) {
    var row = entry.querySelector(".compact-row");
    if (!row) return null;
    var r = row.querySelector(":scope > .sv-grank");
    if (!r) {
      r = document.createElement("span");
      r.className = "sv-grank";
      r.setAttribute("aria-hidden", "true");
      row.insertBefore(r, row.firstChild);
    }
    return r;
  }
  function removeHeads(root) {
    Array.prototype.forEach.call(root.querySelectorAll(":scope > .sv-group-head"), function (h) { h.remove(); });
  }
  function pinChrome(root) {
    var sortRow = root.querySelector(":scope > .compact-sort-row");
    if (sortRow) root.insertBefore(sortRow, root.firstChild);
    var footer = root.querySelector(":scope > .footer");
    if (footer) root.appendChild(footer);
  }

  // Rebuild groups from the current DOM order (stable partition by area).
  function regroup() {
    var root = listRoot();
    if (!root || !on) return;
    removeHeads(root);
    var items = entries(root);
    var order = items.map(function (el, i) { return { el: el, i: i, a: areaName(el) }; });
    order.sort(function (x, y) {
      var c = x.a.localeCompare(y.a, "sk", { sensitivity: "base" });
      return c !== 0 ? c : x.i - y.i;
    });
    var frag = document.createDocumentFragment();
    var cur = null;
    order.forEach(function (o) {
      if (o.a !== cur) {
        cur = o.a;
        var h = document.createElement("h2");
        h.className = "sv-group-head";
        h.setAttribute("data-area", o.a);
        h.innerHTML = '<span class="sv-group-name"></span> <span class="sv-group-count"></span>';
        h.querySelector(".sv-group-name").textContent = o.a || "ostatné";
        frag.appendChild(h);
      }
      frag.appendChild(o.el);
    });
    root.appendChild(frag);
    pinChrome(root);
    refresh();
  }

  // Counts, ranks and empty-group hiding for the current filter state.
  function refresh() {
    var root = listRoot();
    if (!root || !on) return;
    var heads = root.querySelectorAll(":scope > .sv-group-head");
    Array.prototype.forEach.call(heads, function (h) {
      var members = [];
      var n = h.nextElementSibling;
      while (n && !n.classList.contains("sv-group-head") && !n.classList.contains("footer")) {
        if (n.classList.contains("entry")) members.push(n);
        n = n.nextElementSibling;
      }
      var shown = members.filter(isShown);
      h.querySelector(".sv-group-count").textContent = shown.length;
      h.hidden = shown.length === 0;
      // competition rank by h-index among the shown members
      var hs = shown.map(hOf).sort(function (a, b) { return b - a; });
      members.forEach(function (e) {
        var r = ensureRankCell(e);
        if (!r) return;
        if (!isShown(e)) { r.textContent = ""; return; }
        r.textContent = (hs.indexOf(hOf(e)) + 1) + ".";
      });
    });
  }

  function paintButton() {
    document.querySelectorAll(".sv-group-toggle").forEach(function (b) {
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("selected", on);
      b.textContent = on ? "zrušiť zoskupenie" : "zoskupiť podľa oblasti";
    });
  }
  function writeUrl() {
    try {
      var url = new URL(window.location.href);
      if (on) url.searchParams.set("skupiny", "oblast"); else url.searchParams.delete("skupiny");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function setGrouped(v) {
    var root = listRoot();
    if (!root || !root.querySelector(":scope > .entry")) return;
    on = !!v;
    document.body.classList.toggle("sv-grouped", on);
    paintButton();
    if (on) {
      regroup();
    } else {
      removeHeads(root);
      if (window.SV && typeof SV.reapplySort === "function") SV.reapplySort();
    }
    writeUrl();
  }

  window.SV.setGrouped = setGrouped;
  window.SV.isGrouped = function () { return on; };
  window.SV.resetGroup = function () { if (on) setGrouped(false); };
  window.SV.afterSort = function () { if (on) regroup(); };
  window.SV.afterFilter = function () { if (on) refresh(); };

  function bind() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".sv-group-toggle");
      if (!b) return;
      e.preventDefault();
      setGrouped(!on);
      b.blur && e.detail > 0 && b.blur(); // mouse: drop focus ring/sticky hover; keyboard keeps focus
    });
    try {
      if (new URLSearchParams(window.location.search).get("skupiny") === "oblast") setGrouped(true);
    } catch (e) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
