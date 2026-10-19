import { omitRecommendedPage, omitSponsorPage, patchOpenRouterPriceCeiling } from './ofm-free-update-patch.mjs';
import { patchManagementExtension } from './ofm-management-extension-patch.mjs';
import { patchConsoleNavigation } from './ofm-console-integration-patch.mjs';
import { patchSessionStore, patchSessionService } from './ofm-session-store-patch.mjs';
import { patchStreamDiagnostics } from './ofm-stream-diagnostics-patch.mjs';
// Copy a pinned upstream runtime without changing its authentication or business logic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { removeEmbeddedOAuthDefaults, externalizeEacCredentials } from './ofm-google-config-patch.mjs';
import { patchChannelSource } from './ofm-channel-source-patch.mjs';
import { patchEacDiagnostics, patchEacSetupUi } from './ofm-eac-setup-patch.mjs';

const pin = '494a1d84e5401b54c4760e9da08f4221824f6d10';
const root = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: node scripts/vendor-ofm.mjs /path/to/upstream');
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() !== pin) throw new Error(`Expected upstream ${pin}`);
const snapshot = fileURLToPath(new URL('../vendor/ofm/', import.meta.url));
if (fs.existsSync(snapshot) && process.argv[3] !== '--replace') throw new Error('Snapshot already exists; review changes before using --replace');
const dest = fs.mkdtempSync(path.join(path.dirname(snapshot), '.ofm-stage-'));
process.on('exit', () => fs.rmSync(dest, { recursive: true, force: true }));
const files = new Set(['LICENSE', 'package.json', 'packages/standalone/package.json', 'packages/standalone/README.md',
  'scripts/standalone-third-party.txt', 'vendor/channel-pack/LICENSE', 'vendor/channel-pack/NOTICE.md',
  'vendor/channel-pack/qoder-auth-wasm.wasm']);
for (const dir of ['src', 'packages/standalone/channels', 'packages/standalone/web']) {
  const walk = base => {
    for (const entry of fs.readdirSync(path.join(root, base), { withFileTypes: true })) {
      const name = `${base}/${entry.name}`;
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile() && !name.includes('.test.') && !name.includes('/test/') && name !== 'src/picks.js') files.add(name);
    }
  };
  walk(dir);
}
for (const name of ['cli', 'service', 'management', 'login-terminal', 'eac', 'open-external']) files.add(`packages/standalone/${name}.mjs`);
const manifest = [];
for (const name of [...files].sort()) {
  const source = path.join(root, name);
  if (!fs.lstatSync(source).isFile()) throw new Error(`Not a regular file: ${name}`);
  const bytes = fs.readFileSync(source);
  const target = path.join(dest, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  manifest.push({ path: name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
const adaptation = removeEmbeddedOAuthDefaults(dest);
const eacAdaptations = externalizeEacCredentials(dest);
const adaptations = [adaptation, ...eacAdaptations];
const digest = content => crypto.createHash('sha256').update(content).digest('hex');
const channelPages = manifest.filter(row => /^packages\/standalone\/web\/channels-[^/]+\.js$/.test(row.path));
if (!channelPages.length) throw new Error('Upstream channel UI bundle missing');
for (const [file, patch, reason] of [
  ...['packages/standalone/service.mjs', 'packages/standalone/management.mjs', 'src/providers/index.js', 'src/core/runtime.js'].map(file => [file, source => patchManagementExtension(file, source), 'Add authenticated Magpie aggregation and unified health controls; avoid duplicate legacy health gates.']),
  ['packages/standalone/eac.mjs', patchEacDiagnostics, 'Expose safe EAC installation diagnostics.'],
  ['src/aggregate.js', patchOpenRouterPriceCeiling, 'Enforce zero token/request pricing for OpenRouter free-only accounts.'],
  ['src/upstream.js', patchSessionStore, 'Bind free-lane session persistence to the managed data directory with private file permissions. Community PR #7 adaptation.'],
  ['packages/standalone/service.mjs', patchSessionService, 'Bind the session map after acquiring the service data directory.'],
  ['src/forward.js', patchStreamDiagnostics, 'Send protocol-specific SSE errors from the last-resort HTTP error handler. Community PR #5 adaptation.'],
  ...channelPages.map(row => [row.path, omitRecommendedPage, 'Omit recommended-project navigation; outside requested update scope.']),
  ...['packages/standalone/web/app.js', ...channelPages.map(row => row.path)].map(file => [file, source => omitSponsorPage(file, source), 'Omit sponsor navigation and daily-notice mounts under the local no-announcement policy.']),
  ['packages/standalone/web/app.js', patchConsoleNavigation, 'Integrate channel and maintenance pages with the upstream sidebar, router and theme.'],
  ...channelPages.map(row => [row.path, patchEacSetupUi, 'Display safe EAC installation diagnostics.']),
  ...['packages/standalone/service.mjs', 'packages/standalone/channels/runtime.mjs', 'packages/standalone/channels/worker.mjs']
    .map(file => [file, source => patchChannelSource(file, source), 'Select verified unchanged upstream channel business in the Worker.'
      + (file.endsWith('/worker.mjs') ? ' Retain upstream native Anthropic harness conversion and effort normalization.' : '')]),
]) {
  const target = path.join(dest, file);
  const updated = patch(fs.readFileSync(target, 'utf8'));
  fs.writeFileSync(target, updated);
  const existing = adaptations.find(row => row.path === file);
  if (existing) { existing.sha256 = digest(updated); existing.reason += ` ${reason}`; }
  else adaptations.push({ path: file, originalSha256: manifest.find(row => row.path === file).sha256, sha256: digest(updated), reason });
}
const omitted = ['src/vault-data.js', 'src/vault-anchor.js'];
fs.writeFileSync(path.join(dest, 'UPSTREAM.json'), JSON.stringify({ repository: 'https://github.com/Ebony-Vinyl/dsh-our-free-model', commit: pin,
  files: manifest.filter(file => !omitted.includes(file.path)), omitted, adaptations }, null, 2) + '\n');
// Keep the separately collected complete UI dependency licenses.
const webLicenses = path.join(snapshot, 'WEB_THIRD_PARTY_LICENSES.txt');
if (fs.existsSync(webLicenses)) fs.copyFileSync(webLicenses, path.join(dest, 'WEB_THIRD_PARTY_LICENSES.txt'));
const backup = `${dest}-previous`;
if (fs.existsSync(snapshot)) fs.renameSync(snapshot, backup);
try { fs.renameSync(dest, snapshot); }
catch (error) {
  if (fs.existsSync(backup)) fs.renameSync(backup, snapshot);
  throw error;
}
fs.rmSync(backup, { recursive: true, force: true });
console.log('Copied runtime without embedded OAuth/EAC defaults; recorded all adaptations');
