# BASELINE_VERSION_V1

**Status:** Locked baseline reference  
**Definition date:** 2026-04-16  
**Scope:** Current repository state (single-page dashboard in `index.html` + chart fallback in `assets/vendor/chart-fallback.js`)

---

## A. SYSTEM OVERVIEW

Landa InsightPro+ is a browser-only operational analytics application with two UI phases:

1. **Intake phase**
   - User uploads up to three datasets: **Errors** (required), **Availability** (recommended), **Print Volume** (recommended).
   - Files are validated and normalized client-side.
2. **Dashboard phase**
   - Data is merged/aggregated into source-native scoped tables.
   - KPIs, charts, executive summary, reconciliation panel, drilldown views, and event table are rendered from filtered scope.

Core principle in this baseline:
- **Errors data is the required backbone.**
- Availability and volume enrich KPIs/charts when present.
- KPI and chart integrity is protected by explicit reconciliation against source-native aggregates.

---

## B. DATA FLOW

### 1) Upload
- Inputs arrive through individual pickers or bulk dropzone.
- File assignment is inferred by filename and/or schema detection.
- `STATE.files` holds selected files; `STATE.cachedRaw` may store already-read rows.

### 2) Parsing
- Parsing by extension:
  - CSV → custom CSV parser
  - XLS/XLSX → XLSX library
  - JSON → array-of-objects parser
- Dataset-type detection scores rows as `errors`, `availability`, `volume`.

### 3) Validation
- Required gate: **Errors file must validate** before Run is enabled.
- Validation runs partial normalization on sample rows.
- Schema compatibility checks are strict for minimum required semantics (press/alert/time for errors, etc.).

### 4) Normalization
- `normalizeErrorsRows` maps raw errors rows to canonical event records.
- `normalizeAvailabilityRows` decodes machine IDs, resolves canonical press mapping, and computes runtime/planned/unplanned components.
- `normalizeVolumeRows` classifies maintenance vs production jobs and creates both job-level rows and day-level aggregated rows.

### 5) Aggregation + Join
- `mergeOperationalData` builds:
  - `errorsAgg` (events + error duration)
  - `availabilityAgg` (runtime/planned/unplanned + availability%)
  - `volumeAgg` (production/maintenance/total + printed metrics)
- Join keys:
  - primary: press+model+day
  - fallback: press+day
- Merged event rows preserve join context (`primary` vs `fallback` used).

### 6) Filter Scope
- Global filters (press/subsystem/version/date/search) are applied.
- Source-native filtered sets are rebuilt for errors/availability/volume.
- Scoped aggregates (`errorsAgg`, `availabilityAgg`, `volumeAgg`) are recomputed from native filtered rows.

### 7) KPI Computation
- `computeOperationalMetrics` derives totals, MTTR/MTBF, availability %, normalized ratios.
- Availability uses selected definition from `computeAvailabilityDefinitions`.
- KPI outputs are rendered in KPI strip and reused in executive summary and drilldowns.

### 8) Chart Rendering
- Ranking charts: press, subsystem, alert, version with metric mode (events/downtime/normalized).
- Customer volume chart uses selected volume unit/sort.
- Drilldown charts adapt to source type (errors vs availability vs volume vs KPI simulation).
- Chart lifecycle uses `replaceChart`/`destroyChart` and empty/error canvas states.

### 9) Table + Export
- Main table (`Merged Event Explorer`) displays merged event rows in scope.
- Export outputs filtered rows to CSV.
- Drilldown table exports scoped drilldown subset.

---

## C. CRITICAL COMPONENTS

These are critical and must not break.

### KPI calculations
- `computeOperationalMetrics`
- `computeAvailabilityDefinitions`
- `validateSourceAndLayerConsistency`
- `buildReconciliationReport`

### Joins
- Key builders:
  - `buildKey` (press+model+day)
  - `buildPressDayKey` (press+day fallback)
- Merge engine:
  - `mergeOperationalData`
- Press resolution for availability:
  - `buildPressNameLookup`
  - `resolvePressFromCodeAndModel`

### Aggregations
- Source-native aggregators:
  - `aggregateErrorsFromNative`
  - source scope assembly in `buildSourceScope`
- Ranking aggregators:
  - `buildMetricRankings`
  - `aggregateErrorEvents`
  - `aggregateDurationRows`
  - `aggregateMetricRows`

### Validation logic
- File gatekeeping:
  - `validateInputFiles`
  - `validateSingleFile`
- Schema/sample normalization checks in run flow.
- Runtime consistency checks:
  - source reconciliation and mismatch reporting.

### Chart data mapping
- `metricMeta` and chart metric mode mapping.
- Ranking chart data preparation in `renderRankingChart`.
- Volume chart mapping in `buildCustomerVolumeChart`.
- Drilldown chart datasets assembled in `renderDrilldown` by source type.

---

## D. RENDERING STRUCTURE

### KPI rendering
- `renderKpis(k)`
  - Renders KPI strip cards and explanatory microtext.
  - Cards are interactive; clicking opens KPI drilldown.

### Chart rendering
- Core chart helpers:
  - `replaceChart`, `destroyChart`, `showNoDataChart`, `setCanvasState`, `baseOptions`.
- Main dashboard charts:
  - `renderRankingChart` (press/subsystem/alert/version)
  - customer volume chart assembled in `renderDashboard` using `buildCustomerVolumeChart`.
- Drilldown charts:
  - `renderDrilldown` renders four drilldown charts based on mode/source type.

### Table rendering
- Main explorer table:
  - `renderTable(rows)`
- Drilldown table:
  - built in `renderDrilldown` for KPI/availability/volume/events contexts.

### How they connect
- `renderDashboard()` is central renderer:
  1. Builds current scoped model (`getCurrentDashboardScopeModel`)
  2. Computes KPIs and summary
  3. Renders KPIs
  4. Renders ranking + volume charts
  5. Runs reconciliation and status panel
  6. Renders main table
- `scheduleRender()` throttles rerenders from filter/control changes.

---

## E. DO NOT BREAK RULES

### MUST NEVER be modified in behavior
1. **Errors-required contract**: analysis cannot run without valid Errors dataset.
2. **Join key semantics**: primary (press+model+day) and fallback (press+day) logic.
3. **Availability downtime definition**:
   - planned = preventive + on-job maintenance
   - unplanned = recovery + jams
4. **Production-volume KPI basis**: KPI uses production-oriented printed sheets basis and must remain consistent with source aggregations.
5. **Source-native reconciliation**:
   - KPI/chart/table/export values must reconcile with scoped source tables.
6. **Scoped filtering model**:
   - filters must propagate consistently into KPIs, charts, summary, and table.
7. **Drilldown traceability**:
   - drilldown must remain traceable to source type and breadcrumb path.

### Safe-to-change zone (UI only)
- Styling, spacing, colors, typography, card visuals.
- Text phrasing/help labels/microcopy.
- Non-semantic layout adjustments that do not alter data calculations, joins, filter semantics, or chart/table data bindings.

---

## F. BASELINE RESTORE INSTRUCTION

If the user says **"return to baseline"**, restore the codebase to this exact version and discard any experimental changes.

Operationally, this means restoring all logic and UI behavior captured in **BASELINE_VERSION_V1** exactly as defined in this file.

---

## BASELINE LOCK CONFIRMATION

BASELINE_VERSION_V1 is fully understood and locked as the trusted stable reference for future work.
