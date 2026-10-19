import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const CHANNEL_COMMIT = '494a1d84e5401b54c4760e9da08f4221824f6d10';
// Load the complete upstream channel bundle unchanged, including native login
// defaults. Downloaded modules stay outside the public plugin distribution.
export const CHANNEL_FILES = Object.freeze([
  { path: 'LICENSE', bytes: 1068, sha256: '4d5f97c83545b2159926df06d3210a266d2b7f900e27f7b3e8e576caf753e828' },
  { path: 'packages/standalone/channels/business.mjs', bytes: 2912284, sha256: '39316afc57c75a227c5b38efe2aba8a54529cad1e235b4d1a592f83debb0dfd6' },
  { path: 'packages/standalone/channels/contracts.mjs', bytes: 1598, sha256: '999c203ac49b2d77a4dcff750476f3977615ef208ffc3d4d073caea39c72dd33' },
  { path: 'vendor/channel-pack/LICENSE', bytes: 1060, sha256: '0f62f49c7c75f82fe6d88eebfbdd1b647a89e42ab765ee470d0496af40ec0b25' },
  { path: 'vendor/channel-pack/NOTICE.md', bytes: 3542, sha256: 'a6cad78e702a992511f24863350eef53bda78773c868d933f3dc44dbb5931ab9' },
  { path: 'vendor/channel-pack/qoder-auth-wasm.wasm', bytes: 298606, sha256: '6419471effa631519def7797d76d7ede38b9fcfa9a83c2148c8ef5d43355b43d' },
].map(Object.freeze));
const PACKAGE = '{"private":true,"type":"module"}\n';
const installs = new Map();
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const trustedFailures = new WeakSet();
const failure = (code, message) => {
  const error = Object.assign(new Error(message), { code });
  trustedFailures.add(error);
  return error;
};

// Refuse symlinked cache parents before reading, writing or importing code.
async function regularParents(directory, boundary) {
  let current = path.resolve(directory);
  while (true) {
    try { if (!(await fs.lstat(current)).isDirectory()) throw failure('path', '原渠道包缓存路径不能是符号链接或文件。'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(current);
    if (parent === current || current === boundary) return;
    current = parent;
  }
}

async function valid(directory, files, boundary) {
  try {
    if (!(await fs.lstat(directory)).isDirectory()) return false;

    for (const file of [...files, { path: 'package.json', sha256: digest(PACKAGE) }]) {
      const target = path.join(directory, file.path);
      await regularParents(path.dirname(target), boundary);
      const stat = await fs.lstat(target);
      if (!stat.isFile() || stat.size !== (file.bytes ?? Buffer.byteLength(PACKAGE)) || digest(await fs.readFile(target)) !== file.sha256) return false;
    }
    return true;
  } catch { return false; }
}

const origins = [
  file => `https://raw.githubusercontent.com/Ebony-Vinyl/dsh-our-free-model/${CHANNEL_COMMIT}/${file.path}`,
  file => `https://cdn.jsdelivr.net/gh/Ebony-Vinyl/dsh-our-free-model@${CHANNEL_COMMIT}/${file.path}`,
  file => `https://gh-proxy.com/https://raw.githubusercontent.com/Ebony-Vinyl/dsh-our-free-model/${CHANNEL_COMMIT}/${file.path}`,
];
export const channelDownloadUrl = () => origins[0]({ path: 'packages/standalone/channels/business.mjs' });
const matches = (bytes, file) => bytes.length === file.bytes && digest(bytes) === file.sha256;
async function bundledFile(file) {
  try { const bytes = await fs.readFile(new URL(`../vendor/ofm/${file.path}`, import.meta.url)); return matches(bytes, file) ? bytes : undefined; } catch { return undefined; }
}
async function downloadOnce(file, fetcher, signal, origin) {
  const url = origin(file);
  const source = new URL(url).hostname;
  const describe = reason => `原渠道包 ${file.path}（${source}）：${reason}`;
  let response;
  try { response = await fetcher(url, { redirect: 'error', signal }); }
  catch (error) {
    const code = String(error.cause?.code ?? error.code ?? '');
    const reason = signal.aborted ? '连接超时或下载已取消' : ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED'].includes(code) ? code : '网络连接失败（浏览器代理可能未被 Node 使用）';
    throw failure('download', describe(reason));
  }
  if (!response.ok || !response.body) { await response.body?.cancel(); throw failure('download', describe(`HTTP ${response.status}`)); }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > file.bytes) throw failure('integrity', '原渠道包超过大小限制，未加载下载模块。');
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) throw failure('integrity', '原渠道包 SHA-256 校验失败，未加载下载模块；请检查网络后重启 Magpie。');
    return bytes;
  } catch (error) {
    if (['integrity', 'download'].includes(error.code)) throw error;
    throw failure('download', describe(signal.aborted ? '下载超时或已取消' : '响应读取中断'));
  } finally { await reader.cancel().catch(() => {}); }
}

