// Community PR #7: keep a managed service's free-lane session map in its
// actual dataDir. Preserve the legacy fallback for non-managed upstream uses.
export function patchSessionStore(source) {
  const before = `function sessionStorePath() {
  try { return path.join(path.resolve(resolveDshHome(), DATA_DIR_NAME), SESSION_MAP_FILE) } catch { return undefined }
}`;
  const after = `let sessionRoot
export function setSessionStoreRoot(dir) {
  if (typeof dir !== 'string' || !path.isAbsolute(dir)) throw new TypeError('session store root must be an absolute path')
  if (sessionRoot === dir) return
  sessionRoot = dir
  sessions = undefined
}

function sessionStorePath() {
  try { return path.join(sessionRoot ?? path.resolve(resolveDshHome(), DATA_DIR_NAME), SESSION_MAP_FILE) } catch { return undefined }
}`;
  if (source.split(before).length !== 2) throw new Error('Upstream free-lane session store path changed');
  source = source.replace(before, after);
  const temporary = '    const temp = `${file}.tmp`';
  const write = '    fs.writeFileSync(temp, JSON.stringify({ version: 1, at: Date.now(), sessions: Object.fromEntries(sessions) }, undefined, 2))';
  if (source.split(temporary).length !== 2 || source.split(write).length !== 2) throw new Error('Upstream session store write changed');
  return source.replace(temporary, '    const temp = `${file}.${process.pid}.tmp`')
    .replace(write, write.slice(0, -1) + ', { mode: 0o600 })');
}

export function patchSessionService(source) {
  const marker = "import { createModelRuntime, createRuntimeStores } from '../../src/core/runtime.js'";
  const setup = '    stores = createRuntimeStores({ dataDir, logger })';
  if (source.split(marker).length !== 2 || source.split(setup).length !== 2) throw new Error('Upstream session service binding changed');
  return source.replace(marker, "import { setSessionStoreRoot } from '../../src/upstream.js'\n" + marker)
    .replace(setup, '    setSessionStoreRoot(dataDir)\n' + setup);
}
