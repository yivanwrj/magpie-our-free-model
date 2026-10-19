import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { patchConsoleNavigation } from '../scripts/ofm-console-integration-patch.mjs';

test('native console owns channel and maintenance routes and mounts a lifecycle-managed component', async () => {
  const app = await fs.readFile(new URL('../vendor/ofm/packages/standalone/web/app.js', import.meta.url), 'utf8');
  assert.match(app, /id:"providers",name:"渠道与模型"/);
  assert.match(app, /id:"maintenance",name:"更新与健康监测"/);
  assert.match(app, /\.jsx\("ofm-management",\{page:[\w$]+,key:/);
  assert.match(app, /history\.replaceState\(null,"",/);
  assert.match(app, /location\.hash\.slice\(1\)/);
  const management = await fs.readFile(new URL('../vendor/ofm/packages/standalone/management.mjs', import.meta.url), 'utf8');
  assert.match(management, /magpie-console\.js/);
  assert.doesNotMatch(management, /position:fixed;bottom:12px/);
  assert.match(management, /await managementExtension\?\.syncSettings\(patch\)/);
  assert.match(management, /await managementExtension\.probe\(\)/);
  assert.match(management, /managementExtension\?\.healthRow\(entry.id, routable.has\(entry.id\)\)/);
  const template = await fs.readFile(new URL('../assets/console-page.html', import.meta.url), 'utf8');
  assert.doesNotMatch(template, /<iframe|<style|style=/);
  assert.match(template, /class="ui-card settings-card"/);
  assert.match(template, /class="settings-toggle" role="switch"/);
  const element = await fs.readFile(new URL('../assets/console-page.js', import.meta.url), 'utf8');
  assert.match(element, /disconnectedCallback\(\) \{ this.controller\?\.abort\(\)/);
  assert.throws(() => patchConsoleNavigation('unsupported upstream'), /integration changed/);
});

test('legacy page only redirects to the authenticated native console', async () => {
  const html = await fs.readFile(new URL('../assets/models.html', import.meta.url), 'utf8');
  assert.match(html, /url=\/#providers/);
  assert.doesNotMatch(html, /<form|background:|<script/);
});

 test('management headings override the cyber theme cutout without removing the card theme', async () => {
 const css = await fs.readFile(new URL('../assets/console-page.css', import.meta.url), 'utf8');
 assert.match(css, /ofm-management \.ofm-managed-page \.settings-card-heading \{ clip-path: none !important/);
 });
