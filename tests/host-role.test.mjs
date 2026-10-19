import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isAuxiliaryMagpie, resolveHostRole } from '../src/host-role.mjs';
import { getManagedRuntime } from '../src/managed-runtime.mjs';
import { createManagedPlugin } from '../src/managed.mjs';

test('parent command classification recognizes Magpie MCP but not the app or unrelated script arguments', async () => {
  for (const command of ['magpie mcp image', '/Applications/magpie.app/Contents/MacOS/magpie mcp image', '"C:\\Program Files\\Magpie\\magpie.exe" mcp image']) assert.equal(isAuxiliaryMagpie(command), true, command);
  for (const command of ['/Applications/magpie.app/Contents/MacOS/magpie', 'node client.js mcp image', 'magpie-bun run host.js']) assert.equal(isAuxiliaryMagpie(command), false, command);
  assert.equal(await resolveHostRole({ platform: 'darwin', parentCommand: async () => '/Applications/magpie.app/Contents/MacOS/magpie mcp image' }), 'auxiliary');
  assert.equal(await resolveHostRole({ platform: 'darwin', parentCommand: async () => { throw new Error('denied'); } }), 'unknown');
});

test('auxiliary provider listing, loader and usage never start OFM or write an installation when primary is absent', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ofm-aux-hooks-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const options = { autoInstallChannels: false, autoInstallEac: false, refresh: false };
  const runtime = getManagedRuntime({ directory }, options, { resolveHostRole: async () => 'auxiliary' });
  t.after(() => runtime.close());
  const plugin = await createManagedPlugin({ directory }, options);
  const auth = { type: 'api', key: 'managed', metadata: { dataDir: runtime.dataDir } };
  assert.deepEqual(await plugin.provider.models({ models: {} }, { auth }), {});
  assert.deepEqual(await plugin.auth.loader(async () => auth), {});
  assert.match((await plugin.auth.usage(auth)).plan, /不会自动启动/);
  assert.deepEqual(await fs.readdir(directory), []);
});

test('unverifiable macOS host identity refuses service creation before any install or downloads', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ofm-unknown-host-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const runtime = getManagedRuntime({ directory }, {}, { resolveHostRole: async () => 'unknown' });
  await assert.rejects(runtime.ensure(), error => error.code === 'OFM_HOST_UNVERIFIED');
  assert.deepEqual(await fs.readdir(directory), []);
});
