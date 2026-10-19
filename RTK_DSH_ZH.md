# 为什么 Magpie 不能给 DeepSeek Harness 开启 RTK

核对日期：2026-10-19 UTC。Magpie 检查提交 c483feadfd88a5b8de8541de0567f3856822bde5；DSH 检查 master 树 687f282e8625c6b8d11ff58211a90524be2e4317。这里只检查源码，没有修改或重新发布 Magpie/DSH。

## 结论

这是 DSH 工具 Hook 和 RTK 原生集成的能力限制，不是 OFM 的模型账号或代理配置导致。

Magpie 的 internal/library/rtk.go 在 rtkNoHook 中明确列出 dsh：RTK 的自动接管需要把工具即将执行的命令改写，例如 git status 变成 rtk git status；DSH 的前置工具接口目前只允许放行、拒绝或询问，不能通过 updatedInput 改写参数。DSH 的 Claude Code Hook 桥接 README 也明确说明 updatedInput 只记录警告、不实际采用，相关事务设计还位于 proposed 文档中。

RTK 的 DSH 请求 #3847 仍开放，PR #3934 也未合并；该 PR 添加的是指令支持，不等于已经提供可强制改写每条命令的原生 Hook。它的 PR 描述出现 Closed #3847 只是文字，不能当作已合并状态。

正确的接入顺序是 DSH 支持一致的工具输入重写、RTK 提供正式适配，再由 Magpie 注册相应安装/检测/卸载规则。仅给 Magpie 增加一个 dsh 开关或写 AGENTS.md，不会让自动接管生效。

## 三种“RTK”不要混淆

| 方式 | 执行位置 | 当前判断 |
| --- | --- | --- |
| Magpie 管理 RTK 官方 Hook | Agent 执行 shell 前，改写命令 | DSH 暂无受支持适配 |
| DSH 自己运行 rtk 命令 | 工具执行时，由 Agent 主动选择 | 本机安装 RTK 后可手动使用；不是每条命令必经的 Hook |
| OFM 的 tokenSaver.rtk | 请求发往模型前，压缩工具返回文本 | 内置 JavaScript 处理链；不是 RTK 二进制，不提供 rtk gain 统计 |

OFM 核心默认 tokenSaver.enabled=true、rtk=true，但只覆盖经过 src/adapter.js 处理链的请求；账号渠道 Worker 等其他路径不能据此宣称全部覆盖。经 Magpie 使用 OFM 模型，不等于 Magpie 已给 DSH 安装 RTK。压缩能力也不保证固定节省比例。

## 现在怎么用

如果本机已安装 RTK，可让 DSH 在合适任务中直接执行如 rtk git status 的命令，或自行维护项目指令提示 Agent 使用 RTK。它依赖 Agent 遵守指令；不能描述为官方自动 Hook。此次发布没有修改你的 DSH 配置或项目指令。

## 核对来源

- Magpie 源码：https://github.com/yetone/magpie/blob/c483feadfd88a5b8de8541de0567f3856822bde5/internal/library/rtk.go
- DSH Hook 约束：https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/experimental/hooks-claude-code/README.md
- DSH 重写提案：https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/proposed/feature/2026-06-30-pre-tool-input-rewrite.md
- RTK 请求：https://github.com/rtk-ai/rtk/issues/3847
- RTK 指令适配 PR：https://github.com/rtk-ai/rtk/pull/3934
