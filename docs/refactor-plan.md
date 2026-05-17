# grid-bundle Refactor Plan: Base Layer for DataTables.net

## Goal

Split the DataTables.net stack into two bundles with a clean dependency:

```
grid-bundle          ← DataTables.net packages + client-side in-memory tables
    ↑ requires
api-grid-bundle      ← API Platform server-side integration only
```

`grid-bundle` becomes the install target for any project that wants a DataTables.net UI, regardless
of whether they use API Platform. `api-grid-bundle` adds only the ajax/hydra adapter on top.

`simple-datatables-bundle` (which wraps a different library, `simple-datatables`) is deprecated in
favour of this bundle.

---

## Phase 1 — Version & Dependency Alignment

### 1. Upgrade all DT packages to v3 beta (match api-grid-bundle exactly)

`assets/package.json` `dependencies` and `importmap`:

| Package | Target version |
|---|---|
| `datatables.net-bs5` | `3.0.0-beta.2` |
| `datatables.net-buttons-bs5` | `4.0.0-beta.1` |
| `datatables.net-responsive-bs5` | `4.0.0-beta.1` |
| `datatables.net-select-bs5` | `4.0.0-beta.1` |
| `datatables.net-searchbuilder-bs5` | `2.0.0-beta.1` |
| `datatables.net-columncontrol-bs5` | `2.0.0-beta.1` |
| `datatables.net-scroller-bs5` | `3.0.0-beta.1` |

CSS autoimport paths change from `.min.css` to `.css` (beta packages dropped the minified variant
in the package root).

Rationale: api-grid-bundle already ships v3 beta to production and relies on ColumnControl and
SearchBuilder v2, which are beta-only. Aligning versions means one copy of every DT package in the
importmap and lets us file Allan's team targeted bug reports while the beta is still open.

### 2. Copy `datatables-plugins.js` from api-grid-bundle

`api-grid-bundle/assets/src/datatables-plugins.js` is the single source of truth for DT plugin
registration. Move it to `grid-bundle/assets/src/datatables-plugins.js` and have
`api_grid_controller.js` import it from `@survos/grid/datatables-plugins.js` (or just keep it
copied until the importmap supports cross-bundle asset re-use cleanly).

### 3. Deprecate `simple-datatables-bundle`

Add a deprecation notice to its README and `composer.json` pointing to `survos/grid-bundle`. The
`simple-datatables` library (not datatables.net) wraps a different product; its controller stub
was never completed.

---

## Phase 2 — Shared `Column` Model

### 4. Replace `src/Model/Column.php` with the api-grid version

The api-grid `Column` is a strict superset of the grid-bundle version. Adopt it wholesale under
`Survos\Grid\Model\Column`. Key properties the grid-bundle version is missing:

- `order`, `visible`, `browsable`, `widget`, `width`, `className`, `group`
- `responsivePriority`, `titleAttr`, `facet`, `grid`
- `internalCode`, `rowName`, `type`

### 5. Update `GridComponent::preMount()` / `normalizedColumns()`

Wire the new Column properties so client-side rendering can use the same column definitions that
api-grid already produces from `#[Field]` attributes.

---

## Phase 3 — Rework `grid_controller.js`

### 6. Rewrite as a DT v3 client-side Stimulus controller

Port the shared rendering helpers from `api_grid_controller.js`; omit the ajax/API Platform parts.

**Port these methods verbatim or near-verbatim:**

| Method | Purpose |
|---|---|
| `cols()` | Build the DataTables `columns:` array from the Column config |
| `c()` | Build a single column descriptor (render function, route links, etc.) |
| `inferredColumnDefaults()` | Auto-assign width/className from column name heuristics |
| `columnDefs()` | Build `columnDefs:` array (visibility, orderable, responsivePriority) |
| `leadingUtilityColumnCount()` | Count prepended utility columns (responsive, select) |
| `defaultLayout()` | Default DT v3 layout object |
| `normalizedLayout()` | Strip unavailable features from a custom layout |
| `_parseLayout()` | Parse layout value from Stimulus string |
| `prependGroupHeaderRow()` | Inject a column-group `<tr>` above the header |
| `applyHeaderMetadata()` | Set `title`/`width` attributes on `<th>` after init |

