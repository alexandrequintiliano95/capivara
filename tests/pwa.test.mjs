import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

await test('manifest defines standalone mobile installation and correctly sized icons', async () => {
  const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  for (const icon of manifest.icons) {
    const bytes = await readFile(`public${icon.src}`);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
});

await test('worker serves root and assets offline, scopes cleanup, and waits for explicit updates', async () => {
  const events = new Map();
  const deleted = [];
  const cached = new Map();
  let skipped = false;
  const files = ['/index.html', '/_next/static/app.js', '/island.webp'];
  const code = (await readFile('scripts/sw-template.js', 'utf8')).replace('__CACHE_NAME__', 'capivaras-new').replace('__PRECACHE_LIST__', JSON.stringify(files));
  const cache = { addAll: async paths => { for (const file of paths) cached.set(file, `cached ${file}`); }, match: async key => cached.get(key) };
  vm.runInNewContext(code, {
    self: { addEventListener: (name, callback) => events.set(name, callback), location: { origin: 'https://island.test' }, clients: { claim: async () => {} }, skipWaiting: async () => { skipped = true; } },
    caches: { open: async () => cache, keys: async () => ['capivaras-old', 'capivaras-new', 'another-app'], delete: async key => { deleted.push(key); } },
    URL, fetch: async () => { throw new Error('offline'); },
  });
  let pending = Promise.resolve();
  events.get('install')({ waitUntil: task => { pending = task; } });
  await pending;
  assert.equal(skipped, false);
  const request = { url: 'https://island.test/?from=home', method: 'GET', mode: 'navigate' };
  events.get('fetch')({ request, respondWith: task => { pending = task; } });
  assert.equal(await pending, 'cached /index.html');
  events.get('fetch')({ request: { ...request, url: 'https://island.test/_next/static/app.js', mode: 'cors' }, respondWith: task => { pending = task; } });
  assert.equal(await pending, 'cached /_next/static/app.js');
  let intercepted = false;
  events.get('fetch')({ request: { ...request, url: 'https://other.test/' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
  events.get('activate')({ waitUntil: task => { pending = task; } });
  await pending;
  assert.deepEqual(deleted, ['capivaras-old']);
  events.get('message')({ data: { type: 'SKIP_WAITING' } });
  assert.equal(skipped, true);
});
