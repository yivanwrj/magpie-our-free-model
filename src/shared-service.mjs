import fs from 'node:fs/promises';
import path from 'node:path';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const live = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; } };
export async function findSharedService(dataDir, identity, dependencies = {}) {
  let lock;
  const file = path.join(dataDir, 'service.lock');
  try {
    if (!(await fs.lstat(file)).isFile()) throw new Error('OFM 服务锁归属不明，未启动第二份服务');
    lock = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (lock.product !== 'our-free-model-standalone' || !Number.isSafeInteger(lock.pid) || lock.pid < 1) throw new Error('OFM 服务锁归属不明，未启动第二份服务');
  if (!(dependencies.live ?? live)(lock.pid)) return;
  for (let attempt = 0; attempt < 10; attempt++) {
    if (!(dependencies.live ?? live)(lock.pid)) return;
    try {
      const settings = JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8'));
      if (!Number.isInteger(settings.standalonePort) || settings.standalonePort < 1 || settings.standalonePort > 65535 || typeof settings.forwardKey !== 'string' || !settings.forwardKey) throw new Error('not-ready');
      const url = `http://127.0.0.1:${settings.standalonePort}`;
      const response = await (dependencies.fetch ?? fetch)(url + '/api/management/magpie/runtime', { headers: { authorization: `Bearer ${settings.forwardKey}` }, redirect: 'error', signal: AbortSignal.timeout(1000) });
      if ([401, 403, 404].includes(response.status)) { await response.body?.cancel(); throw Object.assign(new Error('现有 OFM 服务不支持跨宿主复用或鉴权不匹配。请先停止 DSH/MCP 客户端并退出 Magpie，再升级重启；不会另启服务或删除数据。'), { incompatible: true }); }
      if (!response.ok) { await response.body?.cancel(); throw new Error('not-ready'); }
      const info = await response.json();
      if (info.protocol !== 1 || info.identity !== identity || info.pid !== lock.pid) throw Object.assign(new Error('现有 OFM 服务的版本、源码路径或设置不同。请退出旧宿主后统一重启，未启动第二份服务。'), { incompatible: true });
      return { type: 'ready', shared: true, identity, url, keyFile: path.join(dataDir, 'settings.json'), pid: lock.pid };
    } catch (error) { if (error.incompatible) throw error; }
    await (dependencies.pause ?? delay)(200);
  }
  throw new Error(`现有 OFM 服务（PID ${lock.pid}）仍在启动或关闭，暂时不能复用；未启动第二份服务。请稍后重试。`);
}
export async function sharedCommand(state, type, payload = {}, signal) {
  const settings = JSON.parse(await fs.readFile(state.keyFile, 'utf8'));
  const response = await fetch(state.url + '/api/management/magpie/runtime', { method: 'POST', redirect: 'error',
    headers: { authorization: `Bearer ${settings.forwardKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, type, identity: state.identity }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(type === 'console' ? 180000 : type === 'models' ? 45000 : 5000)]) : AbortSignal.timeout(type === 'console' ? 180000 : type === 'models' ? 45000 : 5000) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? '共享 OFM 服务管理请求失败');
  return value.value;
}
