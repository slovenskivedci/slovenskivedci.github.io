# -*- coding: utf-8 -*-
import os, re
root = "/Users/richtap/git/slovenskivedci"
tsv = os.path.join(root, "_tmp_photos", "field_fixes.tsv")
bad = []
ok = 0
with open(tsv, encoding="utf-8") as f:
    for line in f:
        line = line.strip("\n")
        if not line.strip():
            continue
        fn, field = line.split("\t", 1)
        path = os.path.join(root, "people", fn)
        text = open(path, encoding="utf-8").read()
        m = re.search(r'^field:\s*"(.*)"\s*$', text, re.M)
        got = m.group(1) if m else None
        if got != field:
            bad.append((fn, field, got))
        else:
            ok += 1
print("people_ok", ok)
print("people_bad", bad)
# protected
for fn, expect in [
    ("Peter_Richtarik.yaml", None),
    ("Martin_Takac.yaml", None),
]:
    t = open(os.path.join(root, "people", fn), encoding="utf-8").read()
    m = re.search(r'^field:\s*(.*)$', t, re.M)
    print(fn, m.group(1) if m else "NOFIELD")
