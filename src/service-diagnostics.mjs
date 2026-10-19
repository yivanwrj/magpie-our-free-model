import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const product = 'our-free-model-standalone';
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const checkPid = pid => { try { process.kill(pid, 0); return 'running'; } catch (error) { return error.code === 'ESRCH' ? 'exited' : 'unknown'; } };
const commandOf = async pid => {
  if (process.platform === 'win32') return '';
  const { stdout } = await exec('ps', ['-p', String(pid), '-o', 'command='], { timeout: 3000, maxBuffer: 65536 });
  return stdout;
};
export async function inspectService(dataDir, dependencies = {}) {
  const file = path.join(dataDir, 'service.lock');
  let raw;
  try {
    if (!(await fs.lstat(file)).isFile()) return { status: 'unknown', reason: '服务锁不是普通文件，未修改' };
    raw = await fs.readFile(file, 'utf8');
  } catch (error) { if (error.code === 'ENOENT') return { status: 'missing' }; return { status: 'unknown', reason: '无法读取服务锁，未修改' }; }
  let lock;
  try { lock = JSON.parse(raw); } catch { return { status: 'unknown', reason: '服务锁格式异常，未修改' }; }
  if (lock.product !== product || !Number.isSafeInteger(lock.pid) || lock.pid < 1) return { status: 'unknown', reason: '服务锁归属不明，未修改' };
  const status = (dependencies.checkPid ?? checkPid)(lock.pid);
  let managed = false;
  if (status === 'running') {
    try { const command = await (dependencies.commandOf ?? commandOf)(lock.pid); managed = /[\\/]src[\\/]managed-runner\.mjs(?:["']?(?:\s|$))/.test(command); } catch {}
  }
  return { status, pid: lock.pid, managed, fingerprint: digest(raw) };
}
export async function stopManagedService(dataDir, dependencies = {}) {
  const first = await inspectService(dataDir, dependencies);
  if (first.status === 'missing' || first.status === 'exited') return { status: 'stopped', message: '没有仍在运行的锁属主；启动新版时会安全检查旧锁。' };
  if (first.status !== 'running' || !first.managed) throw new Error('无法确认这是 Magpie OFM 内置服务，未结束进程；请先退出原 OFM 应用或在活动监视器核对进程。');
  const second = await inspectService(dataDir, dependencies);
  if (second.pid !== first.pid || second.fingerprint !== first.fingerprint || second.status !== 'running' || !second.managed) throw new Error('服务归属已变化，未结束进程，请重新诊断');
  try { (dependencies.kill ?? process.kill)(first.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  for (let i = 0; i < 100; i++) {
    if ((dependencies.checkPid ?? checkPid)(first.pid) === 'exited') return { status: 'stopped', pid: first.pid, message: '已停止核实归属的旧 OFM 服务；账号和配置未删除。' };
    await (dependencies.pause ?? (ms => new Promise(resolve => setTimeout(resolve, ms))))(100);
  }
  throw new Error('旧 OFM 服务尚未退出；未强制结束、未删除锁。请在活动监视器检查该 PID。');
}
export function lockMessage(info) {
  if (info.status === 'running') return `数据目录的服务仍在运行（PID ${info.pid}）。请完全退出 Magpie 和其他 OFM 实例后重试。${info.managed ? '若退出后仍占用，可在新版插件目录运行 node scripts/service-status.mjs --stop 安全停止旧内置服务。' : '未确认进程归属，不会自动结束或删除锁。'}`;
  if (info.status === 'exited') return `检测到旧服务已退出（PID ${info.pid}），锁文件仍有记录，但这不代表服务仍占用。启动新版会安全核对并回收；无需再次停止或删除账号数据。`;
  return '服务锁或数据目录互斥端点被占用；请完全退出其他 OFM 实例，并运行 node scripts/service-status.mjs 检查。未删除任何数据。';
}
