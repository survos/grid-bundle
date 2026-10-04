// Literal dynamic imports let AssetMapper discover pins without eagerly fetching them.
// Both the extension and its BS5 stylesheet loader run before table construction.
const loaders = {
  buttons: () => Promise.all([import("datatables.net-buttons-bs5"), import("datatables.net-buttons-bs5/css/buttons.bootstrap5.css")]),
  columnControl: () => Promise.all([import("datatables.net-columncontrol-bs5"), import("datatables.net-columncontrol-bs5/css/columnControl.bootstrap5.css")]),
  responsive: () => Promise.all([import("datatables.net-responsive-bs5"), import("datatables.net-responsive-bs5/css/responsive.bootstrap5.css")]),
  select: () => Promise.all([import("datatables.net-select-bs5"), import("datatables.net-select-bs5/css/select.bootstrap5.css")]),
  searchBuilder: () => Promise.all([import("datatables.net-searchbuilder-bs5"), import("datatables.net-searchbuilder-bs5/css/searchBuilder.bootstrap5.css")]),
  fixedColumns: () => Promise.all([import("datatables.net-fixedcolumns-bs5"), import("datatables.net-fixedcolumns-bs5/css/fixedColumns.bootstrap5.css")]),
  fixedHeader: () => Promise.all([import("datatables.net-fixedheader-bs5"), import("datatables.net-fixedheader-bs5/css/fixedHeader.bootstrap5.css")]),
  rowGroup: () => Promise.all([import("datatables.net-rowgroup-bs5"), import("datatables.net-rowgroup-bs5/css/rowGroup.bootstrap5.css")]),
};

export async function loadExtensions(names = []) {
  const requested = [...new Set(names)];
  for (const name of requested) {
    if (!Object.hasOwn(loaders, name)) {
      throw new Error(`[grid] Unknown extension "${name}". Choose: ${Object.keys(loaders).join(", ")}`);
    }
  }
  await Promise.all(requested.map((name) => loaders[name]()));
}

const languages = {
  en: () => import("datatables.net-plugins/i18n/en-GB.mjs"),
  es: () => import("datatables.net-plugins/i18n/es-ES.mjs"),
  de: () => import("datatables.net-plugins/i18n/de-DE.mjs"),
};

export async function loadLanguage(locale = "") {
  if (!locale) return undefined; // Plain tables use core's built-in English.
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return (await (languages[language] ?? languages.en)()).default;
}
