# Our Free Model — Magpie 插件

## 0.14.1 社区修复

审核适配器现有 issues 与 PR，移植思考档位标准名及请求还原、首次目录就绪等待、会话缓存目录和 SSE 异常诊断修复。保留 0.14.0 原生控制台整合。原核心已覆盖的 WorkBuddy 会话规则不重复修改。具体采纳范围和待验证问题见 COMMUNITY_REVIEW_ZH.md；Magpie 无法给 DSH 安装 RTK 的原因见 RTK_DSH_ZH.md。

## 0.14.0 原生控制台整合

渠道管理、更新与健康监测已接入原生侧栏，复用项目的主题、卡片、按钮、输入框和开关，不再使用独立大蓝色页面或浮动入口。侧栏“管理”下新增“渠道与模型”“更新与健康监测”；原 /magpie-models 地址跳转到新页面。原项目已具备可用性探测，本版将原生开关、间隔、手动探测和健康状态接到同一调度器，保留新增工具验证及 429 冷却。详见 CONSOLE_INTEGRATION_ZH.md。

## 0.13.1 当前更新

核心同步至 OFM 2.5.4 / 494a1d84，Magpie 适配器基线仍为 36723c85。更新固定版本的控制台与渠道缓存来源，修复 2.5.4 控制台导航变化导致自动构建失败。保留本地无推荐/公告策略，禁用新增赞助导航与每日公告挂载；上游模型请求核心本次未变化，不代表限流或账号权限恢复。保留 0.13.0 统一维护、模型显示和 MCP 宿主隔离。替换见 UPGRADE_ZH.md，清理边界见 CLEANUP_ZH.md。

## 0.13.0 维护行为（继续保留）

此节记录 0.13.0 引入的维护行为，0.13.1 已将核心升级至 OFM 2.5.4。自动更新与健康探测统一在“自动维护与模型检查”设置，总开关关闭可停止新增自动任务。默认保留限流、未验证或暂时异常的模型；严格隐藏可选。429 等待期不重复请求。旧冲突不再混在“无更新”状态下显示，支持清理完成的历史更新构建。详见 MAINTENANCE_ZH.md；下方旧版说明属于历史记录，发布策略以本节为准。


## 0.12.9 当前更新

内置 OFM 2.5.3，固定提交 f0b979f；适配仓库合并至 36723c8。移除 EAC 独立的 60 秒无进展终止规则，合入 EAC 下载大小校验与挂载路径签名测试，以及工具输出压缩回归测试。保留 MCP 不接管 OFM、健康探测和免费路由约束。完整替换步骤见 UPGRADE_ZH.md。


