from pathlib import Path
p = Path("/Users/richtap/git/slovenskivedci/statistiky.html")
t = p.read_text(encoding="utf-8")
old1 = """      legend: {
        position: 'top',
      },"""
new1 = """      legend: { display: false },"""
n = t.count(old1)
if n != 4:
    raise SystemExit("expected 4 simple legends, got %d" % n)
t = t.replace(old1, new1)
old2 = """      legend: {
        display: true,
        position: 'top',
        align: 'center',
        labels: {
          boxWidth: 12,
          padding: 12
        }
      },"""
if old2 not in t:
    raise SystemExit("odbor legend missing")
t = t.replace(old2, "      legend: { display: false },", 1)
p.write_text(t, encoding="utf-8")
print("hidden 5 single-item legends")
