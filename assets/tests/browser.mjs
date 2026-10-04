// Browser integration test against actual npm ESM packages, without bundling.
// CSS modules are served with the same JS-link behavior as AssetMapper.
// Test-only prerequisites: npm install in assets; playwright + Chrome available.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GRID_PLAYWRIGHT || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const modules = process.env.GRID_NODE_MODULES || resolve(root, 'grid-bundle/assets/node_modules');
const manifest = JSON.parse(await readFile(resolve(root, 'grid-bundle/assets/package.json')));
const imports = {
  '@survos/grid-bundle/': '/grid/',
  '@survos/js-twig/routing': '/routing.js',
};
for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies,
  '@tacman1123/twig-browser': '1', '@tacman1123/twig-browser/adapters/symfony': '1' })) {
  const parts = name.split('/'); const packageName = name.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const pkg = JSON.parse(await readFile(resolve(modules, packageName, 'package.json')));
  const subpath = name.slice(packageName.length);
  let entry = subpath ? pkg.exports?.[`.${subpath}`] : pkg.module || pkg.exports?.['.'];
  if (typeof entry === 'object') entry = entry.import || entry.default;
  if (!entry) entry = subpath || pkg.main;
  if (!entry) continue;
  imports[name] = '/npm/' + packageName + '/' + entry.replace(/^\.\//, '').replace(/^\//, '');
}
for (const name of Object.keys(manifest.symfony.importmap)) {
  if (name.includes('/css/') || name.includes('/i18n/')) imports[name] = '/npm/' + name;
}

const rows = Array.from({ length: 24 }, (_, i) => `<tr><td>${String(i).padStart(2,'0')}</td><td>Title ${i}</td></tr>`).join('');
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (url.pathname === '/rows') {
      const start = Number(url.searchParams.get('page') || 1) - 1;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ member: [{ id: start + 1, title: 'API title' }], totalItems: 1 })); return;
    }
    if (url.pathname === '/') {
      res.setHeader('content-type', 'text/html');
      const api = url.searchParams.has('api');
      const extensions = url.searchParams.get('extensions')?.split(',').filter(Boolean) || [];
      const values = api ? {
        ...(url.searchParams.has('layout') ? { layout: JSON.stringify({topStart: 'searchBuilder'}) } : {}),
        'api-call': '/rows', 'column-configuration': JSON.stringify([{name:'title',title:'Title',order:1,sortable:true}]),
        locale: 'en', 'scroll-x': url.searchParams.has('scroll'), 'column-control': extensions.includes('columnControl'),
        select: extensions.includes('select'), 'search-builder': extensions.includes('searchBuilder'),
      } : { extensions, options: Object.fromEntries(extensions.map(x => [x, x === 'rowGroup' ? { dataSrc: 0 } : true])), 'page-length': 5 };
      // Stimulus strings must be plain attributes, unlike arrays/objects.
      const attributes = Object.entries(values).map(([key,value]) => `data-grid-${key}-value='${(typeof value === 'string' ? value : JSON.stringify(value)).replaceAll("'", '&#39;')}'`).join(' ');
      res.end(`<!doctype html><html><head><script type="importmap">${JSON.stringify({ imports })}</script></head><body>
        <div data-controller="grid" ${attributes}>
          <div data-grid-target="message"></div><table data-grid-target="table" class="table"><thead><tr><th>ID</th><th>Title</th></tr></thead><tbody>${api ? '' : rows}</tbody></table>
        </div><script type="module">
        import { Application } from '@hotwired/stimulus';
        import Controller from '${api ? '/api/src/controllers/api_grid_controller.js' : '/grid/src/controllers/grid_controller.js'}';
        window.app = Application.start(); window.app.register('grid', Controller);
        window.controller = () => window.app.getControllerForElementAndIdentifier(document.querySelector('[data-controller]'), 'grid');
        </script></body></html>`); return;
    }
    res.setHeader('content-type', 'text/javascript');
    if (url.pathname === '/routing.js') { res.end('export const path = (name) => "/" + name;'); return; }
    let path;
    if (url.pathname.startsWith('/grid/')) path = resolve(root, 'grid-bundle/assets', url.pathname.slice(6));
    else if (url.pathname.startsWith('/api/')) path = resolve(root, 'api-grid-bundle/assets', url.pathname.slice(5));
    else if (url.pathname.startsWith('/npm/')) path = resolve(modules, url.pathname.slice(5));
    else { res.writeHead(404); res.end(); return; }
    const content = await readFile(path, 'utf8');
    if (path.endsWith('.css') && !url.searchParams.has('raw')) {
      res.end(`const link=document.createElement('link');link.rel='stylesheet';link.href=${JSON.stringify(url.pathname + '?raw')};document.head.append(link);`);
    } else {
      if (path.endsWith('.css')) res.setHeader('content-type','text/css');
      res.end(content);
    }
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, channel: process.env.GRID_BROWSER_CHANNEL || 'chrome' });
try {
  for (const scenario of [
    { query: '', extensions: [] },
    { query: '?extensions=responsive,select', extensions: ['responsive','select'] },
    { query: '?extensions=buttons,columnControl,searchBuilder,fixedColumns,fixedHeader,rowGroup', extensions: ['buttons','columncontrol','searchbuilder','fixedcolumns','fixedheader','rowgroup'] },
    { query: '?api&scroll', extensions: [] },
    { query: '?api&scroll&layout', extensions: ['searchbuilder'] },
    { query: '?api&extensions=columnControl,select,searchBuilder', extensions: ['responsive','columncontrol','select','searchbuilder'] },
  ]) {
    const page = await browser.newPage(); const requests = []; const errors = [];
    page.on('request', req => requests.push(req.url()));
    page.on('pageerror', err => errors.push(err.message));
    page.on('dialog', async dialog => { errors.push(dialog.message()); await dialog.dismiss(); });
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/${scenario.query}`);
    try {
      await page.waitForFunction(() => window.controller?.()?.dt?.rows().count() > 0, null, { timeout: 10000 });
      assert.deepEqual(errors, [], `Browser errors in ${scenario.query}`);
      const requested = [...new Set(requests.map(url => url.match(/\/npm\/datatables\.net-([a-z]+)(?:-bs5)?\//)?.[1]).filter(x => x && x !== 'bs' && x !== 'plugins'))].sort();
      assert.deepEqual(requested, scenario.extensions.sort(), `Unexpected extension fetches in ${scenario.query}`);
      for (const extension of scenario.extensions) {
        assert.ok(requests.some(url => url.includes(`datatables.net-${extension}-bs5/css/`)), `Missing ${extension} CSS`);
      }
      if (!scenario.query.includes('api')) {
        assert.equal(await page.evaluate(() => window.controller().dt.rows().count()), 24);
        await page.evaluate(() => window.controller().dt.search('Title 20').draw());
        assert.equal(await page.evaluate(() => window.controller().dt.rows({ search: 'applied' }).count()), 1);
        await page.evaluate(() => window.controller().dt.search('').order([0,'desc']).draw());
        assert.equal(await page.locator('tbody tr:has(td)').first().locator('td').first().innerText(), '23');
      }
      if (scenario.query.includes('api')) {
        const response = page.waitForResponse(r => r.url().includes('/rows?') && new URL(r.url()).searchParams.get('search') === 'needle');
        await page.evaluate(() => window.controller().dt.search('needle').draw());
        await response;
        assert.equal(await page.evaluate(() => window.controller().dt.rows().count()), 1);
      }
      console.log('PASS', scenario.query || 'plain grid', JSON.stringify(requested));
    } catch (error) { console.error('SCENARIO', scenario.query, errors); throw error; }
    await page.close();
  }
} finally { await browser.close(); server.close(); }
