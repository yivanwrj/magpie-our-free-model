# 更新日志

本文件是本地改造版唯一版本更新记录，按版本倒序；当前版本以package.json为准。历史测试不代表本次重新执行。上游溯源见vendor/ofm/UPSTREAM.json。

## 0.14.6

### 更新

- 改为按需模式：启动、重启、打开控制台、刷新模型列表、保存渠道和后台定时任务均不批量推理。仍可拉取模型目录等元数据。
- 直接使用用户本轮真实请求判断模型状态，不先发测试消息；手动检查必须明确选择一个模型，默认不做额外工具回合测试。
- 增加仅限Our Free Model供应商内的免费备用顺序、开关与每轮1–5个候选上限。备用列表默认空，需明确选择，不读取Magpie其他供应商配置，不自动转为付费。
- 首选失败且尚未输出时尝试下一个兼容备用；找到可用模型就停止，并对同一请求模型入口优先复用最近成功模型30分钟。回复/工具调用开始输出或用户取消后不再重放。
- 记录每个实际尝试的状态、模型冷却和免费通道客户端限制；冷却和最近成功入口保存在本机model-health.json，重启不清零。
- 控制台增加最近请求模型→实际使用模型，避免切换不可见。已有状态名称映射继续保留。

### 修复

- 停止旧版自动开启的推理探测，旧维护配置会迁移为关闭自动探测。
- 单模型测试、实际调用、模型显示共用状态；配置导致的400/404不被误存为模型冷却。
- 模型启用/停用后同步刷新渠道目录，避免重新启用时读到陈旧目录；并发启动等待完整生命周期锁释放。只允许回收本进程能确认已完成的旧锁令牌，未知或仍活跃的令牌继续受保护。
- 共享服务统一处理Chat、Responses和Anthropic入口，避免只在某个客户端生效。
- 保留0.14.5的统一文档约定：更新记录只写update.md，使用说明归README.md，清理重复说明；许可证和溯源文件保留。

### 边界

本包未修改Magpie宿主，不能自动修改所有客户端选择器中当前勾选的模型，也无法读取Magpie为其他供应商勾选的模型。仅内部路由切换；需在OFM明确保存备用顺序。候选必须已启用、未隐藏且兼容已知图片/上下文/输出限制。渠道内部重试另计，模型数上限不等于精确网络请求上限。不会解除上游IP、地区或免费客户端限制。核心仍固定2.5.4/494a1d84，本次不额外合并2.5.5广告改动。

### 验证

完整Node回归325项：323通过、2项可选跳过、0失败；插件契约检查通过。覆盖真实本地网关的403→指定免费备用、后续复用、跨重启冷却、启动与列表读取零推理、停止与卸载、已完成/活跃锁令牌保护、输出后不重放。全部模拟渠道请求使用本地替身，不消耗用户账号额度。当前环境未完成浏览器视觉验收和用户Mac实测，不能据此保证上游403恢复。

## 0.14.5

统一版本日志到update.md，使用、升级、安全检查和清理步骤归README.md，删除重复专题文档、旧验证记录和过期校验清单。后续自动候选也只写统一日志。保留模型状态显示修复。

## 0.14.4

补齐Magpie模型名称的免费通道受限、地区受限、凭据异常等分类映射。状态在刷新模型目录时更新，不是所有客户端实时更新。历史验证314项：312通过、2跳过、0失败。

## 0.14.3

修复401/403都显示授权失败且丢弃具体类型的问题；区分免费客户端限制、地区限制、需要授权和未知403。读取错误体限16KiB，仅记录固定分类。测试出口对DeepSeek一次调用成功，不代表用户网络可用。历史验证313项：311通过、2跳过、0失败。

## 0.14.2

修复深色主题切角裁剪标题；加入更新执行前、测试前及打包前静态增量筛查，敏感变更阻断候选，生成不含原始命中源码的报告；测试期间修改源码禁止发布。静态检查不等于无恶意保证。历史完整验证311项：309通过、2跳过、0失败，补充安全针对性13项通过；未完成浏览器截图验收。

