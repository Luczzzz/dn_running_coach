# NAS OpenClaw 部署设计稿

## 1. 目标

将 Daniels 跑步 AI 助手部署在个人 NAS 上，让 OpenClaw 常驻运行，并通过微信和 QQ 进行日常对话。系统需要长期稳定、可恢复、可备份，并且不能因为模型上下文丢失而遗忘训练历史。

## 2. 部署形态

推荐采用单用户本地部署：

```text
微信 / QQ
  -> OpenClaw Gateway on NAS
  -> 跑步助手 Agent
  -> Daniels 规则引擎
  -> 结构化记忆库
  -> COROS MCP
```

### 2.1 OpenClaw

OpenClaw 部署在 NAS 上，作为常驻对话入口和任务编排层。

它负责：

- 接收微信 / QQ 消息
- 调用跑步助手 Agent
- 触发每日建议、跑后复盘、周报、月报和周期总结
- 接收用户手动输入的篮球、力量、熬夜、加班等事件
- 将结构化记忆写入本地持久化存储

### 2.2 跑步助手 Agent

跑步助手 Agent 是 OpenClaw 调用的业务逻辑层。

它负责：

- 调用 COROS MCP 读取训练数据
- 调用 Daniels 规则引擎生成训练建议
- 更新训练事件日志和摘要
- 输出适合微信 / QQ 阅读的短消息

### 2.3 Daniels 规则引擎

Daniels 规则引擎不依赖聊天上下文。

它负责：

- 保存 VDOT 与训练配速规则
- 识别 E / M / T / I / R 训练类型
- 根据恢复状态和现实约束做降级、替换、改期
- 为每次建议输出解释

### 2.4 COROS MCP

COROS MCP 作为只读训练数据源。

它负责：

- 读取训练历史
- 读取恢复和训练负荷相关指标
- 为初始化、每日建议和跑后复盘提供数据

第一版不依赖向 COROS 写入训练日历。

## 3. 微信与 QQ 对话入口

### 3.1 微信

微信用于最日常的轻量对话。

典型输入：

- 今天怎么练？
- 昨晚 2 点睡，今天只有 30 分钟。
- 刚打了 90 分钟篮球，强度很大。
- 跑完了，帮我复盘。
- 这周总结一下。

### 3.2 QQ

QQ 可以作为备用入口，也适合后续接入群聊或更正式的通知流。

典型用途：

- 自动日报
- 周报 / 月报推送
- 训练周期总结
- 系统异常提醒

### 3.3 消息设计原则

- 微信和 QQ 输出都要短。
- 长报告先给摘要，再允许用户追问详情。
- 每条训练建议必须包含：训练类型、时长、配速或强度、为什么这样安排。
- 跑后复盘必须包含：本次目标、完成情况、偏差、下次调整。

## 4. 持久化目录

建议在 NAS 上为跑步助手单独挂载一个持久化目录：

```text
/data/running-coach/
  profile/
  events/
  summaries/
  rules/
  coros/
  openclaw/
  backups/
  logs/
```

### 4.1 profile

保存长期档案：

- 基本信息
- 目标赛事
- 当前目标成绩
- 当前 VDOT
- 受伤史
- 训练偏好
- 常见可训练时间

### 4.2 events

保存原始事件：

- 跑步
- 比赛
- 测试跑
- 篮球
- 力量训练
- 熬夜
- 加班
- 疼痛
- 生病
- 出差

建议第一版使用 SQLite，便于查询和备份。

### 4.3 summaries

保存摘要：

- daily
- weekly
- monthly
- cycle

摘要用于防止上下文丢失后无法恢复状态。

### 4.4 rules

保存 Daniels 规则配置：

- 训练类型定义
- VDOT 配速推导方式
- 降级规则
- 非跑步活动影响规则
- 报告模板

### 4.5 coros

保存 COROS MCP 相关授权和缓存配置。