**Do not port:**

- `ajax:` callback
- `dataTableParamsToApiPlatformParams()`
- Facet handling (`facetConfigurationValue`, `apiParams.facets`)
- ColumnControl list/range server-side filters
- Twig-browser (`@tacman1123/twig-browser`) cell rendering
- `openShowPanel()` offcanvas fetch

**Client-side data source:**

Use DataTables' `data:` option (in-memory array) instead of `ajax:`. The JSON array is passed via a
`data-grid-rows-value` Stimulus value, serialized by `GridComponent` from the PHP iterable.

```js
static values = {
  rows: { type: String, default: '[]' },          // JSON array of row objects
  columnConfiguration: { type: String, default: '[]' },
  // ... same subset as api_grid_controller
};

connect() {
  this.rows = JSON.parse(this.rowsValue);
  this.columns = JSON.parse(this.columnConfigurationValue);
  // ...
  let dt = new DataTable(el, {
    serverSide: false,
    data: this.rows,
    columns: this.cols(),
    columnDefs: this.columnDefs(),
    layout: this.normalizedLayout() || this.defaultLayout(),
    // ...
  });
}
```

**Known risk:** serializing arbitrary PHP objects to JSON. Objects with Doctrine lazy proxies or
circular relations will fail. `GridComponent` must either accept only plain arrays/DTOs, or use
Symfony's serializer with explicit groups. Prototype this before finalising the component API.

---

## Phase 4 — Make `api-grid-bundle` Depend on `grid-bundle`

### 7. Add `survos/grid-bundle` to `api-grid-bundle` `composer.json` `require`

```json
"survos/grid-bundle": "^2.0"
```

### 8. Remove duplicated code from `api-grid-bundle`

- Delete `src/Model/Column.php`; add `use Survos\Grid\Model\Column;` wherever it was imported
- Remove the duplicated DT npm packages from `api-grid-bundle`'s `assets/package.json`
  (they will be pulled in transitively from grid-bundle's importmap)
- Evaluate whether `src/Twig/TwigExtension.php` is a duplicate; if so, remove it and register
  only from grid-bundle

### 9. Update `api_grid_controller.js` import

```js
// Before (self-contained)
import { dtPlugins } from '../datatables-plugins.js';

// After (from grid-bundle, once asset sharing is clean)
import { dtPlugins } from '@survos/grid/datatables-plugins.js';
```

Until importmap cross-bundle asset imports are stable, keep a local copy with a comment pointing
to grid-bundle as the source of truth.

---

## Phase 5 — `grid-bundle` `composer.json` Cleanup

### 10. Make Doctrine optional

`GridComponent::preMount()` calls `$registry->getRepository()` only when `class` is passed instead
of `data`. Inject `?Registry $registry = null` and assert it is set only when actually needed.
This removes the mandatory `doctrine/doctrine-bundle` and `doctrine/orm` require entries, making
grid-bundle usable for plain-array datasets without a database.

### 11. Metadata updates

- `extra.symfony.require`: `^8.0` (match api-grid-bundle)
- `extra.branch-alias`: `2.0-dev` (signal breaking change — DT v3, new Column model)
- Remove the `conflict:` block (stale old-version constraints, not needed going forward)

---

## Completion Checklist

- [ ] Phase 1: DT v3 packages aligned in `assets/package.json`
- [ ] Phase 1: `datatables-plugins.js` consolidated
- [ ] Phase 1: `simple-datatables-bundle` deprecation notice added
- [ ] Phase 2: `Column` model replaced with api-grid superset
- [ ] Phase 2: `GridComponent` updated for new Column properties
- [ ] Phase 3: `grid_controller.js` rewritten (client-side, DT v3, shared helpers)
- [ ] Phase 3: JSON serialization strategy for `data:` option confirmed
- [ ] Phase 4: `api-grid-bundle` requires `survos/grid-bundle`
- [ ] Phase 4: Duplicate `Column`, `TwigExtension` removed from api-grid-bundle
- [ ] Phase 5: Doctrine made optional in `GridComponent`
- [ ] Phase 5: `composer.json` metadata updated
