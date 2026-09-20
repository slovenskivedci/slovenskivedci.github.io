# Held off live site

YAML here is **not** picked up by `process.py` (it only globs `people/*.yaml`).

- `Peter_Tomasec.yaml` — Scholar `hOuiMR8AAAAJ` 404; deceased 2017; do not invent a Google/Scholar account.
- `Tanya_Ravingerova.yaml` — Scholar `_fONjMIAAAAJ` 404; emailed 2026-08-30 and 2026-09-13; no reply.

To restore: move the file back to `people/`, set a working `scholar:` URL, fix `hindex` if needed, run `python3 process.py`, push `gh-pages`.
