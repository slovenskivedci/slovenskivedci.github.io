from pathlib import Path
p = Path("/Users/richtap/git/slovenskivedci/statistiky.html")
t = p.read_text(encoding="utf-8")

old_title = """.sv-plot-title {
  margin: 12px 0 4px;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  color: #111827;
  font-family: "Open Sans", Arial, sans-serif;
  text-align: center;
}"""
new_title = """.sv-plot-title {
  display: block;
  width: 100%;
  margin: 12px 0 8px;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  color: #111827;
  font-family: "Open Sans", Arial, sans-serif;
  text-align: center;
}"""
if old_title not in t:
    raise SystemExit("title css missing")
t = t.replace(old_title, new_title, 1)

old_pair = """.sv-chart-pair { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.sv-chart-pair .sv-chart { flex: 1 1 360px; max-width: 460px; }"""
new_pair = """.sv-chart-pair { display: flex; flex-wrap: wrap; gap: 24px 20px; justify-content: center; width: 100%; max-width: 920px; margin: 0 auto; }
.sv-chart-col { display: flex; flex-direction: column; align-items: center; flex: 1 1 400px; min-width: 0; max-width: 560px; }
.sv-chart-pair .sv-chart { flex: none; width: 100%; max-width: none; height: 300px; }"""
if old_pair not in t:
    raise SystemExit("pair css missing")
t = t.replace(old_pair, new_pair, 1)

old_media = """  .sv-chart { height: 200px; }
  .sv-chart-workplace { height: 420px; }
  .sv-chart-lollipop-area { height: 340px; }
  .sv-chart-lollipop-decade { height: 220px; }"""
new_media = """  .sv-chart { height: 200px; }
  .sv-chart-workplace { height: 420px; }
  .sv-chart-lollipop-area { height: 340px; }
  .sv-chart-lollipop-decade { height: 220px; }
  .sv-chart-pair .sv-chart { height: 240px; }"""
if old_media not in t:
    raise SystemExit("media css missing")
t = t.replace(old_media, new_media, 1)

# also make base .sv-chart display:block
t = t.replace(
    ".sv-chart { width: 100%; max-width: 920px; height: 260px; margin: 0 auto; }",
    ".sv-chart { display: block; width: 100%; max-width: 920px; height: 260px; margin: 0 auto; }",
    1,
)

old_block = """          <div class="sv-chart-pair">
<p class="sv-plot-title">Počet vedcov a vedkýň podľa h-indexu</p>
<div class="sv-chart"><canvas id="myChartHindex"></canvas></div>"""
new_block = """          <div class="sv-chart-pair">
<div class="sv-chart-col">
<p class="sv-plot-title">Počet vedcov a vedkýň podľa h-indexu</p>
<div class="sv-chart"><canvas id="myChartHindex"></canvas></div>"""
if old_block not in t:
    raise SystemExit("hindex open missing")
t = t.replace(old_block, new_block, 1)

old_mid = """			</script> 
<p class="sv-plot-title">Počet vedcov a vedkýň podľa roku narodenia</p>
<div class="sv-chart"><canvas id="myChartYearHist"></canvas></div>"""
new_mid = """			</script>
</div>
<div class="sv-chart-col">
<p class="sv-plot-title">Počet vedcov a vedkýň podľa roku narodenia</p>
<div class="sv-chart"><canvas id="myChartYearHist"></canvas></div>"""
if old_mid not in t:
    raise SystemExit("year mid missing")
t = t.replace(old_mid, new_mid, 1)

old_end = """});
			</script>
</div>"""
# last occurrence is the pair close after year hist
idx = t.rfind(old_end)
if idx < 0:
    raise SystemExit("pair close missing")
t = t[:idx] + """});
			</script>
</div>
</div>""" + t[idx + len(old_end):]

p.write_text(t, encoding="utf-8")
print("centered and enlarged last two")
