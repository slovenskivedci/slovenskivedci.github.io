# -*- coding: utf-8 -*-
import os, re, unicodedata
root = "/Users/richtap/git/slovenskivedci"
tsv = os.path.join(root, "_tmp_photos", "field_fixes.tsv")
allp = os.path.join(root, "_data", "all.yaml")

def repl(text):
    return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode("UTF-8").replace(",","_").replace("(","_").replace(")","_")

FIELD_GROUPS = [
    ("umelá inteligencia", ["umela inteligencia", "optimalizac", "strojove ucenie", "pocitacove videnie", "robotika", "strojove videnie"]),
    ("matematika", ["teoria grafov", "diferencialne rovnice", "numericka matemat", "aplikovana matemat", "matemat"]),
    ("informatika", ["kvantova informac", "distribuovane", "bioinformatik", "aplikovana informatik", "informatik", "datova veda", "programovacie jazyky", "web system", "pocitacova grafik", "grafove algoritm", "geograficke informacne", "geovizualiz", "komplexne a adaptivne", "komplexne system"]),
    ("biológia", ["fyziologia rastlin", "fyziologia zivocich", "fyziologia buniek", "neurobiologia rastlin", "genetika drevin", "genetika a molekular"]),
    ("fyzika", ["termodynam", "fyzika polymer"]),
    ("medicína", ["mikrobiol", "lekarska biol", "genetika rakoviny", "kardiovaskularna genetik", "molekularna biomedicin", "lekarska fyz", "lekarska biochem", "lakarska chem", "behavioralna medic", "verejne zdravot", "interna medic", "medicinske zobraz", "vyvoj lieciv", "reprodukcne zdrav", "neuroimun", "neurogenetik", "neuroved", "neurol", "kardio", "onko", "imunol", "virol", "farmak", "epidemiol", "patofyziol", "patol", "hematol", "radiol", "oftalm", "pediatr", "reumat", "biomedicin", "tkanivov", "toxikol", "hygien", "fyziologia", "imun", "genetik"]),
    ("biológia", ["fyziologia rastlin", "fyziologia zivocich", "fyziologia buniek", "neurobiologia rastlin", "biotechnolog", "biosenzor", "rastlinna", "biologia rastlin", "botanik", "entomol", "parazitol", "paleobiol", "fytolog", "biogeograf", "fylogenom", "vegetacna", "behavioralna ekolog", "ekolog", "biologia ryb", "reprodukcna biol", "reproduktivna", "biologia reprodukcie", "synteza protein", "genova expres", "genetika drevin", "molekularna a bunkova", "molekularna biol", "genetika a molekular", "lesnictvo", "fyzika dreva", "chemia dreva", "biologia"]),
    ("geovedy", ["geofyz", "geochem", "strukturalna geol", "geol", "hydrol", "geochronol", "seizmol", "vulkanol", "oceanograf", "klimatick"]),
    ("inžinierstvo", ["chemicke inzinier", "elektrotechnik", "elektronik", "energetik", "environmentalne inzinier", "vyrobne technolog", "kolajove vozidl", "aplikovana mechanik", "telekomunik", "potravinarska technolog", "organicka technolog", "automatizac", "kybernet", "bezdrotove siete"]),
    ("fyzika", ["fyzika polymer", "termodynam"]),
    ("chémia", ["enzymol", "biochem", "fyzikalna chem", "anorgan", "organick", "analyticka chem", "makromolekular", "teoreticka chem", "environmentalna chem", "farmaceuticka chem", "materialova chem", "medicinalna chem", "polymer", "vypoctova chem", "vypoctova katalyz", "mechanochem", "krystalograf", "ilove mineral", "biopolymer", "membran", "chemick", "chem"]),
    ("fyzika", ["fyzika polymer", "termodynam", "subjadr", "tuhych latok", "kondenzovanych", "fyzika castic", "fyzika neutr", "fyzika plazm", "elektronova a plazmov", "fyzika magnet", "fyzika makkych", "fyzika pevnych", "experimentalna fyz", "teoreticka fyz", "aplikovana fyz", "matematicka fyz", "kvantov", "astronom", "nanooptik", "fotonik", "optika", "fotovolta", "fotovolt", "supravodic", "magneticka rezonanc", "nuklearna magneticka", "fyzik", "jadr"]),
    ("materiály", ["nanomaterial", "nanotechnol", "antibakterialne material", "opticke material", "materialova veda", "materialy", "material"]),
    ("ekonómia a manažment", ["medzinarodna ekon", "polnohospodarska ekon", "ekon", "financny manazment", "manazment", "logistik"]),
    ("spoločenské vedy", ["kognitivna psycholog", "socialna psycholog", "psycholog", "sociolog", "predskolska pedagog", "rane detstvo", "cudzie jazyky", "fonetik"]),
]

