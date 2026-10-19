import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createModelHealth, healthOptions } from '../src/model-health.mjs';

async function fixture(t, handler, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofm-health-'));
  const keyFile = path.join(dir, 'settings.json');
  fs.writeFileSync(keyFile, JSON.stringify({ forwardKey: 'test-only-key' }));
  let rows = [{ id: 'test' }];
  let now = 10000;
  let active = 0, peak = 0, requests = [];
  const server = http.createServer(async (req, res) => {
    active++; peak = Math.max(peak, active);
    res.once('close', () => active--);
    let raw = ''; for await (const part of req) raw += part;
    const body = JSON.parse(raw); requests.push(body);
    assert.equal(req.headers.authorization, 'Bearer test-only-key');
    assert.equal(body.stream, true);
    await handler(body, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const service = { keyFile, url: `http://127.0.0.1:${server.address().port}`, ready: Promise.resolve(), runtime: { publicModelRows: () => rows } };
  const health = createModelHealth(service, { intervalMs: 1000, cooldownMs: 1000, timeoutMs: 500, tools: false, automatic: true, onDemand: false, ...options }, { now: () => now });
  t.after(async () => { await health.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true }); });
  return { health, requests, setRows(value) { rows = value; }, advance(ms) { now += ms; }, peak: () => peak };
}
const success = (res, message = { content: 'OK' }) => {
  res.setHeader('content-type', 'text/event-stream');
  res.end(`data: ${JSON.stringify({ choices: [{ index: 0, delta: message, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`);
};
test('real HTTP/SSE inference, expiry, deduplication and manual removal', async t => {
  const f = await fixture(t, (_, res) => success(res));
  assert.equal(f.health.available('test'), false);
  await Promise.all([f.health.schedule(), f.health.schedule()]);
  assert.equal(f.requests.length, 1);
  assert.equal(f.health.available('test'), true);
  f.advance(1001); assert.equal(f.health.available('test'), false);
  await f.health.schedule(); assert.equal(f.health.available('test'), true);
  f.setRows([]); await f.health.schedule(); assert.deepEqual(f.health.snapshot(), {});
});
test('changing the shared interval reschedules healthy models without shortening rate-limit cooldowns', async t => {
  let limited = false;
  const f = await fixture(t, (_, res) => { if (limited) { res.writeHead(429, { 'retry-after': '60' }); res.end('{}'); } else success(res); });
  await f.health.schedule();
  f.health.configure({ intervalMs: 5000 });
  f.advance(2000);
  assert.equal(f.health.available('test'), true);
  f.health.configure({ intervalMs: 1000 });
  assert.equal(f.health.available('test'), false);
  limited = true; await f.health.schedule();
  const before = f.health.snapshot().test.nextAt;
  f.health.configure({ intervalMs: 2000 });
  assert.equal(f.health.snapshot().test.nextAt, before);
});
for (const status of [401, 403, 429, 500]) test(`HTTP ${status} hides models, cools down and recovers`, async t => {
  let failing = true;
  const f = await fixture(t, (_, res) => { if (failing) { res.writeHead(status, { 'retry-after': '3' }); res.end('{}'); } else success(res); });
  await f.health.schedule(); assert.equal(f.health.available('test'), false);
  await f.health.schedule(); assert.equal(f.requests.length, 1);
  failing = false; f.advance(3001); await f.health.schedule(); assert.equal(f.health.available('test'), true);
});
test('empty/truncated SSE and timeouts never pass', async t => {
  for (const handler of [(_, res) => success(res, { content: '' }), (_, res) => { res.setHeader('content-type', 'text/event-stream'); res.end('data: {}\n\n'); }, () => {}]) {
    const f = await fixture(t, handler, { timeoutMs: 50 });
    await f.health.schedule(); assert.equal(f.health.available('test'), false);
  }
});
test('tool arguments, call IDs and result roundtrip are verified over SSE', async t => {
  const f = await fixture(t, (body, res) => {
    if (body.tool_choice?.type === 'function') success(res, { tool_calls: [{ index: 0, id: 'call_health', type: 'function', function: { name: 'ofm_health_check', arguments: '{}' } }] });
    else success(res);
  }, { tools: true });
  await f.health.schedule();
  assert.equal(f.health.snapshot().test.tools, true);
  assert.equal(f.requests[2].messages.at(-1).tool_call_id, 'call_health');
});
test('unverified tools are not advertised and bounded concurrency handles a catalog', async t => {
  const f = await fixture(t, (_, res) => new Promise(resolve => setTimeout(() => { success(res); resolve(); }, 10)), { tools: true, concurrency: 2 });
  f.setRows(Array.from({ length: 6 }, (_, i) => ({ id: `model${i}` })));
  await f.health.schedule(); assert.ok(f.peak() <= 2);
  assert.equal(Object.keys(f.health.snapshot()).length, 6);
  assert.ok(Object.values(f.health.snapshot()).every(s => s.state === 'healthy' && !s.tools));
});
test('credential change invalidates in-flight probe', async t => {
  let finish;
  const f = await fixture(t, (_, res) => new Promise(resolve => { finish = () => { success(res); resolve(); }; }));
  const pending = f.health.schedule();
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  f.health.invalidate('test'); finish(); await pending;
  assert.equal(f.health.available('test'), false);
});
test('health settings reject dangerous limits', () => {
  assert.throws(() => healthOptions({ concurrency: 99 }));
  assert.throws(() => healthOptions({ tools: 'yes' }));
});

test('live upstream refusal removes a recently healthy model immediately', async t => {
  const f = await fixture(t, (_, res) => success(res));
  await f.health.schedule(); assert.equal(f.health.available('test'), true);
  f.health.reject('test', 403); assert.equal(f.health.available('test'), false);
  await f.health.schedule(); assert.equal(f.requests.length, 1);
  f.advance(1001); await f.health.schedule(); assert.equal(f.health.available('test'), true);
});

test('newly saved models jump ahead of a running background queue and expose probing state', async t => {
  let release;
  const f = await fixture(t, (body, res) => body.model === 'slow'
    ? new Promise(resolve => { release = () => { success(res); resolve(); }; }) : success(res), { concurrency: 1 });
  f.setRows([{ id: 'slow' }, { id: 'background' }]);
  const run = f.health.schedule();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.health.snapshot().slow.state, 'probing');
  f.setRows([{ id: 'slow' }, { id: 'background' }, { id: 'api/agnes/agnes-2.5-flash' }]);
  f.health.schedule(['api/agnes/agnes-2.5-flash']); release(); await run;
  assert.deepEqual(f.requests.map(row => row.model), ['slow', 'api/agnes/agnes-2.5-flash', 'background']);
  assert.equal(f.health.available('api/agnes/agnes-2.5-flash'), true);
});

