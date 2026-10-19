import { execFile } from 'node:child_process';
import { openExistingConsole } from '../src/console-launcher.mjs';

let access;
try {
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--print-url') { options.print = true; continue; }
    if (!['--data-dir', '--config-dir'].includes(flag) || !args[i + 1]) throw new Error('用法：node scripts/open-console.mjs [--data-dir OFM数据目录] [--config-dir Magpie数据目录] [--print-url]');
    options[flag === '--data-dir' ? 'dataDir' : 'configDir'] = args[++i];
  }
  access = await openExistingConsole(options);
  console.log('已连接正在运行的 OFM。管理入口可反复启动，不需要重新登录。');
  // Only an ephemeral one-use ticket is displayed; never the service API key.
  if (options.print) console.log(access.url);
  else {
    const [command, args] = process.platform === 'darwin' ? ['open', [access.url]] : process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', access.url]] : ['xdg-open', [access.url]];
    await new Promise((resolve, reject) => execFile(command, args, error => error ? reject(error) : resolve()));
    console.log('浏览器已打开。启动器会在两分钟后自动退出，不会关闭 OFM。');
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void access.close());
} catch (error) {
  await access?.close();
  console.error(error.message);
  process.exitCode = 1;
}
