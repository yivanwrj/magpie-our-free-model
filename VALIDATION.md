# Validation — 0.14.1

0.14.1 community-fix validation — 2026-10-19 UTC
Core remains OFM 2.5.4 / 494a1d84e5401b54c4760e9da08f4221824f6d10; adapter main baseline 36723c85.
Full suite in a fresh isolated HOME/XDG/TMPDIR: 307 tests, 305 passed, 0 failed, 0 cancelled, 2 optional skipped; 15.36 seconds.
Plugin contract, whitespace checks, original/adapted snapshot hashes and JavaScript parsing: PASS.
New coverage: canonical menus and native effort translation (including off/disabled and collisions), first discovery with account catalog, private dataDir-bound session persistence, session-cache uninstall, protocol-specific last-resort streaming errors, recursive JSON Schema preservation and existing model-specific CodeArts token normalization.
Real local loader/runner/signed-gateway EAC test proves canonical none maps through the declared disabled level to an actual upstream off request, rather than silently using the default high level. A canonical low request preserves the free lane's native Light token budget.
All vendor/inference endpoints in regression tests are local substitutes. No real user account, Key or upstream model quota was used.
RTK investigation used live GitHub source/API: Magpie c483feadfd88a5b8de8541de0567f3856822bde5, DSH master tree 687f282e8625c6b8d11ff58211a90524be2e4317, RTK issue #3847 and open PR #3934. Magpie/DSH code and user config were not modified.
Community review read 10 issue-list records (6 PRs and 4 actual issues), PR file diffs and discussion comments. Selected fixes are adapted locally, not claimed merged in the upstream repository. See COMMUNITY_REVIEW_ZH.md.
Development checks exposed the old raw-variant test expectation and Node writeHead header caching on an untraced stream; fixed the menu assertion and cached SSE Content-Type before the final successful full suite.
Limits retained: no macOS/Bun/Windows end-to-end or browser visual acceptance; no assertion of live vendor eligibility or fixed free quotas. WorkBuddy client-specific refusals and System One routing still need separate live verification. The older intermittent uninstall cleanup issue is not claimed fixed.


## Historical validation

# Validation — 0.14.0

0.14.0 validation — 2026-10-19 UTC
Core: OFM 2.5.4 / 494a1d84e5401b54c4760e9da08f4221824f6d10; adapter baseline unchanged at 36723c85.
Full suite after native-console integration in fresh isolated HOME/XDG/TMPDIR: 300 tests, 298 passed, 0 failed, 0 cancelled, 2 optional skipped; 14.26 seconds.
Final follow-up after healthy-model interval rescheduling: model-health and real managed-service suites, 40 tests, all passed. Native page polling-disposal and navigation tests also passed (5/5).
Plugin contract, original/adapted snapshot hash verification, git whitespace and changed JavaScript parsing: PASS.
Real loopback HTTP integration covers native-to-maintenance and maintenance-to-native switch/interval updates, service pause blocking inference probes, retained child options under a disabled master, restart persistence, native manual probing and shared health summary. Interval changes immediately recompute healthy expiry without shortening 429 cooldown.
Native pages are registered in the upstream sidebar/router and reuse upstream theme/component CSS. Old /magpie-models redirects to /#providers. Custom-element lifecycle aborts page fetches and clears pollers on unmount.
Visual limitation: Chromium could not be launched in this restricted environment (SIGTRAP), so actual browser rendering/light-dark/mobile screenshots were NOT accepted or verified. Native macOS Magpie/Bun appearance and real-account model availability are not claimed.
The older intermittent uninstall cleanup issue is not claimed fixed. Upgrade by replacing source while retaining account data; do not uninstall/clear accounts merely to update.


## Historical validation

# Validation — 0.13.1

0.13.1 validation — 2026-10-19 UTC
Upstream: OFM 2.5.4 / 494a1d84e5401b54c4760e9da08f4221824f6d10.
Adapter: 36723c85e55300b92e0308323c22780b90d8123a (no newer upstream commit at final check).
Full suite in fresh isolated HOME/XDG/TMPDIR, OFM_UPDATE_TESTING=1: 296 tests, 294 passed, 0 failed, 0 cancelled, 2 optional skipped; 16.81 seconds.
Plugin contract, git diff whitespace, built app/channel JavaScript parsing and original/adapted snapshot hashes: PASS.
New regression coverage verifies retained channel asset imports, no sponsor notice render mounts, excluded recommendation/sponsor navigation, account diagnostics and fail-safe behavior for unknown UI shapes.
The production updater initially refused the 2.5.4 navigation shape in its independent candidate and left installed code intact. The reproducible patch was manually adapted and the pinned snapshot regenerated successfully.
Earlier full runs in the reused test environment hit existing intermittent uninstall leftovers/lifecycle-lock failures. A focused managed-service run passed all 22 tests; the subsequent completely fresh full run passed. This release does not claim that intermittent uninstall race is fixed. Normal updates preserve data; do not uninstall and clear accounts to upgrade.
No native macOS/Bun/Windows or real-account acceptance is claimed. No live provider availability, quota recovery, tool/image eligibility or API key security audit is implied by these checks.


## Historical validation

# Validation — 0.11.0 (2026-10-17 UTC)

