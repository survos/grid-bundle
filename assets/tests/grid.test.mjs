import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const gridRoot = new URL('../', import.meta.url);
const apiRoot = new URL('../../../api-grid-bundle/assets/', import.meta.url);

async function harness({ delayExtension } = {}) {
  const imports = [];
  const tables = [];
  let completeExtension;
  const extensionGate = delayExtension ? new Promise(resolve => { completeExtension = resolve; }) : null;
  const context = vm.createContext({ console, AbortController, URL, URLSearchParams,
    window: { dispatchEvent() {} }, CustomEvent: class {},
    fetch: async () => ({ ok: true, json: async () => ({ member: [{ title: 'A' }] }) }),
  });
  class Table {
    constructor(element, options) { this.element = element; this.options = options; tables.push(this); }
    destroy() { this.destroyed = true; }
  }
  const cache = new Map();
  async function moduleFor(specifier, parent) {
    if (specifier.startsWith('.') || specifier.startsWith('@survos/grid-bundle/')) {
      const url = specifier.startsWith('@survos/grid-bundle/')
        ? new URL(specifier.replace('@survos/grid-bundle/', ''), gridRoot)
        : new URL(specifier, parent.identifier);
      if (!url.pathname.endsWith('.css')) return source(url);
    }
    if (cache.has(specifier)) return cache.get(specifier);
    const values = specifier === '@hotwired/stimulus' ? { Controller: class {} }
      : specifier === 'datatables.net-bs5' ? { default: Table }
      : specifier === '@tacman1123/twig-browser' ? { createEngine: () => ({}) }
      : specifier === '@tacman1123/twig-browser/adapters/symfony' ? { installSymfonyTwigAPI() {} }
      : specifier === '@survos/js-twig/routing' ? { path() {} }
      : { default: { name: specifier } };
    const mod = new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context, identifier: specifier });
    cache.set(specifier, mod);
    return mod;
  }
  async function source(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const mod = new vm.SourceTextModule(await readFile(url, 'utf8'), { context, identifier: url.href,
      importModuleDynamically: async (specifier, parent) => {
        imports.push(specifier);
        if (extensionGate && specifier === delayExtension) await extensionGate;
        const child = await moduleFor(specifier, parent);
        if (child.status === 'unlinked') await child.link(moduleFor);
        if (child.status === 'linked') await child.evaluate();
        return child;
      },
    });
    cache.set(url.href, mod);
    await mod.link(moduleFor);
    return mod;
  }
  const grid = await source(new URL('src/controllers/grid_controller.js', gridRoot));
  await grid.evaluate();
  const make = (Controller = grid.namespace.GridController) => {
    const instance = new Controller();
    Object.assign(instance, { useDatatablesValue: true, hasTableTarget: true, tableTarget: {},
      extensionsValue: [], optionsValue: {}, localeValue: '', remoteUrlValue: '',
      domValue: 'lfrtip', searchValue: true, infoValue: false, pageLengthValue: 20, scrollYValue: '', columnsValue: [],
    });
    return instance;
  };
  return { imports, tables, make, completeExtension, async api() {
    const mod = await source(new URL('src/controllers/api_grid_controller.js', apiRoot));
    await mod.evaluate();
    return mod.namespace.default;
  } };
}

test('plain grid initializes core without importing extensions or i18n', async () => {
  const h = await harness(); const c = h.make(); await c.connect();
  assert.equal(h.tables.length, 1); assert.deepEqual(h.imports, []);
  c.disconnect(); assert.equal(h.tables[0].destroyed, true);
});

test('requested extension loads its JS and CSS before construction, and locale loads alone', async () => {
  const h = await harness(); const c = h.make();
  c.extensionsValue = ['buttons', 'responsive', 'buttons']; c.localeValue = 'es-MX';
  await c.connect();
  assert.deepEqual(h.imports.sort(), [
    'datatables.net-buttons-bs5', 'datatables.net-buttons-bs5/css/buttons.bootstrap5.css',
    'datatables.net-responsive-bs5', 'datatables.net-responsive-bs5/css/responsive.bootstrap5.css',
    'datatables.net-plugins/i18n/es-ES.mjs',
  ].sort());
  assert.equal(h.tables[0].options.language.name, 'datatables.net-plugins/i18n/es-ES.mjs');
});

test('disconnect during extension loading prevents late construction; reconnect builds once', async () => {
  const h = await harness({ delayExtension: 'datatables.net-responsive-bs5' });
  const c = h.make(); c.extensionsValue = ['responsive'];
  const pending = c.connect(); c.disconnect(); h.completeExtension(); await pending;
  assert.equal(h.tables.length, 0); await c.connect(); assert.equal(h.tables.length, 1);
});

test('remote grid carries Column flags and unwraps API Platform rows', async () => {
  const h = await harness(); const c = h.make(); c.remoteUrlValue = '/rows';
  c.columnsValue = [{ name: 'title', title: 'Title', sortable: false, searchable: true }];
  await c.connect(); const options = h.tables[0].options;
  assert.equal(options.data[0].title, 'A'); assert.equal(options.columns[0].orderable, false);
});

test('unknown extensions fail before constructing a partially configured table', async () => {
  const h = await harness(); const c = h.make(); c.extensionsValue = ['typo'];
  await assert.rejects(c.connect(), /Unknown extension/); assert.equal(h.tables.length, 0);
});

test('API controller inherits grid lifecycle and derives only requested extensions', async () => {
  const h = await harness(); const Api = await h.api(); const c = h.make(Api);
  Object.assign(c, { scrollXValue: true, selectValue: false, columnControlValue: false,
    searchBuilderValue: false, searchBuilderColumns: [], buttons: [], bulkActions: [], layout: null,
  });
  assert.deepEqual([...c.requiredExtensions()], []);
  c.scrollXValue = false; c.columnControlValue = true; c.selectValue = true;
  c.layout = { topStart: { buttons: ['custom'] } };
  assert.deepEqual([...c.requiredExtensions()].sort(), ['buttons', 'columnControl', 'responsive', 'select']);
  c.beginConnection(); c.createTable({}, {}); c.disconnect();
  assert.equal(h.tables[0].destroyed, true);
});
