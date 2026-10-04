# Shared grid base

`survos/api-grid-bundle` now requires `survos/grid-bundle` and imports its controller. API Platform remains an API-grid dependency; grid has no API Platform or pentiminax dependency. State providers, paginator, facets and twig-browser rendering remain in API-grid.

The canonical UX package names are `@survos/grid-bundle` and `@survos/api-grid-bundle`; their controller identifiers are `survos--grid-bundle--grid` and `survos--api-grid-bundle--api-grid`. The bundle defaults have been updated. Update application overrides of `stimulus_controller`, direct mounts, and old `@survos/grid` / `@survos/api-grid` entries in `assets/controllers.json` when adopting the release. Flex reads `symfony.importmap`, not npm `dependencies`.

Keep controller fetching lazy and CSS autoimports empty. Remove old DataTables autoimports from application `controllers.json`; otherwise existing application settings can still load styles globally. Reconcile stale app importmap pins only after checking their remaining consumers (especially pentiminax). Do not remove pins needed by a still-installed simple-datatables/pentiminax backend.

Grid owns the unqualified `<twig:item_grid>` name. API-grid's legacy recursive detail component is retained as `<twig:api_item_grid>` to avoid registering the same Twig name twice. Use that explicit name if you need its old nested-item rendering. Existing API `Column` metadata remains available; it has not been silently replaced by the smaller base model.

API-grid no longer imports `datatables-plugins.js` or PerfectScrollbar (the latter was unused). Consumers importing that internal plugin aggregator should request extensions through the controller instead.

API detail dialogs reuse an existing Bootstrap global or import the host's `@tabler/core` exports when modal/offcanvas targets exist. They do not create a global or require a standalone Bootstrap package. Hosts showing dialogs must provide Tabler. No tabler-bundle files change.

This change does not migrate applications, retire simple-datatables, remove FF's direct pentiminax usage, or publish a release. Those require the separate consumer migration sequence in the handoff.
