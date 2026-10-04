# Extension points

`GridController` is exported both by name and as the default from:

```js
import { GridController } from '@survos/grid-bundle/src/controllers/grid_controller.js';
```

The base controller provides:

- `beginConnection()`: destroys the previous table, aborts previous requests and returns the new connection signal.
- `prepareTableAssets(extensions, locale)`: waits for the requested extension modules, their stylesheet loader modules, and one optional language module.
- `tableOptions(extra)`: merges the grid's common Stimulus values, `options`, and caller overrides. An explicit `layout` takes precedence over legacy `dom`.
- `createTable(element, options)`: calls `beforeInit(options)`, constructs the table once, stores `dt`, and calls `afterInit(dt)`.
- `disconnect()`: aborts requests and destroys `dt`.
- `DataTable`: the shared constructor, available to adapters that need extension APIs such as Responsive renderers.

An adapter with its own asynchronous initialization should call `beginConnection()`, await `prepareTableAssets()`, check the returned signal's `aborted` flag, then call `createTable()`. Do not call the base `connect()` as well: that method is the plain-grid DOM/single-fetch adapter. Overrides of `disconnect()` must call `super.disconnect()`.

`api-grid-bundle` follows this contract. Its existing page controls request Responsive unless `scrollX` is active, Select when selection is enabled, ColumnControl when configured, SearchBuilder when configured, and Buttons when buttons/bulk actions or a custom layout need them. An explicit `extensions` array adds capabilities such as FixedHeader. API-specific AJAX, row rendering, facets and detail panels remain there.

# Dependencies

`assets/package.json` is the sole DataTables pin owner. It includes theme-neutral runtime dependencies (required by the BS5 adapters), exactly one styling flavour (BS5), and matching stylesheets. These runtime dependencies are not additional themes. The three language modules are lazy too.

Versions were aligned with the [official DataTables download builder](https://datatables.net/download/): core 3.1.3, Buttons 4.1.2, ColumnControl 2.1.2, Responsive/Select 4.1.1, SearchBuilder/RowGroup 2.1.1, FixedColumns 6.1.1, FixedHeader 5.1.2. Language modules use the existing plugins 3.1.2 release.

Pin ownership and browser downloads are separate: the shared importmap declares every supported extension, but `src/extensions.js` uses literal dynamic imports to fetch only requested modules and CSS. Core plus eight extensions and three locales total 30 explicit DataTables pins. No `bootstrap`, `@popperjs/core`, pentiminax, JSZip or pdfmake pins are added.

Buttons supplies the button framework, custom actions and bulk controls. HTML5/PDF/Excel export modules are not implicitly enabled or promised by this change. Add a separately tested opt-in loader if the consumer inventory establishes a need.

# Theme

The base imports DataTables' BS5 core CSS and the shared Tabler overrides inside its lazy controller. Optional extension CSS is dynamically imported with the extension. The host supplies Tabler's page theme. API-grid keeps only its generated column sizing and grouped-header styles.
