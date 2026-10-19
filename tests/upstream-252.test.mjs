import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { comboId } from '../vendor/ofm/src/combos.js';
import { carryFailure, forwardFailure } from '../vendor/ofm/src/failure.js';
import { normalizeLevel } from '../vendor/ofm/src/effort.js';

test('Chinese and mixed combo names remain stable and distinct after serialization', () => {
  const names = ['免费组合', '免费组合二', 'Fast 免费组合'];
  const ids = names.map(comboId);
  assert.equal(new Set(ids).size, names.length);
  for (let i = 0; i < names.length; i++) {
    assert.match(ids[i], /^combo:[a-z0-9-]+$/);
    assert.equal(comboId(JSON.parse(JSON.stringify(names[i]))), ids[i]);
  }
  assert.equal(comboId('My Fast Chain'), 'combo:my-fast-chain');
});

test('upstream classified failures retain quota status and retry metadata', () => {
  const failure = carryFailure({ message: 'quota', code: 'QUOTA_EXHAUSTED', status: 429, providerRetryAfterMs: 3000, privateToken: 'not-forwarded' });
  assert.equal(Object.hasOwn(failure, 'privateToken'), false);
  const wire = forwardFailure({ failure });
  assert.equal(wire.status, 429);
  assert.equal(wire.error.type, 'insufficient_quota');
  assert.equal(wire.retryAfterMs, 3000);
  assert.equal(normalizeLevel(' HIGH '), 'deep');
  assert.equal(normalizeLevel('unknown'), undefined);
});

test('denied network-interface discovery does not break local console summaries', () => {
  const source = fs.readFileSync(new URL('../vendor/ofm/packages/standalone/service.mjs', import.meta.url), 'utf8');
  const expression = source.match(/rankLanAddresses\((\(\(\) => \{ try \{ return os\.networkInterfaces\(\) \} catch \{ return \{\} \} \}\)\(\))\)/)?.[1];
  assert.ok(expression, 'vendored service must guard optional interface enumeration');
  const value = vm.runInNewContext(expression, { os: { networkInterfaces() { throw new Error('denied'); } } });
  assert.deepEqual(Object.keys(value), []);
});
