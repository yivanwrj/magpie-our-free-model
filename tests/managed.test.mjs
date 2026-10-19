import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer, request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { createManagedPlugin, managedModel } from '../src/managed.mjs';
import { getManagedRuntime } from '../src/managed-runtime.mjs';
import uninstall from '../uninstall.mjs';
import { CHANNEL_COMMIT, CHANNEL_FILES } from '../src/channel-source.mjs';
import { EAC_COMMIT, EAC_FILES } from '../src/eac-source.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await fn(); if (value) return value; await delay(100); }
  throw new Error('Fixture wait expired');
}
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;

test('upstream runtime hashes match the declared snapshot and Google configuration patch', () => {
  const dir = path.join(root, 'vendor/ofm');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'UPSTREAM.json')));
  assert.equal(manifest.commit, CHANNEL_COMMIT);
  assert.equal(manifest.commit, EAC_COMMIT);
  for (const file of [...CHANNEL_FILES, ...EAC_FILES].filter(file => !manifest.omitted.includes(file.path))) {
    const original = manifest.files.find(row => row.path === file.path);
    assert.equal(file.sha256, original?.sha256, file.path);
    if (file.bytes !== undefined) assert.equal(file.bytes, original?.bytes, file.path);
  }
  for (const file of manifest.files) {
    const bytes = fs.readFileSync(path.join(dir, file.path));
    const patch = manifest.adaptations?.find(patch => patch.path === file.path);
    if (patch) assert.equal(patch.originalSha256, file.sha256);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), patch?.sha256 ?? file.sha256, file.path);
    assert.doesNotMatch(file.path, /(?:^|\/)(?:settings|channel-credentials|eac-user|service\.lock)\.json$/);
    if (/\/web\/channels-[^/]+\.js$/.test(file.path)) {
      assert.match(bytes.toString('utf8'), /t\.setup\?\.message\?\?a\("eac\.noLane"\)/, file.path);
    }
  }
  const business = fs.readFileSync(path.join(dir, 'packages/standalone/channels/business.mjs'), 'utf8');
  for (const name of ['vault-data.js', 'vault-anchor.js']) assert.equal(fs.existsSync(path.join(dir, 'src', name)), false);
  const stub = fs.readFileSync(path.join(dir, 'src/vault.js'), 'utf8');
  assert.ok(!stub.includes('crypto') && !stub.includes('LANE_SEAL'));
  assert.match(business, /var GEMINI_DEFAULT_CLIENT_ID = "";/);
  assert.match(business, /var GEMINI_DEFAULT_CLIENT_SECRET = "";/);
  assert.match(business, /var LOOMY_WECHAT_APP_ID = "";/);
  assert.doesNotMatch(business, /wx[0-9a-f]{16}/);
  assert.doesNotMatch(business, /OFM_LOOMY_WECHAT_APP_ID/);
});

test('managed metadata preserves native effort ids and declared image/context capabilities', () => {
  const model = managedModel({ id: 'buddy/test', context_window: 128000, max_tokens: 8192,
    input: ['text', 'image'], reasoning: { efforts: [{ id: 'low' }, { id: 'high' }] } }, 'http://127.0.0.1/v1');
  assert.equal(model.limit.context, 128000);
  assert.equal(model.limit.output, 8192);
  assert.equal(model.capabilities.input.image, true);
  assert.equal(model.capabilities.reasoning, true);
  assert.deepEqual(model.variants.high, { reasoningEffort: 'high' });
  const plain = managedModel({ id: 'unknown' }, 'http://127.0.0.1/v1');
  assert.equal(plain.capabilities.input.image, false);
  assert.deepEqual(plain.variants, {});
  assert.equal(managedModel({ id: '__proto__' }, ''), undefined);
});

test('managed lifecycle validates settings, prevents conflicting instances and diagnoses missing Node', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofm-config-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.throws(() => getManagedRuntime({ directory: dir }, { port: -1 }), /port/);
  assert.throws(() => getManagedRuntime({ directory: dir }, { autoInstallEac: 'yes' }), /autoInstallEac/);
  assert.throws(() => getManagedRuntime({ directory: dir }, { autoInstallCloudflared: 'yes' }), /autoInstallCloudflared/);
  assert.throws(() => getManagedRuntime({ directory: dir }, { port: 18900, consolePort: 18900 }), /consolePort/);
  const runtime = getManagedRuntime({ directory: dir }, { nodePath: path.join(dir, 'missing-node') });
  assert.equal(getManagedRuntime({ directory: dir }, { nodePath: path.join(dir, 'missing-node') }), runtime);
  assert.throws(() => getManagedRuntime({ directory: dir }, { port: 0 }), /不同服务设置/);
  await assert.rejects(runtime.ensure(), /Node/);
  const legacy = { dataDir: path.join(dir, 'migration'), consoleAccess: 'tailscale', autoInstallCloudflared: false };
  const migrated = await createManagedPlugin({ directory: dir }, legacy);
  t.after(() => migrated.lifecycle.dispose());
  assert.equal(migrated.auth.methods.length, 2);
  assert.match(migrated.auth.methods[0].label, /免登录/);
  assert.doesNotMatch(JSON.stringify(migrated.auth.methods), /Tailscale/);
  assert.equal(getManagedRuntime({ directory: dir }, legacy),
    getManagedRuntime({ directory: dir }, { ...legacy, consoleAccess: 'cloudflare' }));
});

