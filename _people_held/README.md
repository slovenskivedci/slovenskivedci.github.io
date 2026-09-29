# Held off live site

Internal notes only. This folder is `_people_held/` (leading underscore) so Jekyll never publishes it; it is also listed under `exclude:` in `_config.yml`.

YAML here is **not** picked up by `process.py` (it only globs `people/*.yaml`).

- `Peter_Tomasec.yaml` — Scholar 404; deceased 2017; do not invent a Google/Scholar account.
- `Tanya_Ravingerova.yaml` — Scholar 404; emailed 2026-08-30 and 2026-09-13; no reply.

The short-lived “Bez Scholar” page idea was scratched 2026-09-20.

To restore to the main list: move the file from `_people_held/` back to `people/`, set a working `scholar:` URL, run `python3 process.py`, push `gh-pages`.
