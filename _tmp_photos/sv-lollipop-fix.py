from pathlib import Path
p = Path("/Users/richtap/git/slovenskivedci/statistiky.html")
t = p.read_text(encoding="utf-8")
old = """                layout: { padding: { right: 168 } },
                onHover: function(evt, elements) {
                  var t = evt && evt.native && evt.native.target;
                  if (t) t.style.cursor = elements.length ? "pointer" : "default";
                },
                onClick: function(evt, elements) {
                  if (!elements || !elements.length) return;
                  var rec = records[elements[0].index];
                  if (rec && rec.id) window.location.href = "/#" + encodeURI(rec.id);
                },"""
new = """                layout: { padding: { right: 220 } },
                interaction: { mode: "index", intersect: false, axis: "y" },
                onHover: function(evt, _els, chart) {
                  var els = chart.getElementsAtEventForMode(evt, "index", { intersect: false, axis: "y" }, false);
                  var t = evt && evt.native && evt.native.target;
                  if (t) t.style.cursor = els.length ? "pointer" : "default";
                },
                onClick: function(evt, _els, chart) {
                  var els = chart.getElementsAtEventForMode(evt, "index", { intersect: false, axis: "y" }, false);
                  if (!els.length) return;
                  var rec = records[els[0].index];
                  if (rec && rec.id) window.location.href = "/#" + encodeURI(rec.id);
                },"""
n = t.count(old)
if n != 2:
    raise SystemExit("option blocks: %d" % n)
t = t.replace(old, new)
old_tip = 'tooltip: { callbacks: { label: function(ctx) { var r = records[ctx.dataIndex] || {}; return (r.name || "") + " · h " + r.h; } } }'
new_tip = 'tooltip: { mode: "index", intersect: false, axis: "y", callbacks: { title: function(items) { var r = records[(items[0] && items[0].dataIndex) || 0] || {}; return r.name || ""; }, label: function(ctx) { var r = records[ctx.dataIndex] || {}; return "h-index " + r.h; } } }'
if t.count(old_tip) != 2:
    raise SystemExit("tooltip blocks: %d" % t.count(old_tip))
t = t.replace(old_tip, new_tip)
p.write_text(t, encoding="utf-8")
print("ok")
