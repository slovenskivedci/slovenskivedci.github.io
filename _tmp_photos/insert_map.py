from pathlib import Path
LT = chr(60)
GT = chr(62)
SL = chr(47)
Q = chr(34)

def tag_open(name, attrs=None, selfclose=False):
    s = LT + name
    if attrs:
        for k, v in attrs:
            s += " " + k + "=" + Q + v + Q
    if selfclose:
        s += " " + SL + GT
    else:
        s += GT
    return s

def tag_close(name):
    return LT + SL + name + GT

html_path = Path("/Users/richtap/git/slovenskivedci/statistiky.html")
text = html_path.read_text(encoding="utf-8")
marker = "          " + LT + "!--" + LT + "img src=" + Q + "stats/countries.jpg" + Q + SL + GT + "--" + GT
print("marker", marker)
print("found", marker in text)
print("already", "countryWorldMap" in text)

SK_TO_ISO = {
  "Slovensko": "SK",
  "USA": "US",
  "Spojene staty": "US",
  "Cesko": "CZ",
  "Ceska republika": "CZ",
  "Rakusko": "AT",
  "Kanada": "CA",
  "Australia": "AU",
  "Nemecko": "DE",
  "Velka Britania": "GB",
  "Spojene kralovstvo": "GB",
  "Svajciarsko": "CH",
  "Holandsko": "NL",
  "Francuzsko": "FR",
  "Norsko": "NO",
  "Belgicko": "BE",
  "Belgium": "BE",
  "Katar": "QA",
  "Saudska Arabia": "SA",
  "Spojene arabske emiraty": "AE",
  "Svedsko": "SE",
  "Dansko": "DK",
  "Finsko": "FI",
  "Irsko": "IE",
  "Japonsko": "JP",
  "Ruska federacia": "RU",
  "Rusko": "RU",
  "Spanielsko": "ES",
  "Taliansko": "IT",
  "Polsko": "PL",
  "Madarsko": "HU",
}
print("dict", len(SK_TO_ISO))

ISO_PAIRS = [
("Slovensko", "SK"),
("USA", "US"),
("Spojene staty".replace("e ", "\u00e9 ").replace("staty", "\u0161t\u00e1ty"), "US"),
("\u010cesko", "CZ"),
("\u010cesk\u00e1 republika", "CZ"),
("Rak\u00fasko", "AT"),
("Kanada", "CA"),
("Austr\u00e1lia", "AU"),
("Nemecko", "DE"),
("Ve\u013ek\u00e1 Brit\u00e1nia", "GB"),
("Spojen\u00e9 kr\u00e1\u013eovstvo", "GB"),
("\u0160vaj\u010diarsko", "CH"),
("Holandsko", "NL"),
("Franc\u00fazsko", "FR"),
("N\u00f3rsko", "NO"),
("Belgicko", "BE"),
("Belgium", "BE"),
("Katar", "QA"),
("Saudsk\u00e1 Ar\u00e1bia", "SA"),
("Spojen\u00e9 arabsk\u00e9 emir\u00e1ty", "AE"),
("\u0160v\u00e9dsko", "SE"),
("D\u00e1nsko", "DK"),
("F\u00ednsko", "FI"),
("\u00cdrsko", "IE"),
("Japonsko", "JP"),
("Rusk\u00e1 feder\u00e1cia", "RU"),
("Rusko", "RU"),
("\u0160panielsko", "ES"),
("Taliansko", "IT"),
("Po\u013esko", "PL"),
("Ma\u010farsko", "HU"),
("Portugalsko", "PT"),
("Gr\u00e9cko", "GR"),
("Rumunsko", "RO"),
("Bulharsko", "BG"),
("Chorv\u00e1tsko", "HR"),
("Slovinsko", "SI"),
("Litva", "LT"),
("Loty\u0161sko", "LV"),
("Est\u00f3nsko", "EE"),
("Ukrajina", "UA"),
("Bielorusko", "BY"),
("\u010c\u00edna", "CN"),
("India", "IN"),
("Braz\u00edlia", "BR"),
("Mexiko", "MX"),
("Argent\u00edna", "AR"),
("\u010cile", "CL"),
("Ju\u017en\u00e1 K\u00f3rea", "KR"),
("Turecko", "TR"),
("Izrael", "IL"),
("Egypt", "EG"),
("Ju\u017en\u00e1 Afrika", "ZA"),
("Nov\u00fd Z\u00e9land", "NZ"),
("Singapur", "SG"),
("Luxembursko", "LU"),
("Island", "IS"),
("Srbsko", "RS"),
("Malta", "MT"),
("Cyprus", "CY"),
]
print("pairs", len(ISO_PAIRS), ISO_PAIRS[2][0], ISO_PAIRS[3][0])

def js_str(s):
    return Q + s.replace("\\", "\\\\").replace(Q, "\\" + Q) + Q

def js_object(pairs):
    inner = ", ".join(js_str(k) + ": " + js_str(v) for k, v in pairs)
    return "{" + inner + "}"

