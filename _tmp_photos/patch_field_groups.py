#!/usr/bin/env python3
import sys
from pathlib import Path
path = Path(sys.argv[1] if len(sys.argv) > 1 else "process.py")
text = path.read_text(encoding="utf-8")
orig = text
repls = [
    ("'cudzie jazyky',\n\t]),", "'cudzie jazyky', 'fonetik',\n\t]),"),
    ("'reumat', 'biomedicin',\n\t\t'toxikol'", "'reumat', 'biomedicin',\n\t\t'tkanivov',\n\t\t'toxikol'"),
    ("('chémia', [\n\t\t'biochem'", "('chémia', [\n\t\t'enzymol',\n\t\t'biochem'"),
    ("'botanik', 'entomol',\n\t\t'paleobiol'", "'botanik', 'entomol', 'parazitol',\n\t\t'paleobiol'"),
]
for a, b in repls:
    if a not in text:
        print("MISSING", repr(a[:60]))
    else:
        text = text.replace(a, b, 1)
        print("OK", repr(a[:40]))
if text == orig:
    print("NOCHANGE")
else:
    path.write_text(text, encoding="utf-8")
    print("WROTE", path)
