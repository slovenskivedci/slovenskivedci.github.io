window.SV = window.SV || {};
/* Persistent header shell: keep Kriváň/title/nav/search; swap .content-wrapper only. */
(function () {
  var ROUTES = {
    "/": true,
    "/index.html": true,
    "/zoznam.html": true,
    "/statistiky.html": true,
    "/suvislosti.html": true
  };

  function pathOf(href) {
    try {
      var u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return null;
      var p = u.pathname;
      if (p === "/index.html") p = "/";
      return p;
    } catch (e) {
      return null;
    }
  }

  function isAppPath(p) {
    return p && ROUTES[p];
  }

  function ensureChart(cb) {
    if (window.Chart) { cb(); return; }
    var s = document.createElement("script");
    s.src = "/style/chart.min.js";
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(); return; }
      // already present?
      var found = Array.prototype.some.call(document.scripts, function (sc) {
        return sc.src && sc.src.indexOf(src) !== -1;
      });
      if (found) { resolve(); return; }
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  function runScripts(container) {
    var scripts = Array.prototype.slice.call(container.querySelectorAll("script"));
    var chain = Promise.resolve();
    scripts.forEach(function (old) {
      chain = chain.then(function () {
        if (old.src) {
          var src = old.getAttribute("src");
          // absolutize relative
          if (src && src.indexOf("http") !== 0 && src[0] !== "/") {
            src = new URL(src, window.location.href).pathname;
          }
          return loadScript(src || old.src);
        }
        return new Promise(function (resolve) {
          var s = document.createElement("script");
          s.text = old.textContent;
          document.body.appendChild(s);
          // keep it out of tree clutter
          setTimeout(function () { try { s.remove(); } catch (e) {} resolve(); }, 0);
        });
      });
      old.remove();
    });
    return chain;
  }

  function setNavCurrent(path) {
    var menus = document.querySelectorAll("header .dropdown-menu");
    menus.forEach(function (el) {
      el.classList.remove("nav-current");
      var a = el.querySelector("a[href]");
      if (!a) return;
      var p = pathOf(a.getAttribute("href"));
      if (p === path || (path === "/" && (p === "/" || p === "/index.html"))) {
        el.classList.add("nav-current");
      }
    });
  }

  function syncSexRow(path) {
    // list pages use real muži/ženy; others keep spacer height via CSS class
    var row = document.querySelector(".sex-under-search");
    if (!row) return;
    var isList = (path === "/" || path === "/zoznam.html");
    row.classList.toggle("sex-under-search-spacer", !isList);
    if (!isList) {
      // keep height but don't look active
      row.querySelectorAll(".sex-chip").forEach(function (c) { c.classList.remove("selected"); });
    }
  }

  function replaceContent(doc, path, push) {
    var next = doc.querySelector(".content-wrapper");
    var cur = document.querySelector(".content-wrapper");
    if (!next || !cur) {
      window.location.href = path;
      return Promise.resolve();
    }
    cur.innerHTML = next.innerHTML;
    document.title = doc.title || document.title;

    // page-specific body class (e.g. page-zoznam wide layout)
    if (document.body) {
      document.body.classList.toggle(
        "page-zoznam",
        /(?:^|\/)zoznam\.html(?:$|[?#])/.test(path) || path === "/zoznam" || path.indexOf("zoznam.html") !== -1
      );
    }

    setNavCurrent(path);
    syncSexRow(path);

    var needsChart = (path === "/statistiky.html" || path.indexOf("statistiky") !== -1);
    var go = function () {
      return runScripts(cur).then(function () {
        // refresh count if list filters present
        if (window.SV && typeof SV.updateSelectedNumber === "function") {
          try { SV.updateSelectedNumber(); } catch (e) {}
        } else if (typeof updateSelectedNumber === "function") {
          try { updateSelectedNumber(); } catch (e) {}
        }
        if (window.SV && typeof SV.runFilter === "function") {
          try { SV.runFilter(); } catch (e) {}
        } else if (typeof filter === "function") {
          try { filter(); } catch (e) {}
        }
        window.scrollTo(0, 0);
      });
    };
    if (needsChart) return new Promise(function (r) { ensureChart(function () { go().then(r); }); });
    return go();
  }

  function isZoznam(path) {
    return !!(path && (path === "/zoznam.html" || path === "/zoznam" || path.indexOf("zoznam.html") !== -1));
  }

  function navigate(path, push) {
    if (!isAppPath(path)) {
      window.location.href = path;
      return;
    }
    var cur = pathOf(window.location.href) || "/";
    if (path === cur && push !== false) {
      // same page
      return;
    }
    var url = path === "/" ? "/" : path;
    // Compact list has its own layout CSS in <head>. Soft-swapping content
    // while keeping another page's stylesheet yields the "refresh vs click" mismatch.
    if (isZoznam(path) !== isZoznam(cur)) {
      window.location.href = url;
      return;
    }
    fetch(url, { credentials: "same-origin", headers: { "X-SV-Shell": "1" } })
      .then(function (res) {
        if (!res.ok) throw new Error("fetch " + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        return replaceContent(doc, path, push).then(function () {
          if (push !== false) {
            history.pushState({ svShell: true, path: path }, "", url);
          }
        });
      })
      .catch(function () {
        window.location.href = url;
      });
  }

  function bindNav() {
    var menus = document.querySelectorAll("header .dropdown-menu");
    menus.forEach(function (el) {
      // remove full-page onclick reload
      el.removeAttribute("onclick");
      var a = el.querySelector("a[href]");
      if (!a) return;
      var p = pathOf(a.getAttribute("href"));
      if (!isAppPath(p)) return;
      el.style.cursor = "pointer";
      el.addEventListener("click", function (e) {
        // allow modified clicks
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        navigate(p, true);
      }, true);
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(p, true);
      });
    });
  }

  window.addEventListener("popstate", function () {
    var p = pathOf(window.location.href) || "/";
    if (isAppPath(p)) navigate(p, false);
  });

  function bindLogo() {
    var logos = document.querySelectorAll("a.site-logo-link[href]");
    logos.forEach(function (a) {
      var p = pathOf(a.getAttribute("href"));
      if (!isAppPath(p)) return;
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(p, true);
      });
    });
  }

  function bindAll() {
    bindNav();
    bindLogo();
  }

  window.SV.navigate = navigate;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAll);
  } else {
    bindAll();
  }
})();
