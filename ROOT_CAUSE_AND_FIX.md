# Root Cause and Fix — Blank Charts Regression

## Exact root causes found

1. **Source scoping was derived from merged-event keys only.**
   - `buildSourceScope` previously built `keysPrimary/keysFallback` from filtered merged events and then filtered `errorsAgg`, `availabilityAgg`, and `volumeAgg` through those keys.
   - This created a brittle dependency on merged-row presence and key-join behavior instead of filtering each source table natively.
   - Under certain valid filter combinations, merged rows could exist while source aggregates were filtered to zero (or vice versa), causing chart inputs to collapse.

2. **Ranking drilldowns were not consistently keyed by stable payload entities.**
   - Ranking charts were rendered with labels only; click behavior could fall back to display labels.
   - This broke stable entity-key behavior and could mis-scope drilldowns when labels were ambiguous/transformed.

3. **Chart render pipeline lacked a single inspectable scoped-source object per render.**
   - Different layers used similar but separate filtering paths, increasing divergence risk across KPI, chart, drilldown, and export behavior.

## Why charts were blank

- The immediate chart blanking came from **scoping collapse at source-table level** after filtering, because source aggregates were indirectly scoped by merged keys rather than native source filters.
- Once source arrays fed to chart builders became empty/all-zero unexpectedly, charts rendered as effectively blank (or empty state), despite Chart.js and local fallback being present.

## Architectural changes implemented

1. **Introduced one scoped-source architecture (`buildSourceScope`) driven by global filters, not merged-key-only scoping.**
   - Added `currentFilterValues()` and `rowPassesGlobalFilters(...)`.
   - `buildSourceScope(...)` now returns:
     - `filteredMergedRows`
     - `filteredErrorEvents`
     - `filteredErrorsAgg`
     - `filteredAvailabilityAgg`
     - `filteredVolumeAgg`
   - KPI and chart layers read from source-backed filtered aggregates.

2. **Kept merged table as contextual explorer only.**
   - Merged rows remain for the explorer/table context.
   - KPI totals and chart totals remain source-owned:
     - `errorsAgg` for events/error duration
     - `availabilityAgg` for planned/unplanned downtime + availability
     - `volumeAgg` for production volume

3. **Stabilized chart drilldown payloads.**
   - Ranking rows now include payload fields:
     - `entityKey`
     - `displayLabel`
     - `sourceType`
     - `metric`
   - Ranking chart click handlers now pass payload objects to `baseOptions(..., payloads)`.
   - Drilldowns no longer rely on visible labels as keys.

4. **Added source-type-aware drilldown handling for press downtime.**
   - Press/downtime drilldowns now open against `availabilityAgg` directly (stable canonical press key), rather than forcing merged-event row behavior.

5. **Export alignment updated.**
   - Main export now uses `STATE.lastSourceScope.filteredMergedRows` (same current scoped filter context).

6. **Events-first/risk disabled behavior preserved.**
   - Top rankings default to events.
   - Risk section remains non-driving/informational-disabled.

## KPI / charts / drilldowns / export alignment now

- **KPI:** computed from scoped source tables.
- **Ranking charts:** computed from scoped source tables (events/downtime/normalized as defined by metric).
- **Drilldowns:** opened via stable payload keys with source-type routing.
- **Explorer:** uses scoped merged rows for contextual event view only.
- **Export:** uses same filtered merged scope currently rendered.

## Known assumptions

1. Availability source lacks customer/site/version in many rows; those filters are treated as non-applicable for availability-source slices.
2. Volume KPI basis remains production-only (`productionPrintedSheets`) for production KPI cards and reconciliation.
3. Planned vs unplanned downtime definition is enforced as:
   - planned = Preventive Maintenance + On Job Maintenance
   - unplanned = Recovery + Jams

## Validation checklist (with attached CSV set)

- [x] Charts render after analysis (Top Presses, Subsystems, Alerts, Versions).
- [x] Print volume chart renders from `volumeAgg`.
- [x] KPI totals reconcile to scoped source totals (`errorsAgg`, `availabilityAgg`, `volumeAgg`).
- [x] Production KPI equals scoped `volumeAgg.productionPrintedSheets` sum.
- [x] Planned/unplanned downtime reconcile to scoped `availabilityAgg` sums.
- [x] Drilldowns use stable entity payload keys (`entityKey`) and route by `sourceType`.
- [x] Export uses same scoped filtered rows used by dashboard explorer context.
- [x] Risk logic remains disabled as active driver; events-first remains default.
