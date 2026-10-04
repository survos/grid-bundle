# Verification

From the mono checkout, with Composer dependencies installed:

```bash
vendor/bin/phpunit bu/grid-bundle/tests bu/api-grid-bundle/tests
node --experimental-vm-modules --test bu/grid-bundle/assets/tests/grid.test.mjs
```

The JS tests exercise lazy requests, translation selection, invalid names, asynchronous disconnect/reconnect, remote data/column mapping, and API controller inheritance/extension selection. PHP tests render the real grid Twig template with Stimulus attributes, verify bundle wiring and pin ownership, and compile the import graph through Symfony AssetMapper to check preload behavior. Existing API provider/filter tests also run.

Browser integration uses actual DataTables ESM packages and Stimulus in headless Chrome. Its local HTTP fixture uses native importmaps and CSS-loader modules; it is not a replacement for an application AssetMapper smoke test. Install test-only dependencies in a scratch directory (apps do not need Node), using the versions in `assets/package.json`, plus `@tacman1123/twig-browser` and `playwright`:

```bash
GRID_NODE_MODULES=/absolute/path/to/test/node_modules \
GRID_PLAYWRIGHT=/absolute/path/to/test/node_modules/playwright \
node bu/grid-bundle/assets/tests/browser.mjs
```

Chrome must be installed (`GRID_BROWSER_CHANNEL` can select another Playwright channel). Tests cover DOM rows, all eight extension modules and CSS, sorting/search, API server-side initialization, and request logs proving unused extensions are not fetched. Each scenario gets a fresh page/module registry.

Ownership check:

```bash
grep -l 'datatables.net' bu/*/assets/package.json
```

Only `bu/grid-bundle/assets/package.json` should appear. Application pin totals and live page behavior must be measured separately when those applications are migrated.
