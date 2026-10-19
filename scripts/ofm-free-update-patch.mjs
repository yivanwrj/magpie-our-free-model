// Keep the upstream built channel UI, but do not enable its promotional page.
export function omitRecommendedPage(source) {
  if (!source.includes('a("nav.tab.picks")')) return source;
  for (const pattern of [/,"picks"(?=,|\])/g, /,\["picks",a\("nav\.tab\.picks"\),null\]/g]) {
    if ((source.match(pattern) ?? []).length !== 1) throw new Error('Recommendation navigation patch mismatch');
    source = source.replace(pattern, '');
  }
  return source;
}

// Keep the local no-announcement policy when upstream adds sponsor navigation.
// Match render sites rather than CSS: hidden notices must not claim a daily view
// or install timers, listeners and localStorage state in the first place.
export function omitSponsorPage(file, source) {
  if (!source.includes('ofm-sponsor-menu-')) return source;
  const patterns = file.endsWith('/app.js') ? [
    /,\{label:"项目支持",items:\[\{id:"sponsor",name:"来自赞助商的广告",icon:[\w$]+\}\]\}/g,
    /,"sponsor"(?=\])/g,
    /,[\w$]+\.jsx\([\w$]+,\{targetId:"ofm-sponsor-menu-desktop",placement:"side"\}\)/g,
  ] : [
    /,"sponsor"(?=\])/g,
    /,\["sponsor",[\w$]+\.title,null\]/g,
    /,[\w$]+\([\w$]+,\{targetId:"ofm-sponsor-menu-plugin"\}\)/g,
  ];
  for (const pattern of patterns) {
    if ((source.match(pattern) ?? []).length !== 1) throw new Error('Sponsor navigation patch mismatch');
    source = source.replace(pattern, '');
  }
  return source;
}

// A free-only OpenRouter account must not silently use a paid endpoint when
// a zero-price promotion ends. The upstream owns enforcement of max_price.
export function patchOpenRouterPriceCeiling(source) {
  const current = "  const bodyText = typeof outbound === 'string' ? outbound";
  if (source.split(current).length === 2) {
    return source.replace(current, `  if (providerId === 'open_router' && config?.providers?.open_router?.freeOnly !== false) {
    const parsed = typeof outbound === 'string' ? JSON.parse(outbound) : { ...outbound }
    const preference = isRecord(parsed.provider) ? parsed.provider : {}
    outbound = { ...parsed, provider: { ...preference, max_price: { prompt: 0, completion: 0, request: 0 } } }
  }
${current}`);
  }
  const before = "  const bodyText = typeof body === 'string' ? body : JSON.stringify({ ...body, stream: true })";
  if (source.split(before).length !== 2) throw new Error('Aggregate poster patch mismatch');
  return source.replace(before, `  let outgoing = typeof body === 'string' ? JSON.parse(body) : { ...body }
  if (model) outgoing.model = model
  if (providerId === 'open_router' && config?.providers?.open_router?.freeOnly !== false) {
    const preference = isRecord(outgoing.provider) ? outgoing.provider : {}
    outgoing = { ...outgoing, provider: { ...preference, max_price: { prompt: 0, completion: 0, request: 0 } } }
  }
  const bodyText = JSON.stringify({ ...outgoing, stream: true })`);
}
