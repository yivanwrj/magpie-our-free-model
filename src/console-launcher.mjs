import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createConsoleHandoff } from './managed-console.mjs';

// Reads only the current Magpie installation registry and its registered OFM
// roots. No account sign-in, runtime startup or model configuration is changed.
export async function consoleDataDir({ dataDir, configDir = process.env.MAGPIE_CONFIG_DIR ?? path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'magpie') } = {}) {
  if (dataDir) return path.resolve(dataDir);
  const candidates = new Set([path.join(configDir, 'our-free-model')]);
  try {
    const registry = JSON.parse(await fs.readFile(path.join(configDir, 'our-free-model-owned.json'), 'utf8'));
    if (registry.product === 'magpie-our-free-model') for (const root of registry.roots ?? []) if (typeof root.path === 'string' && path.isAbsolute(root.path) && !root.cleaned) candidates.add(root.path);
  } catch (error) { if (error.code !== 'ENOENT') throw new Error('无法读取 Magpie OFM 安装登记，请使用 --data-dir 指定现有数据目录'); }
  const found = [];
  for (const directory of candidates) {
    try { if ((await fs.stat(path.join(directory, 'settings.json'))).isFile()) found.push(directory); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (found.length !== 1) throw new Error(found.length ? '找到多份 OFM 数据，请使用 --data-dir 指定要管理的目录' : '未找到 OFM 数据。请先启动 Magpie 和插件；便携版可通过 --config-dir 指定 Magpie 数据目录');
  return found[0];
}

export async function openExistingConsole(options = {}) {
  const directory = await consoleDataDir(options);
  let settings;
  try { settings = JSON.parse(await fs.readFile(path.join(directory, 'settings.json'), 'utf8')); }
  catch { throw new Error('OFM 设置无法读取，请先在 Magpie 启用插件'); }
  const port = settings.standalonePort;
  if (!Number.isInteger(port) || port < 1 || port > 65535 || typeof settings.forwardKey !== 'string' || !settings.forwardKey) throw new Error('OFM 尚未完成启动，请先启动 Magpie 和插件');
  const url = `http://127.0.0.1:${port}`;
  try {
    const response = await fetch(`${url}/api/management/summary`, { headers: { authorization: `Bearer ${settings.forwardKey}` }, redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok) { await response.body?.cancel(); throw new Error('not ready'); }
    const summary = await response.json();
    if (summary.product !== 'our-free-model-standalone') throw new Error('different service');
  } catch { throw new Error('OFM 未运行或端口已变化，请保持 Magpie 与插件运行后重试；无需退出账号'); }
  const handoff = await createConsoleHandoff({ url, keyFile: path.join(directory, 'settings.json') });
  const ticket = handoff.ticket();
  let closing;
  const close = () => closing ??= handoff.close();
  const timer = setTimeout(() => void close(), options.lifetimeMs ?? 120000);
  return { url: ticket, async close() { clearTimeout(timer); await close(); } };
}