// Retry transport failures only; size/hash failures must never be bypassed.
async function download(file, fetcher, signal) {
  const packaged = await bundledFile(file);
  if (packaged) return packaged;
  let last;
  for (const origin of origins) {
    try { return await downloadOnce(file, fetcher, AbortSignal.any([signal, AbortSignal.timeout(7000)]), origin); }
    catch (error) {
      if (error.code !== 'download' || signal.aborted) throw error;
      last = error;
    }
  }
  throw last;
}

// Import only exact pinned upstream bytes into the private cache; never execute
// the uploaded module in the management process. The worker reloads on restart.
export async function importChannelBundle(dataDir, input, dependencies = {}) {
  const files = dependencies.files ?? CHANNEL_FILES;
  const business = files.find(file => file.path === 'packages/standalone/channels/business.mjs');
  const bytes = Buffer.from(input);
  if (!business || !matches(bytes, business)) throw failure('integrity', '导入失败：business.mjs 与当前固定版本的大小或 SHA-256 不符。请用页面上的下载链接获取原文件，不要修改内容。');
  const supplied = new Map([[business.path, bytes]]);
  for (const file of files) if (file !== business) {
    const content = await (dependencies.readBundled ?? bundledFile)(file);
    if (!content || !matches(content, file)) throw failure('integrity', `插件随包依赖 ${file.path} 不完整，请重新安装完整插件包。`);
    supplied.set(file.path, content);
  }
  return installChannelSource(dataDir, { files, fetch: async url => {
    const file = files.find(row => url === origins[0](row));
    if (!file || !supplied.has(file.path)) throw failure('integrity', '导入文件列表无效');
    return new Response(supplied.get(file.path));
  } });
}

// Tests may inject files/fetch; plugin configuration cannot change the origin,
// commit or hashes. Native login defaults stay inside the unchanged source.
export async function installChannelSource(dataDir, dependencies = {}) {
  const files = dependencies.files ?? CHANNEL_FILES;
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const cache = path.join(dataDir, 'runtime');
  const destination = path.join(cache, `channels-${CHANNEL_COMMIT}`);
  if (installs.has(destination)) return installs.get(destination);
  const promise = (async () => {
    if (await valid(destination, files, path.resolve(dataDir))) return destination;
    await regularParents(cache, path.resolve(dataDir));
    await fs.mkdir(cache, { recursive: true, mode: 0o700 });
    await regularParents(cache, path.resolve(dataDir));
    const stage = await fs.mkdtemp(path.join(cache, '.channels-install-'));
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]);
    try {
      const results = await Promise.allSettled(files.map(async file => {
        try {
          const bytes = await download(file, fetcher, signal);
          const target = path.join(stage, file.path);
          await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
          await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
        } catch (error) { controller.abort(); throw error; }
      }));
      // Wait for every writer before removing the stage, including aborted ones.
      const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
      if (errors.length) throw errors.find(error => error.code === 'integrity') ?? errors[0];
      await fs.writeFile(path.join(stage, 'package.json'), PACKAGE, { mode: 0o600 });
      if (!await valid(stage, files, path.resolve(dataDir))) throw failure('integrity', '原渠道包缓存校验失败，未加载下载模块。');
      if (await valid(destination, files, path.resolve(dataDir))) return destination;
      // Only repair this installer's versioned cache, never a selected source.
      await fs.rm(destination, { recursive: true, force: true });
      try { await fs.rename(stage, destination); }
      catch (error) { if (!await valid(destination, files, path.resolve(dataDir))) throw error; }
      return destination;
    } finally { controller.abort(); await fs.rm(stage, { recursive: true, force: true }); }
  })().finally(() => installs.delete(destination));
  installs.set(destination, promise);
  return promise;
}

export async function channelBusinessUrl(settings, dependencies = {}) {
  // Explicit offline/test mode uses the packaged bundle without login defaults.
  if (settings.autoInstallChannels === false) return undefined;
  try {
    const directory = await installChannelSource(settings.dataDir, dependencies);
    return pathToFileURL(path.join(directory, 'packages/standalone/channels/business.mjs')).href;
  } catch (error) {
    if (trustedFailures.has(error) && error.code === 'download') {
      dependencies.onWarning?.(`原始账号渠道包下载失败，已使用随包核心启动。匿名模型与官方 API 仍可配置。${error.message}。可在下方导入浏览器已下载的 business.mjs，校验安装后重启 Magpie。`);
      return undefined;
    }
    throw new Error(trustedFailures.has(error) ? error.message : '原渠道包安装失败；请检查数据目录权限与网络，然后重启 Magpie。');
  }
}
