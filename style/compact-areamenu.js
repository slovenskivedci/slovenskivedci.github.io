/* Compact list: oblasť menu under muži/ženy ("všetci" + one button per oblasť).
   The menu drives the existing area filter (#filter-area + .toggle-area tags),
   so row tags, ?area= links and the menu are one filter, never two.
   No rank numbers anywhere (by design). */
(function () {
  if (window.SV && window.SV.areaMenuBound) return;
  window.SV = window.SV || {};
  window.SV.areaMenuBound = true;

  function menu() { return document.querySelector(".sv-area-menu"); }
  function currentArea() {
    var el = document.getElementById("filter-area");
    return el ? (el.textContent || "").trim() : "";
  }

  // Slovak alphabetical order ("ch" after "h"); "všetci" stays first.
  function orderMenu() {
    var m = menu();
    if (!m) return;
    var btns = Array.prototype.slice.call(m.querySelectorAll(".sv-area-btn[data-area]"));
    var all = btns.filter(function (b) { return !b.getAttribute("data-area"); })[0];
    var areas = btns.filter(function (b) { return b.getAttribute("data-area"); });
    areas.sort(function (a, b) {
      return a.textContent.trim().localeCompare(b.textContent.trim(), "sk", { sensitivity: "base" });
    });
    m.innerHTML = "";
    [all].concat(areas).forEach(function (b, i) {
      if (!b) return;
      if (i > 0) {
        var dot = document.createElement("span");
        dot.className = "sex-dot";
        dot.setAttribute("aria-hidden", "true");
        dot.textContent = "·";
        m.appendChild(document.createTextNode(" "));
        m.appendChild(dot);
        m.appendChild(document.createTextNode(" "));
      }
      m.appendChild(b);
    });
  }

  function paint(area) {
    var m = menu();
    if (!m) return;
    m.querySelectorAll(".sv-area-btn").forEach(function (b) {
      var on = (b.getAttribute("data-area") || "") === area;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("selected", on);
    });
  }

  function writeUrl(area) {
    try {
      var url = new URL(window.location.href);
      if (area) url.searchParams.set("area", area); else url.searchParams.delete("area");
      url.searchParams.delete("skupiny"); // retired grouped view
      var next = url.pathname + url.search + url.hash;
      if (next !== window.location.pathname + window.location.search + window.location.hash) {
        history.replaceState(history.state, "", next);
      }
    } catch (e) {}
  }

  function sync(initial) {
    if (!menu()) return;
    var area = currentArea();
    paint(area);
    // On first paint list-filters has not read ?area= yet: leave the URL alone.
    if (initial !== true) writeUrl(area);
  }

  function selectArea(area) {
    var el = document.getElementById("filter-area");
    if (!el) return;
    el.textContent = area;
    document.querySelectorAll(".toggle-area").forEach(function (t) { t.classList.remove("selected"); });
    if (area) document.querySelectorAll(".toggle-area-" + area).forEach(function (t) { t.classList.add("selected"); });
    if (window.SV && typeof SV.runFilter === "function") SV.runFilter();
    else sync();
  }

  window.SV.afterFilter = function () { sync(false); };
  window.SV.selectArea = selectArea;

  function bind() {
    if (!menu()) return;
    orderMenu();
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".sv-area-btn");
      if (!b) return;
      e.preventDefault();
      selectArea(b.getAttribute("data-area") || "");
      if (e.detail > 0 && b.blur) b.blur(); // mouse: no sticky focus/hover; keyboard keeps focus
    });
    sync(true);
    try { // retired grouped view: drop ?skupiny=
      var u = new URL(window.location.href);
      if (u.searchParams.has("skupiny")) {
        u.searchParams.delete("skupiny");
        history.replaceState(history.state, "", u.pathname + u.search + u.hash);
      }
    } catch (e) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
