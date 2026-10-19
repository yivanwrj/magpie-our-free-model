import path from 'node:path';
import { consoleDataDir } from '../src/console-launcher.mjs';
import { inspectService, stopManagedService, lockMessage } from '../src/service-diagnostics.mjs';
try {
  let dataDir, stop = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--stop') stop = true;
    else if (args[i] === '--data-dir' && args[i + 1]) dataDir = path.resolve(args[++i]);
    else throw new Error('用法：node scripts/service-status.mjs [--data-dir 数据目录] [--stop]；停止前请先退出 Magpie。');
  }
  dataDir = await consoleDataDir({ dataDir });
  const info = stop ? await stopManagedService(dataDir) : await inspectService(dataDir);
  const { fingerprint, ...safe } = info;
  console.log(JSON.stringify({ dataDir, ...safe, message: info.message ?? (info.status === 'missing' ? '没有服务锁。' : lockMessage(info)) }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
