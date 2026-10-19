# 0.14.1 社区问题与 PR 审查

检查日期：2026-10-19 UTC。通过 GitHub API 读取 mu-zi-lee/magpie-our-free-model 全部 10 条 issue 接口记录（含 6 个 PR，实际问题单为 4 条）、PR 文件差异及已有讨论评论。PR 状态以 API 为准；“关闭”不等于“已合并”。本包是本地改造版本，以下采纳不表示原仓库已经合并这些 PR。

保留 0.14.0 原生侧栏、统一维护和健康状态。核心继续使用 OFM 2.5.4 / 494a1d84，适配主线基线继续是 36723c85；没有用 PR 内较旧的快照或界面覆盖当前版本。

## 审查与处理

| 问题 / PR | 判断 | 当前处理 |
| --- | --- | --- |
| #5、#7：on/off、light/balanced/deep 等档位无法在 Pi/Magpie 中选择 | 当前代码仍直接发布原生档位，确有缺口 | 已移植：菜单使用标准档位名；请求再映射回原渠道 ID，特别保留 EAC 的 disabled 关闭语义。冲突时优先保留精确标准档位，不公开未知档位 |
| #7：第一次目录读取早于账号目录就绪 | 当前 runner 可先提供监听与控制台，再异步加载目录 | 已修复：models 命令等待 service.ready；本机与共享宿主模型命令统一允许 45 秒等待。控制台启动不被目录加载阻塞 |
| #7：session-map.json 应使用 OFM 数据目录 | 当前核心按 DSH 默认目录定位，且写入权限没有显式限制 | 已移植并补充：绑定服务 dataDir，0600 写入，PID 临时文件；明确卸载时清理自有文件，普通升级不删除 |
| #5：流开始后异常静默结束 | 2.5.4 正常完成分支已有错误帧，但最外层兜底仍只结束连接 | 已补充：按 Chat、Responses、Anthropic 协议返回 SSE 错误；非 SSE 响应不插入 SSE 内容 |
| #2、#9：多个宿主撞服务锁 | 当前改造版已有经过产品、PID、鉴权、协议和源码配置身份校验的共享服务 | 保留已有实现和跨宿主回归，不引入另一套附着协议 |
| #10：忙锁时回退旧模型列表 | 能减少旧版噪音，但不能替代活服务验证和实时禁用检查 | 本版继续复用已验证服务；无法验证时保留诊断，不用陈旧缓存恢复已停用模型 |
| #6、#8：WorkBuddy 国际版会话头和首条 system | 当前 2.5.4 原始渠道包已含这两项 | 不再叠加临时补丁；下载校验继续证明上游原始字节，不把本地修改摘要充当上游摘要 |
| #5：CodeArts 输出上限 | 当前渠道转换器已按受影响模型限制为 65536 | 保留上游按模型的规则，不扩成所有 CodeArts 模型一刀切；新增回归验证 |
| #3：Recursive JSON schemas | 当前转换器直接保留 JSON Schema 和递归 $ref | 新增递归 Schema 保真回归通过。该结果不保证每一家上游原生接口均接受递归结构，剩余个案需模型/渠道和错误正文 |
| #4：WorkBuddy 对特定客户端的拒绝和空流 | 与上游请求策略、无明确信息的空流有关 | 补齐通用流错误诊断；无错误体时不能可靠断言是账号、客户端或额度问题，原业务包特定拒绝分类仍待实机样本确认。普通健康成功不证明每个客户端形态都可用 |
| #1：Jev / System One 决策模型 | Magpie 当前已有 decide/decides 接口，但这是独立决策协议 | 尚未合入。PR 固定到旧 /zen/v1/systemone 入口；当前聊天核心已迁移，决策入口不能仅按聊天路径推断，需要单独验证请求协议、准入与可用性 |

## 验证重点

- 原生档位映射和重名冲突；未知档位不伪造支持。
- 真实本地 loader → runner → 签名网关测试：EAC none 变成 disabled，再由原网关规则生成实际关闭思考的请求；避免菜单显示关闭、请求仍走默认 high。
- Magpie 标准 low 对应匿名 Light，原有 Token 预算保持。
- 首次模型发现包含已配置账号渠道，不依赖重复刷新。
- SSE 最外层故障在三种协议上保留错误信息。
- 会话缓存路径、稳定性、权限与卸载边界。
- 继续执行原生控制台、共享宿主、MCP 不接管服务及健康策略回归。

所有联机模型行为测试使用本地替身，不消耗用户账号额度。没有对用户账号或 WorkBuddy 实际策略作端到端成功承诺。0.14.0 的浏览器视觉验收限制、旧卸载流程的间歇问题仍保留。

## 贡献来源与归属

以下是按当前代码移植、补充验证的建议来源，保留原作者归属和项目 MIT 许可；不是逐个 PR 整支替换。

- PR #5，1007cordon-ux，d544400ba4ed816df4798804d401d93eb3bbfc2e：https://github.com/mu-zi-lee/magpie-our-free-model/pull/5
- PR #7，Gyarados4157，1a7f00bd7d3083f6a014fdb2162a34dd38bc6269：https://github.com/mu-zi-lee/magpie-our-free-model/pull/7
- 服务复用讨论：https://github.com/mu-zi-lee/magpie-our-free-model/issues/9 、https://github.com/mu-zi-lee/magpie-our-free-model/pull/2 、https://github.com/mu-zi-lee/magpie-our-free-model/pull/10
- WorkBuddy：https://github.com/mu-zi-lee/magpie-our-free-model/issues/4 、https://github.com/mu-zi-lee/magpie-our-free-model/issues/6 、https://github.com/mu-zi-lee/magpie-our-free-model/pull/8
- 递归 Schema：https://github.com/mu-zi-lee/magpie-our-free-model/issues/3
- 决策模型：https://github.com/mu-zi-lee/magpie-our-free-model/pull/1