- Selective OFM 2.4.0 source pin: 0b712bcbb887ae101cae5fdf935b0845761a1421. Snapshot generation, original/adapted file hashes and channel/EAC pin consistency pass. Existing credential stripping, local service security and native Anthropic channel adaptations remain active.
- Final full suite: 239 tests, 237 passed, 0 failed, 2 optional skipped. Plugin contract, changed JavaScript syntax and git diff whitespace checks pass.
- The 2 optional native-channel tests passed separately using the newly verified original 2.4.0 channel business bundle, mocked vendor replies and real local gateways.
- Upstream OpenCode parity and free-lane wire regression scripts pass against the pinned source; shipped unadapted compatibility sources are hash-verified against that pin. Tests do not establish live OpenCode access eligibility.
- New OpenRouter tests cover free variants and explicit zero-price offers, missing/paid/expired/non-text entries, extremely small positive prices, credential redaction, pricing increases, and the production aggregate poster's mandatory zero token/request price ceilings for free-only accounts.
- Managed integration additionally exercises offer discovery, save-time price revalidation, real synthetic inference through the plugin/standalone to a mocked upstream, restoration of the vendor's original model ID, zero-price request constraints, refusal to save paid models and preservation of prior settings after refusal.
- A new integration assertion exposed that the preexisting aggregate request builder passed its composite catalog ID to upstream. The poster now sets the original modelId explicitly; object and JSON-string bodies are tested.
- The recommendation page is not enabled: navigation and persisted-tab admission are removed reproducibly, src/picks.js is excluded, and no recommendation-stat backend is installed. Built upstream assets can still contain unused rendering strings.
- Existing health filtering, channel-download retry/fallback and reusable console launcher regressions remain in the suite. No live user account, API quota, OpenRouter purchase/billing, native desktop or Pi/DSH/Codex end-to-end session was tested. OpenRouter's server owns actual enforcement of its documented max_price routing constraints.

Historical records follow; earlier intermediate failures are not current pass claims.

# Validation — 0.10.2 (2026-10-16)

- Added a reusable local management launcher. It locates registered OFM data, verifies the running service with the current Key and opens a fresh one-use handoff without signing out, restarting OFM or changing client configuration.
- Dedicated tests: 3 passed. Covers repeated opens, one-use replay refusal, key rotation, unchanged settings, service survival after launcher closure, custom/ambiguous directories and offline errors without secret exposure.
- Final full suite: 233 tests, 231 passed, 0 failed, 2 optional skipped. Plugin contract check and POSIX launcher syntax check passed.
- An intermediate complete run hit the previously recorded lifecycle-lock fixture timeout during forced child restart. The final complete rerun passed; this update does not claim to change that lifecycle implementation.
- Actual macOS/Windows desktop browser launching was not exercised here; browser handoff was validated over real loopback HTTP with a mocked management service. No Magpie GUI button integration is claimed.

# Validation — 0.10.1 (2026-10-16)

- Plugin contract check passed.
- Full suite: 230 tests, 228 passed, 0 failed, 2 optional skipped.
- Added interrupted-body retry regression; transport exhaustion returns the packaged fallback plus an explicit warning. Existing size/hash and symlink refusal tests still pass.
- No change to the pinned OFM/channel/EAC source revision. Original channel downloads remain verified before import.
- This repairs startup behavior under a failed channel-package download, not the user's actual proxy or upstream network. No live test on the user's computer was possible.

# Validation — 0.10.0 (2026-10-16)

- Base plugin: mu-zi-lee/magpie-our-free-model @ 9c19948c363716c752d197edc3844df932d8592e.
- OFM snapshot/channel/EAC: e937077fa92d8cc21d3108d5d1e1f32f37e2534e. Regeneration succeeds; complete upstream/original/adapted SHA-256 checks pass.
- `npm run check`: passes. `npm test`: **227 passed, 0 failed, 2 skipped** (229 tests including subtests).
- Both optional native-channel tests passed separately with the verified current original channel bundle, fixture preload and mocked vendor replies: **2 passed, 0 failed**.
- Health tests exercise actual loopback HTTP and production SSE normalization, tools/results, empty/truncated streams, timeouts, 401/403/429/500, recovery, bounded concurrency, duplicate discovery, expiry, removal, credential invalidation and live refusal.
- Managed integration tests exercise authenticated aggregation controls, secret-free responses, source enable/disable, candidate discovery, real aggregate routing through the plugin/standalone to a mocked upstream, local/remote console UI routes, account/EAC metadata, image/tools, key rotation, child termination, stale-lock recovery and uninstall.
- Intermediate concurrent runs intermittently timed out acquiring the existing uninstall lifecycle lock; isolated managed validation passed. The test script now serializes test files to avoid fixture process contention, and the final complete npm test run passed. Initial failures also exposed missing registry OpenRouter listing metadata and abstract sockets denied by this environment; both have explicit integration fixes.
- No live Magpie executable, Pi/DSH client session, real vendor account, GitHub EAC login, Windows/macOS installation or real quota was available. Local fixture success is not live end-to-end acceptance or a guarantee that OpenCode free-tier access will be granted.
- The management extension uses the existing authenticated, same-origin management router; secrets are never returned by the new listing/status route. UI uses textContent for upstream/model text.

