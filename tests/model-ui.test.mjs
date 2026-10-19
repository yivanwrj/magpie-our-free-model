import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const script = await fs.readFile(new URL('../assets/models.js', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };
async function page(errorStatus) {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { value: '', checked: false, textContent: '', hidden: false, options: [], append(child) { this.options.push(child); if (!this.value) this.value = child.value; }, replaceChildren() {} }); return nodes.get(id); };
  const saved = [];
  const controller = new AbortController();
  let interval = 0;
  const cleared = [];
  vm.runInNewContext(script.replace('export function', 'function') + '\nmountModels({ querySelector: selector => document.getElementById(selector.slice(1)) }, { signal });', {
    signal: controller.signal,
    document: { getElementById: node, createElement: () => ({ append() {} }) }, setInterval() { return ++interval; }, clearInterval(id) { cleared.push(id); },
    fetch: async (url, options) => {
      let value;
      if (url.endsWith('/models')) value = { providers: [{ id: 'agnes', name: 'Agnes', models: [], enabled: false }], catalog: [], health: {}, startupWarnings: ['原始账号渠道包下载失败；匿名模型与官方 API 仍可配置'] };
      else if (url.endsWith('/provider')) { saved.push(JSON.parse(options.body)); value = errorStatus ? { error: '请填写自己的 API Key' } : { ok: true }; }
      else value = { preferences: { enabled: true, autoBuild: true, intervalHours: 24 }, status: 'idle' };
      return { ok: !(url.endsWith('/provider') && errorStatus), status: errorStatus ?? 200, json: async () => value };
    },
  });
  await flush(); return { node, saved, controller, cleared };
}

test('account bundle warnings remain separate from successful Agnes model save and periodic refresh', async () => {
  const { node, saved } = await page();
  assert.equal(node('status').textContent, '');
  node('models').value = 'agnes-2.5-flash'; node('enabled').checked = true; node('key').value = 'fixture';
  node('provider').onsubmit({ preventDefault() {} }); await flush();
  assert.deepEqual(saved[0].models, ['agnes-2.5-flash']);
  assert.match(node('status').textContent, /已保存/);
  assert.match(node('startupWarnings').textContent, /账号渠道包下载失败/);
  assert.equal(node('startupWarnings').hidden, false);
  node('refresh').onclick(); await flush(); assert.match(node('status').textContent, /已保存/);
});

test('API validation errors remain visible and do not misleadingly request console login', async () => {
  const { node } = await page(400);
  node('models').value = 'agnes-2.5-flash';
  node('provider').onsubmit({ preventDefault() {} }); await flush();
  assert.equal(node('status').textContent, '请填写自己的 API Key');
  assert.match(node('startupWarnings').textContent, /账号渠道包下载失败/);
});

test('leaving a native management page clears both pollers', async () => {
  const { controller, cleared } = await page();
  controller.abort();
  assert.deepEqual(cleared, [1, 2]);
});
