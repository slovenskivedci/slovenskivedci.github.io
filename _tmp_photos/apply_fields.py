#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply field (odbor) fixes to people/*.yaml and _data/all.yaml."""
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
# Script lives in <repo>/_tmp_photos/ when run on the Mac checkout.
if os.path.basename(HERE) in ("_tmp_photos", "sv-map"):
    ROOT = os.path.dirname(HERE)
else:
    ROOT = HERE

# Allow override
if len(sys.argv) >= 2:
    ROOT = sys.argv[1]
    HERE = os.path.join(ROOT, "_tmp_photos")

TSV = os.path.join(HERE, "field_fixes.tsv")
PEOPLE = os.path.join(ROOT, "people")
ALL_YAML = os.path.join(ROOT, "_data", "all.yaml")

EXTRA = [
    ("Marcel_Franz.yaml", "fyzika kondenzovaných látok"),
    ("Marian_Krajci.yaml", "fyzika kondenzovaných látok"),
    ("Milos_Toth.yaml", "nanooptika"),
    ("MIROSLAV_GRAJCAR.yaml", "kvantová fyzika"),
    ("Dusan_Hesek.yaml", "organická chémia"),
    ("Katarina_Valaskova.yaml", "finančný manažment"),
    ("Pavel_Ciaian.yaml", "poľnohospodárska ekonómia"),
    ("Karol_Flachbart.yaml", "fyzika tuhých látok"),
    ("Jan_Minar.yaml", "fyzika tuhých látok"),
    ("Maria_Kazimirova.yaml", "parazitológia"),
    ("Henrietta_Dulai.yaml", "geochémia"),
    ("Juraj_Svitel.yaml", "biosenzory"),
]


def repl(text):
    return (
        unicodedata.normalize("NFD", text)
        .encode("ascii", "ignore")
        .decode("UTF-8")
        .replace(",", "_")
        .replace("(", "_")
        .replace(")", "_")
    )


