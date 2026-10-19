import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { magpieEfforts, nativeEffort } from '../src/reasoning-levels.mjs';
import { managedModel } from '../src/managed.mjs';
import { startForwardServer } from '../vendor/ofm/src/forward.js';
import { setSessionStoreRoot, sessionForConversation } from '../vendor/ofm/src/upstream.js';
import { toGenerateOptions, normalizeMaxTokens } from '../vendor/ofm/packages/standalone/channels/business.mjs';

test('canonical menus retain native wire levels, including explicit thinking off', () => {
  const variants = magpieEfforts(['off', 'on', 'extra_high', 'unknown', '__proto__']);
  assert.deepEqual(variants, { none: { reasoningEffort: 'off' }, high: { reasoningEffort: 'on' }, xhigh: { reasoningEffort: 'extra_high' } });
  assert.deepEqual(magpieEfforts(['light', 'balanced', 'deep']), { low: { reasoningEffort: 'light' }, medium: { reasoningEffort: 'balanced' }, max: { reasoningEffort: 'deep' } });
  assert.equal(magpieEfforts(['deep', 'max']).max.reasoningEffort, 'max');
  assert.equal(magpieEfforts(['max', 'deep']).max.reasoningEffort, 'max');
  const row = { id: 'eac/test', reasoning_efforts: ['disabled', 'high'] };
  assert.deepEqual(managedModel(row, 'http://127.0.0.1/v1').variants.none, { reasoningEffort: 'disabled' });
  assert.equal(nativeEffort({ reasoning_effort: 'none' }, row).reasoning_effort, 'disabled');
  assert.equal(nativeEffort({ reasoning_effort: 'disabled' }, row).reasoning_effort, 'disabled');
  assert.equal(nativeEffort({ reasoning_effort: 'nonsense' }, row).reasoning_effort, 'nonsense');
});

test('session maps use the managed data directory, remain stable and have private permissions', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ofm-session-root-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  assert.throws(() => setSessionStoreRoot('relative'), /absolute path/);
  setSessionStoreRoot(dir);
  const first = sessionForConversation('fixture-session');
  assert.equal(sessionForConversation('fixture-session'), first);
  const file = path.join(dir, 'session-map.json');
  const saved = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(saved.sessions['fixture-session'], first);
  if (process.platform !== 'win32') assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  assert.deepEqual(await fs.readdir(dir), ['session-map.json']);
});

for (const [route, event] of [['chat/completions', 'data:'], ['messages', 'event: error'], ['responses', 'event: error']]) {
  test(`last-resort ${route} stream failures retain an explicit protocol error`, async t => {
    const server = await startForwardServer({
      config: () => ({ host: '127.0.0.1', port: 0, enabled: true }),
      complete: async () => { throw new Error('unused'); }, modelRows: () => [],
      handleRequest: async (_req, res) => {
        res.setHeader('content-type', 'text/event-stream');
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write(': stream opened\n\n');
        throw new Error('fixture upstream denied request');
      },
    });
    t.after(() => server.close());
    const response = await fetch(`http://127.0.0.1:${server.port}/v1/${route}`, { method: 'POST', body: '{}' });
    const text = await response.text();
    assert.equal(response.status, 200); // status line was already sent
    assert.ok(text.includes(event), text);
    assert.match(text, /fixture upstream denied request/);
    if (route === 'messages') assert.match(text, /"type":"api_error"/);
    if (route === 'chat/completions') assert.match(text, /\[DONE\]/);
  });
}

test('current channel converter preserves recursive JSON references without flattening tool contracts', async () => {
  const schema = { type: 'object', $defs: { node: { type: 'object', properties: { child: { $ref: '#/$defs/node' } } } }, properties: { root: { $ref: '#/$defs/node' } } };
  const result = await toGenerateOptions({ model: 'buddy/test', messages: [{ role: 'user', content: 'hello' }], tools: [{ type: 'function', function: { name: 'tree', parameters: schema } }] }, new AbortController().signal);
  assert.deepEqual(result.tools[0].parameters, schema);
  assert.equal(normalizeMaxTokens(131072, 'codearts', 'deepseek-v4-flash'), 65536);
  assert.equal(normalizeMaxTokens(131072, 'other', 'deepseek-v4-flash'), 131072);
});
