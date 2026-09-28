# -*- coding: utf-8 -*-
import os, re
root = "/Users/richtap/git/slovenskivedci"
tsv = os.path.join(root, "_tmp_photos", "field_fixes.tsv")
n = 0
missing = []
with open(tsv, encoding="utf-8") as f:
    for line in f:
        line = line.strip("\n")
        if not line.strip():
            continue
        fn, field = line.split("\t", 1)
        path = os.path.join(root, "people", fn)
        if not os.path.isfile(path):
            missing.append(fn)
            continue
        text = open(path, encoding="utf-8").read()
        new, c = re.subn(r"^field:.*$", 'field: "%s"' % field, text, count=1, flags=re.M)
        if c:
            open(path, "w", encoding="utf-8", newline="\n").write(new)
            n += 1
            print("OK", fn)
        else:
            print("NOFIELD", fn)
print("changed", n)
print("missing", missing)
