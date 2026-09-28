from pathlib import Path
p = Path("/Users/richtap/git/slovenskivedci/statistiky.html")
t = p.read_text(encoding="utf-8")

css = """.sv-plot-title {
  margin: 12px 0 4px;
  font-weight: 600;
  font-size: 16px;
  line-height: 22px;
  color: #111827;
  font-family: "Open Sans", Arial, sans-serif;
  text-align: center;
}
"""
if ".sv-plot-title" not in t:
    needle = ".sv-chart { width: 100%; max-width: 920px; height: 260px; margin: 0 auto; }\n"
    if needle not in t:
        raise SystemExit("css needle missing")
    t = t.replace(needle, needle + css, 1)

t = t.replace(
    '<p style="margin:12px 0 4px;font-weight:600;font-size:16px;color:#111827;">Počet vedcov a vedkýň podľa krajiny a mesta pôsobenia</p>',
    '<p class="sv-plot-title">Počet vedcov a vedkýň podľa krajiny a mesta pôsobenia</p>',
    1,
)
t = t.replace(
    '<p style="margin:12px 0 4px;font-weight:600;font-size:16px;color:#111827;">Zastúpenie oblastí</p>',
    '<p class="sv-plot-title">Zastúpenie oblastí</p>',
    1,
)

inserts = [
    ('<div class="sv-chart sv-chart-lollipop-area"><canvas id="chartRecordArea"></canvas></div>',
     '<p class="sv-plot-title">Najvyšší h-index v oblasti</p>\n          <div class="sv-chart sv-chart-lollipop-area"><canvas id="chartRecordArea"></canvas></div>'),
    ('<div class="sv-chart sv-chart-lollipop-decade"><canvas id="chartRecordDecade"></canvas></div>',
     '<p class="sv-plot-title">Najvyšší h-index podľa desaťročia narodenia</p>\n          <div class="sv-chart sv-chart-lollipop-decade"><canvas id="chartRecordDecade"></canvas></div>'),
    ('<div class="sv-chart"><canvas id="myChartYearHindex"></canvas></div>',
     '<p class="sv-plot-title">H-index podľa roku narodenia</p>\n          <div class="sv-chart"><canvas id="myChartYearHindex"></canvas></div>'),
    ('<div class="sv-chart"><canvas id="myChartOdbor"></canvas></div>',
     '<p class="sv-plot-title">H-index a počet podľa oblasti</p>\n            <div class="sv-chart"><canvas id="myChartOdbor"></canvas></div>'),
    ('<div class="sv-chart sv-chart-workplace"><canvas id="myChartCountByWorkplace"></canvas></div>',
     '<p class="sv-plot-title">Počet vedcov a vedkýň podľa pracoviska</p>\n            <div class="sv-chart sv-chart-workplace"><canvas id="myChartCountByWorkplace"></canvas></div>'),
    ('<div class="sv-chart"><canvas id="myChartHindex"></canvas></div>',
     '<p class="sv-plot-title">Počet vedcov a vedkýň podľa h-indexu</p>\n<div class="sv-chart"><canvas id="myChartHindex"></canvas></div>'),
    ('<div class="sv-chart"><canvas id="myChartYearHist"></canvas></div>',
     '<p class="sv-plot-title">Počet vedcov a vedkýň podľa roku narodenia</p>\n<div class="sv-chart"><canvas id="myChartYearHist"></canvas></div>'),
]
for old, new in inserts:
    if old not in t:
        raise SystemExit("missing insert target: " + old[:60])
    if "sv-plot-title" in new and new.split("sv-plot-title")[1][:20] in t and old in t:
        # avoid double insert if title already present immediately before
        pass
    if old not in t:
        raise SystemExit("gone: " + old)
    # skip if already inserted
    if new in t:
        continue
    t = t.replace(old, new, 1)

# disable Chart.js plot titles (keep axis titles)
repls = [
    ('                  title: { display: true, text: "Najvyšší h-index v oblasti", color: "#111827", font: { size: 16, weight: "600", family: "Open Sans, sans-serif" } },',
     '                  title: { display: false },'),
    ('                  title: { display: true, text: "Najvyšší h-index podľa desaťročia narodenia", color: "#111827", font: { size: 16, weight: "600", family: "Open Sans, sans-serif" } },',
     '                  title: { display: false },'),
    ("""      title: {
        display: true,
        text: 'H-index podľa roku narodenia'
      },""",
     '      title: { display: false },'),
    ("""      title: {
        display: true,
        text: 'H-index a počet podľa oblasti'
      }""",
     '      title: { display: false }'),
    ("""      title: {
        display: true,
        text: 'Počet vedcov a vedkýň podľa pracoviska'
      }""",
     '      title: { display: false }'),
    ("""      title: {
        display: true,
        text: 'Počet vedcov a vedkýň podľa h-indexu (histogram)'
      }""",
     '      title: { display: false }'),
    ("""      title: {
        display: true,
        text: 'Počet vedcov a vedkýň podľa roku narodenia (histogram)'
      }""",
     '      title: { display: false }'),
]
for old, new in repls:
    if old not in t:
        raise SystemExit("missing title disable: " + old[:80].replace("\n"," "))
    t = t.replace(old, new, 1)

p.write_text(t, encoding="utf-8")
print("titles unified")
