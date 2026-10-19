export function mountModels(root, { signal, onSettingsSaved = () => {} } = {}) {
const $ = id => root.querySelector(`#${id}`);
const timers = [];
const poll = fn => timers.push(setInterval(() => { if (!document.hidden) fn(); }, 10000));
signal?.addEventListener('abort', () => timers.forEach(clearInterval), { once: true });
let providers = [];
let maintenance = {};
async function api(route, body) {
  const r = await fetch(`/api/management/magpie/${route}`, body === undefined ? { signal } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  const value = await r.json();
  if (!r.ok) {
    if (r.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('ofm:unauthorized'));
    throw Object.assign(new Error(value.error ?? `HTTP ${r.status}`), { status: r.status });
  }
  return value;
}
function choose() {
  const p = providers.find(p => p.id === $('source').value);
  if (!p) return;
  $('candidateInfo').textContent = '';
  $('enabled').checked = p.enabled;
  $('key').value = ''; $('clear').checked = false; $('base').value = p.customBaseUrl ?? '';
  $('models').value = (p.id === 'open_router' && !p.enabled ? ['openrouter/free'] : p.models).join('\n');
  $('details').textContent = `${p.auth === 'none' ? '匿名或本地渠道' : '自带 Key 的官方 API'} · ${p.configured ? '已保存凭据' : '未保存凭据'} · ${p.customBaseUrl || p.baseUrl || '需要配置端点'}。保存会覆盖此渠道的模型选择。`;
}
async function refresh() {
  const data = await api('models');
  providers = data.providers;
  maintenance.health = data.healthPreferences ?? {};
  if (data.channelSource) $('channelDownload').href = data.channelSource.downloadUrl;
  $('startupWarnings').textContent = (data.startupWarnings ?? []).join('\n');
  $('startupWarnings').hidden = !data.startupWarnings?.length;
  if (!$('source').options.length) {
    for (const p of providers) { const option = document.createElement('option'); option.value = p.id; option.textContent = `${p.name} · ${p.category}`; $('source').append(option); }
    choose();
  }
  $('rows').replaceChildren();
  const prefix = `api/${$('source').value}/`;
  const catalog = [...data.catalog].sort((a, b) => Number(b.id.startsWith(prefix)) - Number(a.id.startsWith(prefix)));
  const labels = { probing: '正在探测', healthy: '可用', rate_limited: '受到限流', denied: '授权被拒绝', unavailable: '调用失败' };
  for (const row of catalog) {
    const s = data.health[row.id];
    const tr = document.createElement('tr');
    for (const text of [row.id, row.category, row.disabled ? '已保存 · 渠道未启用' : row.configuredOnly ? '已保存 · 未进入运行目录' : s ? `${labels[s.state] ?? s.state}${s.state === 'healthy' && !row.available ? ' · 待复核' : ''}${s.reason ? ' · ' + s.reason : ''}` : (maintenance.health.automatic === false ? '已保存 · 未验证（自动检查关闭）' : '已保存 · 等待检查'), s?.tools ? '已验证' : '未验证', row.disabled ? '渠道未启用' : s?.state === 'rate_limited' && s.nextAt > Date.now() ? '等待至 ' + new Date(s.nextAt).toLocaleString() : maintenance.health.automatic === false ? '自动检查已关闭' : s ? new Date(s.nextAt).toLocaleString() : '等待检查']) { const td = document.createElement('td'); td.textContent = text; tr.append(td); }
    $('rows').append(tr);
  }
}
const run = fn => fn().catch(e => { $('status').textContent = e.message + (e.status === 401 ? '；管理会话已过期，请从 Magpie 重新打开控制台。' : ''); });
$('source').onchange = choose;
$('provider').onsubmit = event => { event.preventDefault(); run(async () => { const saved = await api('provider', { id: $('source').value, enabled: $('enabled').checked, apiKey: $('key').value, clearKey: $('clear').checked, models: $('models').value.split('\n').map(s => s.trim()).filter(Boolean), baseUrl: $('base').value }); $('key').value = ''; $('status').textContent = saved.enabled === false ? '已保存，但渠道未启用；请勾选启用后再次保存。' : saved.probeQueued === false ? '已保存；推理服务暂停，启用服务后再探测。' : '已保存并优先排队探测：' + (saved.models ?? []).join('、') + '。下方始终显示已保存模型；默认保留已启用模型；启用严格隐藏后才按健康状态过滤。'; await refresh(); }); };
$('discover').onclick = () => run(async () => { const data = await api('discover', { id: $('source').value }); $('models').value = data.models.join('\n'); $('status').textContent = data.message; $('candidateInfo').textContent = data.candidates ? data.candidates.map(row => `${row.name} [${({ 'free-router': '免费路由', free: '免费模型', 'zero-price-offer': '当前零价格／可能限时福利' })[row.kind] ?? row.kind}]`).join('；') : ''; });
$('refresh').onclick = () => run(refresh);
$('probe').onclick = () => run(async () => { const r = await api('probe', {}); $('status').textContent = r.message; await refresh(); });
run(refresh); poll(() => run(refresh));

let updatesLoaded = false;
let updatesDirty = false;
async function refreshUpdates() {
  const state = await api('upstream/status');
  if (!updatesLoaded || !updatesDirty) {
    $('updateEnabled').checked = state.preferences.enabled;
    $('updateBuild').checked = state.preferences.autoBuild;
    $('checkUpstream').checked = state.preferences.checkUpstream;
    $('checkModels').checked = state.preferences.checkModels;
    $('healthMinutes').value = state.preferences.healthIntervalMinutes;
    $('hideUnavailable').checked = state.preferences.hideUnavailable;
    $('updateHours').value = state.preferences.intervalHours;
    updatesLoaded = true;
  }
  dependencies();
  const labels = { idle: '等待首次检查', checking: '检查中', current: '没有新更新', available: '发现更新', building: '正在合并/测试', ready: '候选包已通过测试', conflict: '合并冲突，需人工处理', failed: '构建失败', check_failed: '检查失败', interrupted: '任务已中断' };
  const lines = [labels[state.status] ?? state.status, state.message ?? ''];
  if (state.checkedAt) lines.push('最近检查：' + new Date(state.checkedAt).toLocaleString());
  if (state.detail) lines.push('原因：' + state.detail);
  if (state.phase) lines.push('阶段：' + state.phase);
  for (const [name, source] of Object.entries(state.sources ?? {})) lines.push(`${name}: ${source.current?.slice(0, 8)} → ${source.latest?.slice(0, 8) ?? '检查失败'}${source.changed ? '（有变化）' : ''}`);
  if (state.conflicts?.length) lines.push('冲突文件：' + state.conflicts.join('、'));
  if (state.candidate) lines.push('已验证候选版本：' + state.candidate.version);
  $('updateStatus').textContent = lines.join('\n');
  $('downloadUpdate').hidden = !state.candidate;
}
const updateRun = fn => fn().catch(error => { $('updateStatus').textContent = error.message; });
$('saveUpdates').onclick = () => updateRun(async () => { await api('upstream/settings', { enabled: $('updateEnabled').checked, autoBuild: $('updateBuild').checked, intervalHours: Number($('updateHours').value), checkUpstream: $('checkUpstream').checked, checkModels: $('checkModels').checked, healthIntervalMinutes: Number($('healthMinutes').value), hideUnavailable: $('hideUnavailable').checked }); updatesDirty = false; updatesLoaded = false; await refreshUpdates(); await refresh(); onSettingsSaved(); $('status').textContent = '已保存；服务设置中的探测开关和刷新间隔已同步。'; });
$('checkUpdates').onclick = () => updateRun(async () => { if (!$('checkUpstream').checked && !$('checkModels').checked) throw new Error('请至少选择一个检查项目'); if ($('checkUpstream').checked) await api('upstream/check', {}); if ($('checkModels').checked) { const result = await api('probe', {}); $('status').textContent = result.message; } await refreshUpdates(); await refresh(); });
$('buildUpdates').onclick = () => updateRun(async () => { await api('upstream/build', {}); await refreshUpdates(); });
updateRun(refreshUpdates); poll(() => updateRun(refreshUpdates));

$('showUpdateLogs').onclick = () => updateRun(async () => { const data = await api('upstream/logs'); $('updateStatus').textContent = data.logs.length ? data.logs.map(log => log.name + '\n' + log.text).join('\n\n') : '暂无构建日志'; });

$('importChannel').onclick = async () => {
  const file = $('channelFile').files?.[0];
  if (!file) { $('importStatus').textContent = '请先选择浏览器已下载的 business.mjs'; return; }
  $('importChannel').disabled = true; $('importStatus').textContent = '正在校验并安装…';
  try {
    const response = await fetch('/api/management/magpie/channel-source/import', { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file, signal });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error ?? `HTTP ${response.status}`);
    $('importStatus').textContent = value.message;
  } catch (error) { $('importStatus').textContent = error.message; }
  finally { $('importChannel').disabled = false; }
};

$('cleanUpdates').onclick = () => updateRun(async () => { const result = await api('upstream/cleanup', {}); $('cleanupStatus').textContent = result.message; await refreshUpdates(); });

function dependencies() {
  const master = $('updateEnabled').checked;
  $('checkUpstream').disabled = !master;
  $('checkModels').disabled = !master;
  $('updateBuild').disabled = !master || !$('checkUpstream').checked;
  $('updateHours').disabled = !master || !$('checkUpstream').checked;
  $('healthMinutes').disabled = !master || !$('checkModels').checked;
}
for (const id of ['updateEnabled','checkUpstream','checkModels','updateBuild','updateHours','healthMinutes','hideUnavailable']) {
  $(id).oninput = () => { updatesDirty = true; dependencies(); };
}
return { refresh: () => Promise.all([refresh(), refreshUpdates()]) };
}