授权信息要单独保护，避免和普通日志混在一起。

### 4.6 openclaw

保存 OpenClaw channel 配置和 Agent 配置。

### 4.7 backups

保存自动备份。

至少备份：

- profile
- events
- summaries
- rules

### 4.8 logs

保存运行日志和错误日志。

日志不能长期无限增长，要设置轮转。

## 5. 记忆恢复策略

每次 Agent 启动或上下文重建时，按以下顺序加载：

1. 长期档案
2. 当前周期摘要
3. 最近 30 天事件摘要
4. 最近 7 天事件明细
5. 最近一次跑后复盘

这样即使 OpenClaw、模型或 Agent 重启，也能恢复到一个可用状态。

## 6. 自动任务

建议在 NAS 上设置以下自动任务。

### 6.1 每日早晨

任务：

- 读取昨日和近 7 天数据
- 检查是否有未复盘跑步
- 询问今日状态
- 给出今日训练建议

### 6.2 每次跑后

任务：

- 读取最新跑步记录
- 匹配原训练目标
- 生成跑后复盘
- 更新事件库和摘要

### 6.3 每周

任务：

- 生成周总结
- 更新下周训练重点
- 检查疲劳与干扰因素

### 6.4 每月

任务：

- 生成月总结
- 判断 VDOT 和训练状态变化
- 检查训练一致性

### 6.5 每个训练周期结束

任务：

- 生成周期总结
- 判断是否进入下一周期
- 是否需要修改目标

## 7. 手动事件输入

对于没有手表记录的活动，通过微信或 QQ 手动输入。

### 7.1 篮球示例

用户：

```text
刚打了 90 分钟篮球，强度很大，小腿有点紧。
```

系统应保存为：

```json
{
  "type": "basketball",
  "duration_minutes": 90,
  "intensity": "hard",
  "lower_body_load": "high",
  "impact": "high",
  "symptoms": ["小腿紧"],
  "affects_next_run": true
}
```

### 7.2 力量训练示例

用户：

```text
晚上练了下肢力量，深蹲和硬拉，强度中等。
```

系统应保存为：

```json
{
  "type": "strength",
  "focus": "lower_body",
  "intensity": "moderate",
  "affects_next_quality_session": true
}
```

## 8. 备份策略

### 8.1 每日备份

每天备份：

- profile
- events SQLite
- summaries
- rules

### 8.2 每周备份

每周生成一个完整归档。

### 8.3 恢复演练

每月至少做一次恢复检查：

- 能否加载长期档案
- 能否读取最近 30 天事件
- 能否生成当前训练状态摘要

## 9. 安全边界

- COROS 授权信息不要写入普通日志。
- 微信 / QQ 消息不要无限期明文保存，除非用户明确需要完整聊天归档。
- 日志中不要暴露 token、cookie、AppSecret。
- 如果未来给别人使用，必须增加用户隔离和权限边界。

## 10. 最小可用版本

第一版只需要跑通以下链路：

1. 微信或 QQ 能向 OpenClaw 发送消息。
2. OpenClaw 能调用跑步助手 Agent。
3. Agent 能读写本地 profile、events、summaries。
4. Agent 能读取 COROS MCP 数据。
5. Agent 能基于 Daniels 规则输出今日建议。
6. 跑后能生成复盘并保存。
7. 每周能生成周总结。

月总结、周期总结、自动备份可以作为第二阶段增强，但数据结构要在第一版预留。

## 11. 参考资料

- OpenClaw install docs: https://docs.openclaw.ai/install/index
- OpenClaw Docker install docs: https://docs.openclaw.ai/install/docker
- OpenClaw WeChat channel docs: https://docs.openclaw.ai/channels/wechat
- OpenClaw QQ Bot channel docs: https://docs.openclaw.ai/zh-CN/channels/qqbot
- COROS MCP Testing: https://us.coros.com/stories/coros-metrics/c/mcp-testing
