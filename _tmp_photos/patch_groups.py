# -*- coding: utf-8 -*-
path = "/Users/richtap/git/slovenskivedci/process.py"
text = open(path, encoding="utf-8").read()
orig = text

# medicína: add tkanivov
old = "\t\t'oftalm', 'pediatr', 'reumat', 'biomedicin',\n\t\t'toxikol', 'hygien', 'fyziologia', 'imun', 'genetik',"
new = "\t\t'oftalm', 'pediatr', 'reumat', 'biomedicin',\n\t\t'tkanivov',\n\t\t'toxikol', 'hygien', 'fyziologia', 'imun', 'genetik',"
if old not in text:
    raise SystemExit("medicína block not found")
text = text.replace(old, new, 1)

# second biológia: add parazitol near entomol
old = "\t\t'rastlinna', 'biologia rastlin', 'botanik', 'entomol',"
new = "\t\t'rastlinna', 'biologia rastlin', 'botanik', 'entomol', 'parazitol',"
if old not in text:
    raise SystemExit("biológia entomol block not found")
text = text.replace(old, new, 1)

# chémia: add enzymol first
old = "\t('chémia', [\n\t\t'biochem', 'fyzikalna chem', 'anorgan', 'organick',"
new = "\t('chémia', [\n\t\t'enzymol',\n\t\t'biochem', 'fyzikalna chem', 'anorgan', 'organick',"
if old not in text:
    raise SystemExit("chémia block not found")
text = text.replace(old, new, 1)

# spoločenské vedy: add fonetik
old = "\t\t'cudzie jazyky',\n\t]),\n]"
new = "\t\t'cudzie jazyky', 'fonetik',\n\t]),\n]"
if old not in text:
    raise SystemExit("spoločenské vedy block not found")
text = text.replace(old, new, 1)

if text == orig:
    raise SystemExit("no changes")
open(path, "w", encoding="utf-8", newline="\n").write(text)
print("process.py FIELD_GROUPS patched")
