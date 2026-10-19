import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { inspectService, stopManagedService, lockMessage } from '../src/service-diagnostics.mjs';
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ofm-diagnostic-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'service.lock');
  const write = value => fs.writeFile(file, JSON.stringify(value));
  await write({ product: 'our-free-model-standalone', pid: 1234, token: 'private-token' });
  return { dir, file, write };
}
test('diagnosis distinguishes missing, dead and owned live service without exposing lock tokens', async t => {
  const f = await fixture(t);
  const dead = await inspectService(f.dir, { checkPid: () => 'exited' });
  assert.equal(dead.status, 'exited'); assert.doesNotMatch(JSON.stringify(dead), /private-token/);
  await stopManagedService(f.dir, { checkPid: () => 'exited', kill() { throw new Error('must not signal dead process'); } });
  await fs.access(f.file);
  const live = await inspectService(f.dir, { checkPid: () => 'running', commandOf: async () => 'node /path with spaces/src/managed-runner.mjs' });
  assert.equal(live.managed, true); assert.match(lockMessage(live), /PID 1234/);
  await fs.unlink(f.file); assert.equal((await inspectService(f.dir)).status, 'missing');
});
test('stop only signals a confirmed unchanged Magpie runner and never deletes configuration', async t => {
  const f = await fixture(t); let stopped = false, signals = [];
  await fs.writeFile(path.join(f.dir, 'settings.json'), 'keep-account-data');
  const result = await stopManagedService(f.dir, { checkPid: () => stopped ? 'exited' : 'running', commandOf: async () => 'node /plugin/src/managed-runner.mjs', kill(pid, signal) { signals.push([pid, signal]); stopped = true; } });
  assert.equal(result.status, 'stopped'); assert.deepEqual(signals, [[1234, 'SIGTERM']]);
  assert.equal(await fs.readFile(path.join(f.dir, 'settings.json'), 'utf8'), 'keep-account-data');
  await fs.access(f.file);
});
test('foreign owners and changing service locks are never signalled', async t => {
  const f = await fixture(t); let kills = 0;
  const base = { checkPid: () => 'running', kill() { kills++; } };
  await assert.rejects(stopManagedService(f.dir, { ...base, commandOf: async () => 'node /some/other-app.mjs' }), /无法确认/);
  let reads = 0;
  await assert.rejects(stopManagedService(f.dir, { ...base, commandOf: async () => { if (++reads === 1) await f.write({ product: 'our-free-model-standalone', pid: 1235, token: 'new' }); return 'node /plugin/src/managed-runner.mjs'; } }), /归属已变化/);
  assert.equal(kills, 0);
});
