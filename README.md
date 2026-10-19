# Our Free Model · Magpie适配版

版本 **0.14.6**。更新记录统一见 [update.md](update.md)。原项目：[Ebony-Vinyl/dsh-our-free-model](https://github.com/Ebony-Vinyl/dsh-our-free-model)，本包为第三方Magpie适配版，原作者及贡献者归属见NOTICE.md，许可证及vendor溯源资料保留。

## 安装与升级

解压完整包，在Magpie插件页添加含package.json、index.mjs、src、vendor的目录，启用Our Free Model。无需npm install或手动编译。升级时停止相关客户端、退出Magpie，把旧源码移到不会被自动启用的位置备份，新包放回原路径，不覆盖合并文件夹。保留 ~/.config/magpie/our-free-model 或原自定义managed.dataDir；不要通过卸载清理来升级。回退时恢复原源码路径。

## 新版按需使用与分组切换

平时不批量推理检查。真实使用所选模型时直接发送本轮请求，以调用结果记录状态；没有额外的预检消息。模型目录、账号续期及上游代码检查等元数据网络活动不等于推理探测。

1. 打开OFM控制台侧栏“更新与健康监测”。
2. 在“按需调用与供应商内切换”开启失败后使用免费备用模型。
3. 在下拉框选择备用模型，点击加入，按文本框行顺序排序，保存维护设置。最多10个备用条目，每轮最多尝试1–5个模型，包含首选；默认3个。
4. 在Magpie正常选择Our Free Model下的模型使用。失败且尚未输出时按顺序尝试备用，成功就停止。

备用范围仅为当前OFM中启用的匿名OpenCode/Kilo免费模型，不会跳到Magpie其他供应商或未经确认的付费、账号计划、聚合渠道。备用顺序默认空，需要你明确选择；OFM不能读取Magpie其他分组或客户端的勾选状态。已隐藏/停用模型和已知图片、上下文、输出限制不兼容的备用会跳过。

找到成功模型后，同一所选模型入口优先复用它30分钟；它失败或被停用时再找下一可用候选。不改动客户端选择器的当前勾选项。控制台显示“请求模型→实际使用模型”；不要将显示入口名当作实际服务模型。输出正文或工具调用后不再自动重放，用户取消也不再尝试下一模型，避免重复执行工具。渠道内部恢复重试仍可能发生，候选数上限不是网络请求次数保证。

## 状态、冷却与手动检查

控制台“渠道与模型”查看实际调用结果；如确需单独测试，明确选择一个模型再点检测，只测试它，不批量、不调用备用。保存渠道不自动推理。旧版自动探测设置迁移为关闭，后台和重启不会重试；成功状态有效期到期只标记待更新。

429遵守Retry-After；403免费客户端限制对同一匿名OpenCode通道一起冷却，避免逐个模型重复撞限制。model-health.json保存有限的状态、冷却截止时间和最近成功入口，不保存聊天、Key、原始上游报错；跨重启保留。默认保留异常模型可见，严格隐藏为可选。模型名称有最近调用成功、暂时限流、免费通道受限等标签，刷新Magpie模型目录后更新；Pi/DSH可能需要刷新或重启会话，没有后缀不证明可用。

这不能解除上游访问限制或保证不被风控。当前403仍需结合用户网络和官方客户端对照诊断，不要为匿名模型盲删账号或充值。

## 控制台、账号与Key

保持Magpie主程序及插件运行，控制台网页无需常开。macOS用⌘Q退出。随时重开：双击Open-OFM-Console.command（macOS）或Open-OFM-Console.cmd（Windows），也可npm run console。启动器连接现有服务，不再另起OFM；不要收藏一次性管理链接。

免费账号渠道页管理自己的账号、登录、续期和积分；匿名渠道不使用个人Key。官方API在“渠道与模型”选择渠道、输入自己的Key、开启启用并保存，空输入框表示保留，不代表删除。保存会更新模型列表，请保留需要的ID。个人Key渠道不会自动替换匿名公共凭据；Kilo即使认证仍有限流，OpenCode是否支持某免费模型以官方规则和账号实际响应为准。

OpenRouter使用自己的账号Key，获取免费候选后保存。本包默认约束零价格，促销结束应拒绝，不自动切付费；其他API模型可能收费。其他客户端直连OFM时使用控制台API接入页的本地地址和转发密钥，不要与上游个人Key混淆。

## 上游更新与安全

后台上游检查与实际模型调用分开。维护总开关控制后台检查，按需记录和显式备用路由随真实请求执行，不产生后台推理。独立目录构建候选，不热覆盖正在运行的代码；冲突、安全检查或测试失败时不发布。

```bash
node scripts/sync-upstream.mjs
node scripts/sync-upstream.mjs --build
node scripts/apply-upstream.mjs --result /完整路径/updates/work/candidate-xxx/result.json
```

依次为仅检查、构建及停服后应用；自定义数据目录追加--data-dir。Git工作区自行审查合并。构建记录版本、来源和验证摘要到update.md，不再创建单独更新说明。

静态增量筛查覆盖外连、凭据访问、动态执行、构建脚本等变化，命中时暂停候选；报告security-audit.json在构建目录，可从构建日志查看。启发式扫描不是完整安全审计；精简环境和隔离HOME不是操作系统沙箱。未知代码应在不含真实账号或Key的隔离环境测试，不宣称第三方代码绝对无泄漏。

## 数据、清理与占用

默认数据目录 ~/.config/magpie/our-free-model。不要把源码解压进去，不要为修复403删除它。账号、设置、统计、运行时及model-health.json在数据目录。

“清理历史更新缓存”只删除归属确认、已完成且不受保护的历史候选，保留当前候选、未完成任务、账号、运行缓存和备份。updates/backups和旧源码在稳定且不需要回退后再自行删除，备份可能含凭据。不要盲删service.lock。

```bash
node scripts/service-status.mjs
node scripts/service-status.mjs --stop
```

仅诊断或向核实归属的旧服务发送SIGTERM，不强制结束、不删除账号。新版图片MCP辅助宿主只借用现有主服务，不独立启动或接管OFM。DSH仍使用的图片MCP进程不会由OFM主动关闭。

账号包下载失败时，原生账号登录可能不可用。在渠道与模型的修复入口下载固定版本business.mjs，校验导入后重启Magpie；不要覆盖vendor或跳过哈希校验。普通退出、停用及升级保留数据；正式卸载在宿主支持回调时可能清理登记的数据，执行前确认备份。

## 高级配置与验证

managed.dataDir为专用数据目录；managed.nodePath可指定受支持Node。consoleAccess默认auto，服务器可local配合SSH转发；临时Cloudflare管理地址有期限。autoInstallNode、autoInstallChannels、autoInstallEac可关闭自动下载，但相应功能可能不可用。API推理服务默认只监听回环地址。

OFM工具输出压缩与Magpie/DSH命令Hook的RTK功能不同；本包不宣称已修改宿主RTK支持。Jev/System One独立决策协议未完成接入验收。

```bash
npm run check
npm test
```

版本验证摘要只写update.md。vendor/ofm/UPSTREAM.json记录快照原始与改造哈希，保留第三方许可证及来源资料。
