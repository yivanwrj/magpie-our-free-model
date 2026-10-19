import fs from 'node:fs/promises';
import path from 'node:path';
import { withFileLock } from './installation-state.mjs';
import { projectFingerprint, checkSources, prepareCandidate, jsonFile, writeJSON } from './upstream-sync.mjs';

const defaults = { enabled: true, autoBuild: true, intervalHours: 24, checkUpstream: true, checkModels: true, healthIntervalMinutes: 15, hideUnavailable: false };
export function updatePreferences(value = {}) {
  const result = { ...defaults, ...value };
  if (typeof result.enabled !== 'boolean' || typeof result.autoBuild !== 'boolean' || !Number.isInteger(result.intervalHours) || result.intervalHours < 1 || result.intervalHours > 168) throw new Error('更新设置无效：间隔应为 1–168 小时');
  if (['checkUpstream', 'checkModels', 'hideUnavailable'].some(key => typeof result[key] !== 'boolean') || !Number.isInteger(result.healthIntervalMinutes) || result.healthIntervalMinutes < 1 || result.healthIntervalMinutes > 1440) throw new Error('健康检查设置无效：间隔应为 1–1440 分钟');
  return Object.fromEntries(Object.keys(defaults).map(key => [key, result[key]]));
}
export function createUpstreamUpdater({ project, dataDir }, dependencies = {}) {
  const directory = path.join(dataDir, 'updates');
  const stateFile = path.join(directory, 'state.json');
  let state = { preferences: { ...defaults }, status: 'idle', checkedAt: 0 };
  let job, timer, closed = false, writes = Promise.resolve();
  let initialized;
  const now = dependencies.now ?? Date.now;
  const check = dependencies.check ?? checkSources;
  const prepare = dependencies.prepare ?? prepareCandidate;
  let controller;
  const init = () => initialized ??= (async () => {
    try {
      const saved = await jsonFile(stateFile);
      state = { ...saved, preferences: updatePreferences(saved.preferences) };
      if (state.candidate && state.candidate.baseProjectSha256 !== await projectFingerprint(project)) { delete state.candidate; state.status = 'idle'; state.message = '本地代码已变化，旧候选已失效；将重新检查'; }
      if (['checking', 'building'].includes(state.status)) state = { ...state, status: 'interrupted', message: '上次更新任务中断，可重新检查；当前插件未被替换' };
    } catch (error) { if (error.code !== 'ENOENT') state.message = '更新状态文件无法读取，使用默认设置；当前插件未改变'; }
    await prune();
  })();
  const save = () => {
    const snapshot = JSON.parse(JSON.stringify(state));
    writes = writes.catch(() => {}).then(() => writeJSON(stateFile, snapshot));
    return writes;
  };
  const prune = async (removeHistory = false) => {
    let removedBuilds = 0;
    const work = path.join(directory, 'work');
    const candidates = [];
    try {
      const workStat = await fs.lstat(work);
      if (!workStat.isDirectory() || workStat.isSymbolicLink()) return { removedBuilds };
      for (const name of await fs.readdir(work)) {
        if (!/^candidate-[A-Za-z0-9]+$/.test(name)) continue;
        const root = path.join(work, name), stat = await fs.lstat(root);
        if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
        try { const info = await jsonFile(path.join(root, 'result.json')); if (info.schema === 1 && info.buildDir === root) {
          candidates.push({ root, time: stat.mtimeMs });
          for (const transient of ['ofm-source', 'home', 'tmp', 'distribution']) await fs.rm(path.join(root, transient), { recursive: true, force: true });
        } } catch {}
      }
      candidates.sort((a, b) => b.time - a.time);
      const keep = new Set(removeHistory ? [state.candidate?.buildDir] : [state.candidate?.buildDir, state.lastResult?.buildDir, ...candidates.slice(0, 3).map(row => row.root)]);
      for (const row of candidates) if (!keep.has(row.root)) { await fs.rm(row.root, { recursive: true, force: true }); removedBuilds++; }
    } catch { /* Disk cleanup never changes the serving version or a build result. */ }
    return { removedBuilds };
  };
  const view = () => ({ preferences: state.preferences, status: state.status, checkedAt: state.checkedAt, phase: ['building', 'failed', 'conflict'].includes(state.status) ? state.phase : undefined,
    sources: state.sources, message: state.message, detail: ['failed', 'conflict'].includes(state.status) ? state.lastResult?.detail : undefined, conflicts: state.status === 'conflict' ? state.lastResult?.conflicts : undefined, candidate: state.status === 'ready' && state.candidate?.status === 'ready' ? { version: state.candidate.version, createdAt: state.candidate.createdAt, sha256: state.candidate.archiveSha256 } : undefined });
  const api = {
    async status() { await init(); return view(); },
    async configure(value) { await init(); state.preferences = updatePreferences({ ...state.preferences, ...value }); await save(); return view(); },
    async checkNow({ build, force = false } = {}) {
      await init();
      if (closed) throw new Error('更新器已停止');
      if (job) return job;
      controller = new AbortController();
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      if (job) return job;
      job = withFileLock(path.join(directory, 'task.lock'), async () => {
        state.status = 'checking'; state.checkedAt = now(); state.phase = undefined; state.message = '正在检查固定上游'; await save();
        const sources = await check(project, dependencies.fetcher);
        if (closed) return view();
        state.sources = sources; state.checkedAt = now();
        if (Object.values(sources).some(row => row.error)) { state.status = 'check_failed'; state.message = '上游检查未完成；不会合并不完整结果'; await save(); return view(); }
        if (state.candidate && state.candidate.baseProjectSha256 !== await projectFingerprint(project)) delete state.candidate;
        const changed = Object.values(sources).some(row => row.changed);
        if (!changed && !force) { state.status = 'current'; state.phase = undefined; delete state.lastResult; delete state.candidate; delete state.fingerprint; state.message = '已跟踪最新上游，无需合并'; await save(); return view(); }
        const shouldBuild = build ?? state.preferences.autoBuild;
        if (!shouldBuild) { state.status = 'available'; state.message = '发现上游更新，可构建合并候选'; await save(); return view(); }
        const fingerprint = Object.values(sources).map(row => row.latest).join(':') + ':' + await projectFingerprint(project);
        if (!force && state.candidate?.status === 'ready' && state.fingerprint === fingerprint) { state.status = 'ready'; state.message = '这些提交已有已验证候选包'; await save(); return view(); }
        state.status = 'building'; state.phase = 'prepare'; state.message = '在独立目录合并并测试，当前插件继续运行'; await save();
        const result = await prepare({ project, workDir: path.join(directory, 'work'), sources, force, signal: controller.signal }, {
          onPhase(phase) { state.phase = phase; void save().catch(() => {}); },
        });
        if (closed) { state.status = 'interrupted'; state.message = '更新构建已随插件停止；当前源码未改变'; await save(); return view(); }
        state.status = result.status;
        state.phase = result.phase;
        state.message = result.status === 'ready' ? '自动合并与测试通过；可下载候选包，停用旧插件后安装' : result.status === 'conflict' ? '存在合并冲突，需要人工处理；当前插件未改变' : result.phase === 'security' ? '安全检查未通过，需要人工复核；当前插件未改变' : '构建或测试未通过；当前插件未改变';
        state.lastResult = result;
        if (result.status === 'ready') { state.candidate = result; state.fingerprint = fingerprint; }
        await prune();
        await save();
        return view();
      }, 1000).catch(async error => { state.status = closed ? 'interrupted' : 'failed'; state.message = error.message; await save(); return view(); }).finally(() => { job = undefined; });
      return job;
    },
    async cleanup() {
      await init();
      if (closed || job) throw new Error('更新任务正在运行或已停止，请稍后清理');
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      return withFileLock(path.join(directory, 'task.lock'), async () => {
        const result = await prune(true);
        if (!state.candidate) { delete state.lastResult; state.phase = undefined; if (['conflict', 'failed'].includes(state.status)) { state.status = 'idle'; state.message = '已清理完成的历史构建；当前源码和账号配置保留'; } }
        await save();
        return { ...result, message: `已清理 ${result.removedBuilds} 个完成的历史构建目录；当前有效候选、未完成任务、账号、运行缓存和备份保留。` };
      }, 1000);
    },
    async logs() {
      await init();
      const root = state.lastResult?.buildDir;
      const base = path.resolve(directory, 'work');
      if (typeof root !== 'string' || !path.resolve(root).startsWith(base + path.sep)) return [];
      const logs = [];
      for (const name of ['security-audit.json', 'merge.log', 'vendor.log', 'check.log', 'tests.log', 'adapter-clone.log', 'ofm-clone.log']) {
        try { const file = path.join(root, name); if ((await fs.lstat(file)).isSymbolicLink()) continue; logs.push({ name, text: (await fs.readFile(file, 'utf8')).slice(-16000) }); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      return logs;
    },
    async artifact() {
      await init();
      if (state.candidate && state.candidate.baseProjectSha256 !== await projectFingerprint(project)) throw new Error('本地代码已变化，旧候选失效，请重新构建');
      const file = state.candidate?.archive;
      const base = path.resolve(directory, 'work');
      if (state.status !== 'ready' || state.candidate?.status !== 'ready' || typeof file !== 'string' || !path.resolve(file).startsWith(base + path.sep)) throw new Error('还没有已验证的候选包');
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('候选包文件无效');
      const bytes = await fs.readFile(file);
      const { createHash } = await import('node:crypto');
      if (createHash('sha256').update(bytes).digest('hex') !== state.candidate.archiveSha256) throw new Error('候选包校验失败，请重新构建');
      return bytes;
    },
    async tick() { await init(); if (!closed && state.preferences.enabled && state.preferences.checkUpstream && !job && now() - state.checkedAt >= state.preferences.intervalHours * 3600000) return api.checkNow(); },
    start() { timer = setInterval(() => { void api.tick().catch(() => {}); }, 60000); timer.unref(); const first = setTimeout(() => { void api.tick().catch(() => {}); }, 30000); first.unref(); api.first = first; },
    async close() { closed = true; clearInterval(timer); clearTimeout(api.first); controller?.abort(); await job; await writes.catch(() => {}); },
  };
  return api;
}