Historical records below describe earlier releases and are not claims of checks rerun here.

# Validation — 0.9.0

## Upstream standalone/core/channel refresh - 2026-10-11

- Reviewed upstream changes from `f8974369c5904858c696b520d8b9b82ad4425f78`
  to `e9c4b70d913116284692d7b206a63f39ad6fe8cc`. The snapshot retains 88
  original paths: 80 byte-for-byte copies and eight recorded adapted paths.
  All snapshot SHA-256 digests and channel/EAC pin consistency checks pass.
- Downloaded the complete new original channel bundle and EAC file set from
  the pinned official source using the production installers; all sizes/hashes
  passed. EAC source files are unchanged at this revision. The public snapshot
  still excludes vault data and embedded OAuth/App ID defaults.
- Added a regression test for native Anthropic forwarding to the real standalone
  account-channel Worker: unauthorized refusal, authenticated JSON text/tools,
  `x-api-key` authenticated SSE, output budget and disabled-model refusal.
  This found an upstream standalone integration gap: the Messages listener
  supplies harness messages, while the Worker originally only accepted OpenAI
  or Responses bodies. The reproducible Worker patch now accepts that format
  and retains the original enablement/effort/budget checks.
- `npm run check` passed. `npm test`: **215 passed, 0 failed, 2 skipped**.
  The two optional native-channel tests passed separately (**2/2**) with the
  verified new original bundle and mocked vendor replies, including Gemini
  credentials and Loomy QR/poll relays.
  One concurrent validation run hit the existing tunnel-expiry fixture's 400 ms
  startup limit under load; rerunning the full suite separately passed. Production
  expiry remains 30 minutes; this fixture can be sensitive to machine load.
- Both real Magpie/Bun smoke scripts passed against isolated fixture services.
  The unified managed smoke, including uninstall, passed using the previously
  built `/tmp/ofm-magpie-uninstall-bin` with the documented uninstall support.
  An initial run against `/tmp/magpie-compaction-darwin` passed login, inference
  and host-exit shutdown but failed cleanup because that build lacks the paired
  uninstall callback support. This is the existing documented host requirement.
- Chromium checked overview, model listing, account channels, EAC and settings
  at 1440x1000 and 390x844. Pages rendered without uncaught script errors; overview
  had no horizontal document overflow. Screenshots of desktop account channels
  and mobile model listing were visually inspected. Browser fixture data and
  generated screenshots remain outside the published package.
- Live vendor account eligibility, real EAC GitHub authorization, Windows proxy
  behavior on Windows and all provider quotas were not tested. No live public
  Cloudflare tunnel was needed for this upstream refresh; existing gateway,
  callback, lifecycle and tunnel fixture coverage passed.
- Aggregate providers, fallback chains and token-saving dependencies are retained
  with the updated core, but upstream standalone management lacks their complete
  configuration and DSH wiring. This release does not claim those controls
  are available in Magpie.

## Previous 0.8.0 validation record

## Accountless Cloudflare console and Tailscale removal — 2026-10-09

- Removed Tailscale client/daemon installation, authorization and runtime integration.
  Saved `consoleAccess: "tailscale"` migrates to Cloudflare. Only legacy cache
  ownership rules remain so uninstall can remove old plugin downloads.
- Official cloudflared **2026.10.0** asset sizes and SHA-256 pins match GitHub
  release metadata for Linux/macOS x64/arm64 and Windows x64. Both macOS archives
  were verified before calculating executable hashes. The official macOS arm64
  binary was downloaded, verified, installed privately and executed successfully.
  No binaries ship in the package; the original Apache-2.0 LICENSE is preserved.
- Live accountless Quick Tunnels were exercised on macOS arm64 using only a
  synthetic management service and fixture credentials. The tunnel connected;
  initial public requests returned DNS `ENOTFOUND`/NXDOMAIN. After approximately
  **80 seconds**, public HTTPS reached the gateway. A second tunnel then passed
  one-use ticket exchange (303), authenticated HTML (200), replay refusal (401)
  and explicit close (200). All tunnel processes and temporary configurations
  were closed afterward. Real Google/WeChat/EAC sign-in was not exercised.
- `npm test`: **214 passed, 0 failed, 2 skipped**. The two optional unchanged
  original-channel tests passed separately (**2/2**) using the verified original
  bundle, a real Worker/gateway and mocked vendor replies. Node/Bun contracts pass.
- Downloader fixtures cover concurrent install, offline reuse, repair, checksum
  rejection before execution, archive/executable verification and official redirect
  restrictions. Tunnel fixtures cover shared opens, isolated config/environment,
  failures, timeouts, 30-minute expiry, close races and owner SIGKILL cleanup.
- Gateway and managed-runner fixtures verify authentication, origin fencing,
  management-only routing, native callback relays and continuing model service
  after remote access closes. Uninstall covers cloudflared caches, incomplete
  downloads, temporary config, legacy Tailscale data and existing external tools.
- Both real Magpie/Bun CLI smoke scripts pass. Fixture runs now intercept browser
  launch commands in their own child PATH and omit transient login URLs from
  successful output. The managed smoke asserts that the browser invocation was
  intercepted. The live user's browser and system PATH are not modified.
