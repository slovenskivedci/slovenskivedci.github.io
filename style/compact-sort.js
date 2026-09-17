/* Compact list column sort — zoznam.html only */
(function () {
  if (window.SV && window.SV.compactSortBound) return;
  window.SV = window.SV || {};
  window.SV.compactSortBound = true;

  var state = { col: null, dir: "asc" }; // asc = red ▼, desc = green ▲ (rotated)

  var SELECTORS = {
    h: ".compact-h",
    name: ".compact-name",
    position: ".compact-col-position",
    field: ".compact-col-field",
    area: ".compact-col-area",
    affiliation: ".compact-col-affiliation",
    city: ".compact-col-city",
    country: ".compact-col-country"
  };

  function listRoot() {
    return document.querySelector(".content-wrapper .w-dyn-list") ||
      document.querySelector(".w-dyn-list");
  }

  function entries(root) {
    return Array.prototype.slice.call(root.querySelectorAll(":scope > .entry, :scope > .w-dyn-items.entry"));
  }

  function cellText(entry, key) {
    var sel = SELECTORS[key];
    if (!sel) return "";
    var el = entry.querySelector(sel);
    if (!el) return "";
    var t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (key === "name") {
      t = t.replace(/\s*\(\d{4}\)\s*$/, "").trim();
    }
    return t;
  }

  function sortKey(entry, key) {
    var t = cellText(entry, key);
    if (key === "h") {
      var n = parseInt(t, 10);
      return isNaN(n) ? -Infinity : n;
    }
    return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function applySort(col, dir) {
    var root = listRoot();
    if (!root) return;
    var items = entries(root);
    if (!items.length) return;
    var numeric = col === "h";
    items.sort(function (a, b) {
      var ka = sortKey(a, col);
      var kb = sortKey(b, col);
      var cmp;
      if (numeric) {
        cmp = ka - kb;
      } else {
        cmp = String(ka).localeCompare(String(kb), "sk", { sensitivity: "base" });
      }
      if (cmp === 0) {
        // stable-ish tie-break by name then h
        var na = sortKey(a, "name");
        var nb = sortKey(b, "name");
        cmp = String(na).localeCompare(String(nb), "sk", { sensitivity: "base" });
      }
      return dir === "asc" ? cmp : -cmp;
    });
    var frag = document.createDocumentFragment();
    items.forEach(function (el) { frag.appendChild(el); });
    // Append sorted entries, then pin chrome: sort row on top, footer at bottom.
    root.appendChild(frag);
    var sortRow = root.querySelector(":scope > .compact-sort-row");
    if (sortRow) root.insertBefore(sortRow, root.firstChild);
    var footer = root.querySelector(":scope > .footer");
    if (footer) root.appendChild(footer);
  }

  function paintButtons(activeCol, dir) {
    document.querySelectorAll(".compact-sort-btn").forEach(function (btn) {
      var col = btn.getAttribute("data-sort");
      btn.classList.remove("is-asc", "is-desc");
      btn.removeAttribute("aria-sort");
      if (col === activeCol) {
        btn.classList.add(dir === "asc" ? "is-asc" : "is-desc");
        btn.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
      }
    });
  }

  function onClick(e) {
    var btn = e.target.closest(".compact-sort-btn");
    if (!btn) return;
    e.preventDefault();
    var col = btn.getAttribute("data-sort");
    if (!col || !SELECTORS[col]) return;
    if (state.col === col) {
      state.dir = state.dir === "asc" ? "desc" : "asc";
    } else {
      state.col = col;
      state.dir = "asc";
    }
    paintButtons(state.col, state.dir);
    applySort(state.col, state.dir);
    if (window.SV && typeof SV.updateSelectedNumber === "function") {
      try { SV.updateSelectedNumber(); } catch (err) {}
    }
  }

  function bind() {
    var row = document.querySelector(".compact-sort-row");
    if (!row || row.dataset.bound === "1") return;
    row.dataset.bound = "1";
    row.addEventListener("click", onClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
