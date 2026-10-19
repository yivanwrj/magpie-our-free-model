import { completeOnDemand, freeFallback } from './on-demand.mjs';
import { CHANNEL_COMMIT, CHANNEL_FILES, channelDownloadUrl, importChannelBundle } from './channel-source.mjs';
import fs from 'node:fs';
import { discoverOpenRouterFree } from './openrouter-free.mjs';
import { fetchProviderModels } from '../vendor/ofm/src/aggregate.js';
import { PROVIDERS, getProvider } from '../vendor/ofm/src/providers/index.js';
import { baseURL } from './transport.mjs';

export function createManagementExtension(getHealth, getWarnings = () => [], getUpdater = () => undefined, getDataDir = () => undefined, getRuntime = () => undefined, executeCommand = async () => { throw new Error('共享服务尚未就绪'); }, onMaintenance = () => {}) {
  const asset = (name, type) => ({ type, body: fs.readFileSync(new URL(`../assets/${name}`, import.meta.url)) });
  let context, lastRoute;
  const projectSettings = preferences => {
    context?.persist({ standaloneProbe: false, probeIntervalMinutes: preferences.healthIntervalMinutes });
    onMaintenance(preferences);
  };
  return {
    bindSettings(stores, persist, onSettingsChanged) { context = { stores, persist, onSettingsChanged }; },
    async initialize() { const state = await getUpdater()?.status(); if (state) projectSettings(state.preferences); },
    async syncSettings(patch) {
      const updater = getUpdater();
      if (!updater) return;
      const { preferences } = await updater.status();
      const changed = {};
      if (typeof patch.standaloneProbe === 'boolean' && patch.standaloneProbe !== (preferences.enabled && preferences.checkModels)) {
        changed.checkModels = patch.standaloneProbe;
        if (patch.standaloneProbe) changed.enabled = true;
      }
      if (patch.probeIntervalMinutes !== undefined) changed.healthIntervalMinutes = patch.probeIntervalMinutes;
      projectSettings((await updater.configure(changed)).preferences);
    },
    healthCheckedAt() { return Math.max(0, ...Object.values(getHealth()?.snapshot() ?? {}).map(row => row.checkedAt ?? 0)); },
    healthRow(id, routable) {
      const health = getHealth();
      if (!health) return {};
      const state = health.snapshot()[id];
      return { routable: routable && health.visible(id), availability: state?.state === 'healthy' ? health.available(id) ? 'available' : 'unknown' : ({ rate_limited: 'throttled', denied: 'unavailable', forbidden: 'unavailable', unauthorized: 'unavailable', region_blocked: 'unavailable', lane_locked: 'unavailable', authorization_required: 'unavailable', unavailable: 'unavailable' })[state?.state] ?? 'unknown', healthState: state?.state ?? 'unknown', toolsVerified: state?.tools === true };
    },
    async complete(request,onChunk,complete,runtime){
      const preferences=(await getUpdater().status()).preferences;
      const health=getHealth();
      if(!health)return complete(request,onChunk);
      return completeOnDemand({request,onChunk,complete,catalog:runtime.catalog,publicRows:runtime.publicModelRows(),preferences,health,recordRoute:row=>{lastRoute=row;}});
    },
    async probe() {
      if (context?.stores.settings.get().enabled === false) throw Object.assign(new Error('推理服务已暂停，请先在服务设置中启用'), { statusCode: 503 });
      throw Object.assign(new Error('已改为按需调用；请在渠道与模型选择单个模型手动检测'),{statusCode:400});
    },
    assets: new Map([
      ['/magpie-models', asset('models.html', 'text/html; charset=utf-8')],
      ['/assets/magpie-models.js', asset('models.js', 'text/javascript; charset=utf-8')],
      ['/assets/magpie-console.js', asset('console-page.js', 'text/javascript; charset=utf-8')],
      ['/assets/magpie-console.html', asset('console-page.html', 'text/html; charset=utf-8')],
      ['/assets/magpie-console.css', asset('console-page.css', 'text/css; charset=utf-8')],
    ]),
    async handle({ req, res, pathname, stores, runtime, json, readBody, persist }) {
      if (!pathname.startsWith('/api/management/magpie/')) return false;
      const route = pathname.slice('/api/management/magpie/'.length);
      const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
      if (route === 'runtime') {
        const info = getRuntime();
        if (!info) { json(res, 503, { error: '共享服务正在启动或关闭' }); return true; }
        if (req.method === 'GET') json(res, 200, info);
        else if (req.method === 'POST') {
          const body = await readBody(req);
          if (body.identity !== info.identity) { json(res, 409, { error: '共享服务版本或设置不一致，请统一重启宿主' }); return true; }
          if (!['models', 'health', 'admit', 'observe', 'console'].includes(body.type)) fail('不支持的共享管理操作');
          try { json(res, 200, { value: await executeCommand(body) }); }
          catch (error) { json(res, 503, { error: body.type === 'console' ? error.message : '共享 OFM 服务暂时无法执行请求' }); }
        } else json(res, 405, { error: '请求方法不支持' });
        return true;
      }
      if (route === 'channel-source/import' && req.method === 'POST') {
        const limit = CHANNEL_FILES.find(file => file.path.endsWith('/business.mjs')).bytes;
        if (Number(req.headers['content-length']) > limit) { req.resume(); json(res, 413, { error: '文件超过当前固定版本大小，请下载原始 business.mjs' }); return true; }
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > limit) { json(res, 413, { error: '文件超过当前固定版本大小，请下载原始 business.mjs' }); return true; }
          chunks.push(chunk);
        }
        try { await importChannelBundle(getDataDir(), Buffer.concat(chunks)); }
        catch (error) { fail(error.code === 'integrity' ? error.message : '渠道包缓存写入失败，请检查数据目录权限或磁盘空间'); }
        json(res, 200, { ok: true, restartRequired: true, message: '渠道包已通过大小与 SHA-256 校验并安装。请按 ⌘Q 完全退出 Magpie 后重开，原账号数据保留。' });
        return true;
      }
      if (route.startsWith('upstream/')) {
        const updater = getUpdater();
        if (!updater) { json(res, 503, { error: '更新器尚未就绪' }); return true; }
        if (req.method === 'GET' && route === 'upstream/logs') json(res, 200, { logs: await updater.logs() });
        else if (req.method === 'GET' && route === 'upstream/status') json(res, 200, await updater.status());
        else if (req.method === 'POST' && route === 'upstream/settings') {
          const options = await readBody(req);
          if(options.fallbackModels!==undefined){
            const live=new Set(runtime.publicModelRows().map(row=>row.id));
            if(!Array.isArray(options.fallbackModels)||options.fallbackModels.some(id=>!live.has(id)||!freeFallback(runtime.catalog.find(row=>row.id===id))))fail('备用模型必须是当前OFM已启用的匿名或Kilo免费模型');
          }
          try { const updated = await updater.configure(options); projectSettings(updated.preferences); await context?.onSettingsChanged?.(); json(res, 200, updated); } catch (error) { fail(error.message); }
        }
        else if (req.method === 'POST' && ['upstream/check', 'upstream/build'].includes(route)) {
          await readBody(req);
          void updater.checkNow(route === 'upstream/build' ? { build: true, force: true } : {}).catch(() => {});
          json(res, 202, { ok: true });
        } else if (req.method === 'POST' && route === 'upstream/cleanup') { await readBody(req); json(res, 200, await updater.cleanup());
        } else if (req.method === 'GET' && route === 'upstream/download') {
          const bytes = await updater.artifact();
          res.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': 'attachment; filename="magpie-ofm-upstream-candidate.zip"', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
          res.end(bytes);
        } else json(res, 404, { error: '更新接口不存在' });
        return true;
      }
      if (req.method === 'GET' && route === 'models') {
        const settings = stores.settings.get().aggregate ?? {};
        const catalog = runtime.catalog.map(row => ({ id: row.id, name: row.name, available: getHealth()?.available(row.id) === true, category: row.channel === 'aggregate' ? getProvider(row.providerId)?.auth.kind === 'none' ? 'anonymous' : 'official-api' : row.channel ? 'benefits' : 'anonymous' }));
        const present = new Set(catalog.map(row => row.id));
        for (const [id, setting] of Object.entries(settings.providers ?? {})) {
          for (const model of setting.models ?? []) {
            const modelId = `api/${id}/${model}`;
            if (!present.has(modelId)) catalog.push({ id: modelId, category: 'official-api', available: false, configuredOnly: true, disabled: setting.enabled !== true });
          }
        }
        json(res, 200, {
          lastRoute, fallbackChoices: runtime.catalog.filter(freeFallback).filter(row=>runtime.publicModelRows().some(live=>live.id===row.id)).map(row=>({id:row.id,name:row.name})),
          startupWarnings: getWarnings(),
          channelSource: { commit: CHANNEL_COMMIT, downloadUrl: channelDownloadUrl() },
          health: getHealth()?.snapshot() ?? {},
          healthPreferences: getHealth()?.preferences?.(),
          catalog,
          providers: PROVIDERS.filter(row => row.format === 'openai-chat' && ['none', 'apiKey'].includes(row.auth.kind)).map(row => ({
            id: row.id, name: row.name, available: getHealth()?.available(row.id) === true, category: row.category, auth: row.auth.kind, website: row.website, baseUrl: row.baseUrl,
            models: settings.providers?.[row.id]?.models ?? row.models.map(model => model.id), enabled: settings.providers?.[row.id]?.enabled === true,
            customBaseUrl: settings.providers?.[row.id]?.baseUrl ?? '',
            configured: !!settings.providers?.[row.id]?.apiKey,
          })),
        });
      } else if (req.method === 'POST' && route === 'provider') {
        const body = await readBody(req);
        const provider = getProvider(body.id);
        if (!provider || provider.format !== 'openai-chat' || !['none', 'apiKey'].includes(provider.auth.kind)) fail('此渠道尚不支持本入口');
        if (typeof body.enabled !== 'boolean' || !Array.isArray(body.models) || body.models.length > 100 || body.models.some(id => typeof id !== 'string' || !id.trim() || id.length > 300)) fail('渠道设置无效');
        if (body.apiKey !== undefined && (typeof body.apiKey !== 'string' || body.apiKey.length > 4096)) fail('API Key 无效');
        const aggregate = stores.settings.get().aggregate ?? {};
        const old = aggregate.providers?.[provider.id] ?? {};
        const setting = { ...old, enabled: body.enabled, models: [...new Set(body.models.map(id => id.trim()))] };
        if (body.apiKey) setting.apiKey = body.apiKey;
        if (body.clearKey === true) delete setting.apiKey;
        if (body.baseUrl !== undefined) {
          if (body.baseUrl === '') delete setting.baseUrl;
          else { try { setting.baseUrl = baseURL(body.baseUrl); } catch { fail('端点必须为 HTTPS 或本机 HTTP'); } }
        }
        if (provider.auth.kind === 'apiKey' && setting.enabled && !setting.apiKey) fail('请填写自己的 API Key');
        if (setting.enabled && !setting.models.length) fail('请至少填写一个模型 ID');
        if (provider.id === 'open_router') {
          setting.freeOnly = true;
          if (setting.enabled) {
            const choices = await discoverOpenRouterFree({ ...aggregate, enabled: true, providers: { ...aggregate.providers, [provider.id]: setting } });
            const allowed = new Set(choices.map(row => row.id));
            if (setting.models.some(id => !allowed.has(id))) fail('所选 OpenRouter 模型未被当前目录确认为零价格，请重新获取免费/福利目录');
          }
        }
        persist({ aggregate: { ...aggregate, enabled: true, providers: { ...aggregate.providers, [provider.id]: setting } } });
        getHealth()?.invalidate(`api/${provider.id}/`);
        runtime.syncAggregateCatalog();
        const modelIds = setting.enabled ? setting.models.map(id => `api/${provider.id}/${id}`) : [];
        const probeQueued = false; // Saving configuration never sends inference.

        json(res, 200, { ok: true, enabled: setting.enabled, models: modelIds, probeQueued });
      } else if (req.method === 'POST' && route === 'discover') {
        const body = await readBody(req);
        const provider = getProvider(body.id);
        if (!provider || provider.format !== 'openai-chat') fail('不支持的渠道');
        const config = stores.settings.get().aggregate ?? {};
        if (body.id === 'open_router') {
          const candidates = await discoverOpenRouterFree(config);
          json(res, 200, { checkedAt: Date.now(), models: candidates.slice(0, 100).map(row => row.id), candidates: candidates.slice(0, 100), message: '已获取免费与当前零价格福利模型；请检查后保存。保存会重新核对价格，调用附带零价格上限。需自行配置 OpenRouter Key，实际可用性和额度以账号为准。' });
        } else {
          const ids = await fetchProviderModels(config, body.id, { timeoutMs: 15000 });
          if (!ids) fail('模型目录获取失败，请先保存渠道设置或手动填写模型 ID');
          json(res, 200, { models: ids.slice(0, 100), message: '仅为候选目录，保存后仍需实际探测；此渠道不推断免费额度' });
        }
      } else if (req.method === 'POST' && route === 'probe') {
        const selected = await readBody(req);
        if (stores.settings.get().enabled === false) { json(res, 503, { error: '推理服务已暂停，请先在服务设置中启用' }); return true; }
        if(typeof selected.model!=='string'||!runtime.publicModelRows().some(row=>row.id===selected.model))fail('请选择当前已启用的单个模型');
        void getHealth()?.schedule([selected.model])?.catch(() => {});
        json(res, 202, {ok:true,message:'仅安排所选模型检测；冷却未到期不会重试，不会切换备用模型'});
      } else { json(res, 404, { error: '接口不存在' }); }
      return true;
    },
  };
}