test('disabled automatic maintenance makes no startup or discovery probe, manual checks still work', async t => {
  const f = await fixture(t, (_, res) => success(res), { automatic: false });
  f.health.start();
  await new Promise(resolve => setImmediate(resolve));
  await f.health.schedule([], { automatic: true });
  assert.equal(f.requests.length, 0);
  assert.equal(f.health.visible('test'), true);
  assert.equal(f.health.available('test'), false);
  await f.health.schedule();
  assert.equal(f.requests.length, 1);
  f.advance(1001);
  assert.equal(f.health.visible('test'), true, 'expiry does not remove a model by default');
  f.health.configure({ hideUnavailable: true });
  assert.equal(f.health.visible('test'), false);
});

test('rate limits stay visible, survive disabling automation, and manual priority does not bypass Retry-After', async t => {
  const f = await fixture(t, (_, res) => { res.writeHead(429, { 'retry-after': '30' }); res.end('{}'); });
  await f.health.schedule();
  assert.equal(f.health.visible('test'), true);
  assert.equal(f.health.retryAfter('test'), 30);
  f.health.configure({ automatic: false });
  await f.health.schedule(['test']);
  assert.equal(f.requests.length, 1);
  assert.equal(f.health.retryAfter('test'), 30);
  f.advance(30001);
  await f.health.schedule(['test']);
  assert.equal(f.requests.length, 2);
});

test('turning off automatic checks aborts an in-flight probe and prevents queued requests', async t => {
  const f = await fixture(t, () => {});
  f.setRows([{ id: 'a' }, { id: 'b' }]);
  const pending = f.health.schedule([], { automatic: true });
  while (!f.requests.length) await new Promise(resolve => setImmediate(resolve));
  f.health.configure({ automatic: false });
  await pending;
  assert.equal(f.requests.length, 1);
  assert.equal(f.health.preferences().automatic, false);
  assert.ok(!Object.values(f.health.snapshot()).some(s => s.state === 'healthy'));
});

test('saving selected models with automation off probes only the selected models', async t => {
  const f = await fixture(t, (_, res) => success(res), { automatic: false });
  f.setRows([{ id: 'selected' }, { id: 'unrelated' }]);
  await f.health.schedule(['selected']);
  assert.deepEqual(f.requests.map(row => row.model), ['selected']);
  assert.equal(f.health.snapshot().unrelated, undefined);
});

test('health diagnoses refusal classes and never persists provider messages or secrets', async t => {
  for (const [code, expected] of [['REGION_BLOCKED','region_blocked'], ['LANE_LOCKED','lane_locked'], ['AUTHORIZATION_REQUIRED','authorization_required'], ['INVALID_CREDENTIAL','forbidden']]) {
    const f = await fixture(t, (_,res)=>{res.writeHead(403);res.end(JSON.stringify({error:{code,message:'PRIVATE_KEY_DO_NOT_STORE'}}));});
    await f.health.schedule(); const state=f.health.snapshot().test;
    assert.equal(state.state,expected); assert.doesNotMatch(JSON.stringify(state),/PRIVATE_KEY/);
  }
});
test('bounded refusal parsing handles HTML, oversized bodies and inherited discriminator names', async () => {
  const {healthFailure}=await import('../src/model-health.mjs');
  for(const body of ['<html>Forbidden</html>', 'x'.repeat(20000),JSON.stringify({error:{code:'constructor'}})]) {
    const value=await healthFailure(new Response(body,{status:403}));
    assert.equal(value.state,'forbidden');
  }
  assert.equal((await healthFailure(Response.json({error:{type:'RegionError'}},{status:403}))).state,'region_blocked');
  assert.equal((await healthFailure(Response.json({error:{}},{status:401}))).state,'unauthorized');
});
