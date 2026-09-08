import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/client');
const files = (await readdir(root, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
  .filter(file => !file.startsWith('.') && file !== 'sw.js' && file !== 'vinext-client-entry-manifest.json' && !file.endsWith('.map'))
  .sort();
if (!files.includes('index.html') || !files.includes('manifest.webmanifest') || !files.includes('icons/icon-512.png')) throw new Error('Missing PWA build output');
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(await readFile(path.join(root, file)));
const template = await readFile('scripts/sw-template.js', 'utf8');
const worker = template.replace('__CACHE_NAME__', `capivaras-${hash.digest('hex').slice(0, 16)}`).replace('__PRECACHE_LIST__', JSON.stringify(files.map(file => `/${file}`)));
await writeFile(path.join(root, 'sw.js'), worker);
console.log(`PWA: ${files.length} local files prepared for offline use.`);
