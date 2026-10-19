import fs from 'node:fs/promises';
import { auditChanges, auditDiff, securityReport } from './update-security.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

export const SOURCES = Object.freeze({ adapter: 'mu-zi-lee/magpie-our-free-model', ofm: 'Ebony-Vinyl/dsh-our-free-model' });
const SHA = /^[0-9a-f]{40}$/;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const jsonFile = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export async function writeJSON(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try { await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }); }
}
export async function currentSources(project) {
  const policy = await jsonFile(path.join(project, 'UPSTREAM_POLICY.json'));
  const manifest = await jsonFile(path.join(project, 'vendor/ofm/UPSTREAM.json'));
  if (policy.schema !== 1 || Object.entries(SOURCES).some(([id, repo]) => policy[id]?.repository !== repo || policy[id]?.branch !== 'main') || !SHA.test(policy.adapter.commit) || !SHA.test(manifest.commit)) throw new Error('上游来源配置或固定提交无效');
  return { adapter: { repository: SOURCES.adapter, current: policy.adapter.commit }, ofm: { repository: SOURCES.ofm, current: manifest.commit } };
}
export async function checkSources(project, fetcher = globalThis.fetch) {
  const sources = await currentSources(project);
  const results = await Promise.all(Object.entries(sources).map(async ([id, source]) => {
    try {
      const response = await fetcher(`https://api.github.com/repos/${source.repository}/commits/main`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'magpie-ofm-updater' }, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`GitHub HTTP ${response.status}`); }
      const data = await response.json();
      if (!SHA.test(data.sha)) throw new Error('GitHub 返回无效提交');
      return [id, { ...source, latest: data.sha, changed: data.sha !== source.current, title: String(data.commit?.message ?? '').split('\n')[0].slice(0, 300) }];
    } catch {
      if (fetcher === globalThis.fetch) {
        try {
          const value = await runProcess('git', ['ls-remote', '--exit-code', `https://github.com/${source.repository}.git`, 'refs/heads/main'], { cwd: project, timeout: 20000 });
          const sha = value.split(/\s+/)[0];
          if (SHA.test(sha)) return [id, { ...source, latest: sha, changed: sha !== source.current, title: '', transport: 'git' }];
        } catch { /* API and Git fallback both failed; never claim up-to-date. */ }
      }
      return [id, { ...source, error: '无法检查 GitHub 上游，请检查网络或稍后重试' }];
    }
  }));
  return Object.fromEntries(results);
}