## 0.14.1

Semantic adaptations of community PR #5 (1007cordon-ux) and #7 (Gyarados4157): canonical effort menus with native wire translation, readiness-aware discovery, dataDir-bound private session persistence, and protocol-specific SSE diagnostics in the outer HTTP safety net. Existing 2.5.4 channel gates and shared-service identity verification are retained. Core remains 494a1d84; adapter main baseline remains 36723c85. All vendor changes are reproducibly generated and hash-recorded. See README.md.

## 0.14.0

Upstream remains OFM 2.5.4 / 494a1d84 and adapter 36723c85. Added reproducible native sidebar/router patch, theme-sharing page resources, and shared settings/probe/summary hooks. Disabled legacy background inference probing remains in place; native manual probing now uses the same managed scheduler. Core source adaptations are recorded in vendor/ofm/UPSTREAM.json. No account data migration/removal.

## 0.13.1

OFM updated from f0b979fdf48d3915504f5f20e0a105596712f3c8 (2.5.3) to 494a1d84e5401b54c4760e9da08f4221824f6d10 (2.5.4). Adapter remains 36723c85e55300b92e0308323c22780b90d8123a; live upstream comparison found no adapter update. Upstream range contains 9 commits, primarily sponsor UI, publication metadata and documentation; model transport core did not change.

The existing automatic candidate build correctly stopped at an unknown recommendation-navigation shape before installation. Updated the reproducible navigation patch for the added sponsor tab, and disabled sponsor navigation/daily notice render sites in both UI bundles under the existing local no-announcement policy. Unreachable upstream sponsor implementation/assets remain in the snapshot for provenance; this is not a claim that all sponsor bytes were removed. Channel/EAC pins match the new original checkout. Existing free-only price ceilings, managed health visibility, authenticated console and MCP auxiliary-host isolation are retained.

## 0.13.0

No new upstream merge: OFM remains f0b979f and adapter remains 36723c8. Added a shared persisted automatic-maintenance master switch, independent upstream/health selection and intervals, default keep-visible behavior with explicit strict hiding, local Retry-After admission, and selected-only manual probing. The managed integration disables the standalone duplicate background inference probe and ignores its legacy availability snapshot for membership, preserving explicit user hiding and channel disablement; all health gating is owned by the managed scheduler. Regenerated snapshot with a declared core/runtime.js adaptation. Unified settings are hot-applied and survive restart.

Current-state views no longer expose historical conflict/phase/candidate metadata. A fresh current check clears old failure state. Explicit cleanup is task-lock serialized, operates only on completed owned candidates and preserves the active validated candidate, unfinished work, configuration, runtime caches and backups. Documentation describes manual full-source replacement and exact cleanup boundaries.

## 0.12.9

Adapter main advanced to 36723c85e55300b92e0308323c22780b90d8123a. Core advanced from 8c2c0f1e3a1caf5cb682704a576d36a449a6780d to f0b979fdf48d3915504f5f20e0a105596712f3c8 (2.5.3). The adapter commit is based on an older 2.2.0 snapshot: its stale version, snapshot pins/assets and documentation were not allowed to downgrade the 2.5.x local integration. The isolated three-way merge reported 12 conflicts, resolved retaining newer local/generated files and adopting the adapter's EAC byte limits, signed mounted-path fixtures and RTK regressions. Snapshot and both download manifests were then regenerated from the 2.5.3 fixed source.

Core 2.5.3 removes EAC's separate 60-second no-progress deadline and ignores legacy progressTimeoutMs. Existing cancellation, transport failure detection and recovery time limits remain. Core updater source excludes standalone product/Rust caches from plugin upgrades and preserves legacy rollback receipts; Magpie still uses its separate package-file candidate/apply flow, not the DSH host updater. No change is claimed to restore upstream anonymous model admission.

