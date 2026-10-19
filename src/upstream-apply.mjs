import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { jsonFile, verifySnapshot, projectFingerprint } from './upstream-sync.mjs';

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const validPath = name => typeof name === 'string' && !path.isAbsolute(name) && !name.split(/[\\/]/).some(part => ['..', '.git', 'node_modules'].includes(part));
async function verifyFiles(root, files) {
  if (!files || !Object.keys(files).length) throw new Error('候选缺少文件校验清单');
  for (const [name, expected] of Object.entries(files)) {
    if (!validPath(name) || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('候选文件清单无效');
    let parent = path.join(root, name);
    while (parent !== root) { if ((await fs.lstat(parent)).isSymbolicLink()) throw new Error('不能应用含符号链接的候选'); parent = path.dirname(parent); }
    if (hash(await fs.readFile(path.join(root, name))) !== expected) throw new Error('候选或当前代码已改变，必须重新构建后应用');
  }
}
export async function applyCandidate({ project, dataDir, resultFile }) {
  project = path.resolve(project); dataDir = path.resolve(dataDir);
  if ((await fs.lstat(project)).isSymbolicLink()) throw new Error('安装目录不能是符号链接');
  const report = await jsonFile(resultFile);
  if (report.schema !== 1 || report.status !== 'ready' || report.tested !== true || typeof report.projectDir !== 'string') throw new Error('只能应用测试通过的候选');
  try { await fs.lstat(path.join(project, '.git')); throw new Error('检测到 Git 工作区，请在 Git 中合并候选，不使用安装目录替换功能'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (dataDir === project || dataDir.startsWith(project + path.sep)) throw new Error('数据目录位于源码内，不能自动替换；请先分离数据');
  try {
    const lock = await jsonFile(path.join(dataDir, 'service.lock'));
    if (!Number.isSafeInteger(lock.pid) || lock.pid < 1) throw new Error('服务锁无法确认，请先完全退出 Magpie');
    try { process.kill(lock.pid, 0); throw new Error('OFM 正在运行，请完全退出 Magpie 后再应用'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (await projectFingerprint(project) !== report.baseProjectSha256) throw new Error('当前代码已改变，请重新构建候选');
  await verifyFiles(project, report.baseFiles);
  const candidate = path.resolve(report.projectDir);
  if ((await fs.lstat(candidate)).isSymbolicLink()) throw new Error('候选目录不能是符号链接');
  await verifyFiles(candidate, report.files);
  await verifySnapshot(candidate);
  const parent = path.dirname(project), token = crypto.randomUUID();
  const stage = path.join(parent, `.${path.basename(project)}-stage-${token}`);
  const backup = path.join(parent, `${path.basename(project)}-backup-${token}`);
  const dataBackup = path.join(dataDir, 'updates', 'backups', token);
  await fs.mkdir(dataBackup, { recursive: true, mode: 0o700 });
  for (const name of ['settings.json', 'stats.json', 'availability.json', 'catalog.json', 'channel-credentials.json', 'eac-user.json', 'channel-pack', 'gemini-oauth.json', 'loomy-wechat.json']) {
    const source = path.join(dataDir, name);
    try {
      const stat = await fs.lstat(source);
      if (stat.isSymbolicLink()) throw new Error('配置备份不接受符号链接，请先检查数据目录');
      await fs.cp(source, path.join(dataBackup, name), { recursive: true });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const secureBackup = async dir => { await fs.chmod(dir, 0o700); for (const name of await fs.readdir(dir)) { const file = path.join(dir, name), stat = await fs.lstat(file); if (stat.isSymbolicLink()) throw new Error('配置备份包含符号链接'); if (stat.isDirectory()) await secureBackup(file); else await fs.chmod(file, 0o600); } };
  await secureBackup(dataBackup);
  await fs.mkdir(stage, { mode: 0o700 });
  let moved = false;
  try {
    for (const name of Object.keys(report.files)) {
      const source = path.join(candidate, name), target = path.join(stage, name);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target); await fs.chmod(target, (await fs.stat(source)).mode & 0o777);
    }
    await verifyFiles(stage, report.files);
    await fs.rename(project, backup); moved = true;
    try { await fs.rename(stage, project); }
    catch (error) { await fs.rename(backup, project); moved = false; throw error; }
    return { status: 'applied', project, backup, dataBackup, message: '代码已替换；原目录完整备份，数据目录未修改。重新启动 Magpie。' };
  } finally { await fs.rm(stage, { recursive: true, force: true }); }
}
