import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUpstreamUpdater } from '../src/upstream-update.mjs';
import { consoleDataDir } from '../src/console-launcher.mjs';

let updater;
try {
  const args = process.argv.slice(2);
  let dataDir, build = false, force = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--build') build = true;
    else if (args[i] === '--force') { force = true; build = true; }
    else if (args[i] === '--data-dir' && args[i + 1]) dataDir = path.resolve(args[++i]);
    else throw new Error('用法：node scripts/sync-upstream.mjs [--data-dir OFM数据目录] [--build] [--force]');
  }
  dataDir ??= await consoleDataDir();
  updater = createUpstreamUpdater({ project: fileURLToPath(new URL('../', import.meta.url)), dataDir });
  const result = await updater.checkNow({ build, force });
  console.log(JSON.stringify(result, null, 2));
  if (['failed', 'conflict', 'check_failed'].includes(result.status)) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await updater?.close(); }
