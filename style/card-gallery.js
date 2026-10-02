/* Card hover gallery (preview 2026-10-02).
   <div class="cg" data-alts="alt/X_alt1.jpg|alt/X_alt2.jpg" data-v="..." tabindex="0"><img ...main...></div>
   - hover (mouse) or keyboard focus: cross-fade main -> alt1 -> alt2 -> main ... every 1.2 s
   - touch: tap starts / stops; leaving the viewport or tapping another card stops it
   - mouse-out / blur: back to the main photo
   - alternatives are requested only on first activation (lazy)
   - prefers-reduced-motion: no auto-advance, no fade; click / tap / Enter steps manually */
(function () {
  'use strict';
  var INTERVAL = 1200, FIRST = 650;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var mqHover = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: true };
  var current = null;

  function Gallery(box) {
    var alts = (box.getAttribute('data-alts') || '').split('|').filter(Boolean);
    if (!alts.length) return;
    this.box = box; this.alts = alts; this.main = box.querySelector('img');
    this.base = box.getAttribute('data-base') || '/images/';
    this.ver = box.getAttribute('data-v') || '';
    this.layers = null; this.idx = 0; this.timer = null; this.active = false;
    var dots = document.createElement('div'); dots.className = 'cg-dots'; dots.setAttribute('aria-hidden', 'true');
    for (var i = 0; i <= alts.length; i++) { var d = document.createElement('span'); if (!i) d.className = 'on'; dots.appendChild(d); }
    box.appendChild(dots); this.dots = dots;
    var self = this;
    box.addEventListener('mouseenter', function () { if (mqHover.matches) self.start(); });
    box.addEventListener('mouseleave', function () { if (mqHover.matches) self.stop(); });
    box.addEventListener('pointerdown', function () { self.ptr = Date.now(); });
    box.addEventListener('focus', function () { if (Date.now() - (self.ptr || 0) > 600) self.start(); }); // keyboard focus only
    box.addEventListener('blur', function () { self.stop(); });
    box.addEventListener('click', function () {
      if (mqReduce.matches) { self.start(); self.step(); return; }
      if (!mqHover.matches) { self.active ? self.stop() : self.start(); }
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); self.start(); self.step(); }
    });
  }
  Gallery.prototype.build = function () {
    if (this.layers) return;
    this.layers = [this.main];
    for (var i = 0; i < this.alts.length; i++) {
      var im = new Image(); im.className = 'cg-layer'; im.alt = ''; im.decoding = 'async';
      im.width = 280; im.height = 157;
      im.src = this.base + this.alts[i] + (this.ver ? '?v=' + this.ver : '');
      this.box.insertBefore(im, this.dots); this.layers.push(im);
    }
  };
  Gallery.prototype.show = function (n) {
    this.idx = n;
    for (var i = 1; i < this.layers.length; i++) this.layers[i].classList.toggle('on', i === n);
    var ds = this.dots.children; for (var j = 0; j < ds.length; j++) ds[j].classList.toggle('on', j === n);
  };
  Gallery.prototype.step = function () {
    var self = this, n = (this.idx + 1) % this.layers.length, im = this.layers[n];
    if (n && !(im.complete && im.naturalWidth)) {          // wait for the lazy image, never show a blank
      im.addEventListener('load', function () { if (self.active) self.show(n); }, { once: true });
      return;
    }
    this.show(n);
  };
  Gallery.prototype.tick = function (delay) {
    var self = this; clearTimeout(this.timer);
    this.timer = setTimeout(function () { if (!self.active) return; self.step(); self.tick(INTERVAL); }, delay);
  };
  Gallery.prototype.start = function () {
    if (this.active) return;
    if (current && current !== this) current.stop();
    current = this; this.active = true; this.build(); this.box.classList.add('cg-active');
    if (!mqReduce.matches) this.tick(FIRST);
  };
  Gallery.prototype.stop = function () {
    if (!this.active) return;
    this.active = false; clearTimeout(this.timer); this.box.classList.remove('cg-active');
    if (this.layers) this.show(0);
    if (current === this) current = null;
  };

  function init() {
    var boxes = document.querySelectorAll('.cg[data-alts]'), gs = [];
    for (var i = 0; i < boxes.length; i++) { var g = new Gallery(boxes[i]); if (g.box) gs.push(g); }
    if ('IntersectionObserver' in window) {   // stop a tapped gallery once it scrolls away
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting && e.target._cg) e.target._cg.stop(); });
      });
      gs.forEach(function (g) { g.box._cg = g; io.observe(g.box); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
