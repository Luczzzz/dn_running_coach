# DN Running Coach

DN Running Coach 是一个面向个人长期使用的 Daniels 跑步 AI 助手。推荐部署在 NAS 上，由 OpenClaw 负责微信 / QQ 对话、初始化问答和 COROS MCP 数据读取，本服务负责训练逻辑、结构化记忆、VDOT 估算、每日建议、跑后复盘和阶段总结。

## 复制即用：NAS Docker Compose

在 NAS 上新建一个目录，例如 `dn-running-coach`，在里面创建 `docker-compose.yml`，复制下面内容即可：

```yaml
services:
  dn-running-coach:
    image: ghcr.io/luczzzz/dn_running_coach:latest
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

启动：

```bash
docker compose up -d
curl http://127.0.0.1:8787/health
```

期望返回：

```json
{"ok":true,"service":"running-coach"}
```

如果镜像还没有发布到 GHCR，可以先使用源码构建版：

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

源码构建版需要先把仓库 clone 到 NAS：

```bash
git clone https://github.com/Luczzzz/dn_running_coach.git
cd dn_running_coach
docker compose up -d --build
```

## 持久化数据

默认挂载：

```text
./data:/data/running-coach
```

SQLite 默认路径：

```text
/data/running-coach/events/running-coach.sqlite
```

请把 NAS 的 `./data` 目录纳入备份。

## OpenClaw 问答式初始化

初始化不建议让用户手写 JSON。推荐由 OpenClaw 像教练问诊一样逐步提问，你直接用微信 / QQ 回答即可。

### 推荐对话流程

OpenClaw：

```text
我们来初始化跑步助手。我会问几个问题，然后结合 COROS 近期数据建立你的训练档案。
第 1 个问题：你的主要目标是 5K、10K、半马、全马，还是健康稳定跑？
```

用户回答后，OpenClaw 继续问：

```text
目标成绩是多少？如果没有明确成绩，可以说“暂时没有”。
```

继续问：

```text
你最近有没有可靠比赛成绩或测试跑？例如 5K 23:00、10K 48:00、半马 1:50。没有就说“没有”。
```

继续问：

```text
你是否知道自己的 Daniels VDOT？如果知道直接告诉我；不知道就说“不知道”。
```

继续问：

```text
最近 7 天有没有篮球、力量训练、熬夜、加班、疼痛或生病？简单描述即可。
```

最后 OpenClaw：

```text
我会读取你 COROS 近期跑步和恢复数据，然后完成初始化。
```

### OpenClaw 汇总后调用

OpenClaw 收集完回答，并通过 COROS MCP 读取近期数据后，调用：

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

服务会返回 `message`，OpenClaw 直接发给微信 / QQ 用户。

## 中国区 COROS MCP

中国区 COROS MCP endpoint：

```text
https://mcpcn.coros.com/mcp
```

推荐架构：

```text
微信 / QQ
  -> OpenClaw on NAS
  -> COROS MCP 中国区
  -> DN Running Coach HTTP Service
  -> SQLite 结构化记忆
```

本服务不直接登录 COROS。OpenClaw 负责调用 COROS MCP，把训练数据整理成本服务的标准 JSON。

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

如果官方结果和服务估算不同，建议在初始化问答中告诉 OpenClaw 你的官方 VDOT，OpenClaw 会通过 `/coach/initialize` 传入 `knownVdot`。

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

## 本地开发

```bash
npm install
npm test
npm run build
npm run dev
```
