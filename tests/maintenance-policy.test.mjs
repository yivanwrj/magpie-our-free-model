import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRuntimeStores, createModelRuntime } from '../vendor/ofm/src/core/runtime.js';

test('managed health ignores legacy unavailable snapshots but preserves explicit model hiding', t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofm-maintenance-'));
  const stores = createRuntimeStores({ dataDir });
  stores.catalogStore.update({ entries: ['deepseek-v4.1-flash-free', 'space-bunny-free'] });
  stores.availability.update({ results: { 'deepseek-v4.1-flash-free': { state: 'unavailable' } } });
  const core = createModelRuntime({ ...stores, healthManaged: true });
  t.after(() => { core.dispose(); stores.dispose(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  assert.ok(core.publicModelRows().some(row => row.id === 'deepseek-v4.1-flash-free'));
  stores.settings.update({ hiddenModelIds: ['deepseek-v4.1-flash-free'] });
  assert.ok(!core.publicModelRows().some(row => row.id === 'deepseek-v4.1-flash-free'));
});