- Linux/Windows cloudflared execution was not tested on those platforms. The
  successful public fixture validates this environment at test time; Quick Tunnel
  DNS delay and external service/network availability still affect startup.

## Previous 0.7.0 validation record

## Original channel bundle and remote callbacks — 2026-10-09

- Downloaded all six original channel bundle/dependency/license files from upstream
  commit `f8974369c5904858c696b520d8b9b82ad4425f78`; all pinned sizes and SHA-256
  digests passed. The full original business module is loaded unchanged by the
  existing standalone Worker. No original defaults are copied into the public package.
- The runner no longer reads `gemini-oauth.json` or `loomy-wechat.json`. Invalid
  legacy files do not prevent startup in the real managed service fixture.
- Original-bundle validation uses real Node Worker, standalone management server,
  remote authentication gateway, native Gemini callback listener and native Loomy
  QR/poll listener. Vendor network replies are fixtures: original default Gemini
  client starts login, callback returns through the gateway, native token exchange
  persists refresh token and account identity; Loomy default App ID starts QR login,
  QR HTML/poll paths are rewritten, and native account login/save completes.
- The production managed runner also starts with the original bundle by default,
  despite malformed legacy OAuth/App ID files; original Gemini login starts.
- `npm test`: **213 passed, 0 failed, 2 skipped** (the original-bundle tests
  require a separately downloaded source); that separate native run passed
  **2/2**, so both skipped scenarios were exercised.
- Node/Bun plugin contracts pass. Real Magpie/Bun CLI fixture completes add,
  login, model discovery, inference and uninstall.
- Downloader fixtures verify complete unmodified files, private permissions,
  concurrent install, offline reuse, corruption repair, size/hash rejection,
  symlink rejection and safe failures. Remote relay fixtures reject wrong origin,
  session, port/path/state, duplicates, replay, expired/closed flows and unrelated
  loopback routes; cookies and authorization headers are never forwarded.
- Uninstall fixtures also cover versioned channel downloads and incomplete stages.
- Real Google/WeChat account sign-in, vendor eligibility and live public Funnel
  were not tested. Fixture success does not prove those external services accept
  an account. All channel/model behavior remains pinned to the stated upstream version.

Native bundle validation (requires an already downloaded verified original cache):

```sh
OFM_TEST_CHANNEL_SOURCE=/absolute/path/to/runtime/channels-f8974369c5904858c696b520d8b9b82ad4425f78 \
  node --import ./tests/native-channel-fixture.mjs --test tests/native-channels.test.mjs
```

## Previous 0.6.0 validation record

## Automatic uninstall cleanup — 2026-10-09

- Plugin `magpie.uninstall` declares a standalone cleanup module. The paired
  Magpie change runs it before removing the package/list entry, including when
  disabled, and calls only this plugin's live `lifecycle.dispose` hook first.
  Cleanup is bounded/cancellable. A failure keeps the entry for retry.
- Ownership records retain every data directory used since 0.6.0. Cleanup covers
  automatic Node/Tailscale/EAC downloads and incomplete stages, channel account
  storage, runtime settings/cache/statistics, OAuth configuration and private
  temporary console directories. Exact OFM auth ids and their `#account` suffixes
  are removed under Magpie's auth lock; other providers remain.
- Filesystem fixtures cover history, disabled mode, legacy data adoption, partial
  journal retry, restart after partial cleanup, malformed state/auth, live/unknown
  service locks, expired empty Magpie auth locks, protected paths and replaced
  symlinks. Existing binaries, external EAC source and unrelated custom files
  remain. Repeated uninstall succeeds.
- Real bundled Node service is disposed, its HTTP endpoint closes, registered
  current/history data disappears, and the disposed runtime cannot restart.
- A real Unix socket binds inside a data path longer than 108 bytes through a
  shared private working directory and relative socket name; console shutdown
  removes that directory.
- Modified Magpie CLI + real Bun completes local package add, options, login,
  model listing, loopback fixture inference and `plugin rm`. Service data,
  ownership registry and OFM auth are gone; the pre-existing Node wrapper remains.
  This ran in isolated XDG config/cache paths on macOS arm64.
- Node and Bun contract checks pass; `npm test`: **207 passed, 0 failed, 0 skipped**.
- Magpie native, Linux nogui and Windows builds and vet checks pass. New removal
  tests pass with real Bun; Go source formatting produces no changes.
