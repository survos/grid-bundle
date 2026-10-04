# Survos Grid Bundle

DataTables tables for Symfony, Twig components, Stimulus and AssetMapper. Grid owns the DataTables core, all supported extensions and their Bootstrap 5 styles. It requires neither API Platform nor pentiminax, and apps do not need Node.

```bash
composer require survos/grid-bundle
```

Use the host application's Tabler / Bootstrap 5 theme. Grid does not install a second Bootstrap JavaScript runtime.

```twig
<twig:grid :data="rows" :columns="['id', 'title']" :pageLength="20">
    <twig:block name="title"><strong>{{ row.title }}</strong></twig:block>
</twig:grid>
```

For a single JSON fetch, supply `remoteUrl` instead of `data`. Arrays and API Platform `member` / `hydra:member` envelopes are supported. This remains client-side pagination; use `survos/api-grid-bundle` for server-side pagination and facets.

```twig
<twig:grid remoteUrl="/catalog.json"
    :columns="[{name: 'title', title: 'Title', sortable: true, searchable: true}]"
    :extensions="['responsive']"
    :options="{responsive: true}"
    locale="de" />
```

`extensions` loads capabilities; `options` configures them using DataTables options. Supported extension names are `buttons`, `columnControl`, `responsive`, `select`, `searchBuilder`, `fixedColumns`, `fixedHeader`, and `rowGroup`. Each is loaded with its BS5 CSS only when requested. Do not add global CSS autoimports to `controllers.json`.

A plain grid loads core JS/CSS and the small Tabler override stylesheet, with no extension or language downloads. Set `locale` to `en`, `es`, or `de` (regional forms accepted) to load one translation. Unlisted locales fall back to English. The grid controller itself is lazy, so pages without grids need no DataTables downloads.

The `Column` model and optional `class` metadata from `survos/field-bundle` supply column definitions. `<twig:item_grid>` renders a single item's fields without JavaScript.

- [Extension points and dependency ownership](docs/extensions.md)
- [Migration notes](docs/upgrading.md)
- [Consumer inventory and scope](docs/inventory.md)
- [Verification](docs/testing.md)

## Shared base and application example

`survos/api-grid-bundle` requires this bundle and extends its `GridController`. Grid owns DataTables initialization, teardown, core styles and optional extension loading. API Grid adds API Platform pagination, filters, facets and browser-side cell rendering. Use `<twig:grid>` for an in-memory collection or one JSON fetch; use `<twig:api_grid>` when the server should page and filter the collection.

Showcase's `/browse` page is a working example: its controller loads `Site` entities with their related components, then passes them to `<twig:grid>`. Twig blocks render component links and production/local links. No API endpoint or API Grid component is involved.

The October 4, 2026 local smoke test covered 23 sites, search, ascending/descending ordering, page-size changes, pagination, and navigation away and back. Showcase still has legacy simple-datatables/Pentiminax dependencies for other pages; Browse itself uses Grid. This is local application verification, not a live-site deployment result.

The Stimulus controller belongs on a stable wrapper around the table. DataTables moves the table during initialization; mounting the controller on the table itself causes repeated connect/disconnect cycles. The bundled template handles this and omits empty `options` attributes so Stimulus uses its object default.

For AssetMapper applications, keep the UX controller lazy and styles controller-local:

```json
{
  "controllers": {
    "@survos/grid-bundle": {
      "grid": {"enabled": true, "fetch": "lazy", "autoimport": {}}
    }
  }
}
```

After upgrading, run `php bin/console importmap:install` and clear the application cache. Check existing importmap versions against `assets/package.json` → `symfony.importmap`; old application pins can survive an upgrade. Optional extensions being pinned does not mean they are downloaded on every page. Keep legacy pins until their remaining consumers have been migrated.
