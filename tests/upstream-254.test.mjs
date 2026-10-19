import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { verifySnapshot } from '../src/upstream-sync.mjs';
import { omitRecommendedPage, omitSponsorPage } from '../scripts/ofm-free-update-patch.mjs';

test('updated console retains channel loading without mounting daily sponsor notices', async () => {
  const root = new URL('../vendor/ofm/packages/standalone/web/', import.meta.url);
  const app = await fs.readFile(new URL('app.js', root), 'utf8');
  const names = JSON.parse(await fs.readFile(new URL('assets.json', root), 'utf8'));
  const name = names.find(name => /^channels-.*\.js$/.test(name));
  assert.ok(name);
  const channels = await fs.readFile(new URL(name, root), 'utf8');
  assert.ok(app.includes(`./${name}`), 'lazy channel import still targets the published asset');
  assert.doesNotMatch(app, /targetId:"ofm-sponsor-menu-desktop",placement:/);
  assert.doesNotMatch(app, /label:"项目支持",items:/);
  assert.doesNotMatch(channels, /targetId:"ofm-sponsor-menu-plugin"\}/);
  assert.doesNotMatch(channels, /\["picks",a\("nav\.tab\.picks"\)/);
  assert.doesNotMatch(channels, /\["sponsor",[\w$]+\.title,null\]/);
  assert.ok(channels.includes('eac.noLane'), 'account diagnostics remain present');
});

test('navigation adaptation fails safely on unknown upstream render shapes', () => {
  assert.throws(() => omitRecommendedPage('a("nav.tab.picks");changedNavigation()'), /patch mismatch/);
  assert.throws(() => omitSponsorPage('web/app.js', 'newRender("ofm-sponsor-menu-desktop")'), /patch mismatch/);
});

test('2.5.4 snapshot matches recorded original and adapted file hashes', async () => {
  await verifySnapshot(new URL('../', import.meta.url).pathname);
});
