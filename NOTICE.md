# Third-party notices and provenance

## Primary upstream: Our Free Model

The full account-channel integration, standalone model runtime, EAC authorization,
statistics and local management UI are from **Ebony-Vinyl/dsh-our-free-model**:
https://github.com/Ebony-Vinyl/dsh-our-free-model
Pinned commit: 494a1d84e5401b54c4760e9da08f4221824f6d10 (OFM 2.5.4; upstream author attribution retained).
96 upstream paths are retained under vendor/ofm; UPSTREAM.json records every original hash and 15 adapted paths, along with omitted vault data files. Adaptations remove embedded OAuth/App ID defaults and distributed vault material, retain original credential loading, add safe EAC diagnostics, select verified channel business, preserve native Anthropic harness tools, and expose authenticated Magpie aggregation/health controls, and namespace official API model IDs to avoid account-channel collisions. The guarded service lock uses a loopback TCP guard on macOS and a fallback for Linux sandboxes without abstract sockets.
The generator patches are scripts/ofm-google-config-patch.mjs, scripts/ofm-eac-setup-patch.mjs scripts/ofm-channel-source-patch.mjs scripts/ofm-management-extension-patch.mjs, scripts/ofm-console-integration-patch.mjs and scripts/ofm-free-update-patch.mjs. These adaptations
avoid publishing credential material and comply with repository secret scanning.
Normal startup downloads the complete original channel bundle, contracts, Qoder WASM and licenses from the official pinned source, verifies all file sizes and SHA-256 digests and loads it unchanged from a private runtime cache. Native Gemini OAuth defaults and Loomy WeChat configuration are used directly from that bundle; no extra local OAuth/App ID files or Loomy environment overrides are read. The public distribution-only fallback omits these defaults. Downloaded channel source is removed on uninstall. The remote gateway relays the native Loomy login listener and permits a session-bound Gemini callback return while retaining the registered localhost redirect URI. EAC installs the pinned original source in a private runtime cache by default; an explicitly selected local source overrides it. Server authorization/login/signature flow remains unchanged. No original vault decryption code, ciphertext or shards are distributed.
The integration uses the upstream's published standalone entry point. OFM 2.5.4 recommendation/sponsor navigation and daily sponsor-notice mounts are omitted from the UI, and its standalone-unused picks backend is excluded. Local aggregate adaptations enforce zero-price OpenRouter endpoints and restore the vendor model ID on outbound requests.
Original MIT license: vendor/ofm/LICENSE. Channel-pack attribution and MIT license:
vendor/ofm/vendor/channel-pack/NOTICE.md and LICENSE. The channel pack's original
upstream is iJetLi/deepseek-harness-codearts (Gitee), absorbed commit
345f0a07b22713c0ae189ca7d8b97ec4f64626c6.

Qoder's WASM runtime code is retained unchanged. Original EAC material is not shipped, logged, re-minted or published by this repository. The plugin downloads unchanged vault modules and their MIT license from the official upstream at the pinned commit, verifies pinned SHA-256 digests, and caches them privately (0700/0600). Its existing openSeal function is used only inside the local service, matching upstream standalone. Decrypted values are never persisted. The user may disable this installation with managed.autoInstallEac: false or choose their own local upstream source. Original GitHub/Star authorization and server checks
remain in place. No personal account credentials, local API keys or data directories
are included.

Original standalone third-party notices are preserved in
vendor/ofm/scripts/standalone-third-party.txt. Additional complete licenses for
the bundled UI's React, Radix, TanStack Virtual, Lucide, clsx, tailwind-merge and
Tailwind dependencies are included in vendor/ofm/WEB_THIRD_PARTY_LICENSES.txt.
No Node executable is bundled in this repository. Version 0.3.0 may download an official Node.js 24.21.0 runtime from nodejs.org to the user's private data directory, after checking the pinned official SHA-256. Unix release archives retain their original licenses; Node.js license and third-party terms are also available at https://github.com/nodejs/node/blob/v24.21.0/LICENSE. No remote installation script is executed.

New Magpie-specific code manages the child service, maps model metadata and opens
one-use console handoffs. Those are adaptations, not authorship of OFM's original
channels or management features. This is an independent, unofficial port.

## Compatibility Zen provider

The Zen provider and its streaming/tool-call compatibility code are adapted
from https://github.com/magpie-community/plugins/tree/main/packages/zen-free
at commit 5189b287e7aedd413a3332ef3c5da247a48193a0, fetched on 2026-10-09.
The original MIT license and copyright are preserved in vendor/zen-free/LICENSE.

Local changes: provider id renamed from opencode-zen-free to our-free-zen
(including test expectations); response prefix inspection added; entry wrapped
to export a named provider function; helper added for upstream tests. The optional compatibility wrapper displays Our Free Model · Zen. The main entry no longer loads this provider by default.
The original upstream tests are retained alongside the implementation.

Kilo and local-gateway providers are newly implemented for the documented
Magpie/OpenCode hooks. Their connection design is informed by
https://github.com/Ebony-Vinyl/dsh-our-free-model (src/kilo.js, src/catalog.js,
packages/standalone/README.md) and https://usemagpie.ai/docs/plugins.
These two compatibility providers do not embed EAC credentials. Starting in
0.2.0 the separate managed provider ships the original upstream runtime snapshot
described above, and no longer requires a manually started external OFM service.

This is an independent package, not an official Magpie release or a release
by the original OFM maintainer. No npm publication is implied by its name.

## 临时远程管理入口

插件可从 https://github.com/cloudflare/cloudflared/releases/tag/2026.10.0 下载官方
cloudflared 2026.10.0 发行文件，校验固定大小和 SHA-256 后缓存到用户数据目录；
macOS 解压后的可执行文件另外校验固定 SHA-256。二进制不随本仓库分发。
cloudflared 原始 Apache-2.0 许可完整保留在 vendor/cloudflared/LICENSE，并随缓存客户端保存。
其源代码和第三方依赖信息见 https://github.com/cloudflare/cloudflared/tree/2026.10.0 。
临时网关、下载器和进程管理代码位于本仓库 `src/`，未修改固定的上游管理服务。
Tailscale 运行集成和下载器已移除；卸载清理仅保留旧缓存的识别规则。

0.13.0 additionally makes managed health the single background probe and membership policy while retaining explicit user model hiding; the standalone core runtime adaptation is recorded in UPSTREAM.json.

## Community fixes adapted in 0.14.1

Reasoning-menu, readiness/session-store and stream-diagnostic ideas were adapted from mu-zi-lee/magpie-our-free-model PR #5 by 1007cordon-ux (d544400ba4ed816df4798804d401d93eb3bbfc2e) and PR #7 by Gyarados4157 (1a7f00bd7d3083f6a014fdb2162a34dd38bc6269), under the repository MIT license. See COMMUNITY_REVIEW_ZH.md for scope and additional validation.
