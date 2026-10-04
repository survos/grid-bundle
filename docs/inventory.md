# Inventory for shared dependency ownership

Read-only observations from the 2026-10-04 handoff and bundle/consumer inspection. This is a focused inventory for the shared-base change, not an exhaustive audit of every application.

| Consumer | Observed contract | Consequence |
| --- | --- | --- |
| API-grid controller | Server-side AJAX, ColumnControl facets, responsive detail rows, selection and bulk/custom buttons, optional SearchBuilder, en/es/de languages | Shared loader owns libraries; API-grid keeps request mapping, facet options and renderers |
| Showcase `templates/home.html.twig` | `<twig:simple_datatables>` with columns, data, perPage and Twig blocks | Requires a compatibility adapter in a later migration |
| FF `templates/author/index.html.twig` | Direct pentiminax controller over HTML rows | Do not drop the direct dependency until this page is migrated |
| FF `templates/app/index.html.twig` | `<twig:api_grid>` and custom rendering blocks | Preserve API-grid's Twig rendering contract |
| FF `templates/mail/fetch.html.twig` | `<twig:grid>` | Base table behavior is relevant independently of API Platform |
| Fotostory | Both API-grid and simple-datatables Composer dependencies | Full template audit is still required before removal |

The shared extension registry includes all eight requested extensions, including FixedColumns, FixedHeader and RowGroup. Their availability does not cause them to load on pages that don't request them.

The two Column models are not equivalent: base Grid has FieldDescriptor conversion; API-grid has facets, browsing, grouping and rendering metadata. API-specific metadata stays intact in this change. The duplicate `item_grid` registration is resolved by preserving the legacy API variant under `api_item_grid`.