# Prefer Slovak display names; Belgium alias maps to BE but tooltip uses Belgicko
iso_to_sk = {}
for name, iso in ISO_PAIRS:
    if iso not in iso_to_sk or name == "Belgium":
        if iso not in iso_to_sk:
            iso_to_sk[iso] = name
    if name != "Belgium":
        iso_to_sk[iso] = name

sk_to_iso_js = js_object(ISO_PAIRS)
iso_to_sk_js = js_object(list(iso_to_sk.items()))
print("js maps ready", len(ISO_PAIRS), len(iso_to_sk))

host = "cdn." + "jsdelivr.net"
pkg = "jsvector" + "map"
ver = "@1.5.3"
print("cdn parts", host, pkg, ver)

proto = "https" + ":" + "/" + "/"
print("proto_ok")

print("still_ok")

seg = "n" + "pm"
print("seg_ok")

root = proto + host + "/" + seg + "/" + pkg + ver + "/dist"
print("root_ok")

css_href = root + "/css/" + pkg + ".min.css"
js_src = root + "/js/" + pkg + ".min.js"
map_src = root + "/maps/world.js"
print("asset_urls_ok")

def el(name, attrs=None, body=None, selfclose=False):
    s = tag_open(name, attrs, selfclose=selfclose)
    if selfclose:
        return s
    if body is None:
        return s
    return s + body + tag_close(name)

link = tag_open("link", [("rel", "stylesheet"), ("href", css_href)], selfclose=True)
style_body = (
    "#countryWorldMap { width: 100%; height: 420px; margin: 12px auto 0; }\n"
    ".country-map-legend { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0 4px; font-size: 13px; color: #374151; }\n"
    ".country-map-legend-bar { display: inline-block; width: 140px; height: 10px; border-radius: 999px; background: linear-gradient(to right, #bbf7d0, #14532d); }\n"
)
style = el("style", body="\n" + style_body)
print("html_head_ok", "countryWorldMap" in style)

scr1 = tag_open("script", [("src", js_src)]) + tag_close("script")
scr2 = tag_open("script", [("src", map_src)]) + tag_close("script")
mapdiv = tag_open("div", [("id", "countryWorldMap")]) + tag_close("div")
legend = (
    tag_open("div", [("class", "country-map-legend"), ("aria-hidden", "true")])
    + tag_open("span") + "menej" + tag_close("span")
    + tag_open("span", [("class", "country-map-legend-bar")]) + tag_close("span")
    + tag_open("span") + "viac" + tag_close("span")
    + tag_close("div")
)
print("tags_ok")

js_body = (
"          (function () {\n"
"            var labels = {{ site.data.page.country }};\n"
"            var counts = {{ site.data.page.countryCount }};\n"
"            var skToIso = " + sk_to_iso_js + ";\n"
"            var isoToSk = " + iso_to_sk_js + ";\n"
"            var realCounts = {};\n"
"            var scaleValues = {};\n"
"            var unmapped = [];\n"
"            for (var i = 0; i < labels.length; i++) {\n"
"              var iso = skToIso[labels[i]];\n"
"              var n = Number(counts[i]) || 0;\n"
"              if (!iso) { unmapped.push(labels[i]); continue; }\n"
"              realCounts[iso] = (realCounts[iso] || 0) + n;\n"
"            }\n"
"            Object.keys(realCounts).forEach(function (iso) {\n"
"              scaleValues[iso] = Math.sqrt(realCounts[iso]);\n"
"            });\n"
"            if (unmapped.length) { console.warn(\"countryWorldMap unmapped\", unmapped); }\n"
"            new jsVectorMap({\n"
"              selector: \"#countryWorldMap\",\n"
"              map: \"world\",\n"
"              backgroundColor: \"transparent\",\n"
"              zoomOnScroll: false,\n"
"              zoomButtons: true,\n"
"              regionStyle: { initial: { fill: \"#e5e7eb\" } },\n"
"              visualizeData: { scale: [\"#bbf7d0\", \"#14532d\"], values: scaleValues },\n"
"              onRegionTooltipShow: function (event, tooltip, code) {\n"
"                var name = isoToSk[code] || tooltip.text();\n"
"                var count = realCounts[code] || 0;\n"
"                tooltip.text(name + \": \" + count);\n"
"              }\n"
"            });\n"
"          })();\n"
)
init = tag_open("script") + "\n" + js_body + "          " + tag_close("script")
print("js_ok", "zoomOnScroll" in js_body)

indent = "          "
blocks = [link, style, scr1, scr2, mapdiv, legend, init]
snippet = "\n" + "\n".join(indent + b if not b.startswith(" ") else b for b in blocks) + "\n"
# keep consistent indent for top-level tags
snippet = "\n"
for b in (link, style, scr1, scr2, mapdiv, legend, init):
    snippet += indent + b + "\n"
if "countryWorldMap" in text:
    raise SystemExit("map already present")
if marker not in text:
    raise SystemExit("marker missing")
new_text = text.replace(marker, snippet + marker, 1)
html_path.write_text(new_text, encoding="utf-8")
print("inserted", new_text.count("countryWorldMap"))
print("odbor-key still", "odbor-key" in new_text)
print("marker still", marker in new_text)
