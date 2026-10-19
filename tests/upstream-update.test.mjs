import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { currentSources, checkSources, prepareCandidate, runProcess, projectFingerprint } from '../src/upstream-sync.mjs';
import { createUpstreamUpdater, updatePreferences } from '../src/upstream-update.mjs';
import { applyCandidate } from '../src/upstream-apply.mjs';

const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const write = async (dir, name, value) => { await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true }); await fs.writeFile(path.join(dir, name), value); };
const git = (dir, ...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@localhost', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ofm-updater-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = path.join(root, 'adapter'), original = path.join(root, 'ofm'), project = path.join(root, 'installed'), dataDir = path.join(root, 'data');
  for (const dir of [adapter, original, project, dataDir]) await fs.mkdir(dir);
  git(adapter, 'init'); await write(adapter, 'src/local-adaptation.mjs', 'export const value = "base";\n'); git(adapter, 'add', '.'); git(adapter, 'commit', '-m', 'base'); const adapterBase = git(adapter, 'rev-parse', 'HEAD');
  git(original, 'init'); await write(original, 'payload.js', 'export const source = "old";\n'); git(original, 'add', '.'); git(original, 'commit', '-m', 'base'); const ofmBase = git(original, 'rev-parse', 'HEAD');
  await write(original, 'payload.js', 'export const source = "new";\n'); git(original, 'add', '.'); git(original, 'commit', '-m', 'new'); const ofmLatest = git(original, 'rev-parse', 'HEAD');
  const policy = { schema: 1, adapter: { repository: 'mu-zi-lee/magpie-our-free-model', branch: 'main', commit: adapterBase }, ofm: { repository: 'Ebony-Vinyl/dsh-our-free-model', branch: 'main' }, preserve: ['src/local-adaptation.mjs'] };
  await write(project, 'UPSTREAM_POLICY.json', JSON.stringify(policy));
  await write(project, 'package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', type: 'module', files: ['src', 'scripts', 'tests', 'vendor', 'UPSTREAM_POLICY.json', 'README.md', 'NOTICE.md', 'UPSTREAM_SYNC.md'] }));
  await write(project, 'src/local-adaptation.mjs', 'export const value = "local customization";\n');
  for (const kind of ['channel', 'eac']) await write(project, `src/${kind}-source.mjs`, `export const ${kind === 'channel' ? 'CHANNEL' : 'EAC'}_COMMIT = '${ofmBase}';\nexport const FILES = [{ path: 'payload.js', bytes: 27, sha256: '${'0'.repeat(64)}' }];\n`);
  await write(project, 'vendor/ofm/UPSTREAM.json', JSON.stringify({ commit: ofmBase, files: [], adaptations: [], omitted: [] }));
  await write(project, 'vendor/zen-free/smoke.test.mjs', 'import test from "node:test"; test("fixture smoke", () => {});');
  await write(project, 'scripts/check.mjs', 'import {value} from "../src/local-adaptation.mjs"; if(value !== "local customization") throw new Error("lost adaptation");');
  await write(project, 'tests/check.test.mjs', 'import test from "node:test"; import assert from "node:assert/strict"; import {value} from "../src/local-adaptation.mjs"; test("local retained", () => assert.equal(value,"local customization"));');
  await write(project, 'scripts/vendor-ofm.mjs', `import fs from 'node:fs'; import crypto from 'node:crypto'; import {execFileSync} from 'node:child_process';
const pin = '${ofmBase}';
const root=process.argv[2]; if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==pin) throw new Error('pin');
const bytes=fs.readFileSync(root+'/payload.js'); fs.mkdirSync('vendor/ofm',{recursive:true}); fs.writeFileSync('vendor/ofm/runtime.js',bytes); fs.writeFileSync('vendor/ofm/UPSTREAM.json',JSON.stringify({commit:pin,files:[{path:'runtime.js',sha256:crypto.createHash('sha256').update(bytes).digest('hex')}],adaptations:[],omitted:[]}));`);
  for (const name of ['README.md', 'UPSTREAM_SYNC.md']) await write(project, name, 'fixture\n');
  await write(project, 'NOTICE.md', `Pinned commit: ${ofmBase}\nOriginal author attribution\n`);
  const sources = { adapter: { repository: policy.adapter.repository, current: adapterBase, latest: adapterBase, changed: false }, ofm: { repository: policy.ofm.repository, current: ofmBase, latest: ofmLatest, changed: true } };
  return { root, project, dataDir, adapter, original, adapterBase, sources, deps: { repositories: { adapter, ofm: original } }, args: () => ({ project, workDir: path.join(root, 'work'), sources }) };
}

