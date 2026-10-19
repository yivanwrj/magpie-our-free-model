import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { consoleDataDir, openExistingConsole } from '../src/console-launcher.mjs';

async function setup(t) {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ofm-launch-'));
  const dataDir = path.join(configDir, 'our-free-model');
  await fs.mkdir(dataDir);
  let key = 'fixture-current-key';
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/management/summary' && req.headers.authorization === `Bearer ${key}`) return res.end(JSON.stringify({ product: 'our-free-model-standalone' }));
    if (req.url === '/api/management/session' && JSON.parse(body).key === key) { res.setHeader('set-cookie', 'session=fixture; Path=/api/management; HttpOnly; SameSite=Strict'); return res.end('{}'); }
    res.writeHead(401); res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const save = () => fs.writeFile(path.join(dataDir, 'settings.json'), JSON.stringify({ standalonePort: server.address().port, forwardKey: key }));
  await save();
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await fs.rm(configDir, { recursive: true, force: true }); });
  return { configDir, dataDir, save, server, rotate() { key = 'fixture-rotated-key'; return save(); } };
}
test('console launcher can reopen after login and key rotation without changing credentials', async t => {
  const f = await setup(t);
  assert.equal(await consoleDataDir({ configDir: f.configDir }), f.dataDir);
  const before = await fs.readFile(path.join(f.dataDir, 'settings.json'), 'utf8');
  const first = await openExistingConsole({ configDir: f.configDir });
  t.after(() => first.close());
  assert.ok(!first.url.includes('fixture-current-key'));
  const opened = await fetch(first.url, { redirect: 'manual' });
  assert.equal(opened.status, 303); assert.match(opened.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await fetch(first.url, { redirect: 'manual' })).status, 401);
  assert.equal(await fs.readFile(path.join(f.dataDir, 'settings.json'), 'utf8'), before);
  await first.close();
  await f.rotate();
  const second = await openExistingConsole({ dataDir: f.dataDir });
  t.after(() => second.close());
  assert.notEqual(second.url, first.url);
  assert.equal((await fetch(second.url, { redirect: 'manual' })).status, 303);
  await second.close();
  // Closing the launcher leaves the running OFM management service intact.
  assert.equal((await fetch(`http://127.0.0.1:${f.server.address().port}/api/management/summary`, { headers: { authorization: 'Bearer fixture-rotated-key' } })).status, 200);
});
test('registered custom data directories are resolved and ambiguous roots require a choice', async t => {
  const f = await setup(t);
  const custom = path.join(f.configDir, 'custom');
  await fs.mkdir(custom); await fs.copyFile(path.join(f.dataDir, 'settings.json'), path.join(custom, 'settings.json'));
  await fs.writeFile(path.join(f.configDir, 'our-free-model-owned.json'), JSON.stringify({ product: 'magpie-our-free-model', roots: [{ path: custom }] }));
  await assert.rejects(consoleDataDir({ configDir: f.configDir }), /多份/);
  await fs.rm(f.dataDir, { recursive: true });
  assert.equal(await consoleDataDir({ configDir: f.configDir }), custom);
});
test('missing or offline service reports an actionable error without exposing secrets', async t => {
  const f = await setup(t);
  const file = path.join(f.dataDir, 'settings.json');
  await fs.writeFile(file, JSON.stringify({ standalonePort: 0, forwardKey: 'private-test' }));
  await assert.rejects(openExistingConsole({ dataDir: f.dataDir }), /尚未完成启动/);
  await fs.writeFile(file, JSON.stringify({ standalonePort: 1, forwardKey: 'private-test' }));
  await assert.rejects(openExistingConsole({ dataDir: f.dataDir }), error => !error.message.includes('private-test') && /未运行/.test(error.message));
});
