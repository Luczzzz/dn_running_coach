# Phase 2: COROS MCP、Docker Compose 与 Daniels VDOT 设计稿

## 1. 目标

在现有 MVP 基础上增加二期能力：

- Docker Compose 部署
- 接入中国区 COROS MCP
- 完整初始化评估：近期数据 + 目标成绩 + VDOT 估算
- 跑后复盘 HTTP 接口
- 周 / 月 / 周期总结 HTTP 接口
- Daniels VDOT 配速表或官方计算器适配

二期目标不是做完整商业化平台，而是让个人 NAS + OpenClaw + 微信 / QQ 的长期使用闭环真正跑起来。

## 2. 关键决策

### 2.1 COROS 区域

用户使用中国区 COROS 账号，因此默认 MCP endpoint 为：

```text
https://mcpcn.coros.com/mcp
```

其他区域 endpoint 仅作为配置保留，不作为默认值。

### 2.2 COROS MCP 接入方式

二期优先采用 OpenClaw 转发模式：

```text
COROS MCP
  -> OpenClaw
  -> DN Running Coach HTTP Service
```

原因：

- COROS MCP 目前是 read-only，适合读取训练数据后交给本服务分析。
- OpenClaw 已经是微信 / QQ 对话入口，也适合托管外部 MCP 工具调用。
- 本服务保持为训练逻辑服务，不在二期里过早承担 MCP 鉴权、授权刷新和工具发现。

本服务需要定义标准化 COROS 输入结构，OpenClaw 从 COROS MCP 读取后，按该结构调用本服务。

### 2.3 VDOT 与 Daniels 配速

不直接复制 Daniels 书籍中的完整 VDOT 表格。

二期采用两层方案：

1. 支持用户手动输入或校准 VDOT。
2. 使用公开公式估算 VDOT 和训练配速近似值，并在 README 中建议用户用官方 V.O2 Calculator 校验。

这避免版权风险，也让服务在没有外部 API 的情况下可离线运行。

## 3. Docker Compose 部署

新增文件：

```text
Dockerfile
docker-compose.yml
.dockerignore
```

### 3.1 容器要求

- 基础镜像使用 Node 24。
- 容器端口默认 `8787`。
- 数据目录挂载到 `/data/running-coach`。
- SQLite 路径默认 `/data/running-coach/events/running-coach.sqlite`。

### 3.2 docker-compose.yml 目标

```yaml
services:
  dn-running-coach:
    build: .
    container_name: dn-running-coach
    restart: unless-stopped
    ports:
      - "8787:8787"
    environment:
      HOST: "0.0.0.0"
      PORT: "8787"
      RUNNING_COACH_DATA_DIR: "/data/running-coach"
      RUNNING_COACH_DB: "/data/running-coach/events/running-coach.sqlite"
      COROS_MCP_ENDPOINT: "https://mcpcn.coros.com/mcp"
    volumes:
      - ./data:/data/running-coach
```

### 3.3 启动流程

```bash
docker compose up -d --build
curl http://127.0.0.1:8787/health
```

## 4. 标准化 COROS 数据模型

新增 `src/domain/corosTypes.ts`。

二期先定义本服务需要的最小训练数据，而不是绑定 COROS 原始字段。

### 4.1 CorosRunInput

字段：

- `id`
- `startedAt`
- `durationMinutes`
- `distanceKm`
- `averagePaceSecondsPerKm`
- `averageHeartRate`
- `maxHeartRate`
- `elevationGainMeters`
- `trainingLoad`
- `cadence`
- `notes`

### 4.2 CorosRecoveryInput

字段：

- `date`
- `recoveryStatus`
- `sleepHours`
- `restingHeartRate`
- `hrvStatus`
- `fatigueLevel`

### 4.3 CorosInitializationInput

字段：

- `recentRuns`
- `recentRecovery`
- `recentManualEvents`
- `goalRace`
- `goalTimeSeconds`
- `knownRaceResult`
- `knownVdot`

## 5. 初始化评估

新增接口：

```text
POST /coach/initialize
```

### 5.1 输入

输入包含：

- 用户 ID
- 目标赛事
- 目标成绩
- 近期 COROS 跑步数据
- 近期恢复数据
- 已知比赛成绩，可选
- 已知 VDOT，可选
- 手动活动记录，可选

### 5.2 决策优先级

VDOT 初始化优先级：

1. 用户提供 `knownVdot`，直接采用，但标记来源为 `manual`。
2. 用户提供近期比赛成绩，使用比赛成绩估算 VDOT，标记来源为 `race_result`。
3. 使用近期高质量跑步表现估算 VDOT，标记来源为 `recent_training_estimate`。
4. 数据不足时使用保守默认值，并要求用户补充一次测试跑或官方 V.O2 Calculator 结果。