// Keep credentials, npm hooks and the real user's HOME out of the build process.
export function buildEnvironment(home, temp) {
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'LANG', 'LC_ALL']) if (process.env[key]) env[key] = process.env[key];
  return { ...env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), TMPDIR: temp, TMP: temp, TEMP: temp,
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0', OFM_UPDATE_TESTING: '1' };
}
export async function runProcess(command, args, { cwd, env, signal, logFile, timeout = 600000 } = {}) {
  return new Promise((resolve, reject) => {
    let output = '', child;
    try { child = spawn(command, args, { cwd, env, signal, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch { reject(new Error(`无法执行 ${path.basename(command)}`)); return; }
    const chunks = [];
    let bytes = 0;
    const collect = chunk => { output = (output + chunk).slice(-8192); if (bytes < 4 * 1024 * 1024) { chunks.push(chunk); bytes += chunk.length; } };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.once('error', error => { clearTimeout(timer); reject(new Error(error.code === 'ENOENT' ? `缺少 ${path.basename(command)}，请安装后重试` : '更新子进程启动失败或已取消')); });
    child.once('close', async code => {
      clearTimeout(timer);
      try { if (logFile) await fs.writeFile(logFile, Buffer.concat(chunks), { mode: 0o600 }); }
      catch (error) { reject(error); return; }
      if (code !== 0) reject(Object.assign(new Error(`${path.basename(command)} 执行失败；查看候选构建日志`), { output }));
      else resolve(output.trim());
    });
  });
}
const safeRelative = name => typeof name === 'string' && name !== '' && !path.isAbsolute(name) && !name.split(/[\\/]/).some(part => ['..', '.git', 'node_modules'].includes(part)) && !name.includes('\0');
export async function projectFiles(project) {
  const pkg = await jsonFile(path.join(project, 'package.json'));
  const result = new Set(['package.json']);
  const walk = async relative => {
    if (!safeRelative(relative)) throw new Error('项目打包路径无效');
    const stat = await fs.lstat(path.join(project, relative));
    if (stat.isSymbolicLink()) throw new Error('候选包不接受符号链接');
    if (stat.isDirectory()) for (const name of await fs.readdir(path.join(project, relative))) await walk(path.join(relative, name));
    else if (stat.isFile() && stat.size <= 32 * 1024 * 1024) result.add(relative.replaceAll('\\', '/'));
    else throw new Error('候选文件类型或大小无效');
  };
  for (const name of pkg.files ?? []) await walk(name);
  // These provenance files are needed even when the original npm file list was older.
  for (const name of ['UPSTREAM_POLICY.json', 'SYNC_RESULT.json']) try { if ((await fs.stat(path.join(project, name))).isFile()) result.add(name); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return [...result].sort();
}
export async function projectFingerprint(project) {
  const files = {};
  for (const file of await projectFiles(project)) files[file] = digest(await fs.readFile(path.join(project, file)));
  return digest(JSON.stringify(files));
}
export async function copyProject(source, target) {
  for (const file of await projectFiles(source)) {
    const destination = path.join(target, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(source, file), destination);
    await fs.chmod(destination, (await fs.stat(path.join(source, file))).mode & 0o777);
  }
}
async function updateDownloadPins(project, original, commit) {
  for (const kind of ['channel', 'eac']) {
    const file = path.join(project, `src/${kind}-source.mjs`);
    let source = await fs.readFile(file, 'utf8');
    source = source.replace(/export const (CHANNEL|EAC)_COMMIT = '[0-9a-f]{40}'/, (_, name) => `export const ${name}_COMMIT = '${commit}'`);
    const matches = [...source.matchAll(/\{ path: '([^']+)', (?:bytes: \d+, )?sha256: '[0-9a-f]{64}' \}/g)];
    if (!matches.length) throw new Error('上游下载清单格式发生变化，需要人工适配');
    for (const match of matches) {
      if (!safeRelative(match[1])) throw new Error('上游文件清单不安全');
      const bytes = await fs.readFile(path.join(original, match[1]));
      source = source.replace(match[0], `{ path: '${match[1]}', ${match[0].includes('bytes:') ? `bytes: ${bytes.length}, ` : ''}sha256: '${digest(bytes)}' }`);
    }
    await fs.writeFile(file, source);
  }
  const generator = path.join(project, 'scripts/vendor-ofm.mjs');
  const source = await fs.readFile(generator, 'utf8');
  if (!/const pin = '[0-9a-f]{40}'/.test(source)) throw new Error('同步生成器格式发生变化，需要人工适配');
  await fs.writeFile(generator, source.replace(/const pin = '[0-9a-f]{40}'/, `const pin = '${commit}'`));
}
export async function verifySnapshot(project) {
  const base = path.join(project, 'vendor/ofm');
  const manifest = await jsonFile(path.join(base, 'UPSTREAM.json'));
  for (const item of manifest.files) {
    if (!safeRelative(item.path)) throw new Error('快照路径无效');
    const stat = await fs.lstat(path.join(base, item.path));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('快照必须为普通文件');
    const bytes = await fs.readFile(path.join(base, item.path));
    const adaptation = manifest.adaptations.find(row => row.path === item.path);
    if (digest(bytes) !== (adaptation?.sha256 ?? item.sha256) || adaptation && adaptation.originalSha256 !== item.sha256) throw new Error('快照完整性校验失败');
  }
  for (const name of manifest.omitted ?? []) if (await fs.stat(path.join(base, name)).then(() => true, error => error.code === 'ENOENT' ? false : Promise.reject(error))) throw new Error('候选包包含应排除的上游凭据文件');
}

// Surface known compatibility failures without copying arbitrary upstream/test output
// (which may contain URLs or secrets) into the status API.
export function failureDetail(error, phase) {
  const output = String(error.output ?? '');
  const diagnostics = [
    ['Standalone EAC integration point changed', 'EAC 服务初始化接口变化，需要调整兼容补丁'],
    ['Upstream EAC diagnostic integration changed', 'EAC 诊断接口变化，需要调整兼容补丁'],
    ['Upstream channel source integration changed', '账号渠道接口变化，需要调整兼容补丁'],
    ['Recommendation navigation patch mismatch', '控制台导航变化，需要调整页面补丁'],
    ['Aggregate poster patch mismatch', '免费 API 传输接口变化，需要调整兼容补丁'],
    ['Upstream EAC UI integration changed', 'EAC 页面变化，需要调整兼容补丁'],
  ];
  for (const [marker, message] of diagnostics) if (output.includes(marker)) return message;
  return ({ security: '安全检查发现敏感变更或检查失败；查看 security-audit.json 并人工复核', prepare: '准备构建失败，请检查 Git 安装与网络并查看日志', merge: '上游合并未通过，请查看冲突列表与日志', vendor: '快照生成或完整性校验失败，请查看日志', tests: '候选检查或回归测试未通过，请查看日志', package: '候选打包失败，请查看日志' })[phase] ?? '更新任务失败，请查看日志';
}

// Merge into a disposable checkout. The installed project is never an output.
export async function prepareCandidate({ project, workDir, sources, force = false, signal }, dependencies = {}) {
  const refs = await currentSources(project);
  for (const id of Object.keys(SOURCES)) {
    const info = sources[id];
    if (!info || !SHA.test(info.latest) || info.current !== refs[id].current || info.repository !== SOURCES[id]) throw new Error('上游检查结果失效或提交无效，请重新检查');
  }
  if (!force && !Object.values(sources).some(row => row.latest !== row.current)) return { status: 'current' };
  const resolvedWork = path.resolve(workDir), resolvedProject = path.resolve(project);
  if (resolvedWork === resolvedProject || resolvedWork.startsWith(resolvedProject + path.sep)) throw new Error('构建目录必须位于插件源码目录之外');
  await fs.mkdir(resolvedWork, { recursive: true, mode: 0o700 });
  const build = await fs.mkdtemp(path.join(resolvedWork, 'candidate-'));
  const candidate = path.join(build, 'project');
  const home = path.join(build, 'home'), temp = path.join(build, 'tmp');
  await fs.mkdir(home); await fs.mkdir(temp); await fs.mkdir(candidate);
  const env = buildEnvironment(home, temp);
  const run = dependencies.run ?? runProcess;
  const command = (cmd, args, cwd = candidate, log) => {
    const childEnv = { ...env };
    // Git network calls may use the user's proxy; regression tests do not inherit it.
    if (cmd === 'git') for (const key of ['HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'all_proxy', 'no_proxy']) if (process.env[key]) childEnv[key] = process.env[key];
    return run(cmd, args, { cwd, env: childEnv, signal, logFile: log ? path.join(build, log) : undefined });
  };
  const git = (args, cwd = candidate, log) => command('git', ['-c', 'core.hooksPath=' + path.join(build, 'no-hooks'), ...args], cwd, log);
  let phase = 'prepare';
  const auditReports = [];
  const gate = async (stage, findings, changed = []) => {
    auditReports.push(securityReport(stage, findings, changed));
    await writeJSON(path.join(build, 'security-audit.json'), { schema: 1, reports: auditReports });
    if (findings.length) throw new Error('安全检查发现敏感代码变更，需要人工复核；候选不执行、不发布');
  };
  const auditProject = async stage => {
    const report = await auditChanges(project, candidate, await projectFiles(candidate));
    await gate(stage, report.findings, report.changed);
  };
  try {
    await command('git', ['--version']);
    if (sources.adapter.latest !== refs.adapter.current) {
      await git(['clone', '--no-checkout', dependencies.repositories?.adapter ?? `https://github.com/${SOURCES.adapter}.git`, candidate], build, 'adapter-clone.log');
      await git(['fetch', 'origin', refs.adapter.current, sources.adapter.latest]);
      await git(['merge-base', '--is-ancestor', refs.adapter.current, sources.adapter.latest]);
      await git(['checkout', '--detach', refs.adapter.current]);
      for (const name of await fs.readdir(candidate)) if (name !== '.git') await fs.rm(path.join(candidate, name), { recursive: true, force: true });
    } else await git(['init']);
    const baseFiles = {};
    for (const file of await projectFiles(project)) baseFiles[file] = digest(await fs.readFile(path.join(project, file)));
    await copyProject(project, candidate);
    await git(['add', '-A']);
    await git(['-c', 'user.name=OFM Updater', '-c', 'user.email=ofm-updater@localhost', 'commit', '-m', 'Preserve local OFM adaptations']);
    if (sources.adapter.latest !== refs.adapter.current) {
      phase = 'merge'; dependencies.onPhase?.(phase);
      await git(['-c', 'user.name=OFM Updater', '-c', 'user.email=ofm-updater@localhost', 'merge', '--no-commit', '--no-ff', sources.adapter.latest], candidate, 'merge.log');
    }
    phase = 'security'; dependencies.onPhase?.(phase);
    await auditProject('adapter-before-execution');
    phase = 'vendor'; dependencies.onPhase?.(phase);
    const original = path.join(build, 'ofm-source');
    await git(['clone', '--no-checkout', dependencies.repositories?.ofm ?? `https://github.com/${SOURCES.ofm}.git`, original], build, 'ofm-clone.log');
    await git(['fetch', 'origin', sources.ofm.latest], original);
    await git(['checkout', '--detach', sources.ofm.latest], original);
    // Never follow rewritten history automatically.
    await git(['merge-base', '--is-ancestor', refs.ofm.current, sources.ofm.latest], original);
    phase = 'security'; dependencies.onPhase?.(phase);
    const diffFile = path.join(build, 'upstream-security.diff');
    await git(['diff', '--no-ext-diff', '--no-textconv', '--unified=0', '--output=' + diffFile, refs.ofm.current, sources.ofm.latest], original);
    try { await gate('upstream-before-execution', auditDiff(await fs.readFile(diffFile, 'utf8'))); }
    finally { await fs.rm(diffFile, { force: true }); }
    phase = 'vendor'; dependencies.onPhase?.(phase);
    await updateDownloadPins(candidate, original, sources.ofm.latest);
    await command(process.execPath, ['scripts/vendor-ofm.mjs', original, '--replace'], candidate, 'vendor.log');
    await verifySnapshot(candidate);
    const policy = await jsonFile(path.join(candidate, 'UPSTREAM_POLICY.json'));
    policy.adapter.commit = sources.adapter.latest;
    await writeJSON(path.join(candidate, 'UPSTREAM_POLICY.json'), policy);
    for (const file of policy.preserve) await fs.access(path.join(candidate, file));
    phase = 'security'; dependencies.onPhase?.(phase);
    const generated = new Set(['scripts/vendor-ofm.mjs', 'src/channel-source.mjs', 'src/eac-source.mjs']);
    const runtimeAudit = await auditChanges(project, candidate, (await projectFiles(candidate)).filter(file => !generated.has(file)));
    await gate('runtime-before-tests', runtimeAudit.findings, runtimeAudit.changed);
    const beforeTestsFingerprint = await projectFingerprint(candidate);
    phase = 'tests'; dependencies.onPhase?.(phase);
    await command(process.execPath, ['scripts/check.mjs'], candidate, 'check.log');
    const testFiles = [];
    for (const dir of ['tests', 'vendor/zen-free']) for (const name of await fs.readdir(path.join(candidate, dir))) if (name.endsWith('.test.mjs')) testFiles.push(path.join(dir, name));
    if (!testFiles.length) throw new Error('候选缺少回归测试');
    const testOutput = await command(process.execPath, ['--test', '--test-concurrency=1', ...testFiles], candidate, 'tests.log');
    if (!/^(?:#|ℹ) tests [1-9]\d*$/m.test(testOutput) || !/^(?:#|ℹ) fail 0$/m.test(testOutput) || !/^(?:#|ℹ) cancelled 0$/m.test(testOutput)) throw new Error('回归测试没有完整成功报告，候选不发布');
    phase = 'security'; dependencies.onPhase?.(phase);
    if (await projectFingerprint(candidate) !== beforeTestsFingerprint) await gate('test-modified-project', [{ file: '.', rule: 'project-mutated-during-tests' }]);
    const finalAudit = await auditChanges(project, candidate, (await projectFiles(candidate)).filter(file => !generated.has(file)));
    await gate('after-tests-before-package', finalAudit.findings, finalAudit.changed);
    phase = 'package'; dependencies.onPhase?.(phase);
    const pkgFile = path.join(candidate, 'package.json');
    const pkg = await jsonFile(pkgFile);
    const version = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
    if (version) pkg.version = `${version[1]}.${version[2]}.${Number(version[3]) + 1}`;
    pkg.files = [...new Set([...(pkg.files ?? []), 'SYNC_RESULT.json', 'UPSTREAM_POLICY.json', 'update.md'])];
    await writeJSON(pkgFile, pkg);
    const report = { baseProjectSha256: digest(JSON.stringify(baseFiles)), baseVersion: (await jsonFile(path.join(project, 'package.json'))).version, baseFiles, schema: 1, status: 'ready', tested: true, security: { status: 'no_flags', stages: auditReports.length, limitation: 'Static heuristic checks only; not a security guarantee' }, createdAt: Date.now(), sources, version: pkg.version, phase: 'ready' };
    await writeJSON(path.join(candidate, 'SYNC_RESULT.json'), report);
    const historyFile = path.join(candidate, 'update.md');
    const history = await fs.readFile(historyFile, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
    const note = `## ${pkg.version} — 上游自动合并候选\n\n- 时间：${new Date().toISOString()}。\n- Adapter：${sources.adapter.latest}；OFM：${sources.ofm.latest}。\n- 保留本地改造，快照完整性、插件契约、静态增量检查及回归测试通过。\n- 不证明真实账号额度或模型可用，也不是无恶意代码保证。\n\n`;
    const heading = '# 更新日志\n\n';
    await fs.writeFile(historyFile, history.startsWith(heading) ? heading + note + history.slice(heading.length) : heading + note + history);
    const noticeFile = path.join(candidate, 'NOTICE.md');
    const notice = await fs.readFile(noticeFile, 'utf8');
    await fs.writeFile(noticeFile, notice.replace(/Pinned commit: [^\n]+/, `Pinned commit: ${sources.ofm.latest} (automatic candidate; upstream author attribution retained).`));
    await git(['add', '-A']);
    await git(['-c', 'user.name=OFM Updater', '-c', 'user.email=ofm-updater@localhost', 'commit', '-m', 'Validated automatic upstream candidate']);
    const distribution = path.join(build, 'distribution');
    await fs.mkdir(distribution);
    await copyProject(candidate, distribution);
    await git(['init'], distribution);
    await git(['add', '-A'], distribution);
    await git(['-c', 'user.name=OFM Updater', '-c', 'user.email=ofm-updater@localhost', 'commit', '-m', 'Candidate distribution'], distribution);
    const archive = path.join(build, 'candidate.zip');
    await git(['archive', '--format=zip', '--prefix=magpie-our-free-model/', '--output=' + archive, 'HEAD'], distribution);
    report.archiveSha256 = digest(await fs.readFile(archive));
    report.files = {};
    for (const file of await projectFiles(candidate)) report.files[file] = digest(await fs.readFile(path.join(candidate, file)));
    report.buildDir = build; report.projectDir = candidate; report.archive = archive;
    await writeJSON(path.join(build, 'result.json'), report);
    return report;
  } catch (error) {
    const result = { schema: 1, status: phase === 'merge' ? 'conflict' : 'failed', phase, tested: false, message: error.message, detail: failureDetail(error, phase), buildDir: build, sources };
    if (phase === 'merge') { try { result.conflicts = (await git(['diff', '--name-only', '--diff-filter=U'])).split('\n').filter(Boolean); } catch {} }
    await writeJSON(path.join(build, 'result.json'), result);
    return result;
  } finally {
    // Keep logs, candidate ZIP/project and result; discard rebuildable clones
    // and isolated test scratch even after a failed build.
    for (const name of ['ofm-source', 'home', 'tmp', 'distribution']) {
      await fs.rm(path.join(build, name), { recursive: true, force: true }).catch(() => {});
    }
  }
}