# Same first-match rules as process.py AFTER the FIELD_GROUPS patch.
FIELD_GROUPS = [
    ("umelá inteligencia", [
        "umela inteligencia", "optimalizac", "strojove ucenie", "pocitacove videnie",
        "robotika", "strojove videnie",
    ]),
    ("matematika", [
        "teoria grafov", "diferencialne rovnice", "numericka matemat",
        "aplikovana matemat", "matemat",
    ]),
    ("informatika", [
        "kvantova informac", "distribuovane", "bioinformatik",
        "aplikovana informatik", "informatik", "datova veda",
        "programovacie jazyky", "web system", "pocitacova grafik",
        "grafove algoritm", "geograficke informacne", "geovizualiz",
        "komplexne a adaptivne", "komplexne system",
    ]),
    ("biológia", [
        "fyziologia rastlin", "fyziologia zivocich", "fyziologia buniek",
        "neurobiologia rastlin", "genetika drevin", "genetika a molekular",
    ]),
    ("fyzika", ["termodynam", "fyzika polymer"]),
    ("medicína", [
        "mikrobiol", "lekarska biol", "genetika rakoviny",
        "kardiovaskularna genetik", "molekularna biomedicin",
        "lekarska fyz", "lekarska biochem", "lakarska chem",
        "behavioralna medic", "verejne zdravot", "interna medic",
        "medicinske zobraz", "vyvoj lieciv", "reprodukcne zdrav",
        "neuroimun", "neurogenetik", "neuroved", "neurol",
        "kardio", "onko", "imunol", "virol", "farmak", "epidemiol",
        "patofyziol", "patol", "hematol", "radiol",
        "oftalm", "pediatr", "reumat", "biomedicin",
        "tkanivov",
        "toxikol", "hygien", "fyziologia", "imun", "genetik",
    ]),
    ("biológia", [
        "fyziologia rastlin", "fyziologia zivocich", "fyziologia buniek",
        "neurobiologia rastlin", "biotechnolog", "biosenzor",
        "rastlinna", "biologia rastlin", "botanik", "entomol", "parazitol",
        "paleobiol", "fytolog", "biogeograf", "fylogenom",
        "vegetacna", "behavioralna ekolog", "ekolog",
        "biologia ryb", "reprodukcna biol", "reproduktivna",
        "biologia reprodukcie", "synteza protein", "genova expres",
        "genetika drevin", "molekularna a bunkova", "molekularna biol",
        "genetika a molekular", "lesnictvo", "fyzika dreva", "chemia dreva",
        "biologia",
    ]),
    ("geovedy", [
        "geofyz", "geochem", "strukturalna geol", "geol", "hydrol",
        "geochronol", "seizmol", "vulkanol", "oceanograf", "klimatick",
    ]),
    ("inžinierstvo", [
        "chemicke inzinier", "elektrotechnik", "elektronik",
        "energetik", "environmentalne inzinier", "vyrobne technolog",
        "kolajove vozidl", "aplikovana mechanik", "telekomunik",
        "potravinarska technolog", "organicka technolog",
        "automatizac", "kybernet", "bezdrotove siete",
    ]),
    ("fyzika", ["fyzika polymer", "termodynam"]),
    ("chémia", [
        "enzymol",
        "biochem", "fyzikalna chem", "anorgan", "organick",
        "analyticka chem", "makromolekular", "teoreticka chem",
        "environmentalna chem", "farmaceuticka chem", "materialova chem",
        "medicinalna chem", "polymer", "vypoctova chem", "vypoctova katalyz",
        "mechanochem", "krystalograf", "ilove mineral", "biopolymer",
        "membran", "chemick", "chem",
    ]),
    ("fyzika", [
        "fyzika polymer", "termodynam", "subjadr", "tuhych latok",
        "kondenzovanych", "fyzika castic", "fyzika neutr", "fyzika plazm",
        "elektronova a plazmov", "fyzika magnet", "fyzika makkych",
        "fyzika pevnych", "experimentalna fyz", "teoreticka fyz",
        "aplikovana fyz", "matematicka fyz", "kvantov",
        "astronom", "nanooptik", "fotonik", "optika",
        "fotovolta", "fotovolt", "supravodic",
        "magneticka rezonanc", "nuklearna magneticka",
        "fyzik", "jadr",
    ]),
    ("materiály", [
        "nanomaterial", "nanotechnol", "antibakterialne material",
        "opticke material", "materialova veda", "materialy", "material",
    ]),
    ("ekonómia a manažment", [
        "medzinarodna ekon", "polnohospodarska ekon", "ekon",
        "financny manazment", "manazment", "logistik",
    ]),
    ("spoločenské vedy", [
        "kognitivna psycholog", "socialna psycholog", "psycholog",
        "sociolog", "predskolska pedagog", "rane detstvo",
        "cudzie jazyky", "fonetik",
    ]),
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
    return '"' + area.replace('"', '\\"') + '"'


def append_extra_rows():
    existing = set()
    if os.path.exists(TSV):
        with open(TSV, "r", encoding="utf-8") as f:
            for line in f:
                line = line.rstrip("\n")
                if not line.strip():
                    continue
                fn = line.split("\t", 1)[0].strip()
                existing.add(fn)
    added = 0
    with open(TSV, "a", encoding="utf-8") as f:
        # ensure trailing newline
        if os.path.getsize(TSV) > 0:
            f.seek(0, os.SEEK_END)
        for fn, field in EXTRA:
            if fn in existing:
                continue
            f.write("%s\t%s\n" % (fn, field))
            added += 1
            existing.add(fn)
    return added


def load_fixes():
    fixes = []
    seen = set()
    with open(TSV, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 2:
                print("BAD TSV LINE:", repr(line))
                continue
            fn = parts[0].strip()
            field = parts[1].strip()
            if fn in seen:
                continue
            seen.add(fn)
            fixes.append((fn, field))
    return fixes


def replace_field_line(text, new_field):
    lines = text.splitlines(keepends=True)
    out = []
    changed = False
    for line in lines:
        if re.match(r"^field:\s*", line):
            nl = "\n" if line.endswith("\n") else ""
            out.append('field: "%s"%s' % (new_field, nl))
            changed = True
        else:
            out.append(line)
    if not changed:
        return text, False
    return "".join(out), True


def update_all_record(record, new_field, fieldurl, area, areaurl):
    lines = record.splitlines(keepends=True)
    out = []
    hits = {"field": 0, "fieldurl": 0, "area": 0, "areaurl": 0}
    for line in lines:
        if re.match(r"^  field:\s*", line):
            nl = "\n" if line.endswith("\n") else ""
            out.append('  field: "%s"%s' % (new_field, nl))
            hits["field"] += 1
        elif re.match(r"^  fieldurl:\s*", line):
            nl = "\n" if line.endswith("\n") else ""
            out.append("  fieldurl: %s%s" % (fieldurl, nl))
            hits["fieldurl"] += 1
        elif re.match(r"^  area:\s*", line):
            nl = "\n" if line.endswith("\n") else ""
            out.append("  area: %s%s" % (quote_area(area), nl))
            hits["area"] += 1
        elif re.match(r"^  areaurl:\s*", line):
            nl = "\n" if line.endswith("\n") else ""
            out.append("  areaurl: %s%s" % (areaurl, nl))
            hits["areaurl"] += 1
        else:
            out.append(line)
    return "".join(out), hits


def img_stem(record):
    m = re.search(r"^  img:\s*(\S+)", record, re.M)
    if not m:
        return None
    return os.path.splitext(m.group(1).strip().strip('"').strip("'"))[0]


def main():
    print("ROOT", ROOT)
    print("TSV", TSV)
    print("PEOPLE", PEOPLE)
    print("ALL_YAML", ALL_YAML)
    added = append_extra_rows()
    print("appended_extra", added)
    fixes = load_fixes()
    print("fixes", len(fixes))

    people_changed = 0
    people_missing = []
    people_unchanged = []
    img_to_fix = {}
    yaml_to_fix = {}

    for fn, new_field in fixes:
        path = os.path.join(PEOPLE, fn)
        stem = os.path.splitext(fn)[0]
        yaml_to_fix[stem] = new_field
        if not os.path.isfile(path):
            people_missing.append(fn)
            img_to_fix[stem] = new_field
            continue
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        # also map this file's img stem
        m = re.search(r"^img:\s*(\S+)", text, re.M)
        if m:
            ist = os.path.splitext(m.group(1).strip().strip('"').strip("'"))[0]
            img_to_fix[ist] = new_field
        else:
            img_to_fix[stem] = new_field
        new_text, changed = replace_field_line(text, new_field)
        if changed and new_text != text:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(new_text)
            people_changed += 1
            print("PEOPLE_OK", fn, "->", new_field)
        else:
            people_unchanged.append(fn)
            print("PEOPLE_NOCHANGE", fn)

    print("people_changed", people_changed)
    print("people_missing", people_missing)
    print("people_unchanged", people_unchanged)

    if not os.path.isfile(ALL_YAML):
        print("NO_ALL_YAML")
        return

    with open(ALL_YAML, "r", encoding="utf-8") as f:
        all_text = f.read()
    ended_nl = all_text.endswith("\n")
    parts = all_text.split("\n- name:")
    records = [parts[0]] + ["- name:" + p for p in parts[1:]]

    all_changed = 0
    all_hits = []
    unmatched_stems = set(img_to_fix.keys()) | set(yaml_to_fix.keys())
    area_changes = []

    new_records = []
    for rec in records:
        stem = img_stem(rec)
        new_field = None
        if stem and stem in img_to_fix:
            new_field = img_to_fix[stem]
        elif stem and stem in yaml_to_fix:
            new_field = yaml_to_fix[stem]
        if new_field is None:
            new_records.append(rec)
            continue
        unmatched_stems.discard(stem)
        fieldurl = repl(new_field.replace(" ", "_"))
        area = field_group(new_field)
        areaurl = repl(area.replace(" ", "_"))
        # capture old area
        om = re.search(r"^  area:\s*(.*)$", rec, re.M)
        old_area = om.group(1).strip().strip('"') if om else "?"
        new_rec, hits = update_all_record(rec, new_field, fieldurl, area, areaurl)
        if new_rec != rec:
            all_changed += 1
            all_hits.append((stem, new_field, fieldurl, area, areaurl, hits, old_area))
            if old_area != area and old_area != '"%s"' % area:
                area_changes.append((stem, old_area, area))
            print(
                "ALL_OK",
                stem,
                "field=",
                new_field,
                "fieldurl=",
                fieldurl,
                "area=",
                area,
                "was=",
                old_area,
                "hits=",
                hits,
            )
        else:
            print("ALL_NOCHANGE", stem)
        new_records.append(new_rec)

    rebuilt = new_records[0] if new_records else ""
    for rec in new_records[1:]:
        if rebuilt and not rebuilt.endswith("\n"):
            rebuilt += "\n"
        rebuilt += rec
    if ended_nl and not rebuilt.endswith("\n"):
        rebuilt += "\n"
    if rebuilt != all_text:
        with open(ALL_YAML, "w", encoding="utf-8", newline="\n") as f:
            f.write(rebuilt)
        print("WROTE_ALL_YAML")
    else:
        print("ALL_YAML_UNCHANGED_BYTES")

    print("all_changed", all_changed)
    print("unmatched_stems", sorted(unmatched_stems))
    print("area_changes", len(area_changes))
    for row in area_changes:
        print("AREA_CHANGE", row[0], row[1], "->", row[2])


if __name__ == "__main__":
    main()
