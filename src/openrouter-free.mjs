import { resolveProvider } from '../vendor/ofm/src/aggregate.js';

const ZERO = /^0+(?:\.0+)?(?:e[+-]?\d+)?$/i;
const zero = value => value === 0 || typeof value === 'string' && ZERO.test(value.trim());
// A name containing "free"/"alpha" is not a pricing guarantee. Require the
// published input/output prices to be exactly zero, and reject any other
// published nonzero/unknown price rather than guessing which feature uses it.
export function freeOpenRouterModels(rows, now = Date.now()) {
  if (!Array.isArray(rows)) throw new Error('OpenRouter 模型目录格式无效');
  const out = new Map();
  for (const row of rows) {
    if (typeof row?.id !== 'string' || !row.id.trim() || row.id.length > 300) continue;
    if (row.expiration_date) {
      const until = Date.parse(row.expiration_date);
      if (!Number.isFinite(until) || until <= now) continue;
    }
    const pricing = row.pricing;
    const pricedFree = pricing && zero(pricing.prompt) && zero(pricing.completion) && Object.values(pricing).every(zero);
    const router = row.id === 'openrouter/free';
    // The official free router is documented free even when metadata is omitted.
    // Contradictory prices, if published, still exclude it.
    if (!pricedFree && !(router && pricing == null)) continue;
    const output = row.architecture?.output_modalities;
    if (Array.isArray(output) && !output.includes('text')) continue;
    out.set(row.id, {
      id: row.id, name: typeof row.name === 'string' ? row.name : row.id,
      kind: router ? 'free-router' : row.id.endsWith(':free') ? 'free' : 'zero-price-offer',
      contextWindow: Number.isSafeInteger(row.context_length) && row.context_length > 0 ? row.context_length : undefined,
      toolsDeclared: Array.isArray(row.supported_parameters) && row.supported_parameters.includes('tools'),
    });
  }
  return [...out.values()];
}

export async function discoverOpenRouterFree(config, { fetcher = globalThis.fetch, now } = {}) {
  const resolved = resolveProvider(config, 'open_router');
  let response;
  try {
    response = await fetcher(`${resolved.baseUrl.replace(/\/+$/, '')}/models`, {
      headers: resolved.headers, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error('listing failed'); }
    const value = await response.json();
    const rows = freeOpenRouterModels(value.data, now);
    if (!value.data.some(row => row?.id === 'openrouter/free')) rows.unshift({ id: 'openrouter/free', name: 'OpenRouter Free Router', kind: 'free-router', toolsDeclared: false });
    return rows;
  } catch { throw new Error('OpenRouter 免费目录获取失败，请检查 Key、端点和网络；原配置未更改'); }
}