### 5.3 输出

输出包含：

- `profile`
- `estimatedVdot`
- `vdotSource`
- `trainingStatus`
- `riskFlags`
- `initialAdvice`
- `message`

### 5.4 风险判断

初始化时需要识别：

- 近 7 / 28 天跑量是否异常
- 是否近期有高冲击篮球或下肢重训
- 是否恢复指标明显偏差
- 目标成绩是否远超当前估算能力

如果目标成绩过激，输出必须保守提示，不直接按目标成绩安排训练配速。

## 6. VDOT 估算与配速

新增 `src/domain/vdot.ts`。

### 6.1 VDOT 估算

二期使用公开、可解释的近似计算：

- 使用比赛距离和成绩估算等效表现。
- 对近期训练数据只做保守估算，不把普通训练当作全力比赛。
- 对 VDOT 估算输出置信度。

### 6.2 Daniels 配速输出

新增输出结构：

```ts
type TrainingPaces = {
  vdot: number;
  easy: string;
  marathon: string;
  threshold: string;
  interval: string;
  repetition: string;
};
```

配速采用近似区间，不声明为官方表格复刻。

### 6.3 官方校验

README 中加入说明：

- 服务内置 VDOT 为近似估算。
- 关键训练周期开始前，建议用官方 V.O2 Calculator 校验。
- 用户可通过 `/coach/profile` 或 `/coach/initialize` 传入 `knownVdot` 覆盖估算值。

## 7. 跑后复盘接口

新增接口：

```text
POST /coach/run-review
```

### 7.1 输入

- `userId`
- `plannedType`
- `run`
- `recentContextNotes`
- `recentManualEvents`

### 7.2 输出

- `summary`
- `matchedType`
- `completedIntent`
- `deviations`
- `nextAdjustment`
- `message`

### 7.3 存储

跑后复盘结果保存到 summaries 或专门的 review 记录表。

## 8. 周 / 月 / 周期总结接口

新增接口：

```text
POST /coach/summary/weekly
POST /coach/summary/monthly
POST /coach/summary/cycle
```

### 8.1 weekly

输入：

- 周起止日期
- 本周跑步数据
- 本周手动事件

输出：

- 跑量
- 质量课次数
- 非跑步负荷
- 恢复风险
- 下周建议

### 8.2 monthly

输入：

- 月起止日期
- 本月跑步数据
- 本月手动事件
- 当前 VDOT

输出：

- 跑量趋势
- 训练一致性
- VDOT 变化建议
- 最常见干扰因素
- 下月重点

### 8.3 cycle

输入：

- 周期起止日期
- 周期目标
- 跑步数据
- 手动事件
- 当前 VDOT

输出：

- 周期目标是否达成
- Daniels 目标刺激是否完成
- 是否进入下一周期
- 是否调整目标成绩或训练重点

## 9. OpenClaw 调用方式

OpenClaw 负责：

- 调用 COROS MCP 读取近期数据
- 将数据转成本服务标准 JSON
- 调用本服务 HTTP 接口
- 将 `message` 返回微信 / QQ

本服务负责：

- 训练理论和业务判断
- 持久化用户档案、手动事件和总结
- 输出结构化结果和可读消息

## 10. 错误处理

### 10.1 COROS 数据缺失

如果初始化时没有近期跑步数据：

- 如果有 `knownVdot`，允许初始化。
- 如果没有 `knownVdot`，返回 `INSUFFICIENT_DATA`。
- message 中提示用户补充 VDOT、比赛成绩或一次测试跑。

### 10.2 VDOT 过激

如果目标成绩对应能力远高于当前估算：

- 不按目标成绩设置训练配速。
- 保留当前估算 VDOT。
- 输出目标差距提示。

### 10.3 未初始化用户

所有需要 profile 的接口，如果找不到用户档案，返回：

```json
{
  "ok": false,
  "error": "PROFILE_NOT_FOUND"
}
```

## 11. 验收标准

1. 可以通过 Docker Compose 启动服务。
2. 容器重启后 SQLite 数据不丢失。
3. `/coach/initialize` 可以根据 knownVdot、比赛成绩或近期数据完成初始化。
4. 初始化结果会保存 profile。
5. `/coach/run-review` 返回结构化复盘和中文 message。
6. `/coach/summary/weekly`、`monthly`、`cycle` 都可用。
7. VDOT 配速输出包含 E / M / T / I / R 近似区间。
8. README 写清楚 NAS Docker Compose 部署步骤。
9. 全量测试和构建通过。

## 12. 参考资料

- COROS MCP Testing: https://eu.coros.com/stories/coros-metrics/c/mcp-testing
- V.O2 Calculator: https://vdoto2.com/calculator
