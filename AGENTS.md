# AGENTS.md

## Project overview
Static **Landa InsightPro+ dashboard** implemented in `index.html`.

## Run locally
`python3 -m http.server 8000`

## Engineering rules
- Avoid large rewrites; prefer minimal safe patches.
- Do not redesign UI unless explicitly requested.
- Do not hardcode sample file names, dates, presses, customers, models, or row-specific values.
- Preserve KPI/chart/drilldown/validation consistency.
- Avoid double counting.
- Keep one source of truth for parsed/normalized data.

## Data rules
- Handle uploaded files generically by detected format/content.
- Same-format future files with different dates/presses/customers/models/row counts must work.
- Print Volume / Waste logic must not be tuned to current sample files only.
- `special` job type = waste.
- `totalPrintedSheets = goodPrintedSheets + wastePrintedSheets`.
- `wasteRatio = wastePrintedSheets / totalPrintedSheets` when `totalPrintedSheets > 0`.

## Verification rules
- Run syntax checks where possible.
- Manually review changed sections.
- Report files changed and checks performed.

## Definition of Done
- App still loads.
- No UI regression.
- No sample-specific hardcoding.
- KPI, charts, drilldowns, and validation use the same canonical source of truth (or derived aggregations).
