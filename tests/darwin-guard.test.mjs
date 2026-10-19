import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

test('Darwin process guard is exclusive, releases, and permits a new owner', async t => {
  const source = fs.readFileSync(new URL('../vendor/ofm/packages/standalone/service.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function acquireProcessGuard('), end = source.indexOf('\nasync function acquireServiceLock(', start);
  assert.ok(start >= 0 && end > start);
  const acquire = vm.runInNewContext(source.slice(start, end) + '; acquireProcessGuard', { fs, net, crypto, process: { platform: 'darwin' } });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofm-darwin-guard-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const first = await acquire(dir); assert.equal(typeof first, 'function');
  try { await assert.rejects(acquire(dir), error => error.code === 'EEXIST'); } finally { await first(); }
  const next = await acquire(dir); await next();
});