- `go test -tags nogui ./...` passes under a temporary HOME with pinned Go caches.
- Targeted removal tests also pass with `-race`; paired host implementation is
  [Magpie PR #1](https://github.com/mu-zi-lee/magpie/pull/1), commit
  `d25453b6d55dd7501c21b408e692d65c0fa021da`.
- Replacing Magpie's removal code with its original implementation makes
  `TestRemoveDisabledPluginRunsDeclaredCleanupBeforeRemovingEntry` fail with
  `uninstall left downloaded runtime`. Restoring the change passes.

Uninstall requires the paired Magpie implementation. Updating only this plugin
on a Magpie version without `magpie.uninstall` does not enable automatic cleanup.
Local-folder source checkouts and shared Magpie Bun/caches remain user/host owned.
Pre-0.6 paths that are no longer configured cannot be reconstructed. Other live
Magpie instances must stop before deleting a shared data directory. There was no
live-account deletion, real public Tailscale Funnel or Linux/Windows execution;
cross-platform builds and vet are compilation checks only.

## Previous 0.5.0 validation record

## Automatic EAC source — 2026-10-09

- Original standalone `createStandaloneEac` calls `openSeal` directly, rather than
  the DSH plugin's host-detection gate. The Magpie runner now downloads that
  unchanged module, both dependencies and the MIT license from the official
  pinned commit, verifies fixed SHA-256 hashes, and imports only the complete
  verified set from a private runtime cache. No original material is packaged.
- Live official downloads verified all four hashes. A real Node child started
  through `getManagedRuntime` with default automatic setup, reached the original
  EAC gateway's status endpoint, and returned `available: true`, `configured: true`,
  `required: true`, `authorized: false`. The EAC model credential is absent before
  login. Temporary test data and processes were cleaned up afterward.
- Installer fixtures cover cache reuse offline, permissions, dependency tampering,
  concurrent installation, checksum/size/redirect failure, staging cleanup,
  explicit-source precedence, opt-out, and sanitizing imported module exceptions.
- Real bundled service fixtures verify GitHub authorization collection, original
  HMAC and per-user token forwarding, unified model discovery after login, and
  EAC source failure without disrupting the anonymous model catalog.
- EAC UI now shows safe source setup diagnostics instead of reporting every
  installation failure as an unsupported runtime. Five adapted upstream files
  have updated provenance hashes; 52 of 57 retained paths remain unchanged.
- Node and Bun plugin hook checks pass. Full suite: **195 passed, 0 failed, 0 skipped**.

No real user's GitHub login, Star action, or authorized EAC inference was performed.
The live check confirms source installation and gateway readiness, not free quota
or successful turns after authorization. Source installation on Windows was not
exercised. Existing account data and local API keys are outside the package.

## Previous 0.4.0 run

## Temporary Tailscale console — 2026-10-09

Verified on macOS arm64 with Node and Bun:

- `npm run check` and `bun scripts/check.mjs`: plugin hook checks pass.
- `npm test`: **186 passed; 0 failed; 0 skipped**.
- Linux installer fixtures exercise official pinned URLs, streamed SHA-256 verification,
  matched CLI/daemon extraction, concurrent installation, cache reuse, and rejecting
  a bad checksum before extraction or execution. Official 1.102.4 amd64/arm64 hashes
  were fetched from the release server and pinned in source.
- Controlled CLI processes exercise existing-node reuse, isolated userspace daemon
  with in-memory state/private socket, browser login and Funnel policy authorization,
  free-port selection, foreground-only cleanup, deadline expiry, and worker cleanup
  after SIGKILL of the owner. Existing nodes are never globally reset or logged out.
- Real bundled Node runner and actual management service exercise remote authorize,
  gateway ticket/cookie exchange, management reads, and closing the remote gateway
  while the model service remains available. Funnel transport is a controlled CLI fixture.
- Gateway tests cover unauthenticated requests, replay/expiry, Secure/HttpOnly cookies,
  cross-origin rejection, opening a capability link from Magpie Web, blocked model
  API/local terminal routes, header isolation, and explicit closure.

No live public Funnel or real Tailscale browser authorization was exercised. No Linux
static binary was executed on this macOS host. macOS/Windows system installers are
not automated. Vendor OAuth flows using separate localhost callback listeners still
need their own forwarding; this change does not establish remote login compatibility
for every account channel. The earlier evidence below records the previous run.

## Packaged provider icon

The original `assets/icon.png` is preserved. Its lossless WebP copy is 701,618 bytes
and has identical 1254 × 1254 RGBA pixels, verified by decoding both images.
The package includes both assets. `magpie.icon` supplies the public HTTPS asset;
the auth hook supplies the packaged WebP as a data URI for offline loading.

## Previous 0.3.0 run

Date: 2026-10-09. Linux amd64; Node.js v24.19.0.

## Managed integration

- `npm run check`: one default provider export and hooks passed, no network or credentials.
- `npm test`: **176 passed; 0 failed; 0 skipped**.
- 54 of the 57 retained upstream paths match commit
  `f8974369c5904858c696b520d8b9b82ad4425f78` byte-for-byte. Three adapted paths
  match their declared hashes. Google OAuth defaults and the Loomy WeChat App ID were removed; the EAC vault
  was replaced by an empty stub; and the service accepts an optional local
  credential function. Two encrypted EAC data files are omitted entirely.
  These changes respond to GitHub secret scanning and automatic public-egress review.
- Tests run the actual bundled service in its Node child, including its real
  Worker/channel adapters, with all external fetches redirected to loopback.
- Verified one-use console handoff and reopening, HttpOnly management cookies,
  model discovery, channel image/context metadata, anonymous effort budgets,
  real CodeBuddy tool calls, image bytes, EAC login/poll/signature forwarding
  with a user-selected local fixture credential function (not original secrets),
  model disable admission, key rotation, concurrent startup, graceful shutdown,
  dead-child lock recovery, and account-data retention.
- Original upstream `standalone-channels-test.mjs`: **11/11 checks passed**.
- Original upstream `standalone-management-test.mjs`: **16/16 checks passed**.
  These also use local fixtures; they ran in the separately checked-out pinned
  upstream source, not against production accounts.
- Real official Magpie CLI **0.1.1139** and its **Bun 1.4.2** host passed the
  managed provider sign-in, model metadata and actual Chat request tests.
  After each short-lived CLI host exits, the child stops and releases its lock.
- The optional compatibility-file host suite also passed: three signed-in providers,
  Zen Chat/Responses/Anthropic, Kilo Chat and external-local Chat.

## Automatic Node runtime and single entry

- Main entry exports only `OurFreeModelPlugin`, so normal installation registers
  exactly one provider without compatibility-disable options. Package metadata is
  `magpie-our-free-model` 0.3.0; provider display name is Our Free Model.
- Automatic runtime tests passed in Node and **Bun 1.4.2**: missing-system-Node
  fallback, concurrent download sharing, cache reuse, checksum rejection before
  extraction/execution, failed-install cleanup/retry, explicit-path precedence,
  opt-out, supported target mappings and old/Bun runtime rejection.
- A real official **Node.js 24.21.0 Linux x64** release was downloaded from
  nodejs.org by Bun, checked against the pinned official SHA-256, extracted and
  executed successfully. A second install reused the cache. The actual bundled service
  and installer test suites also passed under this downloaded Node version. This found and fixed
  root/container tar ownership failures using `--no-same-owner` and
  `--no-same-permissions`. No system Node or PATH was modified.
- The bundled service test verifies the configured console handoff port, real
  cookie exchange and shutdown; README provides SSH forwarding for server use.
- The WeChat patch test confirms missing local configuration reports an error,
  configured App ID builds the login URL, and no fixed WeChat App ID remains in
  the compiled bundle. Combined OAuth adaptation was reproduced byte-for-byte
  from the pinned original upstream source. No live Loomy login was performed.
- Windows/macOS/Alpine installers are implemented but not executed on those
  systems. Tests for extraction use small synthetic archives; the separate real
  Linux download check used the official binary, not a synthetic archive.

Reproduce managed-host verification (the Node wrapper is POSIX-only):

```sh
MAGPIE_BIN=/absolute/path/to/magpie node scripts/managed-magpie-smoke.mjs
```

No live vendor inference, real GitHub EAC authorization, or real channel account
login was performed. User-owned Gemini OAuth client configuration and Code Assist
eligibility and Loomy WeChat login configuration were not validated. Browser cookie exchange was verified over HTTP; GUI clicks
and rendering were not exercised. Runtime management is tested on Linux only;
macOS and Windows behavior needs testing on those platforms. The main managed
integration test's POSIX Node wrapper skips on Windows; the other unit tests
still run there. No Node binary is distributed. The hosted management UI and its
backend are retained upstream code, not a newly audited implementation.

The original Magpie used for this historical record did not call custom tool/event/disposal hooks. Models and requests run
through Magpie; management stays in a loopback browser console. Signing out of
the Magpie provider does not itself stop the shared child; exiting its host does.
DSH announcements, plugin self-update/hot reload, LAN relay and DSH Agent resume
are outside this version's integration scope.

## Previous 0.1.0 validation record

Date: 2026-10-09.

## Unit and integration tests

- Runtime: Node.js v24.19.0.
- `node scripts/check.mjs`: three provider exports, config/auth/model hooks passed.
- `npm test`: **156 passed; 0 failed; 0 skipped**.
- Tests use loopback HTTP stand-ins only. No personal accounts or API keys used.
- Retained upstream Zen tests: native Chat Completions, Responses and Anthropic
  Messages; tool snapshots and fragmented deltas; Unicode; protocol errors;
  bounded pending-tool buffers; cancellation and downstream backpressure.
- Added tests: Kilo free-only discovery, paid-model refusal, reasoning menu and
  request mapping, SSE/JSON mismatch, cache fallback, successful empty catalogs,
  Retry-After, caller cancellation, local key substitution and account isolation.

## Real Magpie host

- Official Magpie CLI **0.1.1139**, Linux amd64.
- Download SHA-256 verified against official release metadata:
  `2bce36cf5decc725306af9b5b13fe439a90c9c86ada964f565dc600e6692bbf8`.
- Magpie downloaded and ran its **Bun 1.4.2** plugin host.
- Separate XDG configuration/cache paths; no agent config was changed.
- Added local folder package and set its options with the actual CLI.
- Signed in to all three fixture providers via Magpie's real login prompts.
- `magpie plugin --json` confirms three providers loaded and signed in.
- Kilo context length, image flag and four reasoning variants verified from
  real host output.
- `magpie provider test` passed for:

| Provider | Fixture model | Native upstream protocol |
|---|---|---|
| our-free-zen | chat-free | Chat Completions |
| our-free-zen | responses-free | Responses |
| our-free-zen | messages-free | Anthropic Messages |
| our-free-kilo | fixture/free | Chat Completions |
| our-free-local | qoder/fixture | Chat Completions |

The fixture deliberately labels SSE with `application/json` to check response
prefix detection inside Bun. It also verifies that Kilo receives no key and
the local bridge receives only the local service key.

Reproduce using `MAGPIE_BIN=/path/to/magpie node scripts/magpie-smoke.mjs`.

## Limits of the evidence

No live inference against Zen, Kilo, EAC or the thirteen account channels was
performed. Tests establish plugin installation, host-hook compatibility and
request/response behavior with controlled upstreams. They do not establish
current real model availability, regions, allowances or account eligibility.
The full original OFM service was not installed or tested in this environment;
its local API boundary was represented by the documented fixture.
EAC and account channels remain optional local-service integration, not native
Magpie login implementations. GUI click flows were not exercised; CLI login
and prompts were exercised through the same plugin host.


## 0.12.0 updater validation
Full sequential regression: 247 tests, 245 passed, 0 failed, 2 optional skips. Updater fixtures exercise real local Git history, compatible merge, conflict, patch and test failure, packaging, stopped application and candidate integrity. Full-project candidate build passed. No live channel eligibility or interactive client validation is claimed.


## 0.12.1 / OFM 2.5.0 validation
252 tests: 250 passed, 0 failed, 2 optional skips. Separately enabled original-bundle native-channel fixtures: 2 passed. Upstream free-lane wire assertions passed against a local HTTP fixture. The actual updater detected e490a98, regenerated the snapshot and passed the full suite before exporting a ready ZIP from the old core pin; its first failure against unmodified 0.12.0 correctly blocked publication.
New regression tests exercise legacy session encoding, exact model effort metadata, browser launch fallback with a stub executor, malformed JSON-object requests and explicit streamed dispatch failures for Chat/Responses/Messages. Local status hints are allowlisted rather than echoing arbitrary child output.
The full distributed snapshot is hash-checked. Live vendor access/quotas and interactive Magpie UI were not tested.


## 0.12.2 UI feedback validation
Two targeted tests execute the distributed management script against a mock DOM/API. Agnes model submission preserves the ID, account-bundle warnings remain separate after save and refresh, and validation errors do not request login unless HTTP 401. Both passed. Core source is unchanged from 0.12.1; its recorded full regression is retained, not claimed rerun.


## 0.12.3 validation
Full regression: 257 tests, 255 passed, 0 failed, 2 optional skipped. Added actual-service Agnes configuration/catalog/probe/publication coverage with a local upstream, queue-priority/probing-state coverage, transient build cleanup assertions on success and failure, and a real-socket test of the Darwin guard branch (platform simulated on the available host). The TTL regression uses an injected clock and retains its expiry/no-extension assertions. The final UI sort/labels change also passed both distributed-script UI tests. This is not a native macOS run or live Agnes entitlement check.


## 0.12.4 / OFM 2.5.1 validation
Actual update pipeline from e490a98 to 3df868aa: ready, 261 tests, 259 passed, 0 failed, 2 optional skipped. New tests verify EAC prefix-free labels with preserved routing IDs, missing/dead/owned process diagnosis, safe SIGTERM after revalidation, preservation of credentials, and refusal to signal foreign/changing owners. No native macOS or live user environment validation is claimed. The attached screenshot identifies a lock conflict but cannot establish its process owner remotely.


## 0.12.5 validation
Full regression: 264 tests, 262 passed, 0 failed, 2 optional skipped. Seven channel-source tests cover fixed origins, caching, corruption and integrity refusal, retry, immutable CDN fallback, verified local import and bundled-dependency reuse. Management integration rejects unauthenticated and invalid uploads. A separate real-service smoke uploaded the original ~2.9 MB business file over the authenticated binary endpoint and verified all six private cache hashes. No live vendor account/API or the user's macOS network/proxy was tested.


## 0.12.6 validation
Full suite: 268 tests, 266 passed, 0 failed, 2 optional skipped. Real independent Node host subprocess tests cover owner/borrower PID sharing, shared authenticated health/model/console commands, borrower exit preserving owner, owner exit and recovery, mismatched settings refusal, and simultaneous startup producing one service. Network fixtures are local. Tests reject unauthenticated and mismatched-identity requests. A stuck-updater shutdown regression proves the model service begins closing independently. No native macOS / actual Magpie desktop plus MCP-client test is claimed.


## 0.12.7 validation
Final sequential suite: 272 tests, 270 passed, 0 failed, 2 optional skipped. New role unit tests use the observed Magpie command forms and test macOS lookup failure. Independent host subprocess tests inject primary/auxiliary roles and verify zero OFM creation before the main host, later authenticated sharing, no takeover after main exit, reconnect after main restart, and borrowed close preserving the owner. Provider listing/loader/usage remain quiet when a primary is absent.
An initial focused run saw a lifecycle lock-recovery timeout plus dependent cleanup failure. An unchanged isolated lifecycle rerun passed 20/20; the final full run also passed. This timeout was not reproduced or established fixed by the role change. Native Magpie/Bun/macOS interaction is unverified and remains a material validation limitation. The patch concerns OFM ownership, not terminating an MCP client that remains legitimately connected.


## 0.12.8 / OFM 2.5.2 validation
2026-10-18 UTC — Magpie OFM 0.12.8
Core OFM 2.5.2: 8c2c0f1e3a1caf5cb682704a576d36a449a6780d
Adapter main unchanged: 9c19948c363716c752d197edc3844df932d8592e
Actual isolated automatic candidate build: ready; 272 tests, 270 passed, 0 failed, 2 optional skipped.
Final isolated full regression: 275 tests, 273 passed, 0 failed, 0 cancelled, 2 optional skipped; 12.87 seconds.
Plugin contract and git diff --check: PASS.
Initial candidate correctly refused aggregate patch drift. After adaptation, regression exposed optional interface enumeration breaking console summaries; fixed with empty discovery metadata fallback. No diagnostic error stack shipped.
Added regression coverage: Chinese/mixed combo identity stability; classified quota status/retry metadata and effort aliases; denied network-interface enumeration. Existing real HTTP OpenRouter tests verify object/string bodies, bare model IDs and forced zero-price limits; real subprocess tests verify auxiliary MCP never becomes OFM owner.
Two direct non-isolated full-suite attempts produced truncated reports without totals and were not counted as passes. Isolated candidate and final runs completed with totals above.
No native macOS/Bun/Windows host acceptance or live vendor account/region/quota validation is claimed.


## 0.12.9 validation
2026-10-18 UTC — Magpie OFM 0.12.9
OFM 2.5.3 pin: f0b979fdf48d3915504f5f20e0a105596712f3c8
Adapter pin: 36723c85e55300b92e0308323c22780b90d8123a
Isolated automatic three-way adapter merge: conflicts detected and correctly blocked publication. Twelve stale snapshot/version/provenance conflicts manually reviewed and resolved; newer local runtime, patches and behavior retained. Adapter EAC byte-size checks, mounted-path/signature fixtures and RTK tests adopted. Core snapshot and download pins then regenerated from 2.5.3.
Resolved isolated candidate: 284 tests, 282 passed, 0 failed, 2 optional skipped (11.89 s).
First final-package run: 284 tests, 280 passed, 2 failed, 2 skipped. Uninstall live-service cleanup lock timed out; containing parent also counted failed. No implementation or assertion was disabled to obtain a pass.
Final unchanged-code full rerun with fresh isolated HOME: 284 tests, 282 passed, 0 failed, 0 cancelled, 2 optional skipped (14.11 s).
Plugin contract, snapshot original/adapted hashes and git diff --check: PASS.
Additional unchanged upstream recovery harness: 119/131 checks passed. All EAC no-progress removal, legacy option, silent waiting, heartbeat, text/reasoning/tool, cancellation and no-duplicate-turn cases passed. Twelve DSH-plugin Forward bootstrap cases timed out in this environment. This harness is not claimed to pass fully; packaged Magpie integration/protocol tests passed independently.
Intermittent cleanup-lock behavior remains an observed limitation; the rerun does not establish a root-cause fix. No native macOS/Bun/Windows host validation or live real vendor-account acceptance is claimed.
Package scope excludes .git, dependency/build caches, user data and private downloaded account/EAC sources. UPGRADE_ZH.md describes full source replacement preserving the separate data directory.


## 0.13.0 validation
2026-10-18 UTC — Magpie OFM 0.13.0
Core OFM remains 2.5.3 / f0b979fdf48d3915504f5f20e0a105596712f3c8
Adapter base remains 36723c85e55300b92e0308323c22780b90d8123a
Change scope: unified persisted automatic-maintenance settings, optional strict hiding (default off), 429 visibility and Retry-After admission, selected manual probes, suppression of legacy managed background inference probing/availability gating, historical conflict/candidate display fix, scoped completed-update cleanup, manual replacement/cleanup documentation.
Focused health/updater/UI tests: PASS 22/22 before new coverage.
Focused new health/updater/managed suite: PASS 46/46.
After explicit legacy-gate fix, focused managed/legacy policy suite: PASS 23/23.
Final full sequential suite with isolated HOME/XDG and no live vendor access: 293 tests, 291 passed, 0 failed, 0 cancelled, 2 optional skipped (14.29 seconds).
Plugin contract, whitespace check and original/adapted snapshot hash verification: PASS.
Regression evidence includes real HTTP 429 and local Retry-After response without repeating the upstream call; live strict-visibility switching; disabled maintenance surviving real service restart despite the standalone probe flag being true; old cached unavailability no longer hiding managed models while explicit user hiding remains; manual selected-model probes not touching unrelated models; cleanup preserving private settings/backups and unfinished work.
During development, an old test assumed visibility implied completed inference; it now separately waits for verified health before asserting a fixture completion. A new restart test originally used a stale connection left by a preceding lifecycle test; fixed the fixture to acquire the live authenticated connection. One early full run also saw a residual isolated data directory; later focused/full runs passed without removing the assertion. One final attempt produced a truncated report without totals and was not counted as success.
Known limits: publication still depends on live runtime catalog, explicit channel/model switches and account state; upstream removal is not overridden. Automatic master stops new update checks and inference probes, aborts active health probes, but already-started update builds may complete. User/manual checks remain available. No native macOS/Bun/Windows or real-account acceptance is claimed. Uninstall-lock intermittent behavior observed in earlier releases is not claimed root-cause fixed here.

## 0.14.2
自动维护标题取消主题切角裁剪；修复内容内边距。新增更新安全增量检查，在候选代码执行前、测试前和打包前检查；敏感改动阻断候选发布。完整回归 311 项：309 通过、2 跳过、0 失败。补充测试期间源码变化阻断检查后，上游更新与安全针对性测试 13 项全部通过。浏览器运行文件缺失，未完成实际截图验证。参见 UPDATE_SECURITY_ZH.md；静态检查不等于无泄漏保证。
