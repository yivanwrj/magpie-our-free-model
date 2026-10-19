import { getManagedRuntime } from './managed-runtime.mjs';
import { safeID, positive, chatRequest, forwardChat } from './transport.mjs';
import { remoteByDefault } from './cloudflare-console.mjs';
import fs from 'node:fs';
import { magpieEfforts, nativeEffort } from './reasoning-levels.mjs';

const PROVIDER = 'our-free-model';
const SDK = '@ai-sdk/openai-compatible';
const boolean = (value, defaultValue = false) => typeof value === 'boolean' ? value : defaultValue;
let providerIcon;

export function managedModel(row, base) {
  if (!safeID(row?.id)) return;
  const id = row.id.trim();
  const inputs = row.input ?? row.modalities?.input ?? [];
  const rawEfforts = row.reasoning_efforts ?? row.reasoning?.efforts;
  const efforts = Array.isArray(rawEfforts) ? rawEfforts : [];
  const variants = magpieEfforts(efforts);
  return {
    id, providerID: PROVIDER, name: (row.name ?? id) + (row.health_label ? ` · ${row.health_label}` : ''),
    api: { id, url: base, npm: SDK },
    limit: { context: positive(row.context_window ?? row.context_length, 32768), output: positive(row.max_tokens, 4096) },
    capabilities: { temperature: true, reasoning: boolean(row.reasoning, efforts.length > 0),
      toolcall: boolean(row.tool_call ?? row.toolcall, true), attachment: false,
      input: { text: true, image: boolean(row.vision, inputs.includes('image')), audio: false, video: false, pdf: false },
      output: { text: true, image: false, audio: false, video: false, pdf: false } },
    options: {}, headers: {}, variants, status: 'active', release_date: '',
  };
}

export async function createManagedPlugin(input, options = {}) {
  if (options.consoleAccess === 'tailscale') options = { ...options, consoleAccess: 'cloudflare' };
  const runtime = getManagedRuntime(input, options);
  const authorizeConsole = async access => {
    const result = await runtime.command('console', access ? { access } : {});
    const remote = typeof result === 'object';
    return { url: remote ? result.url : result, method: 'auto',
      instructions: remote ? result.instructions : '内置服务已启动。在本机控制台完成 EAC 或账号渠道登录，再回 Magpie 刷新模型。此按钮也可重新打开管理页面。',
      async callback() { return { type: 'success', key: 'managed', metadata: { dataDir: runtime.dataDir } }; } };
  };
  const checkAuth = auth => {
    if (auth?.type !== 'api' || auth.key !== 'managed' || auth.metadata?.dataDir !== runtime.dataDir) {
      throw Object.assign(new Error('请在 Our Free Model 一体化供应商中重新打开控制台并启用'), { signIn: 'expired' });
    }
  };
  async function discover(auth, previous = {}, signal) {
    checkAuth(auth);
    let conn;
    try { conn = await runtime.connection(); }
    catch (error) { if (error.code === 'OFM_PRIMARY_REQUIRED') return {}; throw error; }
    try {
      const rows = await runtime.command('models', {}, signal);
      const models = {};
      for (const row of rows) {
        const model = managedModel(row, conn.base);
        if (model) models[model.id] = model;
      }
      return models;
    } catch (error) {
      signal?.throwIfAborted();
      if (error.signIn === 'expired') throw error;
      return {}; // Health discovery fails closed; never republish stale models.
    }
  }
  return {
    lifecycle: { dispose: () => runtime.dispose() },
    async config(cfg) {
      cfg.provider ??= {};
      cfg.provider[PROVIDER] ??= { name: 'Our Free Model', npm: SDK, models: {} };
      if (cfg.provider[PROVIDER].name === 'Our Free Model · 一体化（全部渠道）') cfg.provider[PROVIDER].name = 'Our Free Model';
    },
    auth: { provider: PROVIDER, maxConcurrency: 2,
      // Carry the packaged picture without depending on access to GitHub.
      icon: providerIcon ??= `data:image/webp;base64,${fs.readFileSync(new URL('../assets/icon.webp', import.meta.url)).toString('base64')}`,
      methods: [
        { type: 'oauth', label: remoteByDefault(options) ? '启用模型 / 临时远程控制台（免登录）' : '启用模型 / 打开账号管理控制台', authorize: () => authorizeConsole() },
        { type: 'oauth', label: remoteByDefault(options) ? '本机控制台 / SSH 转发' : '临时远程控制台（免登录）', authorize: () => authorizeConsole(remoteByDefault(options) ? 'local' : 'cloudflare') },
      ],
      async loader(getAuth) {
        const auth = await getAuth();
        if (!auth) return {};
        checkAuth(auth);
        let conn;
        try { conn = await runtime.connection(); }
        catch (error) { if (error.code === 'OFM_PRIMARY_REQUIRED') return {}; throw error; }
        return { baseURL: conn.base, async fetch(input, init) {
          const currentAuth = await getAuth();
          checkAuth(currentAuth);
          const current = await runtime.connection();
          if (current.base !== conn.base) throw new Error('内置服务地址发生变化，请刷新或重载供应商');
          const { request, body } = await chatRequest(input, init, current.base);
          request.signal.throwIfAborted();
          const admission = await runtime.command('admit', { model: body.model }, request.signal);
          if (admission?.limited) return Response.json({ error: { type: 'rate_limit_error', message: '模型仍在限流等待期，保留列表但暂不重复请求上游，请按 Retry-After 等待。' } }, { status: 429, headers: { 'retry-after': String(admission.retryAfter) } });
          if (!admission) {
            return Response.json({ error: { type: 'invalid_request_error', message: '模型不存在、已停用、探测未通过或没有可用账号；请在控制台检查健康状态并刷新模型' } }, { status: 404 });
          }
          request.signal.throwIfAborted();
          // The service checks its live catalog on every request. Never let an
          // old Magpie cache re-enable a model disabled in the console.
          let outgoing = body;
          if (typeof body.reasoning_effort === 'string') {
            const rows = await runtime.command('models', {}, request.signal);
            outgoing = nativeEffort(body, rows.find(row => row.id === body.model));
          }
          const response = await forwardChat(request, outgoing, { key: current.key });
          // The shared completion observes the actual candidate, not the alias.
          return response;
        } };
      },
      async usage(auth) {
        checkAuth(auth);
        try { await runtime.ensure(); } catch (error) { if (error.code !== 'OFM_PRIMARY_REQUIRED') throw error; return { plan: 'OFM 主服务未运行；图片 MCP 不会自动启动它，请在 Magpie 主程序中启用。', windows: [] }; }
        return { plan: 'Our Free Model 一体化；账号积分、用量、签到和请求日志见本机控制台', windows: [] };
      },
    },
    provider: { id: PROVIDER, async models(provider, { auth, signal } = {}) {
      if (!auth) return {};
      return discover(auth, provider.models, signal);
    } },
  };
}
