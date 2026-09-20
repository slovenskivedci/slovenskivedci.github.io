# Bez Google Scholar (`people_no_scholar/`)

People who belong in spirit on slovenskivedci.sk but lack a **working** Google Scholar
profile. They appear on `/bez-scholar.html` only — **not** on Kompaktný or Podrobný.

`process.py` reads `people_no_scholar/*.yaml` → `_data/no_scholar.yaml`.

## Required / useful fields

| Field | Notes |
|-------|--------|
| `name`, `last`, `field`, `affiliation`, `city`, `country`, `img` | Same as main `people/` |
| `reason` | Short Slovak note, e.g. `Scholar profil nefunguje (404)` |
| `semantic_scholar` | Full URL only if verified live; else omit |
| `openalex` | Full URL only if verified live; else omit |
| `h_semantic` / `h_openalex` | Only if taken from that live source |
| `h_google_stale` | Optional last known Google Scholar h — **not** current; labeled on the page |
| `links` | ResearchGate, CV, etc. as usual |
| `pribeh`, `year`, `position`, `sex` | Optional, same as main list |

**Do not invent Google Scholar user IDs.** Do not put broken `scholar:` URLs here for display as live metrics.

## Add someone

1. Create `people_no_scholar/First_Last.yaml` with the fields above.
2. Ensure `images/First_Last_size_280px.jpg` exists.
3. Run `python3 process.py` (or the project venv).
4. Commit and push `gh-pages`.

## Restore to main list

When they have a working Scholar profile with h ≥ 30:

1. Move YAML to `people/`.
2. Set working `scholar:` and current `hindex`; drop `reason` / `h_google_stale` / alt metrics if you prefer.
3. Remove from `people_no_scholar/`.
4. Run `python3 process.py`, push.
