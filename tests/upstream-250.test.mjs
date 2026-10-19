import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeSession, isCanonicalSession, mintSessionId, sessionForConversation } from '../vendor/ofm/src/upstream.js';
import { buildCatalog, buildEacCatalog } from '../vendor/ofm/src/catalog.js';
import { effortPatchFor } from '../vendor/ofm/src/effort.js';
import { startForwardServer } from '../vendor/ofm/src/forward.js';
import { openExternal } from '../vendor/ofm/packages/standalone/open-external.mjs';
import { failureDetail } from '../src/upstream-sync.mjs';

test('free lane re-encodes ascending/legacy sessions deterministically into the accepted window', () => {
  const legacy = 'ses_012345678000ABCDEFGHIJKLMN';
  assert.equal(isCanonicalSession(legacy), false);
  const converted = canonicalizeSession(legacy);
  assert.equal(isCanonicalSession(converted), true);
  assert.equal(sessionForConversation(legacy), converted);
  assert.equal(sessionForConversation(converted), converted);
  assert.notEqual(canonicalizeSession('conversation-two'), converted);
  assert.equal(isCanonicalSession(mintSessionId()), true);
});

test('free model capabilities preserve declared effort menus without inventing an off switch', () => {
  const rows = buildCatalog(['deepseek-v4.1-flash-free', 'glm-5.3-flash-free', 'space-bunny-free', 'big-pickle']);
  const find = id => rows.find(row => row.id === id);
  assert.equal(find('deepseek-v4.1-flash-free').contextWindow, 1048576);
  assert.deepEqual(effortPatchFor('disabled', find('deepseek-v4.1-flash-free')), { reasoning_effort: 'none' });
  assert.deepEqual(effortPatchFor('max', find('glm-5.3-flash-free')), { reasoning_effort: 'max' });
  assert.equal(find('glm-5.3-flash-free').canDisableThinking, false);
  assert.equal(find('space-bunny-free').efforts.includes('disabled'), false);
  assert.ok(find('big-pickle'));
});

test('bundled browser helper supports launch/fallback without executing real browser commands', async () => {
  const calls = [];
  const exec = async (...args) => { calls.push(args); };
  assert.equal(await openExternal('https://example.invalid/login', { platform: 'darwin', exec }), true);
  assert.equal(calls[0][0], '/usr/bin/open');
  assert.equal(await openExternal('https://example.invalid/login', { platform: 'linux', exec: async () => { throw new Error('no browser'); } }), false);
  assert.equal(await openExternal('file:///etc/passwd', { exec }), false);
});

test('protocol endpoints return explicit errors for malformed bodies and failed streams', async t => {
  const server = await startForwardServer({ config: () => ({ enabled: true, key: 'fixture', host: '127.0.0.1', port: 0 }),
    complete: async () => { throw new Error('fixture dispatch failure'); }, modelRows: () => [{ id: 'fixture' }] });
  t.after(() => server.close());
  const call = (route, body) => fetch(`http://127.0.0.1:${server.port}/v1/${route}`, { method: 'POST',
    headers: { authorization: 'Bearer fixture', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  for (const body of [null, [], 1]) {
    const response = await call('chat/completions', body);
    assert.equal(response.status, 400); await response.body.cancel();
  }
  const chat = await call('chat/completions', { model: 'fixture', messages: [{ role: 'user', content: 'hi' }], stream: true });
  const chatText = await chat.text(); assert.match(chatText, /fixture dispatch failure/); assert.match(chatText, /\[DONE\]/);
  const responses = await call('responses', { model: 'fixture', input: 'hi', stream: true });
  assert.match(await responses.text(), /response.failed/);
  const messages = await call('messages', { model: 'fixture', max_tokens: 128, messages: [{ role: 'user', content: 'hi' }], stream: true });
  assert.match(await messages.text(), /fixture dispatch failure/);
});

test('update failure details identify known patch drift and never echo arbitrary child output', () => {
  assert.match(failureDetail({ output: 'Error: Standalone EAC integration point changed' }, 'vendor'), /EAC 服务初始化/);
  const result = failureDetail({ output: 'secret-token https://example.invalid/?key=secret' }, 'tests');
  assert.match(result, /回归测试/); assert.doesNotMatch(result, /secret/);
});


test('EAC cards hide routing prefix in the label while retaining distinct model IDs', () => {
  const [row] = buildEacCatalog(['opencode/deepseek-v4.1-flash-free']);
  assert.equal(row.id, 'opencode/deepseek-v4.1-flash-free');
  assert.equal(row.label, 'deepseek-v4.1-flash-free');
});