test('checks fixed GitHub repos and rejects malformed heads without claiming current', async t => {
  const f = await fixture(t); let calls = 0;
  const refs = await checkSources(f.project, async url => { assert.ok(url.startsWith('https://api.github.com/repos/')); calls++; return Response.json({ sha: f.sources.ofm.latest, commit: { message: 'new\nbody' } }); });
  assert.equal(calls, 2); assert.equal(refs.ofm.changed, true); assert.equal(refs.ofm.title, 'new');
  const bad = await checkSources(f.project, async () => Response.json({ sha: '--option-injection' }));
  assert.ok(bad.ofm.error); assert.equal(bad.ofm.latest, undefined);
  const policy = JSON.parse(await fs.readFile(path.join(f.project, 'UPSTREAM_POLICY.json'))); policy.ofm.repository = 'someone/else'; await write(f.project, 'UPSTREAM_POLICY.json', JSON.stringify(policy));
  await assert.rejects(currentSources(f.project), /来源/);
});
test('no update performs no build and never touches installed files', async t => {
  const f = await fixture(t); f.sources.ofm.latest = f.sources.ofm.current;
  const before = await projectFingerprint(f.project);
  assert.equal((await prepareCandidate(f.args(), { run() { throw new Error('must not run'); } })).status, 'current');
  assert.equal(await projectFingerprint(f.project), before);
});
test('automatic candidate merges compatible adapter changes, vendors new core and runs real tests', async t => {
  const f = await fixture(t);
  await write(f.adapter, 'src/upstream-addition.mjs', 'export const upstream = true;'); git(f.adapter, 'add', '.'); git(f.adapter, 'commit', '-m', 'compatible addition');
  f.sources.adapter.latest = git(f.adapter, 'rev-parse', 'HEAD'); f.sources.adapter.changed = true;
  const before = await projectFingerprint(f.project);
  const result = await prepareCandidate(f.args(), f.deps);
  assert.equal(result.status, 'ready', JSON.stringify(result));
  for (const name of ['ofm-source', 'home', 'tmp', 'distribution']) await assert.rejects(fs.access(path.join(result.buildDir, name)));
  await fs.access(result.archive);
  assert.equal(result.tested, true); assert.equal(result.version, '1.0.1');
  assert.ok((await fs.stat(result.archive)).size > 0);
  assert.match(await fs.readFile(path.join(result.projectDir, 'src/local-adaptation.mjs'), 'utf8'), /local customization/);
  assert.equal(await fs.readFile(path.join(result.projectDir, 'src/upstream-addition.mjs'), 'utf8'), 'export const upstream = true;');
  assert.match(await fs.readFile(path.join(result.projectDir, 'vendor/ofm/runtime.js'), 'utf8'), /new/);
  assert.equal(await projectFingerprint(f.project), before);
  // A stopped ZIP installation can atomically apply the tested candidate.
  const applied = await applyCandidate({ project: f.project, dataDir: f.dataDir, resultFile: path.join(result.buildDir, 'result.json') });
  assert.equal(applied.status, 'applied'); assert.equal((await fs.stat(applied.backup)).isDirectory(), true);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.project, 'package.json'))).version, '1.0.1');
  assert.match(await fs.readFile(path.join(applied.backup, 'src/local-adaptation.mjs'), 'utf8'), /local customization/);
});
test('merge conflicts are reported and installed project remains intact', async t => {
  const f = await fixture(t);
  await write(f.adapter, 'src/local-adaptation.mjs', 'export const value = "upstream incompatible";\n'); git(f.adapter, 'add', '.'); git(f.adapter, 'commit', '-m', 'conflict');
  f.sources.adapter.latest = git(f.adapter, 'rev-parse', 'HEAD'); f.sources.adapter.changed = true;
  const before = await projectFingerprint(f.project);
  const result = await prepareCandidate(f.args(), f.deps);
  assert.equal(result.status, 'conflict'); assert.ok(result.conflicts.includes('src/local-adaptation.mjs')); assert.equal(result.tested, false);
  assert.equal(await projectFingerprint(f.project), before);
});
test('patch mismatch and failed regression never publish candidates', async t => {
  for (const kind of ['patch', 'test']) {
    const f = await fixture(t);
    await write(f.project, kind === 'patch' ? 'scripts/vendor-ofm.mjs' : 'tests/check.test.mjs', kind === 'patch' ? 'throw new Error("unsupported patch shape");' : 'import test from "node:test"; test("failure",()=>{throw new Error("fixture");});');
    const result = await prepareCandidate(f.args(), f.deps);
    assert.equal(result.status, 'failed'); assert.equal(result.tested, false);
    assert.equal(result.phase, kind === 'patch' ? 'vendor' : 'tests');
    await assert.rejects(fs.access(path.join(result.buildDir, 'ofm-source')));
    await assert.rejects(fs.access(path.join(result.buildDir, 'candidate.zip')));
  }
});
test('applying refuses running service, candidate tampering and changed local code', async t => {
  const f = await fixture(t); const result = await prepareCandidate(f.args(), f.deps); assert.equal(result.status, 'ready');
  const args = { project: f.project, dataDir: f.dataDir, resultFile: path.join(result.buildDir, 'result.json') };
  await write(f.dataDir, 'service.lock', JSON.stringify({ pid: process.pid }));
  await assert.rejects(applyCandidate(args), /正在运行/); await fs.rm(path.join(f.dataDir, 'service.lock'));
  await write(result.projectDir, 'src/local-adaptation.mjs', 'tampered');
  await assert.rejects(applyCandidate(args), /已改变/);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.project, 'package.json'))).version, '1.0.0');
});
test('scheduler honors switches, coalesces jobs and leaves API credentials out of state', async t => {
  const f = await fixture(t); let checks = 0, builds = 0;
  const refs = async () => { checks++; return f.sources; };
  const updater = createUpstreamUpdater({ project: f.project, dataDir: f.dataDir }, { now: () => 864000001, check: refs, prepare: async () => { builds++; await new Promise(resolve => setTimeout(resolve, 10)); return { status: 'conflict', tested: false, phase: 'merge' }; } });
  t.after(() => updater.close());
  await updater.configure({ enabled: false, autoBuild: true, intervalHours: 24 }); await updater.tick(); assert.equal(checks, 0);
  await Promise.all([updater.checkNow(), updater.checkNow()]); assert.equal(checks, 1); assert.equal(builds, 1);
  assert.equal((await updater.status()).status, 'conflict');
  await updater.configure({ enabled: true, autoBuild: false, intervalHours: 1 }); await updater.checkNow(); assert.equal(builds, 1); assert.equal((await updater.status()).status, 'available');
  await assert.rejects(updater.artifact(), /还没有/);
  assert.throws(() => updatePreferences({ intervalHours: 0 }));
});
test('failed metadata checks cannot trigger merging; current refs skip builds', async t => {
  const f = await fixture(t);
  const updater = createUpstreamUpdater({ project: f.project, dataDir: f.dataDir }, { check: async () => ({ ofm: { error: 'offline' } }), prepare() { throw new Error('must not build'); } });
  t.after(() => updater.close()); await updater.checkNow(); assert.equal((await updater.status()).status, 'check_failed');
});

