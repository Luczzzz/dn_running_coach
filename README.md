# DN Running Coach

DN Running Coach 是一个面向个人长期使用的 Daniels 跑步 AI 助手。推荐部署在 NAS 上，由 OpenClaw 负责微信 / QQ 对话入口和 COROS MCP 数据读取，本服务负责训练逻辑、结构化记忆、VDOT 估算、每日建议、跑后复盘和阶段总结。

## 当前能力

- Docker Compose 部署
- 中国区 COROS MCP endpoint 配置：`https://mcpcn.coros.com/mcp`
- 用户档案初始化与完整初始化评估
- Daniels 风格每日训练建议
- VDOT 估算和 E / M / T / I / R 近似训练配速
- 手动记录篮球、力量、熬夜、加班、疼痛等非手表活动
- 跑后复盘 HTTP 接口
- 周 / 月 / 周期总结 HTTP 接口
- SQLite 本地持久化
- OpenClaw 可调用的 HTTP 契约

## 架构

```text
微信 / QQ
  -> OpenClaw on NAS
  -> COROS MCP 中国区
  -> DN Running Coach HTTP Service
  -> SQLite 结构化记忆
```

说明：本服务不直接登录 COROS。推荐由 OpenClaw 调用 COROS MCP，再把标准化后的训练数据传给本服务。

## 技术栈

- Node.js 24+
- TypeScript
- Fastify
- Zod
- Vitest
- Node 内置 `node:sqlite`
- Docker Compose

`node:sqlite` 在 Node 24 中可能打印 `ExperimentalWarning`，不影响当前 MVP/二期功能使用。

## Docker Compose 部署

在 NAS 或服务器上执行：

```bash
git clone https://github.com/Luczzzz/dn_running_coach.git
cd dn_running_coach
docker compose up -d --build
curl http://127.0.0.1:8787/health
```

期望返回：

```json
{"ok":true,"service":"running-coach"}
```

默认持久化挂载：

```text
./data:/data/running-coach
```

默认 SQLite 路径：

```text
/data/running-coach/events/running-coach.sqlite
```

默认环境变量：

```text
HOST=0.0.0.0
PORT=8787
RUNNING_COACH_DATA_DIR=/data/running-coach
RUNNING_COACH_DB=/data/running-coach/events/running-coach.sqlite
COROS_MCP_ENDPOINT=https://mcpcn.coros.com/mcp
```

查看日志：

```bash
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

## 本地开发

```bash
npm install
npm test
npm run build
npm run dev
```

默认监听：

```text
http://127.0.0.1:8787
```

## 首次初始化

如果你已经知道自己的 VDOT，可以直接初始化：

```bash
curl -X POST http://127.0.0.1:8787/coach/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default",
    "goalRace": "10K",
    "goalTimeSeconds": 2700,
    "knownVdot": 45,
    "recentRuns": [],
    "recentRecovery": [],
    "recentManualEvents": []
  }'
```

如果你有近期比赛成绩，可以让服务估算 VDOT：

```bash
curl -X POST http://127.0.0.1:8787/coach/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default",
    "goalRace": "10K",
    "goalTimeSeconds": 2700,
    "knownRaceResult": {
      "race": "10K",
      "distanceKm": 10,
      "timeSeconds": 2700,
      "occurredAt": "2026-05-19T00:00:00.000Z"
    },
    "recentRuns": [],
    "recentRecovery": []
  }'
```

初始化返回会包含：

- `estimatedVdot`
- `vdotSource`
- `trainingPaces`
- `riskFlags`
- `initialAdvice`
- `message`

## OpenClaw 接入 COROS MCP

中国区 COROS MCP endpoint：

```text
https://mcpcn.coros.com/mcp
```

推荐流程：

1. OpenClaw 通过 COROS MCP 读取近期训练和恢复数据。
2. OpenClaw 把 COROS 原始字段整理成本服务的标准 JSON。
3. OpenClaw 调用 `/coach/initialize`、`/coach/daily-advice`、`/coach/run-review` 或总结接口。
4. OpenClaw 把返回的 `message` 发回微信 / QQ。

## 每日建议

```bash
curl -X POST http://127.0.0.1:8787/coach/daily-advice \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default",
    "date": "2026-05-19",
    "availableMinutes": 45,
    "sleepQuality": "poor",
    "fatigue": "high",
    "hasOvertime": true
  }'
```

## 手动记录篮球或力量

```bash
curl -X POST http://127.0.0.1:8787/coach/manual-event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default",
    "event": {
      "type": "basketball",
      "occurredAt": "2026-05-19T12:00:00.000Z",
      "durationMinutes": 90,
      "intensity": "hard",
      "lowerBodyLoad": "high",
      "notes": "小腿紧",
      "affectsNextRun": true
    }
  }'
```

之后再问“今天怎么练”，系统会把篮球负荷纳入判断，通常会把质量课降级为 E 跑。

## 跑后复盘

```bash
curl -X POST http://127.0.0.1:8787/coach/run-review \
  -H "Content-Type: application/json" \
  -d '{
    "plannedType": "E",
    "currentVdot": 45,
    "run": {
      "id": "run-1",
      "startedAt": "2026-05-19T12:00:00.000Z",
      "durationMinutes": 45,
      "distanceKm": 9,
      "averagePaceSecondsPerKm": 300,
      "averageHeartRate": 168,
      "perceivedEffort": "hard",
      "notes": ""
    },
    "recentContextNotes": ["昨晚睡眠差"]
  }'
```

## 周 / 月 / 周期总结

周总结：

```bash
curl -X POST http://127.0.0.1:8787/coach/summary/weekly \
  -H "Content-Type: application/json" \
  -d '{
    "periodStart": "2026-05-13",
    "periodEnd": "2026-05-19",
    "totalRunKm": 32,
    "qualitySessions": 1,
    "manualEvents": []
  }'
```

月总结：

```bash
curl -X POST http://127.0.0.1:8787/coach/summary/monthly \
  -H "Content-Type: application/json" \
  -d '{
    "periodStart": "2026-05-01",
    "periodEnd": "2026-05-31",
    "totalRunKm": 120,
    "currentVdot": 45,
    "manualEventCount": 4
  }'
```

周期总结：

```bash
curl -X POST http://127.0.0.1:8787/coach/summary/cycle \
  -H "Content-Type: application/json" \
  -d '{
    "periodStart": "2026-04-01",
    "periodEnd": "2026-05-31",
    "cycleGoal": "10K threshold block",
    "completedQualitySessions": 8,
    "currentVdot": 45
  }'
```

## VDOT 说明

服务内置 VDOT 使用公开公式进行近似估算，并输出 Daniels 风格的 E / M / T / I / R 训练配速区间。它不是 Daniels 官方表格复刻。

关键训练周期开始前，建议用官方 V.O2 Calculator 校验：

```text
https://vdoto2.com/calculator
```

如果官方结果和服务估算不同，建议通过 `/coach/initialize` 传入 `knownVdot` 覆盖。

## HTTP 接口

详细契约见：

```text
docs/openclaw-agent-contract.md
```

当前主要接口：

- `GET /health`
- `POST /coach/profile`
- `POST /coach/initialize`
- `POST /coach/manual-event`
- `POST /coach/daily-advice`
- `POST /coach/run-review`
- `POST /coach/summary/weekly`
- `POST /coach/summary/monthly`
- `POST /coach/summary/cycle`

## 备份建议

请定期备份：

```text
./data/events/running-coach.sqlite
```

如果你在 NAS 上把 `./data` 挂载到独立存储池，建议纳入 NAS 自动备份任务。