def field_group(field):
    raw = field if field is not None else ""
    if str(raw).strip() == "":
        return "ostatné"
    norm = repl(str(raw)).lower()
    for label, keys in FIELD_GROUPS:
        for key in keys:
            if key in norm:
                return label
    padded = " " + norm.replace("/", " ").replace("_", " ").replace("-", " ") + " "
    if " ai " in padded:
        return "umelá inteligencia"
    return "ostatné"

def quote_area(area):
    if all((c.isascii() and (c.isalnum() or c in "_-")) for c in area):
        return area
    return '"' + area + '"'

fixes = {}
with open(tsv, encoding="utf-8") as f:
    for line in f:
        line = line.strip("\n")
        if not line.strip():
            continue
        fn, field = line.split("\t", 1)
        fixes[os.path.splitext(fn)[0]] = field

# also map img stems from people yaml
for stem, field in list(fixes.items()):
    p = os.path.join(root, "people", stem + ".yaml")
    if not os.path.isfile(p):
        continue
    t = open(p, encoding="utf-8").read()
    m = re.search(r"^img:\s*(\S+)", t, re.M)
    if m:
        ist = os.path.splitext(m.group(1).strip().strip('"').strip("'"))[0]
        fixes[ist] = field

text = open(allp, encoding="utf-8").read()
ended = text.endswith("\n")
parts = text.split("\n- name:")
recs = [parts[0]] + ["- name:" + p for p in parts[1:]]
changed = 0
area_changes = []
unmatched = set(fixes)
out = []
for rec in recs:
    m = re.search(r"^  img:\s*(\S+)", rec, re.M)
    stem = os.path.splitext(m.group(1).strip().strip('"').strip("'"))[0] if m else None
    if not stem or stem not in fixes:
        out.append(rec)
        continue
    unmatched.discard(stem)
    new_field = fixes[stem]
    fieldurl = repl(new_field.replace(" ", "_"))
    area = field_group(new_field)
    areaurl = repl(area.replace(" ", "_"))
    om = re.search(r"^  area:\s*(.*)$", rec, re.M)
    old_area = om.group(1).strip().strip('"') if om else "?"
    def sub_line(r, key, val):
        return re.sub(r"^  %s:.*$" % key, "  %s: %s" % (key, val), r, count=1, flags=re.M)
    new = rec
    new = sub_line(new, "field", '"%s"' % new_field)
    new = sub_line(new, "fieldurl", fieldurl)
    new = sub_line(new, "area", quote_area(area))
    new = sub_line(new, "areaurl", areaurl)
    if new != rec:
        changed += 1
        if old_area != area:
            area_changes.append((stem, old_area, area))
        print("OK", stem, new_field, fieldurl, area, "was", old_area)
    else:
        print("NOCHANGE", stem)
    out.append(new)

rebuilt = out[0]
for rec in out[1:]:
    if rebuilt and not rebuilt.endswith("\n"):
        rebuilt += "\n"
    rebuilt += rec
if ended and not rebuilt.endswith("\n"):
    rebuilt += "\n"
open(allp, "w", encoding="utf-8", newline="\n").write(rebuilt)
print("all_changed", changed)
print("area_changes", len(area_changes))
for a in area_changes:
    print("AREA", a[0], a[1], "->", a[2])
print("unmatched", sorted(unmatched))
print("bytes", len(text), "->", len(rebuilt))