Preserved MCP auxiliary non-ownership, authenticated service reuse, bounded shutdown, channel source repair, health gating, persistent console launch, OpenRouter zero-price constraints and denied-interface console fix. Account configuration remains outside the plugin source.

Actual isolated merged candidate: 284 tests, 282 passed, 0 failed, 2 optional skipped. Additional unchanged upstream recovery harness: 119/131 checks passed, all EAC waiting/cancellation cases passed; 12 DSH-plugin Forward bootstrap cases timed out in this environment. This upstream harness is not claimed to pass fully. Final distribution's own full suite separately exercises the actual Magpie integration and protocol forwarding. No native macOS/Bun or real user account inference acceptance is claimed.

## 0.12.8

Checked both main branches: adapter unchanged at 9c19948c363716c752d197edc3844df932d8592e; OFM advanced from 3df868aaeaf26af5bf611fc61a909fcc0139d159 to 8c2c0f1e3a1caf5cb682704a576d36a449a6780d. The complete allowed core/standalone snapshot and original channel/EAC download pins were regenerated with original/adapted hashes.

Adopts upstream channel message/tool/image and account rotation fixes, classified stream/HTTP failures and retry metadata, model visibility controls, Chinese combo identities and effort aliases, login/status race fixes, compiled console assets and default free combo. Upstream desktop packaging, DSH host updater and announcement service remain outside the integration. Recommendation navigation remains removed. LAN relay is available in upstream console settings and remains disabled by default.

The automatic update pipeline correctly blocked the old aggregate patch after upstream changed its serialization. Updated that compatibility patch while retaining upstream real-model-ID handling and mandatory OpenRouter zero-price ceiling. A second regression exposed denied os.networkInterfaces() breaking authenticated management summaries in restricted hosts; optional address discovery now falls back to an empty list without disabling local management or changing relay enablement. No diagnostic stack is exposed in the shipped management error response.

Preserves 0.12.7 auxiliary MCP non-ownership, authenticated service borrowing, bounded shutdown, private source cache/import repair, health probes and persistent console launcher. Candidate build passed its full regression after these fixes; final package tests additionally cover new upstream behaviors. Actual macOS/Bun and live account inference are not verified here.

## 0.12.7

Core remains 3df868aaeaf26af5bf611fc61a909fcc0139d159. Host classification reads the parent command (ps on Unix, native process query on Windows) and distinguishes the observed Magpie MCP invocation from the desktop/ordinary CLI host. Recognized MCP hosts take a read-only shared-service path before any installation registration, lifecycle-lock creation, runtime download or spawn. An absent primary returns a tagged unavailable condition, quietly handled by model enumeration/loader/usage. Existing authenticated version/config/source identity checks remain.
The auxiliary host cannot promote itself after the primary exits. It may reconnect after a primary independently starts again. This fixes OFM's side of the dependency without changing DSH configuration or Magpie binaries. It deliberately does not terminate the image MCP process that a DSH client still owns.
macOS/Windows parent-query failure refuses startup instead of guessing that an unknown host is primary. Linux containers where process inspection is prohibited retain CLI startup compatibility. No native macOS/Windows run is claimed.

## 0.12.6

Core pin stays 3df868aaeaf26af5bf611fc61a909fcc0139d159. Independent Magpie plugin hosts now discover a live service under the per-data-directory lifecycle lock before spawning. Reuse requires a matching product/PID, authenticated loopback protocol, identity of package version/source path/runtime settings. The key remains in the user's settings file and is never returned by metadata. A narrow authenticated command endpoint shares existing health/model/admission/observation/console operations; unknown commands and mismatched identities are refused.
Borrowers never close the owner. If the owner exits, a borrower's next ensure rechecks the PID and may start a replacement; in-flight requests can fail during that transition, and uninterrupted failover is not claimed. Old/foreign services are not adopted, killed or unlocked automatically.
All resource closes begin together, with bounded graceful shutdown and a final runner exit deadline, so a stuck update cannot hold up model-service cleanup. Dead-PID diagnostics no longer infer a retained mutex solely from an old lock record.