test('real bundled service: console handoff, channels, EAC, requests, key rotation and shutdown', { skip: process.platform === 'win32' }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofm-managed-'));
  const dataDir = path.join(dir, 'data');
  const requests = [];
  let rejectAnonymous=false;
  const upstream = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const body = raw ? JSON.parse(raw) : {};
    requests.push({ pathname, body, headers: req.headers });
    const json = value => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); };
    if(rejectAnonymous&&body.model==='mimo-v2.6-flash-free'){res.statusCode=403;return json({error:{type:'FreeTierError',message:'free tier can only be used from within OpenCode'}});}
    if (body.model === 'fixture-rate-limit') { res.writeHead(429, { 'retry-after': '30' }); return res.end('{}'); }
    if (req.headers['x-ofm-signature']) {
      const expected = crypto.createHmac('sha256', 'fixture-only-not-a-production-secret')
        .update(`${req.headers['x-ofm-timestamp']}\n${req.method}\n${pathname}\n${crypto.createHash('sha256').update(raw).digest('hex')}`)
        .digest('hex');
      if (!pathname.startsWith('/remote/eac/v1/') || req.headers['x-ofm-signature'] !== expected) {
        res.statusCode = 403;
        return json({ error: { message: 'wrong mounted path or signature' } });
      }
    }
    if (pathname.endsWith('/auth/status')) return json({ authorized: !!req.headers['x-ofm-user'], starred: true });
    if (pathname.endsWith('/auth/github/start')) { res.writeHead(302, { location: 'https://example.invalid/login' }); return res.end(); }
    if (pathname.endsWith('/auth/poll')) return json({ status: 'ok', token: 'fixture-eac', login: 'fixture', ackRequired: true });
    if (pathname.endsWith('/auth/ack') || pathname.endsWith('/auth/logout')) return json({ ok: true });
    if (pathname.endsWith('/pool')) return json({ ok: true, inflight: 1 });
    if (pathname === '/remote/api/v1/models') return json({ data: [
      { id: 'openrouter/free', pricing: { prompt: '0', completion: '0' } },
      { id: 'vendor/offer', name: 'Temporary offer', pricing: { prompt: '0', completion: '0' } },
      { id: 'vendor/paid', pricing: { prompt: '0.01', completion: '0.01' } },
    ] });
    if (pathname.endsWith('/models')) return json({ data: req.headers['x-ofm-signature']
      ? [{ id: 'fixture-eac-model' }, { id: 'opencode/deepseek-v4-flash' }] : pathname === '/models' ? [{ id: 'fixture/free', isFree: true, context_length:1048576 }]
      : [{ id: 'mimo-v2.6-flash-free' }] });
    if (pathname.includes('/console/enterprises/') || pathname.endsWith('/v3/config')) return json({ data: {
      models: [{ id: 'fixture-free', name: 'Fixture', credits: 'x0', maxInputTokens: 128000,
        maxOutputTokens: 4096, supportsImages: true, reasoning: { supportedEfforts: ['low', 'high'], defaultEffort: 'high' } }],
      agents: [{ name: 'craft', models: ['fixture-free'] }],
    } });
    if (pathname.endsWith('/chat/completions')) {
      res.setHeader('content-type', 'text/event-stream');
      const frames = [ { choices: [{ index: 0, delta: { content: 'managed-ok' } }] },
        ...(body.tools?.some(tool => tool.function?.name === 'lookup') ? [{ choices: [{ index: 0, delta: { tool_calls: [
          { index: 0, id: 'call_fixture', type: 'function', function: { name: 'lookup', arguments: '{}' } } ] } }] }] : []),
        { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2 } } ];
      return res.end(frames.map(frame => `data: ${JSON.stringify(frame)}\n\n`).join('') + 'data: [DONE]\n\n');
    }
    json({ data: { Response: { Data: { Accounts: [] } } } });
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const fixture = `http://127.0.0.1:${upstream.address().port}`;
  const envKeys = ['OFM_TEST_UPSTREAM', 'OUR_FREE_MODEL_BASE', 'OUR_FREE_MODEL_KILO_BASE', 'OFM_TEST_EAC_SOURCE'];
  const before = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  for (const key of envKeys.slice(0, 3)) process.env[key] = fixture;
  const eacSourceDir = path.join(dir, 'local-eac');
  process.env.OFM_TEST_EAC_SOURCE = eacSourceDir;
  fs.mkdirSync(path.join(dataDir, 'channel-pack'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'channel-pack/state.json'), JSON.stringify({
    accounts: [{ id: 'buddy-fixture', provider: 'buddy', nickname: 'Fixture', enabled: true,
      refreshable: false, createdAt: Date.now(), expiresAt: Date.now() + 86400000, credentialRef: 'BUDDY_FIXTURE' }], disabledModels: {},
  }));
  fs.writeFileSync(path.join(dataDir, 'channel-credentials.json'), JSON.stringify({ BUDDY_FIXTURE: JSON.stringify({
    access_token: 'fixture-access', refresh_token: 'fixture-refresh', domain: 'copilot.tencent.com',
    expires_at: String(Date.now() + 86400000), refresh_expires_at: String(Date.now() + 7 * 86400000),
    user_id: 'fixture-user', nickname: 'Fixture', account_type: 'personal',
  }) }));
  const wrapper = path.join(dir, 'node-fixture');
  fs.writeFileSync(wrapper, `#!/bin/sh\nexec ${quote(process.execPath)} --import ${quote(path.join(root, 'tests/managed-fixture.mjs'))} "$@"\n`, { mode: 0o700 });
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const consolePort = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const input = { directory: dir };
  const tunnelTarget = path.join(dir, 'tunnel-target.txt');
  const cloudflareScript = path.join(dir, 'cloudflare-fixture.mjs');
  fs.writeFileSync(cloudflareScript, `import fs from 'node:fs';
    const args=process.argv.slice(2);
    if(args[0]==='--version') { console.log('cloudflared version 2026.10.0'); process.exit(0); }
    if(args[0]==='tunnel') {
      fs.writeFileSync(${JSON.stringify(tunnelTarget)}, args[args.indexOf('--url')+1]);
      console.log('https://managed-fixture.trycloudflare.com');
      console.log('Registered tunnel connection');
      setInterval(()=>{},1000);
    } else process.exit(1);
  `);
  const cloudflaredPath = path.join(dir, 'cloudflared');
  fs.writeFileSync(cloudflaredPath, `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(cloudflareScript)} "$@"\n`, { mode: 0o700 });
  const options = { dataDir, nodePath: wrapper, port: 0, consolePort, eacSourceDir, consoleAccess: 'local', autoInstallChannels: false, cloudflaredPath };
  const runtime = getManagedRuntime(input, options);
  t.after(async () => {
    await runtime.close();
    upstream.closeAllConnections(); await new Promise(resolve => upstream.close(resolve));
    for (const key of envKeys) { if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key]; }
    fs.rmSync(dir, { recursive: true, force: true });
  });
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'gemini-oauth.json'), 'invalid legacy custom configuration');
  fs.writeFileSync(path.join(dataDir, 'loomy-wechat.json'), 'invalid legacy custom configuration');
  const plugin = await createManagedPlugin(input, options);
  const login = await plugin.auth.methods[0].authorize();
  const result = await login.callback();
  const auth = { type: 'api', key: result.key, metadata: result.metadata };
  assert.equal(auth.key, 'managed');
  const firstModels = await plugin.provider.models({ models: {} }, { auth });
  assert.ok(firstModels['buddy/fixture-free'], 'the first discovery waits for the account catalog');
  await runtime.command('models');
  assert.equal(requests.filter(row=>row.pathname.endsWith('/chat/completions')).length,0,'starting and listing the real service must not probe any model');
  assert.ok(!login.url.includes('ofm-'));
  assert.equal(new URL(login.url).port, String(consolePort));
  const conn = await runtime.connection();
  const api = async (suffix, body, cookie) => {
    const response = await fetch(conn.base.replace(/\/v1$/, '') + suffix, {
      method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json',
        ...(cookie ? { cookie } : { authorization: `Bearer ${(await runtime.connection()).key}` }) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  await t.test('failed EAC source leaves the real service and free model catalog running', async () => {
    const isolated = getManagedRuntime({ directory: dir }, { dataDir: path.join(dir, 'eac-failure-data'), port: 0,
      nodePath: wrapper, refresh: false, eacSourceDir: path.join(dir, 'missing-source'), autoInstallChannels: false, consoleAccess: 'local' });
    try {
      const connection = await isolated.connection();
      const status = await fetch(connection.base.replace(/\/v1$/, '') + '/api/management/eac/status',
        { headers: { authorization: `Bearer ${connection.key}` } }).then(response => response.json());
      assert.equal(status.available, false);
      assert.equal(status.setup.state, 'failed');
      assert.match(status.setup.message, /本机来源加载失败/);
      await until(async () => (await isolated.command('models')).some(model => model.id === 'mimo-v2.6-flash-free'));
    } finally { await isolated.close(); }
  });
  await t.test('one-use console login gives a real management cookie and can be reopened', async () => {
    const handoff = await fetch(login.url, { redirect: 'manual' });
    assert.equal(handoff.status, 303);
    const cookie = handoff.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    const summary = await api('/api/management/summary', undefined, cookie.split(';')[0]);
    assert.equal(summary.status, 200, JSON.stringify(summary.body));
    assert.equal(summary.body.channels.state, 'ready');
    assert.equal(summary.body.networkMode, 'fixture');
    assert.equal((await fetch(login.url)).status, 401);
    const next = await plugin.auth.methods[0].authorize();
    assert.notEqual(next.url, login.url);
    assert.equal((await fetch(next.url, { redirect: 'manual' })).status, 303);
  });
  await t.test(`Cloudflare auth goes through the real runner and gateway; closing it keeps model service running`, async () => {
    const remote = await plugin.auth.methods[1].authorize();
    const hostname = 'managed-fixture.trycloudflare.com';
    assert.equal(new URL(remote.url).hostname, hostname);
    const target = fs.readFileSync(tunnelTarget, 'utf8');
    // Node fetch does not preserve a caller-supplied Host on all supported versions.
    const request = (pathname, options = {}) => new Promise((resolve, reject) => {
      const req = httpRequest(target + pathname, { ...options, headers: { host: hostname, ...options.headers } }, res => {
        let body = ''; res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }); req.on('error', reject); req.end();
    });
    const opened = await request(new URL(remote.url).pathname);
    assert.equal(opened.status, 303);
    const cookie = opened.headers['set-cookie'][0].split(';')[0];
    const summary = await request('/api/management/summary', { headers: { cookie } });
    assert.equal(summary.status, 200, JSON.stringify(summary.body)); assert.equal(JSON.parse(summary.body).channels.state, 'ready');
    assert.equal((await request('/magpie-models', { headers: { cookie } })).status, 200);
    assert.equal((await request('/api/management/magpie/models', { headers: { cookie } })).status, 200);
    const closed = await request('/remote/close', { method: 'POST', headers: { cookie, origin: `https://${hostname}` } });
    assert.equal(closed.status, 200);
    await until(async () => { try { await fetch(target); return false; } catch { return true; } });
    assert.equal((await api('/api/management/summary')).status, 200);
  });
  await t.test('aggregation console authenticates, persists keys privately and updates the live catalog', async () => {
    const url = conn.base.replace(/\/v1$/, '');
    assert.equal((await fetch(url + '/api/management/magpie/models')).status, 401);
    assert.equal((await fetch(url + '/magpie-models')).status, 200);
    assert.equal((await fetch(url + '/api/management/magpie/upstream/status')).status, 401);
    assert.equal((await fetch(url + '/api/management/magpie/channel-source/import', { method: 'POST', body: 'bad' })).status, 401);
    assert.equal((await api('/api/management/magpie/channel-source/import', { invalid: true })).status, 400);
    const updaterStatus = await api('/api/management/magpie/upstream/status');
    assert.equal(updaterStatus.status, 200); assert.equal(updaterStatus.body.preferences.intervalHours, 24);
    assert.equal((await api('/api/management/magpie/upstream/settings', { enabled: false, autoBuild: false, intervalHours: 24 })).status, 200);
    assert.equal((await api('/api/management/magpie/upstream/settings', { enabled: true, autoBuild: true, intervalHours: 0 })).status, 400);
    assert.deepEqual((await api('/api/management/magpie/upstream/logs')).body.logs, []);
    const saved = await api('/api/management/magpie/provider', { id: 'open_router', enabled: true, apiKey: 'fixture-private-key', models: ['openrouter/free'] });
    assert.equal(saved.status, 200);
    const list = await api('/api/management/magpie/models');
    assert.equal(list.status, 200);
    assert.ok(list.body.catalog.some(row => row.id === 'api/open_router/openrouter/free'));
    assert.ok(!JSON.stringify(list.body).includes('fixture-private-key'));
    assert.ok(list.body.providers.find(row => row.id === 'open_router').configured);
    await until(async () => (await runtime.command('models')).some(row => row.id === 'api/open_router/openrouter/free'));
    const aggregateLoader = await plugin.auth.loader(async () => auth);
    const result = await aggregateLoader.fetch(aggregateLoader.baseURL + '/chat/completions', { method: 'POST', body: JSON.stringify({ model: 'api/open_router/openrouter/free', messages: [{ role: 'user', content: 'synthetic test' }], stream: false }) });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).choices[0].message.content, 'managed-ok');
    const freeList = await api('/api/management/magpie/discover', { id: 'open_router' });
    assert.equal(freeList.status, 200);
    assert.ok(freeList.body.models.includes('vendor/offer'));
    assert.ok(!freeList.body.models.includes('vendor/paid'));
    assert.equal(freeList.body.candidates.find(row => row.id === 'vendor/offer').kind, 'zero-price-offer');
    assert.equal((await api('/api/management/magpie/provider', { id: 'open_router', enabled: true, models: ['vendor/offer'] })).status, 200);
    await until(async () => (await runtime.command('models')).some(row => row.id === 'api/open_router/vendor/offer'));
    const offerReply = await aggregateLoader.fetch(aggregateLoader.baseURL + '/chat/completions', { method: 'POST', body: JSON.stringify({ model: 'api/open_router/vendor/offer', messages: [{ role: 'user', content: 'synthetic offer check' }], stream: false }) });
    assert.equal(offerReply.status, 200); await offerReply.text();
    const sent = requests.findLast(req => req.pathname.endsWith('/chat/completions') && req.body.model === 'vendor/offer');
    assert.deepEqual(sent.body.provider.max_price, { prompt: 0, completion: 0, request: 0 });
    assert.equal((await api('/api/management/magpie/provider', { id: 'open_router', enabled: true, models: ['vendor/paid'] })).status, 400);
    assert.ok((await api('/api/management/magpie/models')).body.catalog.some(row => row.id === 'api/open_router/vendor/offer'));
    const off = await api('/api/management/magpie/provider', { id: 'open_router', enabled: false, clearKey: true, models: ['openrouter/free'] });
    assert.equal(off.status, 200);
    assert.ok((await api('/api/management/magpie/models')).body.catalog.some(row => row.id === 'api/open_router/openrouter/free' && row.disabled));
    assert.equal((await api('/api/management/magpie/provider', { id: 'gemini', enabled: true, apiKey: 'fixture-api-key', models: ['gemini-fixture'] })).status, 200);
    await until(async () => (await runtime.command('models')).some(row => row.id === 'api/gemini/gemini-fixture'));
    const gemini = await aggregateLoader.fetch(aggregateLoader.baseURL + '/chat/completions', { method: 'POST', body: JSON.stringify({ model: 'api/gemini/gemini-fixture', messages: [{ role: 'user', content: 'synthetic test' }], stream: false }) });
    assert.equal(gemini.status, 200);
    assert.equal((await gemini.json()).choices[0].message.content, 'managed-ok');
    await api('/api/management/magpie/provider', { id: 'gemini', enabled: false, clearKey: true, models: ['gemini-fixture'] });

  });
  let models;
  const provider = { models: {} };
  await t.test('model sync uses real core and channel capabilities, not defaults', async () => {
    models = await until(async () => { const rows = await plugin.provider.models(provider, { auth }); return rows['buddy/fixture-free'] && rows['mimo-v2.6-flash-free'] ? rows : undefined; });
    assert.equal(models['buddy/fixture-free'].capabilities.input.image, true);
    assert.equal(models['buddy/fixture-free'].limit.context, 128000);
    assert.deepEqual(Object.keys(models['mimo-v2.6-flash-free'].variants), ['low', 'medium', 'max']);
    assert.equal(models['mimo-v2.6-flash-free'].capabilities.input.image, true);
  });
  const loader = await plugin.auth.loader(async () => auth);
  const call = (model, extra = {}) => loader.fetch(`${loader.baseURL}/chat/completions`, { method: 'POST',
    headers: { authorization: 'Bearer downstream-secret', cookie: 'downstream-cookie' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], stream: true, ...extra }) });
  await t.test('Agnes custom model is saved, visible before probing, and published after a real fixture completion', async () => {
    const beforeInference=requests.filter(row=>row.pathname.endsWith('/chat/completions')).length;
    const saved = await api('/api/management/magpie/provider', { id: 'agnes', enabled: true, apiKey: 'fixture-agnes-key', baseUrl: fixture + '/remote/api/v1', models: ['agnes-2.5-flash'] });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.models, ['api/agnes/agnes-2.5-flash']);
    assert.ok((await api('/api/management/magpie/models')).body.catalog.some(row => row.id === 'api/agnes/agnes-2.5-flash'));
    await until(async () => (await runtime.command('models')).some(row => row.id === 'api/agnes/agnes-2.5-flash'));
    assert.equal(requests.filter(row=>row.pathname.endsWith('/chat/completions')).length,beforeInference,'saving and reading models must send no inference');
    const actual=await call('api/agnes/agnes-2.5-flash');assert.equal(actual.status,200);await actual.text();
    await until(async () => (await runtime.command('health'))['api/agnes/agnes-2.5-flash']?.state === 'healthy');
    assert.ok(requests.some(row => row.pathname.endsWith('/chat/completions') && row.body.model === 'agnes-2.5-flash'));
    await api('/api/management/magpie/provider', { id: 'agnes', enabled: false, models: ['agnes-2.5-flash'] });
    assert.ok((await api('/api/management/magpie/models')).body.catalog.some(row => row.id === 'api/agnes/agnes-2.5-flash' && row.disabled));
  });
  await t.test('unified maintenance preserves a rate-limited model, supports strict hiding and blocks repeat calls', async () => {
    const prior = (await api('/api/management/magpie/upstream/status')).body.preferences;
    const id = 'api/agnes/fixture-rate-limit';
    await api('/api/management/magpie/provider', { id: 'agnes', enabled: true, apiKey: 'fixture', baseUrl: fixture + '/remote/api/v1', models: ['fixture-rate-limit'] });
    const actual=await call(id);assert.equal(actual.status,429);await actual.text();
    await until(async () => (await runtime.command('health'))[id]?.state === 'rate_limited');
    assert.ok((await runtime.command('models')).some(row => row.id === id));
    const count = () => requests.filter(row => row.body.model === 'fixture-rate-limit').length;
    const before = count();
    const saved = await api('/api/management/magpie/upstream/settings', { ...prior, enabled: false, hideUnavailable: false });
    assert.equal(saved.status, 200);
    const summary = (await api('/api/management/magpie/models')).body;
    assert.equal(summary.healthPreferences.automatic, false);
    assert.equal(summary.healthPreferences.hideUnavailable, false);
    await runtime.command('models');
    const limited = await call(id); assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0); await limited.text();
    await api('/api/management/magpie/probe', {model:id});
    assert.equal(count(), before);
    await api('/api/management/magpie/upstream/settings', { ...prior, enabled: false, hideUnavailable: true });
    assert.ok(!(await runtime.command('models')).some(row => row.id === id));
    await api('/api/management/magpie/provider', { id: 'agnes', enabled: false, models: ['fixture-rate-limit'] });
    await api('/api/management/magpie/upstream/settings', prior);
  });
  await t.test('real channel inference retains tools and strips downstream secrets', async () => {
    const response = await call('buddy/fixture-free', { tools: [{ type: 'function', function: { name: 'lookup', parameters: {} } }] });
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.match(text, /managed-ok/); assert.match(text, /call_fixture/);
    assert.ok(!JSON.stringify(requests).includes('downstream-secret'));
    assert.ok(!JSON.stringify(requests).includes('downstream-cookie'));
  });
  await t.test('inline image bytes reach the real channel adapter', async () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
    const response = await call('buddy/fixture-free', { messages: [{ role: 'user', content: [
      { type: 'text', text: 'what' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${png}` } } ] }] });
    assert.equal(response.status, 200); await response.text();
    assert.ok(JSON.stringify(requests.findLast(req => req.pathname.endsWith('/chat/completions')).body).includes(png));
  });
  await t.test('canonical low effort applies the original native Light token budget', async () => {
    const response = await call('mimo-v2.6-flash-free', { reasoning_effort: 'low', max_tokens: 7000 });
    assert.equal(response.status, 200); await response.text();
    assert.equal(requests.findLast(req => req.pathname.endsWith('/chat/completions')).body.max_tokens, 4096);
  });
  await t.test('native Anthropic gateway authenticates, completes JSON and streams channel replies', async () => {
    const body = { model: 'buddy/fixture-free', max_tokens: 1024, messages: [{ role: 'user', content: 'hi' }],
      tools: [{ name: 'lookup', input_schema: { type: 'object', properties: {} } }] };
    const address = `${conn.base}/messages`;
    assert.equal((await fetch(address, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body) })).status, 401);
    const complete = await api('/v1/messages', body);
    assert.equal(complete.status, 200, JSON.stringify(complete.body));
    assert.equal(complete.body.type, 'message');
    assert.ok(complete.body.content.some(block => block.type === 'text' && block.text === 'managed-ok'));
    assert.ok(complete.body.content.some(block => block.type === 'tool_use' && block.name === 'lookup'));
    assert.equal(requests.findLast(req => req.pathname.endsWith('/chat/completions')).body.max_tokens, 1024);
    const streamed = await fetch(address, { method: 'POST', headers: {
      'content-type': 'application/json', 'x-api-key': (await runtime.connection()).key },
      body: JSON.stringify({ ...body, stream: true }) });
    assert.equal(streamed.status, 200);
    const frames = await streamed.text();
    assert.match(frames, /event: message_start/);
    assert.match(frames, /managed-ok/);
    assert.match(frames, /event: message_stop/);
  });
  await t.test('migrated EAC gateway preserves mounted auth paths, signed requests and model catalog', async () => {
    const status = await api('/api/management/eac/status');
    assert.equal(status.body.available, true);
    assert.equal(status.body.authorized, false);
    assert.equal(status.body.setup.source, 'local');
    assert.equal((await plugin.provider.models(provider, { auth }))['fixture-eac-model'], undefined);
    const start = await api('/api/management/eac/login/start', {});
    assert.ok(start.body.link, JSON.stringify(start));
    assert.equal(new URL(start.body.url).pathname, '/remote/eac/auth/github/start');
    const poll = await api(`/api/management/eac/login/poll?link=${start.body.link}`);
    assert.equal(poll.body.status, 'ok');
    const rows = await until(async () => { const rows = await plugin.provider.models(provider, { auth }); return rows['fixture-eac-model'] ? rows : undefined; });
    const id = 'fixture-eac-model';
    const response = await call(id); assert.equal(response.status, 200); await response.text();
    const request = requests.findLast(req => req.pathname.endsWith('/chat/completions'));
    assert.equal(request.pathname, '/remote/eac/v1/chat/completions');
    assert.equal(request.headers['x-ofm-user'], 'fixture-eac');
    assert.equal(typeof request.headers['x-ofm-signature'], 'string');
    assert.ok(requests.some(req => req.pathname === '/remote/eac/auth/status'));
    assert.ok(requests.some(req => req.pathname === '/remote/eac/auth/poll'));
    assert.ok(requests.some(req => req.pathname === '/remote/eac/auth/ack'));
    assert.ok(requests.some(req => req.pathname === '/remote/eac/v1/models'));
    const menu = (await plugin.provider.models(provider, { auth }))['opencode/deepseek-v4-flash'];
    assert.deepEqual(menu.variants.none, { reasoningEffort: 'disabled' });
    const off = await call('opencode/deepseek-v4-flash', { reasoning_effort: 'none' });
    assert.equal(off.status, 200); await off.text();
    const offRequest = requests.findLast(req => req.pathname === '/remote/eac/v1/chat/completions');
    assert.equal(offRequest.body.reasoning_effort, 'none', 'native disabled off-patch reaches the signed gateway, rather than the default high level');
  });
  await t.test('stale Magpie catalog cannot re-enable a disabled model', async () => {
    const disabled = await api('/api/management/channels/rpc', { method: 'model.setDisabled', payload: { provider: 'buddy', modelId: 'fixture-free', disabled: true } });
    assert.equal(disabled.body.ok, true, JSON.stringify(disabled));
    const before = requests.filter(req => req.pathname.endsWith('/chat/completions')).length;
    const anthropic = await api('/v1/messages', { model: 'buddy/fixture-free', max_tokens: 1024,
      messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(anthropic.status, 404);
    const response = await call('buddy/fixture-free');
    assert.equal(response.status, 404);
    const stream = await response.text();
    assert.ok(!stream.includes('managed-ok'));
    assert.equal(requests.filter(req => req.pathname.endsWith('/chat/completions')).length, before);
    await api('/api/management/channels/rpc', { method: 'model.setDisabled', payload: { provider: 'buddy', modelId: 'fixture-free', disabled: false } });
  });
  await t.test('API key rotation does not require another Magpie login', async () => {
    const old = conn.key;
    const rotate = await api('/api/management/key/rotate', { confirm: true });
    assert.equal(rotate.status, 200);
    assert.notEqual((await runtime.connection()).key, old);
    const response = await call('buddy/fixture-free'); assert.equal(response.status, 200); await response.text();
  });
  await t.test('parallel starts share one child and close removes its service lock', async () => {
    const states = await Promise.all([runtime.ensure(), runtime.ensure()]);
    assert.equal(states[0].pid, states[1].pid);
    await runtime.close();
    assert.equal(fs.existsSync(path.join(dataDir, 'service.lock')), false);
    await assert.rejects(fetch(conn.base + '/models', { signal: AbortSignal.timeout(1000) }));
  });
  await t.test('dead child lock is recovered and existing account data survives restart', async () => {
    const state = await runtime.ensure();
    process.kill(state.pid, 'SIGKILL'); await runtime.exited;
    assert.equal(fs.existsSync(path.join(dataDir, 'service.lock')), true);
    const next = await runtime.ensure();
    assert.notEqual(next.pid, state.pid);
    assert.ok(JSON.parse(fs.readFileSync(path.join(dataDir, 'channel-credentials.json'))).BUDDY_FIXTURE);
    await runtime.close();
    assert.equal(fs.existsSync(path.join(dataDir, 'service.lock')), false);
  });
  await t.test('disabled unified maintenance survives restart and suppresses legacy standalone background probing', async () => {
    const conn = await runtime.connection();
    const liveApi = async (suffix, body) => { const res = await fetch(conn.base.replace(/\/v1$/, '') + suffix, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${conn.key}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); assert.equal(res.status, 200); return { body: await res.json() }; };
    const prior = (await liveApi('/api/management/magpie/upstream/status')).body.preferences;
    await liveApi('/api/management/magpie/upstream/settings', { ...prior, enabled: false, hideUnavailable: false });
    await liveApi('/api/management/settings', { streamRecovery: true });
    await runtime.close();
    const before = requests.filter(row => row.pathname.endsWith('/chat/completions')).length;
    await runtime.ensure();
    assert.ok((await runtime.command('models')).length > 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(requests.filter(row => row.pathname.endsWith('/chat/completions')).length, before);
  });
  await t.test('native settings and unified maintenance share probe switches, intervals and service pause', async () => {
    const request = async (suffix, body) => { const current = await runtime.connection(); const r = await fetch(current.base.replace(/\/v1$/, '') + '/api/management/' + suffix, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${current.key}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
    const send = async (suffix, body) => { const r = await request(suffix, body); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
    await send('settings', { standaloneProbe: true, probeIntervalMinutes: 37 });
    let state = await send('magpie/upstream/status');
    assert.equal(state.preferences.enabled, true);
    assert.equal(state.preferences.checkModels, false);
    assert.equal(state.preferences.healthIntervalMinutes, 37);
    await send('magpie/upstream/settings', { enabled: false, healthIntervalMinutes: 41 });
    let summary = await send('summary');
    assert.equal(summary.settings.standaloneProbe, false);
    assert.equal(summary.settings.probeIntervalMinutes, 41);
    // Saving an unrelated native setting must not discard the retained sub-option.
    await send('settings', { streamRecovery: false, standaloneProbe: false });
    state = await send('magpie/upstream/status');
    assert.equal(state.preferences.checkModels, false);
    await send('settings', { standaloneProbe: true });
    await send('settings', { enabled: false });
    assert.equal((await send('magpie/models')).healthPreferences.automatic, false);
    assert.equal((await request('magpie/probe', {})).status, 503);
    await send('settings', { enabled: true, standaloneProbe: false });
    state = await send('magpie/upstream/status');
    assert.equal(state.preferences.checkModels, false);
    // The native probe button must publish the managed result, not a second
    // legacy availability snapshot. Manual probing remains usable when auto is off.
    assert.equal((await request('models/refresh',{probe:true})).status,400,'implicit bulk inference is rejected');
    const selected=await request('magpie/probe',{model:'buddy/fixture-free'});assert.equal(selected.status,202);
    await until(async()=>(await runtime.command('health'))['buddy/fixture-free']?.state==='healthy');
    const probed = await send('models/refresh', { probe: false });
    const managed = await send('magpie/models');
    assert.ok(Object.values(managed.health).some(row => row.state === 'healthy'));
    for (const row of probed.catalog) {
      if (managed.health[row.id]?.state === 'rate_limited') assert.equal(row.availability, 'throttled');
      if (managed.health[row.id]?.state === 'healthy') assert.equal(row.availability, 'available');
    }
    summary = await send('summary');
    assert.ok(summary.catalog.every(row => typeof row.healthState === 'string'));
    await runtime.close(); await runtime.ensure();
    assert.equal((await send('summary')).settings.standaloneProbe, false);
    assert.equal((await send('magpie/upstream/status')).preferences.healthIntervalMinutes, 41);
  });
  await t.test('real OFM gateway fails over only to configured free OFM model and then reuses it without probes', async()=>{
    const current=await runtime.connection();
    const apiNow=async(suffix,body)=>{const response=await fetch(current.base.replace(/\/v1$/,'')+'/api/management/magpie/'+suffix,{method:body?'POST':'GET',headers:{authorization:`Bearer ${current.key}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()};};
    const saved=await apiNow('upstream/settings',{failoverEnabled:true,fallbackModels:['fixture/free'],maxAttempts:3,hideUnavailable:false});assert.equal(saved.status,200,JSON.stringify(saved));
    assert.equal((await apiNow('upstream/settings',{fallbackModels:['api/open_router/openrouter/free']})).status,400,'no unverified/paid aggregate fallback');
    const liveLoader=await plugin.auth.loader(async()=>auth);
    const liveCall=model=>liveLoader.fetch(`${current.base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:'hi'}],stream:true})});
    rejectAnonymous=true;
    try {
      const before=requests.filter(row=>row.pathname.endsWith('/chat/completions')).length;
      const response=await liveCall('mimo-v2.6-flash-free');assert.equal(response.status,200);assert.match(await response.text(),/managed-ok/);
      const summary=await apiNow('models');assert.equal(summary.body.lastRoute.served,'fixture/free');assert.equal(summary.body.lastRoute.attempts,2);
      const sent=requests.slice().filter(row=>row.pathname.endsWith('/chat/completions')).slice(before);assert.deepEqual(sent.map(row=>row.body.model),['mimo-v2.6-flash-free','fixture/free']);
      const next=await liveCall('mimo-v2.6-flash-free');assert.equal(next.status,200);await next.text();
      const last=await apiNow('models');assert.equal(last.body.lastRoute.served,'fixture/free');assert.equal(last.body.lastRoute.attempts,1);
    } finally {rejectAnonymous=false;}
  });
  await t.test('uninstall disposes the live service and removes all registered plugin data', async () => {
    await runtime.ensure();
    const current = await runtime.connection();
    await plugin.lifecycle.dispose();
    await uninstall(input, { managed: options });
    assert.equal(fs.existsSync(dataDir), false);
    assert.equal(fs.existsSync(path.join(dir, 'eac-failure-data')), false, fs.existsSync(path.join(dir, 'eac-failure-data')) ? JSON.stringify(fs.readdirSync(path.join(dir, 'eac-failure-data'))) : '');
    assert.equal(fs.existsSync(path.join(dir, 'our-free-model-owned.json')), false);
    assert.equal(fs.existsSync(path.join(eacSourceDir, 'src/vault.js')), true);
    await assert.rejects(runtime.ensure(), /卸载/);
    await assert.rejects(fetch(current.base + '/models', { signal: AbortSignal.timeout(1000) }));
  });
});
