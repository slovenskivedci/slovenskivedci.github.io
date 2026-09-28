# -*- coding: utf-8 -*-
import unicodedata
import glob
import oyaml as yaml

def repl(text):
    return unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('UTF-8').replace(",","_").replace("(","_").replace(")","_")

FIELD_GROUPS = [
    ('neurológia', ['neuro']),
    ('kardiológia', ['kardio']),
    ('onkológia', ['onko']),
    ('imunológia', ['imun']),
    ('virológia', ['virol']),
    ('mikrobiológia', ['mikrobiol']),
    ('farmakológia', ['farmak']),
    ('epidemiológia', ['epidemiol']),
    ('fyziológia', ['fyziol']),
    ('patológia', ['patol']),
    ('hydrológia', ['hydrol']),
    ('geológia', ['geol']),
    ('ekonómia', ['ekon']),
    ('manažment', ['manazment']),
    ('umelá inteligencia', ['umela inteligencia']),
    ('informatika', ['informatik']),
    ('matematika', ['matemat']),
    ('biochémia', ['biochem']),
    ('biofyzika', ['biofyz']),
    ('biotechnológia', ['biotech']),
    ('molekulárna biológia', ['molekularn']),
    ('rastlinná biológia', ['rastlin']),
    ('ekológia', ['ekolog']),
    ('materiálová veda', ['material']),
    ('chémia', ['fyzikalna chem', 'anorgan', 'organick', 'chemick', 'chem']),
    ('fyzika', ['subjadr', 'tuhych latok', 'kvantov', 'fyzik', 'jadr']),
    ('biológia', ['biol']),
]

def has_ai_token(norm):
    padded = ' ' + norm.replace('/', ' ').replace('_', ' ').replace('-', ' ') + ' '
    return ' ai ' in padded

def field_group(field):
    raw = field if field is not None else ""
    if str(raw).strip() == "":
        return 'ostatné'
    norm = repl(str(raw)).lower()
    for label, keys in FIELD_GROUPS:
        for key in keys:
            if key in norm:
                return label
    if has_ai_token(norm):
        return 'umelá inteligencia'
    return raw

groups = {}
n_people = 0
for path in glob.glob("./people/*.yaml"):
    with open(path) as f:
        dic = yaml.safe_load(f)
    if int(dic['hindex']) < 30:
        continue
    n_people += 1
    g = field_group(dic.get('field') or "")
    groups.setdefault(g, []).append(int(dic['hindex']))

rows = []
for name, hs in groups.items():
    n = len(hs)
    mn = min(hs)
    mx = max(hs)
    avg = round(sum(hs) / float(n), 1)
    rows.append((name, n, mn, avg, mx))
rows.sort(key=lambda e: (-e[1], repl(e[0]).lower()))

def js_str(s):
    return "'" + str(s).replace("'", "\\'") + "'"

def js_num(v):
    if isinstance(v, float):
        return "%.1f" % v
    return str(v)

odbor = "[" + ",".join(js_str(e[0]) for e in rows) + "]"
odborCount = "[" + ",".join(str(e[1]) for e in rows) + "]"
odborMin = "[" + ",".join(js_num(e[2]) for e in rows) + "]"
odborAvg = "[" + ",".join(js_num(e[3]) for e in rows) + "]"
odborMax = "[" + ",".join(js_num(e[4]) for e in rows) + "]"

bad = [(e[0], e[2], e[3], e[4]) for e in rows if not (e[2] <= e[3] <= e[4])]
print("groups", len(rows))
print("sum_n", sum(e[1] for e in rows))
print("people", n_people)
print("min_avg_max_ok", len(bad) == 0, "violations", len(bad))
print("TOP8")
for e in rows[:8]:
    print("%s\tn=%s\tmin=%s\tavg=%s\tmax=%s" % (e[0], e[1], e[2], e[3], e[4]))

with open("_data/page.yaml") as f:
    page = yaml.safe_load(f)

# drop raw per-person h lists if present; keep compact n
page["fields"] = {name: n for name, n, mn, avg, mx in rows}
page["odbor"] = odbor
page["odborCount"] = odborCount
page["odborMin"] = odborMin
page["odborAvg"] = odborAvg
page["odborMax"] = odborMax

with open("_data/page.yaml", "w") as f:
    yaml.dump(page, f)
print("wrote _data/page.yaml")
