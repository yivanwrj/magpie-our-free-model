export function patchManagementExtension(file, source) {
  const replace = (before, after) => {
    if (!source.includes(before)) throw new Error(`Management extension patch mismatch: ${file}`);
    source = source.replace(before, after);
  };
  if (file.endsWith('/service.mjs')) {
    // The managed integration owns one health scheduler. The standalone legacy
    // background probe switch must not launch a second inference probe loop.
    const backgroundProbe = 'runtime.refreshCatalog({ probe: settings.get().standaloneProbe === true, force })';
    if (source.includes(backgroundProbe)) replace(backgroundProbe, 'runtime.refreshCatalog({ probe: managementExtension ? false : settings.get().standaloneProbe === true, force })');
    // Interface enumeration can be denied in containers or restricted hosts.
    // It is optional discovery metadata, so it must not break local management.
    if (source.includes('os.networkInterfaces()')) {
      replace('os.networkInterfaces()', '(() => { try { return os.networkInterfaces() } catch { return {} } })()');
    }
    replace("if (process.platform !== 'win32' && process.platform !== 'linux') return null", "if (process.platform !== 'win32' && process.platform !== 'linux' && process.platform !== 'darwin') return null");
    replace("const address = process.platform === 'win32' ?", "const address = process.platform === 'darwin' ? { host: '127.0.0.1', port: 20000 + parseInt(id.slice(0, 8), 16) % 40000 } : process.platform === 'win32' ?");
    replace("    if (error.code === 'EADDRINUSE') {", "    if (['EPERM', 'EACCES', 'EAFNOSUPPORT'].includes(error.code) && process.platform === 'linux') {\n      const guard = net.createServer(socket => socket.destroy())\n      try { await new Promise((resolve, reject) => { guard.once('error', reject); guard.listen({ host: '127.0.0.1', port: 20000 + parseInt(id.slice(0, 8), 16) % 40000 }, resolve) }) }\n      catch (fallback) { if (fallback.code === 'EADDRINUSE') throw Object.assign(new Error('数据目录互斥端点已占用'), { code: 'EEXIST' }); throw fallback }\n      guard.unref()\n      return () => new Promise((resolve, reject) => guard.close(error => error ? reject(error) : resolve()))\n    }\n    if (error.code === 'EADDRINUSE') {");
    replace('logger = console, refresh = true, probe,', 'logger = console, refresh = true, managementExtension, probe,');
    replace('stores, runtime, channels, eac,', 'stores, runtime, channels, eac, managementExtension,');
    replace('...stores, logger, attributionUserAgent:', '...stores, logger, healthManaged: managementExtension !== undefined, attributionUserAgent:');
  } else if (file.endsWith('/core/runtime.js')) {
    replace('  resolveImage,', '  resolveImage,\n  healthManaged = false,');
    replace('membership: computeMembership(catalog, availability.get(), settings.get()),', 'membership: computeMembership(catalog, healthManaged ? {} : availability.get(), settings.get()),');
    replace('computeMembership(snapshot.catalog, availability.get(), {', 'computeMembership(snapshot.catalog, healthManaged ? {} : availability.get(), {');
  } else if (file.endsWith('/providers/index.js')) {
    replace('return `${provider.id}/${model}`', 'return `api/${provider.id}/${model}`');
    replace('const text = composite.trim()', "const raw = composite.trim()\n  const text = raw.startsWith('api/') ? raw.slice(4) : raw");
  } else {
    replace('onSettingsChanged, loginTerminal', 'onSettingsChanged, managementExtension, loginTerminal');
    replace('  const json = (res,', '  for (const [url, asset] of managementExtension?.assets ?? []) assets.set(url, asset)\n  const json = (res,');
    replace("    if (!authenticated(req)) throw fail(401, '请先登录管理页面')", "    if (!authenticated(req)) throw fail(401, '请先登录管理页面')\n    if (await managementExtension?.handle({ req, res, pathname, stores, runtime, json, readBody, persist })) return");
    replace(".replace('data-login-platform=\"unsupported\"', `data-login-platform=\"${loginPlatform}\"`)", ".replace('data-login-platform=\"unsupported\"', `data-login-platform=\"${loginPlatform}\"`).replace('</body>', '<link rel=\"stylesheet\" href=\"/assets/magpie-console.css\"><script type=\"module\" src=\"/assets/magpie-console.js\"></script></body>')");
    replace('  const summary = () => {', '  managementExtension?.bindSettings(stores, persist, onSettingsChanged)\n  const summary = () => {');
    replace("        ttftMs: available.results?.[entry.id]?.ttftMs ?? null,", "        ttftMs: available.results?.[entry.id]?.ttftMs ?? null,\n        ...managementExtension?.healthRow(entry.id, routable.has(entry.id)),");
    replace('      probedAt: available.at ?? 0,', '      probedAt: managementExtension?.healthCheckedAt() ?? available.at ?? 0,');
    replace('      persist(patch)\n      await onSettingsChanged()', '      persist(patch)\n      await managementExtension?.syncSettings(patch)\n      await onSettingsChanged()');
    replace('      await runtime.refreshCatalog({ probe: body.probe === true, force: body.probe === true })', '      await runtime.refreshCatalog({ probe: managementExtension ? false : body.probe === true, force: body.probe === true })\n      if (managementExtension && body.probe === true) await managementExtension.probe()');
  }
  return source;
}
