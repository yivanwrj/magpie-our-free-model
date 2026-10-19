// Adapt the community PR #5/#7 idea at the plugin boundary. Magpie exposes
// variant names, but forwards canonical reasoning_effort strings itself, so
// the wire must translate back too (not merely rename the menu).
const ranks = Object.freeze({ off: 0, none: 0, disabled: 0, minimal: 1, light: 2, low: 3, medium: 4, balanced: 4, high: 5, on: 5, extra_high: 6, xhigh: 7, max: 8, deep: 8, ultra: 9 });
const levels = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
export function magpieEfforts(efforts = []) {
  const variants = {};
  const distance = {};
  for (const entry of efforts) {
    const id = typeof entry === 'string' ? entry : entry?.id;
    if (!Object.hasOwn(ranks, id)) continue;
    let level = typeof entry === 'object' && levels.includes(entry?.canonical) ? entry.canonical : undefined;
    if (!level) level = levels.filter(value => (ranks[value] === 0) === (ranks[id] === 0))
      .sort((a, b) => Math.abs(ranks[a] - ranks[id]) - Math.abs(ranks[b] - ranks[id]) || ranks[b] - ranks[a])[0];
    const gap = Math.abs(ranks[level] - ranks[id]);
    if (!Object.hasOwn(variants, level) || gap < distance[level] || id === level) {
      variants[level] = { reasoningEffort: id };
      distance[level] = gap;
    }
  }
  return variants;
}

export function nativeEffort(body, row) {
  if (typeof body.reasoning_effort !== 'string' || !row) return body;
  const efforts = row.reasoning_efforts ?? row.reasoning?.efforts;
  const declared = Array.isArray(efforts) ? efforts : [];
  if (declared.some(value => (typeof value === 'string' ? value : value?.id) === body.reasoning_effort)) return body;
  const native = magpieEfforts(declared)[body.reasoning_effort]?.reasoningEffort;
  return native ? { ...body, reasoning_effort: native } : body;
}