## 0.12.5

Core pin remains 3df868aaeaf26af5bf611fc61a909fcc0139d159. The channel installer reuses bundled original files only when exact expected size/hash match. The distribution's adapted business module cannot pass the original hash, so it is never mistaken for the original native bundle. Transport retries use fixed-SHA raw/CDN/upstream-proxy URLs, with existing integrity failure blocking retained.
Authenticated management adds a bounded binary upload endpoint for the exact pinned business.mjs. It validates input before writing, reconstructs the other five files from verified shipped dependencies, and uses the existing private atomic cache installer. Uploaded code is not evaluated in the management process, published, logged or added to the package. A full Magpie restart loads the original module. Startup warning details expose only fixed file/source identifiers and allowlisted network classes.

## 0.12.4

Core pin: 3df868aaeaf26af5bf611fc61a909fcc0139d159. Includes EAC card labels and rebuilt UI; upstream feed/updater mirror source changes are retained in the snapshot, while DSH updater, announcements and promotional recommendations remain inactive in Magpie. Magpie's own updater still uses its existing API/Git sources.
Adds lock-owner diagnosis and an explicit manual stop CLI. The CLI requires a matching product, running PID, managed-runner command and unchanged lock before SIGTERM; it never deletes service.lock or credentials and never forces a process. Startup EEXIST now reports owner-specific guidance instead of treating all cases identically. Installation instructions specify replacing the exact registered source path with correct directory depth, one enabled plugin, and data-directory preservation.
The actual candidate generator merged from e490a98 to 3df868aa, regenerated pins and snapshot and exported a regression-validated ZIP. Final distribution version is 0.12.4; temporary automatic candidate version is not the published package version.

## 0.12.3

Core pin remains e490a98dc01c0fda3dfdaa3fa23ad49bf0acb7ec. Reproducible service adaptation adds a kernel-owned loopback TCP process guard on Darwin; dead-lock reclamation still checks product, PID, ownership and unchanged lock bytes. Live owners remain protected. A regression exercises the Darwin branch using real sockets on the available host.
Saved official API models are visible independently of health admission, including disabled entries. Newly saved IDs receive priority within the bounded probe pool, and probing state is explicit. Actual Agnes save/catalog/publication is exercised with local HTTP fixtures; vendor availability is not claimed.
Temporary upstream clones, isolated home/tmp and duplicate distribution trees are removed after successful or failed builds. Valid old build records receive the same cleanup at updater initialization; three recent completed records and the current candidate remain. Source/config backups are intentionally retained. Incomplete work directories are not guessed safe to delete.
The Quick Tunnel TTL test now uses an injected expiry clock and asserts repeated opens do not reset it, avoiding dependence on subprocess startup completing within 400 ms. Production expiry is unchanged.

## 0.12.2

Separate account-bundle startup warnings from model-save results and periodic health refresh. Only 401 requests suggest renewing the console session. Core 2.5.0 pin is unchanged.

## 0.12.1

Pinned core: e490a98dc01c0fda3dfdaa3fa23ad49bf0acb7ec. Adapter base remains 9c19948c363716c752d197edc3844df932d8592e.
Includes the upstream canonical session encoding, declared free-model effort/capability metadata, protocol error handling, channel harness conversion, EAC browser launch helper and built control-panel changes.
Local EAC credential/setup injection now matches the call boundary rather than requiring onSaved to be adjacent. The known EAC diagnostic signatures retain strict mismatch checks. The old channel harness rewrite was removed in favor of the upstream implementation. The new browser helper is included in the distribution.
Promotional recommendations, DSH host updater, announcements and desktop shell remain excluded. OpenRouter zero-price enforcement and existing Magpie health/console adaptations remain.
Updater status exposes allowlisted failure hints, never arbitrary child process output. Failed candidates still cannot replace serving code.

## 0.12.0

