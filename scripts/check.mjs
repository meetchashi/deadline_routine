import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function asset(path) {
  assert.equal(typeof path, 'string', 'Asset path must be a string');
  const resolved = resolve(root, path);
  const rel = relative(root, resolved);
  assert(!isAbsolute(rel) && !rel.startsWith('..'), `Asset is outside the project: ${path}`);
  assert(existsSync(resolved), `Missing asset: ${path}`);
}

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3, 'Expected a Manifest V3 extension');
assert(manifest.name && manifest.description, 'Manifest needs a name and description');
assert(/^\d+(\.\d+){0,3}$/.test(manifest.version), 'Invalid extension version');
asset(manifest.background.service_worker);
for (const path of Object.values(manifest.icons)) asset(path);
for (const path of Object.values(manifest.action.default_icon)) asset(path);

const html = readFileSync(join(root, 'board.html'), 'utf8');
for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)) asset(match[1]);
for (const file of readdirSync(root).filter(file => file.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { stdio: 'inherit' });
  assert.equal(result.status, 0, `Syntax check failed: ${file}`);
}
console.log('Passed: JavaScript syntax, manifest, icons, and HTML asset references.');
