import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { consoleDataDir } from '../src/console-launcher.mjs';
import { applyCandidate } from '../src/upstream-apply.mjs';
try {
  const args = process.argv.slice(2);
  let resultFile, dataDir;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--result' && args[i + 1]) resultFile = path.resolve(args[++i]);
    else if (args[i] === '--data-dir' && args[i + 1]) dataDir = path.resolve(args[++i]);
    else throw new Error('用法：node scripts/apply-upstream.mjs --result 构建目录/result.json [--data-dir OFM数据目录]');
  }
  if (!resultFile) throw new Error('需要 --result 指定已验证候选的 result.json');
  dataDir ??= await consoleDataDir();
  const report = await applyCandidate({ project: fileURLToPath(new URL('../', import.meta.url)), dataDir, resultFile });
  console.log(JSON.stringify(report, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
