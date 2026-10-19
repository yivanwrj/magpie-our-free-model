import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { freeOpenRouterModels, discoverOpenRouterFree } from '../src/openrouter-free.mjs';
import { postAggregateStreamed } from '../vendor/ofm/src/aggregate.js';
import { PROVIDERS } from '../vendor/ofm/src/providers/index.js';

const free = (id, extra = {}) => ({ id, pricing: { prompt: '0', completion: '0', request: '0' }, ...extra });
const config = (baseUrl = 'https://openrouter.ai/api/v1') => ({ enabled: true, providers: { open_router: { enabled: true, apiKey: 'fixture-key', baseUrl, freeOnly: true, models: ['openrouter/free'] } } });

test('free router, free variants and zero-price offers are identified from official metadata', () => {
  const rows = freeOpenRouterModels([
    { id: 'openrouter/free' }, free('vendor/model:free'), free('vendor/alpha', { supported_parameters: ['tools'], context_length: 64000 }),
  ]);
  assert.deepEqual(rows.map(row => row.kind), ['free-router', 'free', 'zero-price-offer']);
  assert.equal(rows[2].toolsDeclared, true);
});
test('paid, unknown, expired and non-text entries never become free offers', () => {
  const rows = freeOpenRouterModels([
    { id: 'vendor/free-in-name' }, free('vendor/fake:free', { pricing: { prompt: '0.1', completion: '0' } }),
    free('vendor/paid-image', { pricing: { prompt: '0', completion: '0', image: '0.01' } }),
    free('vendor/unknown', { pricing: { prompt: '0', completion: '0', request: null } }),
    free('vendor/expired', { expiration_date: '2020-01-01' }), free('vendor/invalid-date', { expiration_date: 'unknown' }),
    free('vendor/image', { architecture: { output_modalities: ['image'] } }),
    free('vendor/tiny-positive', { pricing: { prompt: '1e-999', completion: '0' } }),
    { id: 'openrouter/free', pricing: { prompt: '1', completion: '0' } },
  ]);
  assert.deepEqual(rows, []);
});
test('discovery uses saved credentials and never exposes echoed upstream errors', async () => {
  let call;
  const rows = await discoverOpenRouterFree(config(), { fetcher: async (url, init) => { call = { url, init }; return Response.json({ data: [free('vendor/offer')] }); } });
  assert.ok(rows.some(row => row.id === 'vendor/offer'));
  assert.equal(call.url, 'https://openrouter.ai/api/v1/models');
  assert.equal(call.init.headers.authorization, 'Bearer fixture-key');
  assert.equal(call.init.redirect, 'error');
  await assert.rejects(discoverOpenRouterFree(config(), { fetcher: async () => Response.json({ error: 'fixture-key' }, { status: 401 }) }), error => !error.message.includes('fixture-key'));
});
test('pricing increase removes an offer on the next discovery', () => {
  assert.equal(freeOpenRouterModels([free('vendor/offer')]).length, 1);
  assert.equal(freeOpenRouterModels([free('vendor/offer', { pricing: { prompt: '0', completion: '0.01' } })]).length, 0);
});
test('production aggregate poster sets a non-overridable zero-price ceiling', async t => {
  const bodies = [];
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const part of req) raw += part;
    bodies.push(JSON.parse(raw));
    res.setHeader('content-type', 'text/event-stream');
    res.end('data: {"choices":[{"delta":{"content":"OK"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const cfg = config(`http://127.0.0.1:${server.address().port}/v1`);
  for (const stringBody of [false, true]) {
    const body = { model: 'api/open_router/vendor/offer', messages: [{ role: 'user', content: 'synthetic' }], provider: { max_price: { prompt: 99 }, only: ['fixture'] } };
    await postAggregateStreamed({ config: cfg, providerId: 'open_router', modelId: 'vendor/offer', body: stringBody ? JSON.stringify(body) : body, onData() {} });
  }
  assert.equal(bodies.length, 2);
  for (const body of bodies) { assert.equal(body.model, 'vendor/offer'); assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0, request: 0 }); assert.deepEqual(body.provider.only, ['fixture']); }
});
test('removed duplicate OpenCode aggregate row and excluded recommendation navigation stay absent', () => {
  assert.ok(!PROVIDERS.some(row => row.id === 'opencode'));
  const dir = new URL('../vendor/ofm/packages/standalone/web/', import.meta.url);
  for (const name of fs.readdirSync(dir).filter(name => /^channels-.*\.js$/.test(name))) {
    const source = fs.readFileSync(new URL(name, dir), 'utf8');
    assert.ok(!source.includes('["picks",a("nav.tab.picks"),null]'));
    assert.ok(!source.includes(',"picks"]'));
  }
});
