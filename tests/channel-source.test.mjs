import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { CHANNEL_FILES, CHANNEL_COMMIT, installChannelSource, channelBusinessUrl, importChannelBundle } from '../src/channel-source.mjs';

async function fixture(t) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ofm-channels-test-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const contents = Object.fromEntries(CHANNEL_FILES.map(file => [file.path, Buffer.from(`fixture ${file.path}`)]));
  const requests = [];
  const dependencies = { files: CHANNEL_FILES.map(file => ({ ...file, bytes: contents[file.path].length,
    sha256: crypto.createHash('sha256').update(contents[file.path]).digest('hex') })),
    async fetch(url, options) {
      requests.push({ url, options });
      const file = CHANNEL_FILES.find(file => url.endsWith(CHANNEL_COMMIT + '/' + file.path));
      return new Response(contents[file.path]);
    } };
  return { dataDir, contents, dependencies, requests };
}

test('original channel bundle: pinned origin, unchanged complete files, private cache and offline reuse', async t => {
  const f = await fixture(t);
  const [first, second] = await Promise.all([installChannelSource(f.dataDir, f.dependencies), installChannelSource(f.dataDir, f.dependencies)]);
  assert.equal(first, second); assert.equal(f.requests.length, CHANNEL_FILES.length);
  for (const { url, options } of f.requests) {
    assert.ok(url.startsWith(`https://raw.githubusercontent.com/Ebony-Vinyl/dsh-our-free-model/${CHANNEL_COMMIT}/`));
    assert.equal(options.redirect, 'error');
  }
  for (const file of CHANNEL_FILES) assert.deepEqual(await fs.readFile(path.join(first, file.path)), f.contents[file.path]);
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(first)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(path.join(first, CHANNEL_FILES[1].path))).mode & 0o777, 0o600);
  }
  const url = await channelBusinessUrl({ dataDir: f.dataDir }, { ...f.dependencies, fetch() { throw new Error('offline'); } });
  assert.ok(url.endsWith('/packages/standalone/channels/business.mjs'));
});

test('channel cache corruption is repaired; wrong size/hash never produces a loadable module', async t => {
  const f = await fixture(t);
  const directory = await installChannelSource(f.dataDir, f.dependencies);
  await fs.writeFile(path.join(directory, CHANNEL_FILES[1].path), 'tampered');
  await channelBusinessUrl({ dataDir: f.dataDir }, f.dependencies);
  assert.deepEqual(await fs.readFile(path.join(directory, CHANNEL_FILES[1].path)), f.contents[CHANNEL_FILES[1].path]);
  await fs.rm(directory, { recursive: true });
  await assert.rejects(channelBusinessUrl({ dataDir: f.dataDir }, { ...f.dependencies, fetch: async () => new Response('incorrect') }), /SHA-256|大小/);
  assert.deepEqual(await fs.readdir(path.join(f.dataDir, 'runtime')), []);
});

test('channel source rejects symlinked cache parents and does not disclose download errors', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  const outside = path.join(f.dataDir, 'outside'); await fs.mkdir(outside);
  await fs.symlink(outside, path.join(f.dataDir, 'runtime'));
  await assert.rejects(channelBusinessUrl({ dataDir: f.dataDir }, f.dependencies), /符号链接/);
  assert.deepEqual(await fs.readdir(outside), []);
  await fs.unlink(path.join(f.dataDir, 'runtime'));
  const warnings = [];
  assert.equal(await channelBusinessUrl({ dataDir: f.dataDir }, { ...f.dependencies, onWarning: message => warnings.push(message), fetch() { throw new Error('secret-value'); } }), undefined);
  assert.equal(warnings.length, 1);
  assert.doesNotMatch(warnings[0], /secret-value/);
});

test('interrupted channel download retries and validates bytes before use', async t => {
  const f = await fixture(t);
  let failed = false;
  const directory = await installChannelSource(f.dataDir, { ...f.dependencies, async fetch(url, options) {
    if (!failed) { failed = true; return new Response(new ReadableStream({ start(controller) { controller.error(new Error('interrupted')); } })); }
    return f.dependencies.fetch(url, options);
  } });
  assert.equal(failed, true);
  assert.deepEqual(await fs.readFile(path.join(directory, CHANNEL_FILES[1].path)), f.contents[CHANNEL_FILES[1].path]);
});


test('transport fallback uses immutable CDN paths and still validates every byte', async t => {
  const f = await fixture(t); const seen = [];
  const directory = await installChannelSource(f.dataDir, { ...f.dependencies, async fetch(url, options) {
    seen.push(url);
    if (url.startsWith('https://raw.githubusercontent.com/')) throw new Error('raw unavailable');
    assert.ok(url.startsWith(`https://cdn.jsdelivr.net/gh/Ebony-Vinyl/dsh-our-free-model@${CHANNEL_COMMIT}/`));
    return f.dependencies.fetch(url, options);
  } });
  assert.ok(seen.some(url => url.includes('cdn.jsdelivr.net')));
  assert.deepEqual(await fs.readFile(path.join(directory, CHANNEL_FILES[1].path)), f.contents[CHANNEL_FILES[1].path]);
});

test('local business import constructs a complete verified cache and rejects modified input', async t => {
  const f = await fixture(t);
  const business = CHANNEL_FILES[1].path;
  const directory = await importChannelBundle(f.dataDir, f.contents[business], { files: f.dependencies.files, readBundled: async file => f.contents[file.path] });
  for (const file of CHANNEL_FILES) assert.deepEqual(await fs.readFile(path.join(directory, file.path)), f.contents[file.path]);
  await assert.rejects(importChannelBundle(f.dataDir, Buffer.from('tampered'), { files: f.dependencies.files }), /大小或 SHA-256/);
  assert.deepEqual(await fs.readFile(path.join(directory, business)), f.contents[business]);
  assert.equal(await installChannelSource(f.dataDir, { files: f.dependencies.files, fetch() { throw new Error('offline'); } }), directory);
});

test('unchanged bundled dependencies are reused so only the original business module needs network', async t => {
  const f = await fixture(t); const business = CHANNEL_FILES[1].path;
  const files = CHANNEL_FILES.map(file => file.path === business ? f.dependencies.files.find(row => row.path === business) : file);
  let calls = 0;
  const directory = await installChannelSource(f.dataDir, { files, async fetch(url) {
    calls++; assert.ok(url.endsWith('/' + business)); return new Response(f.contents[business]);
  } });
  assert.equal(calls, 1);
  for (const file of files) assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(directory, file.path))).digest('hex'), file.sha256);
});
