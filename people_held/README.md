# Held off live site

YAML that belongs on the **Bez Google Scholar** page lives in `people_no_scholar/`
(not here). `process.py` only globs `people/*.yaml` for the main Kompaktný/Podrobný lists.

Historical note (2026-09-20): Peter Tomašec and Tanya Ravingerová were first moved
here because their Google Scholar profiles returned 404, then into `people_no_scholar/`
for the dedicated page.

To put someone back on the main list: move their YAML to `people/`, set a working
`scholar:` URL and current `hindex`, run `python3 process.py`, push `gh-pages`.