test('a current upstream check clears stale conflict details and persists unified disabled maintenance', async t => {
  const f = await fixture(t);
  const directory = path.join(f.dataDir, 'updates');
  await write(directory, 'state.json', JSON.stringify({ preferences: { enabled: false, autoBuild: false, intervalHours: 24 }, status: 'current', lastResult: { status: 'conflict', conflicts: ['old-conflict.js'], detail: 'old' } }));
  const updater = createUpstreamUpdater({ project: f.project, dataDir: f.dataDir }, { check: async () => Object.fromEntries(Object.entries(f.sources).map(([k,v]) => [k, { ...v, latest: v.current, changed: false }])) });
  t.after(() => updater.close());
  assert.equal((await updater.status()).conflicts, undefined);
  const updated = await updater.configure({ checkModels: false, healthIntervalMinutes: 30 });
  assert.equal(updated.preferences.enabled, false);
  assert.equal(updated.preferences.checkUpstream, true);
  assert.equal(updated.preferences.hideUnavailable, false);
  const result = await updater.checkNow();
  assert.equal(result.status, 'current'); assert.equal(result.conflicts, undefined); assert.equal(result.detail, undefined);
  const saved = JSON.parse(await fs.readFile(path.join(directory, 'state.json')));
  assert.equal(saved.lastResult, undefined);
  assert.equal(saved.preferences.checkModels, false);
});

test('explicit update cleanup removes only completed owned histories and preserves unfinished work and data backups', async t => {
  const f = await fixture(t), updates = path.join(f.dataDir, 'updates');
  const complete = path.join(updates, 'work', 'candidate-History');
  await write(complete, 'result.json', JSON.stringify({ schema: 1, status: 'conflict', buildDir: complete }));
  await write(complete, 'project/source.js', 'disposable candidate');
  const unfinished = path.join(updates, 'work', 'candidate-Unfinished');
  await write(unfinished, 'project/source.js', 'do not discard unverified work');
  await write(updates, 'backups/keep/settings.json', 'private backup');
  await write(f.dataDir, 'settings.json', 'private live config');
  const updater = createUpstreamUpdater({ project: f.project, dataDir: f.dataDir });
  t.after(() => updater.close());
  const result = await updater.cleanup();
  assert.equal(result.removedBuilds, 1);
  await assert.rejects(fs.access(complete));
  await fs.access(path.join(unfinished, 'project/source.js'));
  assert.equal(await fs.readFile(path.join(f.dataDir, 'settings.json'), 'utf8'), 'private live config');
  await fs.access(path.join(updates, 'backups/keep/settings.json'));
});