Added fixed-repository detection, isolated three-way merge, snapshot regeneration, regression-gated ZIP export, management scheduler and stopped-service application with backups. Upstream pins remain unchanged; no new upstream release is claimed.

## 0.11.0

Source pin: `0b712bcbb887ae101cae5fdf935b0845761a1421`. Reviewed the source delta after e937077: adopted OpenCode request/session/tool compatibility and native channel bundle updates, catalog display names, built standalone assets, and removal of the duplicate generic OpenCode provider row. No desktop shell, DSH host updater, announcement or recommended-project service was introduced.

The standalone assets contain upstream recommendation rendering code; a reproducible navigation/persisted-tab patch keeps that page unreachable. `src/picks.js` is excluded from the snapshot and standalone does not import it. No recommendation-stat network fetch is enabled. The original asset hashes and the explicit local navigation adaptation are both recorded.

Added `ofm-free-update-patch.mjs`: omits recommendation navigation and adds OpenRouter zero-price routing constraints. The aggregate poster also restores the original vendor model ID before sending, retaining the api/ namespace only in Magpie's catalog. OpenRouter pricing discovery/selection lives in src/openrouter-free.mjs and authenticated management routes; price checks apply to synthetic probes and normal inference through the same poster. Existing health/download/console code is retained.

## 0.10.2

增加持续可用的控制台启动器，可随时重新打开已运行服务的短期管理会话，不需要重新登录账号。

## 0.10.1

原始账号包网络下载失败时用随包核心启动，控制台显示降级警告；不跳过文件完整性和安全路径校验。

## 0.10.0

Reviewed standalone/core changes through `e937077fa92d8cc21d3108d5d1e1f32f37e2534e`. Regenerated the complete snapshot with the existing credential stripping/channel adaptations intact. Channel and EAC download pins and original source hashes were recalculated from the same checkout.

Adopted the current inference endpoint and upstream error classification, catalog/probe changes, protocol fixes and guarded stale-lock recovery. Removed the runner's duplicate unguarded stale-lock deletion. Restricted Linux environments that deny abstract sockets use a deterministic loopback TCP guard; collisions fail closed. The guard closes with the service.

Added `ofm-management-extension-patch.mjs` to reproducibly inject authenticated aggregation and health controls into standalone management. This is a local integration extension, recorded in UPSTREAM.json. The existing channel-business Worker adaptations remain intact.

Official API model IDs use an `api/` prefix in the registry composer/parser to prevent collision with account channels such as Gemini. This reproducible adaptation is included in the snapshot manifest.

New health admission and UI live under src/ and assets/. Actual account credentials and downloaded original vault/channel source remain outside the distributed package. No live provider account eligibility or client end-to-end result is claimed.

## 0.9.0

Reviewed the changes from `f8974369c5904858c696b520d8b9b82ad4425f78`
to `e9c4b70d913116284692d7b206a63f39ad6fe8cc`.

Adopted:

- Standalone UI bundles: themes, model batch controls and clearer channel credit
  querying/retry feedback.
- Channel business: Gemini/Cline environment and Windows system proxy handling,
  explicit Gemini quota refresh and image pricing.
- Updated model core and dependencies, including the native Anthropic Messages
  listener. Added a reproducible Magpie Worker adaptation for its harness messages
  and tools; provider/model enablement, effort normalization and token budgets
  still use the original channel logic.
- Updated channel and EAC download commit pins, verified the original downloads,
  and recorded the original and adapted hashes for every retained source file.
- Snapshot generation recognizes hashed channel UI bundles and stages all patches
  before replacing the old snapshot. A patch mismatch leaves the old snapshot
  intact; separately collected UI dependency licenses are retained.

Deferred:

- The new aggregate provider, fallback chain and token-saving modules are copied
  with the core because it imports them. Upstream standalone management lacks
  complete configuration controls and does not enable all DSH-specific wiring.
  They are not advertised as fully available Magpie features.
- DSH host updater/hot reload, announcements, Agent continuation and LAN relay
  remain outside this plugin's supported integration.
