import fs from 'node:fs';
import { forwardChat } from './transport.mjs';

export function healthOptions(options = {}) {
  const out = { intervalMs: 900000, timeoutMs: 20000, concurrency: 2, cooldownMs: 120000, tools: true, automatic: true, hideUnavailable: false, ...options };
  for (const key of ['intervalMs', 'timeoutMs', 'concurrency', 'cooldownMs']) {
    if (!Number.isSafeInteger(out[key]) || out[key] < 1) throw new Error(`health.${key} must be a positive integer`);
  }
  if (out.concurrency > 4 || out.timeoutMs > 120000 || out.intervalMs < 1000 || out.cooldownMs < 1000 || typeof out.tools !== 'boolean' || typeof out.automatic !== 'boolean' || typeof out.hideUnavailable !== 'boolean') throw new Error('Invalid health limits');
  return out;
}

// Memory owns admission. Saved diagnostics are never trusted after a restart.
export function createModelHealth(service, options, dependencies = {}) {
  let cfg = healthOptions(options);
  const send = dependencies.send ?? forwardChat;
  const now = dependencies.now ?? Date.now;
  const states = new Map();
  let generation = 0;
  const controllers = new Set();
  let running, timer, closed = false;
  const priority = new Set(), probing = new Set();
  const key = () => JSON.parse(fs.readFileSync(service.keyFile, 'utf8')).forwardKey;
  async function ask(model, messages, extra = {}) {
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const body = { model, messages, max_tokens: 96, stream: false, ...extra };
      const response = await send(new Request(`${service.url}/v1/chat/completions`, { method: 'POST', signal: controller.signal }), body, { key: key() });
      if (!response.ok) {
        const retry = response.headers.get('retry-after');
        const seconds = Number(retry);
        const after = retry ? (Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - now()) : 0;
        await response.body?.cancel();
        throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status, after: Math.max(0, after || 0) });
      }
      const value = await response.json();
      if (value.error || !value.choices?.length) throw new Error('Invalid completion');
      return value.choices[0].message;
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }
  async function probe(row) {
    const old = states.get(row.id);
    const version = generation;
    states.set(row.id, { state: 'probing', tools: false, checkedAt: now(), nextAt: now() + cfg.timeoutMs * 3, failures: old?.failures ?? 0 });
    try {
      const message = await ask(row.id, [{ role: 'user', content: 'Reply with OK.' }]);
      if (typeof message?.content !== 'string' || !message.content.trim()) throw new Error('Empty completion');
      let tools = false;
      if (cfg.tools) {
        try {
          const messages = [{ role: 'user', content: 'Call ofm_health_check with no arguments, then report its result.' }];
          const declarations = [{ type: 'function', function: { name: 'ofm_health_check', description: 'Synthetic connectivity test', parameters: { type: 'object', properties: {}, additionalProperties: false } } }];
          const call = await ask(row.id, messages, { tools: declarations, tool_choice: { type: 'function', function: { name: 'ofm_health_check' } } });
          const calls = call?.tool_calls;
          if (!Array.isArray(calls) || calls.length !== 1 || !calls[0].id || calls[0].function?.name !== 'ofm_health_check') throw new Error('Tool call missing');
          JSON.parse(calls[0].function.arguments);
          const answer = await ask(row.id, [...messages, call, { role: 'tool', tool_call_id: calls[0].id, content: 'OK' }], { tools: declarations, tool_choice: 'none' });
          tools = typeof answer?.content === 'string' && !!answer.content.trim();
        } catch { /* Chat remains usable; never advertise unverified tools. */ }
      }
      if (version !== generation) return;
      states.set(row.id, { state: 'healthy', tools, checkedAt: now(), nextAt: now() + cfg.intervalMs, failures: 0 });
    } catch (error) {
      if (version !== generation) return;
      const failures = (old?.failures ?? 0) + 1;
      states.set(row.id, { state: error.status === 429 ? 'rate_limited' : [401, 403].includes(error.status) ? 'denied' : 'unavailable', tools: false,
        checkedAt: now(), nextAt: now() + Math.max(error.after ?? 0, Math.min(3600000, cfg.cooldownMs * 2 ** Math.min(failures - 1, 5))), failures,
        reason: error.status ? `HTTP ${error.status}` : 'timeout_or_invalid_response' });
    }
  }
  const api = {
    preferences() { return { ...cfg }; },
    configure(patch) {
      const next = healthOptions({ ...cfg, ...patch });
      if (cfg.automatic && !next.automatic) {
        generation++; priority.clear();
        for (const controller of controllers) controller.abort();
        for (const [id, state] of states) if (state.state === 'probing') states.delete(id);
      }
      if (next.intervalMs !== cfg.intervalMs) {
        for (const state of states.values()) if (state.state === 'healthy') state.nextAt = state.checkedAt + next.intervalMs;
      }
      cfg = next; return api.preferences();
    },
    visible(id) { return !cfg.hideUnavailable || api.available(id); },
    retryAfter(id) { const s = states.get(id); return s?.state === 'rate_limited' ? Math.max(0, Math.ceil((s.nextAt - now()) / 1000)) : 0; },
    available(id) { const s = states.get(id); return s?.state === 'healthy' && now() < s.nextAt; },
    reject(id, status, retryAfter) {
      if (![401, 403, 404, 429].includes(status) && status < 500) return;
      const seconds = Number(retryAfter);
      const delay = retryAfter ? Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now() : 0;
      generation++;
      states.set(id, { state: status === 429 ? 'rate_limited' : 'unavailable', tools: false, checkedAt: now(), nextAt: now() + Math.max(cfg.cooldownMs, delay || 0), failures: 1, reason: `HTTP ${status}` });
    },
    invalidate(prefix = '') { generation++; for (const id of states.keys()) if (id.startsWith(prefix)) states.delete(id); },
    snapshot() { return Object.fromEntries(states); },
    schedule(ids = [], { automatic = false } = {}) {
      if (automatic && !cfg.automatic) return;
      for (const id of ids) priority.add(id);
      if (closed || running) return running;
      running = (async () => {
        const rows = service.runtime.publicModelRows();
        const liveIds = new Set(rows.map(row => row.id));
        for (const id of states.keys()) if (!liveIds.has(id)) states.delete(id);
        const pending = rows.filter(row => (!ids.length || ids.includes(row.id)) && (!states.has(row.id) || states.get(row.id).nextAt <= now()));
        let index = 0;
        await Promise.all(Array.from({ length: cfg.concurrency }, async () => {
          while (!closed && (!automatic || cfg.automatic)) {
            const live = service.runtime.publicModelRows();
            let row;
            for (const id of priority) {
              if (probing.has(id)) continue;
              priority.delete(id);
              row = live.find(current => current.id === id);
              if (row && (!states.get(row.id)?.nextAt || states.get(row.id).nextAt <= now() || states.get(row.id).state !== 'rate_limited')) break;
              row = undefined;
            }
            if (!row) {
              while (index < pending.length && (!live.some(current => current.id === pending[index].id) || probing.has(pending[index].id) || states.get(pending[index].id)?.nextAt > now())) index++;
              row = pending[index++];
            }
            if (!row) break;
            probing.add(row.id);
            try { await probe(row); } finally { probing.delete(row.id); }
          }
        }));
      })().finally(() => { running = undefined; if (!closed && priority.size) void api.schedule([], { automatic }).catch(() => {}); });
      return running;
    },
    start() { timer = setInterval(() => { void api.schedule([], { automatic: true })?.catch(() => {}); }, 5000); timer.unref(); void service.ready.then(() => api.schedule([], { automatic: true })).catch(() => {}); },
    async close() { closed = true; clearInterval(timer); for (const controller of controllers) controller.abort(); await running; },
  };
  return api;
}