> **原项目：[`Ebony-Vinyl/dsh-our-free-model`](https://github.com/Ebony-Vinyl/dsh-our-free-model)，作者 [Ebony-Vinyl](https://github.com/Ebony-Vinyl)。**
> 本仓库是它的第三方 **Magpie 适配版本**，不是原项目官方发布。
> 账号渠道、EAC 授权流程、本地服务与管理界面来自原项目；这些功能的主要实现归原作者及其上游贡献者。
> 本仓库新增 Magpie 供应商接口、自动服务管理、浏览器管理入口和兼容测试。

版本 **0.14.1**，包名 **`magpie-our-free-model`**。正常安装只显示 **Our Free Model** 一个供应商，统一提供匿名/Kilo、EAC 与账号渠道。
插件图标使用 `assets/icon.png` 的无损 WebP 副本（像素和尺寸相同，满足 Magpie 的 1 MB 限制），随包加载，无需联网获取图标。

[首次打开管理页面](#在-magpie-中打开管理页面) · [服务器访问](#服务器部署与浏览器控制台) · [页面打不开](#页面打不开时) · [更新](#更新已有版本) · [卸载清理](#卸载与自动清理)

## 随时重新打开 OFM 管理控制台（0.10.2）

保持 Magpie 和插件运行，双击插件目录里的 **Open-OFM-Console.command**（macOS），或 **Open-OFM-Console.cmd**（Windows）。Linux/其他终端运行 `npm run console`。

这个入口每次为正在运行的服务生成新的短期管理会话，不需要退出账号或重新走首次连接。不要收藏旧的 `/open/…` 一次性链接；可把启动器的替身/快捷方式放在桌面。启动器不会另起 OFM，也不会修改模型或账号设置。浏览器打开后，启动器进程两分钟后自行退出，不影响控制台和模型服务。

Magpie 宿主当前没有提供插件自定义常驻管理按钮的接口，本版通过独立启动器提供持续可用的入口，不声称已修改 Magpie 供应商卡片。自定义/便携目录及远程环境见 INSTALL_ZH.md。

## 安装与首次使用

不需要手动启动 Our Free Model，也不需要 `npm install` 或编译。插件会准备运行环境、启动服务，并把模型接入 Magpie。

```sh
git clone https://github.com/mu-zi-lee/magpie-our-free-model.git
magpie plugin add ./magpie-our-free-model
```

也可以在本仓库 **Code → Download ZIP** 下载并解压，然后在 Magpie 的 **插件（Plugins）** 页面添加解压后的项目目录、启用插件。安装目录需要保持固定。

[![Star History Chart](https://api.star-history.com/chart?repos=mu-zi-lee/magpie-our-free-model&type=timeline&legend=bottom-right)](https://www.star-history.com/?repos=mu-zi-lee%2Fmagpie-our-free-model&type=date&releases=&legend=bottom-right)

### 在 Magpie 中打开管理页面

**当前界面使用远程入口的顺序：启用插件 → 选择远程连接 → 等首次弹窗结束 → 再点开 Our Free Model → 打开管理链接。**

1. 在 Magpie 的 **插件（Plugins）** 页面确认本插件已启用。
2. 打开 **供应商（Providers）** 页面，找到 **Our Free Model**，进入登录／连接入口。也可以从插件卡片的登录入口进入该供应商。
3. 选择适合安装位置的方式：

   | Magpie 安装在哪里 | 选择哪个入口 | 浏览器打开的地址 |
   |---|---|---|
   | 自己正在使用的电脑 | **启用模型 / 打开账号管理控制台** | `http://127.0.0.1:端口/open/…` |
   | 服务器、SSH 或远程容器 | **临时远程控制台（免登录）**，或 **启用模型 / 临时远程控制台（免登录）** | `https://随机名称.trycloudflare.com/open/…` |
   | 服务器，已自行建立 SSH 端口转发 | **本机控制台 / SSH 转发** | 经 SSH 转发的本机地址，见[转发步骤](#通过-ssh-转发访问) |

4. 首次使用需要下载 Node、原渠道包等缺少的组件；远程入口还会准备 Cloudflare 客户端并建立临时通道。等待完成，保持 Magpie 运行。
5. **如果首次选择远程连接后只是弹出登录提示，然后返回供应商页面，没有自动跳转：再次点开 Our Free Model，重新进入登录／连接入口，选择同一个远程方式。** 此时可打开管理链接。若界面提供 **再次打开（Open again）** 或复制链接按钮，也可直接使用；没有自动打开浏览器时，复制当前完整链接到自己电脑的浏览器。
6. 进入网页后，在控制台完成 EAC 授权或添加渠道账号。回到 Magpie 刷新供应商模型，再为 Agent 选择 `our-free-model` 下的模型。

**Magpie 显示供应商已连接，只表示插件已启用。** 匿名 Zen/Kilo 模型可直接刷新使用；EAC 还需要在网页完成 GitHub 授权与 Star 校验，账号渠道则要分别登录厂商账号。
“远程控制台免登录”指无需 Cloudflare 账号；渠道本身的登录要求仍由原项目和厂商决定。

### 以后如何重新打开

回到 Magpie 的 **供应商 → Our Free Model → 登录／连接入口**，再次选择本机或远程控制台方式。
该入口也用于重新打开管理页，无需卸载插件或退出已有渠道账号。界面的按钮文字可能随 Magpie 版本、语言和连接状态略有变化。

使用本次生成的完整 `/open/…` 链接，不要只打开域名首页，也不要反复打开旧链接。
链接十分钟内有效、只能使用一次；它换取浏览器管理会话，服务 API Key 不进入 URL。
远程通道最多保持 30 分钟，结束后重新从 Magpie 生成入口。

### 使用时保持 Magpie 运行

桌面 Magpie、`magpie web` 或 `magpie serve` 需要持续运行，内置服务随插件宿主运行。
终端的 `magpie plugin login our-free-model` 是短命命令，命令退出后服务也会关闭；
完成网页里的渠道登录，请优先使用正在运行的 Magpie 界面。
关闭窗口可能只是退到托盘；完全退出 Magpie 才会停止服务。

### 一体化版本覆盖范围

| 功能 | 实现与位置 |
|---|---|
| 匿名 Zen 与 Kilo 免费池 | 统一供应商发现模型和推理，沿用原项目路由 |
| 十三个账号渠道的实现 | CodeArts、CodeBuddy、WorkBuddy 国际版、LobsterAI、Qoder、Qoder 中国版、TRAE、Cline、Loomy、Raccoon、MiniMax Code、ZCode、Gemini；完整渠道包与默认登录配置直接来自原仓库 |
| 渠道登录、账号池、轮换和续期 | 原项目渠道后端与控制台；账号凭据只保存在本机 |
| 签到/领取积分、模型开关、积分锁定、账本与备份 | 原控制台与渠道实现；供应商停用及模型停用会阻止实际调用 |
| EAC 登录、Star 校验、资源池 | 自动安装原项目固定版本来源（也可指定本机目录），沿用原服务端授权；不修改服务端校验逻辑 |
| 模型上下文、图片、思考档位 | 根据真实运行目录映射到 Magpie，保留上游档位 ID |
| 用量、请求日志、服务设置 | 本机控制台；Magpie 也记录经过自身网关的请求用量 |
| Chat Completions / Responses / Anthropic Messages | 内置服务支持三种；Magpie 插件使用 Chat 接口；其他本机客户端可用原生 `/v1/messages`（普通/流式回复及工具调用） |
| 本机 API 转发 | 控制台 API 接入页复制地址和密钥；其他本机工具可调用 |
| 生命周期与密钥轮换 | 插件启动/停止服务；控制台轮换密钥后，插件下次请求自动读取新密钥 |

**覆盖范围：**管理界面在独立浏览器页面中打开；服务器部署使用临时 HTTPS 地址访问。Magpie 没有插件自定义页面接口，管理界面不能嵌入 Magpie 窗口。
原 DSH 的公告推送、插件自更新/热重载、宿主 Agent 自动续跑和局域网中继尚未迁移。
本机服务只监听回环地址；更新此仓库后需通过 Magpie 重载插件或重启。
原项目的 OpenCode 账号渠道仍默认停用。
没有逐家使用真实账号验收，也不保证上游模型、登录接口和免费额度一直有效。

### 0.12.8 选择性同步与 OpenRouter 免费/福利接入

同步 OFM 2.4.0 来源 `0b712bcbb887ae101cae5fdf935b0845761a1421` 中的免费通道请求兼容、工具映射、模型名称、控制台资产和渠道业务包；移除聚合注册表中重复且通用传输不可用的 OpenCode 免 Key 行。原生免费通道仍保留。未启用上游“推荐项目”页面：该页仅介绍 EAC-Desktop/EAC-Pack、展示 GitHub 项目数据，不提供额度或模型。

OpenRouter 候选获取现同时识别 `openrouter/free`、有明确零价格信息的 `:free` 模型，以及官方目录当前标价为零的其他模型（可能是限时福利）。拒绝已到期、价格不明、已收费或非文本输出条目。保存时重新获取目录核对，不按名字中的 alpha/free 等字样猜免费。新增 OpenRouter 账号默认仅免费模式；原已配置账号也默认发送零价格上限，付费 OpenRouter 模型不在本版用途内。

OpenRouter 出站请求附带 `provider.max_price` 的输入/输出/每请求价格上限 0，促销结束后应由上游拒绝没有零价格端点的请求；不会自动降级成付费推理。账号专属赠送余额/优惠券不能自动当作免费模型。还修正了聚合出站模型 ID：Magpie 的 `api/渠道/模型` 标识在发送厂商前还原为厂商原始模型 ID。

使用：打开 OFM 管理控制台 → 渠道与健康探测 → OpenRouter → 填自己的 Key、启用并保存默认 `openrouter/free` → 获取候选目录 → 检查列表并保存 → 探测后刷新 Magpie。没有替用户申请账号或启用任何新渠道。

此前的健康过滤、下载重试/降级、独立控制台启动器继续保留。

### 0.10.1 启动修复

原始账号渠道包的网络下载最多重试三次；25 秒下载预算耗尽或连接中断时，以随包核心启动，不再阻塞整个控制台。健康页面显示降级警告，匿名池与官方 API 可继续配置（仍需网络及上游准入）。部分原生账号登录依赖原始包，下载恢复后重启 Magpie 即可重新安装。文件大小/哈希错误及不安全缓存路径仍阻止启动，不会跳过校验。

### 本次改造（0.10.0，2026-10-16）

完整安装包的升级步骤见 [INSTALL_ZH.md](INSTALL_ZH.md)。

- OFM 核心、渠道包、EAC 来源统一固定到 `e937077fa92d8cc21d3108d5d1e1f32f37e2534e`，保留完整性校验与原授权流程。
- 默认真实推理健康探测：SSE 完整性、非空回答、工具调用及结果回传；只有已验证的工具能力会注册进 Magpie。
- 探测失败、过期、停用或没有可用账号的模型不发布；403/429/5xx 在实际调用失败时也会更新健康状态，后台冷却重试。
- 原控制台右下角新增“渠道与健康探测”，提供匿名/本地、官方 API 配置与候选目录获取；账号福利渠道仍在原控制台登录。
- OpenRouter 候选范围在 0.12.8 扩展为免费路由、明确零价格免费变体和当前零价格福利；候选必须保存并通过真实推理才发布。
- 不跨渠道自动转发用户提示词。仍通过 Magpie Agents 管理 Pi、DSH 等客户端，无须在 Agent 中逐个配置渠道。

聚合入口仅启用注册表中的 OpenAI Chat 兼容 API；其他原生协议、OAuth/ADC 聚合渠道的新增配置入口未开放。
回退链与 Token 节省模块仍保留上游代码，未增加独立控制台入口。
健康状态自动更新；Magpie 和 Agent 的模型菜单需要刷新/重新加载，不能保证旧客户端缓存即时消失。

### Node 自动安装

Magpie 提供 Bun，但原项目渠道 Worker 需要 Node。插件先使用可用的 **Node.js 22.19+ 或 24+**；
服务器没有合适的 Node 时，首次启用自动从 **nodejs.org** 下载固定版本 **24.21.0**，
使用代码中固定的官方 SHA-256 校验，通过后解压并检查能否运行，再启动服务。
安装到数据目录的 `runtime/`，之后直接复用；无需 root、不改系统 Node/PATH、不执行远程安装脚本。
首次下载约 50–65 MB，需要访问 nodejs.org，解压后占用更多磁盘空间。
Linux/macOS 需要系统自带的 `tar`。支持 Linux x64/arm64、macOS x64/arm64 和 Windows x64/arm64；
Alpine 自动安装目前支持 x64。Windows/macOS 尚未实机验收。
下载失败、架构不支持或系统 libc 不兼容时会显示原因，修复后可重试，或指定已安装的 `managed.nodePath`。
显式设置了 `nodePath` 时会使用该路径；路径无效会报错，避免悄悄替换你指定的运行环境。
可设 `managed.autoInstallNode: false` 关闭自动下载。
官方运行环境与许可来自 [Node.js](https://nodejs.org/)；Unix 压缩包中的许可随运行环境保留。

### 更新已有版本

路径安装可在仓库目录运行 `git pull --ff-only`，随后完全退出并重启 Magpie，重新读取包名和入口。
ZIP 安装请用新版文件替换旧目录，保留自己的账号数据目录。
升级后主入口不再注册 `our-free-zen`、`our-free-kilo`、`our-free-local`；它们原有登录数据不会被插件删除。
若 Agent 仍选用了这些旧 ID，请改选 **Our Free Model** 下的模型。
若界面仍保留旧行，请重载插件或重启 Magpie。新版卸载会删除账号数据，更新时请保留安装条目。

### 卸载与自动清理

**需要支持 `package.json` 中 `magpie.uninstall` 回调的 Magpie。** 配套实现见 [Magpie PR #1](https://github.com/mu-zi-lee/magpie/pull/1)，对应分支 `codex/plugin-uninstall-cleanup`；
原有 Magpie 仅移除插件条目并跳过包脚本，单独更新插件不能让旧宿主自动清理。

使用支持回调的 Magpie，在插件页面点击卸载，或运行 `magpie plugin rm <安装路径或包名>`，会先停止该插件的服务与临时 Cloudflare 控制台，再删除：

- 本插件自动下载的 Node、cloudflared、原渠道包、EAC 来源及未完成的下载目录；旧版本下载的 Tailscale 也会清理。
- 设置、模型缓存、统计、渠道账号、EAC 登录、旧版 Gemini OAuth 和 Loomy 配置文件、临时文件。
- 本插件在 Magpie 中的统一供应商及旧兼容供应商登录记录。
- 0.6.0 起登记过的历史 `managed.dataDir`，即使后来改了路径或停用了插件。

首次使用会在 Magpie 配置目录保存清理登记，并在专用数据目录写入归属标记；卸载成功后这些登记也会删除。
升级前的旧版本没有历史目录登记，卸载时只能识别当前配置指向的旧 OFM 数据目录。
系统已有 Node/cloudflared/Tailscale、自行指定的外部 EAC 源码、其他供应商账号，以及自定义目录中的无关文件会保留。
路径安装的源码目录由用户管理，Magpie 保留该目录；包管理器安装的插件包由 Magpie 移除。
共享的 Magpie Bun 和缓存由 Magpie 管理，不属于本插件的下载。

清理失败会保留插件安装条目供重试，可能已经清理的文件不会恢复。
若另一个 Magpie 实例仍在使用同一数据目录，请关闭它后重试。
普通停用、退出、重启和升级保留账号与运行环境；只有卸载执行清理。

### 服务器部署与浏览器控制台

默认 `managed.consoleAccess: "auto"`：检测到 SSH 环境，或没有 DISPLAY/WAYLAND_DISPLAY 的 Linux 时，
供应商登录入口使用 **临时远程控制台（免登录）**。自动判断只是环境启发式；
判断不符合实际时可在登录方式中选择本机/远程入口，或显式设置 `"local"`、`"cloudflare"`。

按上面的[Magpie 操作步骤](#在-magpie-中打开管理页面)选择远程入口：先完成供应商启用，若首次没有跳转，再点开 **Our Free Model** 并重新选择同一入口。
无需 Cloudflare 账号、登录、域名或 Tailscale；客户端连接后会给出随机的
`https://随机名称.trycloudflare.com/open/…`，在自己电脑浏览器中打开。
临时域名可能需要一两分钟才能访问，实测首次约 80 秒；遇到 DNS 错误时先稍等再刷新。

插件优先使用已有 `cloudflared`。缺少可用客户端时，自动从
[Cloudflare 官方发行页](https://github.com/cloudflare/cloudflared/releases/tag/2026.10.0)
下载固定 **2026.10.0**，校验固定大小和 SHA-256，再缓存到插件数据目录 `runtime/`。
自动下载支持 **Linux/macOS x64、arm64 和 Windows x64**，macOS 解压需要 `tar`。
首次下载约 20–55 MB；不需要 root，不修改系统 PATH，不安装系统服务。

完成账号管理后点击页面顶部 **结束远程访问**。退出控制台登录、通道启动后满 **30 分钟**、
或宿主退出都会关闭本次入口；重新从 Magpie 打开可开启新通道。模型服务继续在服务器本机运行。

若服务器没有被自动识别，可在插件选项中强制使用远程入口：

```json
{
  "managed": {
    "consoleAccess": "cloudflare",
    "autoInstallCloudflared": true
  }
}
```

命令行可写入同样的插件选项（替换为自己的安装路径；已有其他选项时一并保留），保存后重启 Magpie：

```sh
magpie plugin options /absolute/path/to/magpie-our-free-model '{"managed":{"consoleAccess":"cloudflare"}}'
```

可用 `cloudflaredPath` 指定已有官方客户端（2024 或更新版本）。
`autoInstallCloudflared: false` 禁止自动下载，缺少客户端时直接显示原因。
旧配置 `consoleAccess: "tailscale"` 自动迁移为 Cloudflare，不再运行或下载 Tailscale；
旧 `tailscalePath`、`tailscaledPath` 和 `autoInstallTailscale` 配置不再生效。

管理服务仍只监听回环地址。Quick Tunnel 转发到插件独立的管理网关；网关校验 HTTPS Host/Origin、
一次性链接和 Secure/HttpOnly 会话，拒绝模型 API 和本机终端登录入口。
客户端使用独立临时配置，忽略已有具名隧道的 token/配置环境变量；关闭时结束本次进程并删除临时配置。
服务器需要能访问 GitHub 发行文件和 Cloudflare 隧道服务。
[Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) 用于临时访问，
不保证可用性，不支持 SSE；本插件只用它管理账号，模型流式请求仍走本机服务。

远程控制台会将 Loomy 原生微信扫码页和轮询/绑定接口转发到当前临时 HTTPS 地址，直接使用原渠道包的 App ID。
Gemini 保留原项目的 `http://localhost:<端口>/oauth-callback`，符合 Google 桌面应用回调规则。
Google 授权后，若你的电脑无法打开 localhost 页面，复制地址栏中的完整回调地址，回到远程控制台，
展开 **Gemini 服务器登录回调**，粘贴并回传。原渠道包继续处理 state 校验、令牌交换与账号保存；
不需要再为这个回调端口建立 SSH 转发。回传限于当前管理会话启动的登录，端口、路径和 state 必须匹配。
其他渠道的独立回调仍沿用上游流程；本版未逐家使用真实账号验证远程登录。
控制台 API 接入页显示的是服务器本机 API 地址，不会通过这个临时入口公开模型 API。

#### 通过 SSH 转发访问

如果不使用临时公网通道，可以保留 SSH 方式。在自己电脑上转发管理服务和一次性交接服务两个端口。
可设置固定端口，避免每次查找交接端口：

```json
{ "managed": { "consoleAccess": "local", "port": 18900, "consolePort": 18901 } }
```

重启服务器上的 Magpie，在你电脑的终端执行：

```sh
ssh -N -L 18900:127.0.0.1:18900 -L 18901:127.0.0.1:18901 your-user@your-server
```

保持这个终端运行，再打开 Magpie 给出的 `http://127.0.0.1:18901/open/…` 链接；
浏览器随后跳转到本机 18900，经 SSH 到达服务器控制台。交接链接只能使用一次，失效后重新生成。
两端对应端口需空闲；服务端 18900 若被占用会选择其他端口，以实际地址为准并调整转发。
部分账号渠道还依赖浏览器登录或其他回调端口，应按该渠道提示额外转发；Node 自动安装不会替你登录厂商账号。

### 页面打不开时

| 现象 | 处理方法 |
|---|---|
| 选择远程连接后弹窗结束，没有打开网页 | 再点开 **Our Free Model**，重新选择同一远程入口；有链接时也可复制到浏览器打开 |
| 在自己电脑打开服务器给出的 `127.0.0.1` 链接失败 | `127.0.0.1` 指向浏览器所在的电脑。改选远程控制台，或先建立 SSH 端口转发 |
| `trycloudflare.com` 显示 DNS 错误 | 保持 Magpie 运行，等一两分钟再刷新；若持续失败，检查服务器到 Cloudflare 的出站网络 |
| 提示“管理链接已失效” | 链接已使用过或超过十分钟。回 Magpie 重新生成完整链接 |
| 打开临时域名首页提示需要一次性链接 | 使用 Magpie 给出的完整 `/open/…` 地址进入，不能只复制域名 |
| `127.0.0.1` 显示“拒绝连接”，或旧远程地址打不开 | 确认 Magpie 仍在运行，且临时通道未结束；重开入口。短命 CLI 测试退出后生成的链接无法继续使用 |
| 网页中已经添加账号，但 Magpie 没显示对应模型 | 回 Magpie 刷新模型，确认网页里渠道、账号及模型已启用 |

### 直接使用原仓库渠道包

默认 `managed.autoInstallChannels: true`。首次启动自动下载固定提交
`e937077fa92d8cc21d3108d5d1e1f32f37e2534e` 的完整 `business.mjs`、contracts、Qoder WASM 与许可文件，
来源固定为原仓库的 **raw.githubusercontent.com**。完整文件集合通过固定大小和 SHA-256 校验后才会加载，
保存在专用数据目录的 `runtime/channels-<提交>/`；原文件不做内容改写，类 Unix 系统目录/文件权限为 0700/0600。
每次启动复核缓存，缓存完整时可离线加载。首次下载失败会明确报错，请检查网络并重启；不会悄悄换用其他登录配置。

十三个渠道、Gemini 的默认 OAuth 客户端、Loomy 微信扫码配置及账号处理都直接使用这个原包。
本插件不再读取旧版新增的 `gemini-oauth.json`、`loomy-wechat.json`，也不再增加 Loomy App ID 环境变量覆盖。
旧文件不影响升级启动；现有账号按原项目保存，升级不会删除账号。
Google 原项目已有的环境变量接口仍属于上游行为，插件不额外设置它们。
厂商账号登录、服务资格和额度仍遵循原项目及厂商规则，不代表免登录或无限免费。

公开发布包中的渠道副本继续移除内置 OAuth/App ID 默认值；正常运行加载经过校验的原包。
`managed.autoInstallChannels: false` 是明确关闭原包加载的受限模式，用于离线隔离测试；
此模式不提供 Gemini 默认客户端及 Loomy 微信扫码能力，正常使用请保留默认值。
下载的原包也纳入插件卸载清理。上游代码固定在上述提交，后续更新须重新核对版本与哈希。

### EAC 自动接入

默认 `managed.autoInstallEac: true`。首次启动自动从原项目的 **raw.githubusercontent.com**
下载固定提交 `e937077fa92d8cc21d3108d5d1e1f32f37e2534e` 的 `src/vault.js`、两份数据依赖及 MIT 许可，
按代码中固定的 SHA-256 校验完整文件集合后，保存到本机数据目录的 `runtime/eac-<提交>/`。
原文件保持原样；类 Unix 系统目录权限为 0700、文件为 0600。每次启动复核缓存，之后可离线复用。
这些原始来源文件不放进本插件的公开仓库或发布包，解封结果不写入磁盘、日志或网页。
安装不需要 root、git、DSH 或手动填写路径，Linux/macOS/Windows 使用同一下载逻辑。

打开控制台 **EAC 协付渠道 → 使用 GitHub 登录**，在原项目授权页完成 GitHub 登录与 Star 校验。
授权成功后原服务自动刷新 EAC 清单；回 Magpie 刷新模型后即可选用。
**安装来源不等于已授权**；授权、Star 校验、请求签名、资源池与实际模型可用性均由原项目网关决定。
本插件沿用原项目独立服务的 `openSeal` 入口，不伪装 DSH 宿主，也不绕过服务端检查。
临时远程通道仅提供控制台入口，不影响原网关的浏览器授权流程。

服务器需能访问 raw.githubusercontent.com 及原 EAC 网关。下载有总计 20 秒的超时和大小限制，
来源安装失败会在 EAC 页面显示原因，匿名/Kilo 与账号渠道继续运行。
修复网络或数据目录权限后重启 Magpie 重试；不修改远端地址或跟随上游 main 自动执行新代码。
固定来源版本被网关撤销或不再兼容时，需要更新本插件或明确选用新版本来源。
可设 `managed.autoInstallEac: false` 关闭自动安装及自动来源使用。

已有完整原项目源码时，仍可显式指定本机目录，优先于自动安装：

```json
{ "managed": { "eacSourceDir": "/absolute/path/to/dsh-our-free-model" } }
```

该目录需要完整原项目的 `src/vault.js` 及数据依赖，只使用你信任的原项目版本。
插件会执行这份本机模块；目录需保持固定，配置后重启 Magpie，再完成原项目授权。
原项目地址是 [Ebony-Vinyl/dsh-our-free-model](https://github.com/Ebony-Vinyl/dsh-our-free-model)。
真实用户 GitHub 登录及授权后的 EAC 推理尚未实机验收。

### 配置、数据与停止

默认数据目录是 **Magpie 配置目录下的 `our-free-model/`**，与 DSH 和原独立服务默认目录隔离。
包括本地密钥、渠道账号、EAC 授权、统计和设置。手动删除源码目录不会触发自动清理；通过 Magpie 卸载的行为见[卸载与自动清理](#卸载与自动清理)。
只有启用一体化供应商后才启动服务。完全退出 Magpie 时子服务会关闭；
关闭一个界面窗口可能只是退到托盘，并不等于退出宿主。
退出供应商登录会停止该账号在 Magpie 中的访问；Magpie 没有调用插件退出钩子，
已启动的本机服务会继续存在至宿主退出，仍可从控制台退出具体渠道账号。

下面是传给本插件的选项，和 OFM 网页里的服务设置分开。使用 `magpie plugin options <安装路径或包名> '<JSON>'` 保存，修改后重启 Magpie。
全部可省略，默认自动准备运行环境：

```json
{
  "managed": { "autoInstallNode": true, "consoleAccess": "auto", "autoInstallCloudflared": true, "dataDir": "/absolute/path/to/ofm-data", "port": 18900, "consolePort": 18901 }
}
```

Windows 的 `nodePath` 在 JSON 中例如 `C:\\Program Files\\nodejs\\node.exe`。
默认首次使用端口 18900，冲突时自动选用可用端口，并保存实际端口；`port: 0` 每次启动自动分配。
修改 `managed` 的运行设置后重启 Magpie。同一个数据目录只允许一个服务实例。
若上次被强制关闭，插件只会清理经 PID 检查确认已停止的本产品锁文件。

## 可选兼容入口（默认不加载）

旧的三个独立供应商保存在 `compatibility.mjs`，仅供需要直接连接 Zen/Kilo 或已有外部服务的高级用法。
它们不由正常插件入口加载。只有主动添加这个文件才会显示三个供应商：

```sh
magpie plugin add /absolute/path/magpie-our-free-model/compatibility.mjs
```

| 供应商 ID | 功能 | 登录 |
|---|---|---|
| `our-free-zen` | Zen 免费模型，原生 Chat / Responses / Anthropic | 免费访问标记 `public` |
| `our-free-kilo` | Kilo 免费池，支持推理档位 | 免费访问标记 `public` |
| `our-free-local` | 连接已有原项目独立服务 | 回环地址及该服务 API Key |

兼容入口选项 `zen`、`kilo`、`local` 可为配置对象或 `false`。
这里的 Zen 实际服务仍为 OpenCode Zen；厂商端点、协议标识与第三方来源不会因本插件改名而改变。
截图中的 `opencode-doubao-translate` 是另一个插件，不在本仓库中。

## 兼容入口的协议能力

- 动态模型发现和失败时保留缓存；成功返回空列表时会清空旧模型。
- Zen 的三种原生协议，以及 Magpie 负责的 Agent 协议转换。
- SSE 流式输出与普通 JSON 输出；思考字段、工具调用和用量保留。
- 响应体前缀识别，兼容上游错误标注 Content-Type；已读取字节全部回放。
- Zen 的会话关联、客户端标识和工具声明兼容；未声明的工具调用被拒绝。
- Kilo 的 Low / Medium / High 推理参数转换；仅向允许关闭的模型提供 Disabled。
- 请求取消、上游 HTTP 状态与 Retry-After 透传。
- 隔离本地服务账号清单，向本地服务换用其自己的密钥。

免费模型列表不等于无限额度。插件没有厂商的剩余额度数据，`quota` 不会伪造百分比。
Kilo 免费池的提示词可能被上游记录；对话、工具定义与结果会发往对应模型服务。
插件不写入对话日志，不自动创建账号或绕过账号授权。

## 开发与验证

Node.js 22.19+ 或 24+，不需要额外依赖：

```sh
npm run check
npm test
```

可选的真实 Magpie 宿主测试（会创建隔离配置，使用本机 HTTP 替身）：

```sh
MAGPIE_BIN=/absolute/path/to/magpie node scripts/magpie-smoke.mjs
MAGPIE_BIN=/absolute/path/to/magpie node scripts/managed-magpie-smoke.mjs
```

首次运行时 Magpie 可能需要下载 Bun；可设置 `MAGPIE_TEST_CACHE` 指向一个专用测试缓存目录。
这些测试使用隔离配置，并拦截自动打开浏览器的操作，不会弹出测试登录页面。

测试使用本机 HTTP 替身，覆盖三种 Zen 协议、Kilo、网关桥接、工具调用、缓存、
取消、推理参数与错误语义。它们不访问真实上游，也不证明所有免费模型当前可用。
真实 Magpie 宿主验证结果与环境见 `VALIDATION.md`。

一体化服务管理已在 Linux 和 macOS 验证；Cloudflare 公网入口已在 macOS arm64 使用测试服务验证。
Windows 运行及 Linux/Windows 上的真实 Cloudflare 通道仍需对应平台验收。
测试不代表逐家真实账号或当前免费额度已验收。

## 来源、贡献与许可证

原项目运行代码固定于 [`e937077fa92d8cc21d3108d5d1e1f32f37e2534e`](https://github.com/Ebony-Vinyl/dsh-our-free-model/tree/e9c4b70d913116284692d7b206a63f39ad6fe8cc)，
随包保存在 `vendor/ofm/`。88 个保留文件中 80 个保持原始字节；8 个有明确适配改动：
移除内置 Google OAuth 默认凭据和 Loomy 微信 App ID、将 EAC 凭据模块替换为空实现、增加 EAC 来源入口及安装诊断，以及原渠道包加载入口。
账号渠道 Worker 另兼容 Anthropic 网关提供的消息与工具格式。
两个 EAC 加密凭据数据文件不随包分发。原始 SHA-256、改动摘要和省略清单见 `vendor/ofm/UPSTREAM.json`。
首次启用时从原项目下载固定版本的完整渠道包、EAC 来源模块与依赖，校验后缓存到私有数据目录；不执行远程安装脚本，不需要另外安装 DSH。

| 组成 | 来源与归属 |
|---|---|
| OFM 核心、独立服务、渠道集成和控制台 | **[Ebony-Vinyl/dsh-our-free-model](https://github.com/Ebony-Vinyl/dsh-our-free-model)**；原作者及贡献者；MIT，原许可保存在 `vendor/ofm/LICENSE` |
| 原项目吸收的渠道包 | [iJetLi/deepseek-harness-codearts](https://gitee.com/iJetLi/deepseek-harness-codearts)，提交 `345f0a07b22713c0ae189ca7d8b97ec4f64626c6`；原说明与 MIT 许可保留在 `vendor/ofm/vendor/channel-pack/` |
| 兼容 Zen 供应商和流式/工具处理 | [magpie-community/plugins 的 zen-free](https://github.com/magpie-community/plugins/tree/5189b287e7aedd413a3332ef3c5da247a48193a0/packages/zen-free)；MIT，见 `vendor/zen-free/LICENSE` |
| Magpie 自动运行、统一供应商、控制台安全交接和适配测试 | 本仓库的 Magpie 适配代码；MIT，见根目录 `LICENSE` |

第三方组件的原始许可也随包保留，详见 `NOTICE.md`。
欢迎支持并向原项目作者致谢；本仓库不把上游功能宣称为独立原创，也不代表其维护者。


## 上游自动更新（0.12.8）

在 OFM 控制台 → 渠道与健康探测 → 上游自动更新中操作。默认每 24 小时检查并自动构建通过测试的候选包；只在 Magpie 和 OFM 运行期间执行。首次延迟约 30 秒。构建需安装 Git。当前插件不会在运行中被替换。详见 [AUTO_UPDATE_ZH.md](AUTO_UPDATE_ZH.md)。


## 0.12.8 修复说明

同步 OFM 2.5.0（e490a98），包含免费通道会话编码、模型能力与思考档位、协议错误返回和控制台修复。修复新版 EAC 参数的补丁适配，收录 open-external.mjs，保留上游 Messages 账号渠道转换；更新失败时显示可识别的兼容性原因。推荐项目页与桌面壳仍不启用。已安装用户先退出 Magpie，在原插件路径替换源码，保留数据目录，不要卸载清理账号。


## 0.12.8 页面反馈修复
启动时的账号业务包下载警告单独显示，不再覆盖保存模型的成功或失败结果；仅在 HTTP 401 时提示重新登录管理控制台。Agnes 等官方 API 独立于账号业务包。保存成功后在健康列表查看实际调用结果。


## 0.12.8 探测、macOS 锁与更新清理修复
保存的模型立即显示在管理列表，未启用、排队、正在探测、调用失败与可用分别展示；当前渠道优先显示。新保存模型优先加入正在进行的探测队列。只有健康探测通过才发布到 Magpie。
macOS 服务使用内核释放的本机 TCP 互斥端点，允许安全检查并回收已退出进程的旧服务锁，仍拒绝有效占用。临时通道过期测试改为可控时钟，生产 30 分钟期限不变。
每次构建结束（成功或失败）清理临时上游克隆、隔离 HOME、测试临时目录和重复打包目录；保留日志、结果、候选源码和 ZIP。更新器启动时也清理有有效构建记录的旧目录。通常保留最近三份完成记录及当前有效候选；代码和凭据回退备份不自动删除。中断且没有完成记录的目录不自动清理。


## 0.12.8 / OFM 2.5.2
已同步 8c2c0f1e3a1caf5cb682704a576d36a449a6780d，包含渠道请求与工具消息、流式错误、登录竞态、模型隐藏和中文组合名称等修复。保留 MCP 启动隔离，并修复受限环境网卡信息读取失败导致的控制台错误。上游 DSH 升级器和公告源新增镜像的源码随快照同步；Magpie 的独立自动更新仍采用其现有固定仓库 GitHub API/Git 流程，不声称已使用该镜像。
升级替换路径、目录层级与服务占用处理详见 [UPGRADE_ZH.md](UPGRADE_ZH.md)。新增 node scripts/service-status.mjs 诊断，以及在退出 Magpie 后使用 --stop 停止核实归属的旧内置服务。不会自动停止有效占用，也不会删除锁或账号数据。


## 0.12.8 原渠道包下载修复
原渠道包只下载未能从随包文件通过原始哈希校验复用的文件；通常只有 business.mjs 需要联网。下载按固定 SHA 尝试 raw、jsDelivr、上游采用的 gh-proxy 镜像，所有字节仍须匹配固定大小与 SHA-256。网络失败显示具体文件、来源和安全归类原因，不输出底层异常中的敏感文本。
浏览器已能下载 business.mjs 时，在“渠道与健康探测”→“账号渠道包下载修复”中选择原始文件，点击“校验并安装本地渠道包”，成功后按 ⌘Q 退出 Magpie 再重开。其余五个文件由完整插件包校验补齐；不需手动放缓存目录。若自行设置 managed.autoInstallChannels: false，需恢复启用才会加载该缓存。


## 0.12.8 多宿主共享与退出修复
Magpie 桌面端、magpie mcp image 等独立插件宿主可能同时加载插件。本版先核对现有服务的产品、活跃 PID、本机鉴权接口、协议、版本/源码路径/配置身份，再复用同一 OFM。借用方关闭不会停止主服务；主服务退出后，其他宿主下次请求会重新核对并尝试恢复。旧版本服务、不同设置或未知进程不会被自动接管或终止。
退出时同时发起服务、探测、更新和控制台清理，后台更新不再阻塞释放服务锁；有退出时间上限。诊断显示 exited 只表示该 PID 已退出，锁文件可能仍有记录，不等于服务仍占用。
这次从旧版升级前，请先在 DSH web 终端按 Ctrl+C，并退出仍使用 Magpie 的相关客户端会话，再按 ⌘Q 退出 Magpie，替换原源码目录。必要时运行 service-status.mjs --stop 停止已确认的旧服务一次。升级后通常无需反复手动停止；一个正常运行的 managed-runner.mjs 应当保留。


## 0.12.8 图片 MCP 辅助宿主启动隔离
识别到父进程为 magpie mcp（包括图片 MCP）时，OFM 只连接已运行且身份匹配的主服务，不注册安装、不下载运行时、不自行启动或接管服务。主服务不在时，模型列表和加载器返回空结果，用量提示先打开主程序，不因供应商枚举报错或启动后台服务。主程序关闭后，仍活着的图片 MCP 不能恢复 OFM；主程序再次启动后可以重新连接。
此修复位于 OFM 插件，不修改 Magpie 应用或 DSH，不需要停用图片 MCP 分发。图片 MCP 进程仍会随 DSH 的连接保持运行，这与 OFM 服务是否运行是两回事。辅助角色通过只读父进程命令核对；macOS/Windows 无法核对时拒绝自动创建服务并提示原因，Linux 受限容器保留现有 CLI 兼容行为。
本次替换源码前，先在 DSH Web 终端按 Ctrl+C，并按 ⌘Q 退出 Magpie，使旧宿主卸载旧代码。替换原源码路径，保留账号和数据目录，再启动 Magpie 和 DSH。之后不需要每次为避免 OFM 启动而关闭图片 MCP。
