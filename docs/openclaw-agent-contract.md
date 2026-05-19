# OpenClaw Agent Contract

DN Running Coach exposes HTTP endpoints for OpenClaw. OpenClaw should handle WeChat / QQ conversation, call COROS MCP, normalize data, and then call this service.

## Runtime

- Node.js 24+
- SQLite via Node built-in `node:sqlite`
- Default China COROS MCP endpoint: `https://mcpcn.coros.com/mcp`
- Environment variable: `COROS_MCP_ENDPOINT=https://mcpcn.coros.com/mcp`

## Conversational Initialization

Do not ask the user to paste JSON. OpenClaw should ask short questions one by one, store answers, read COROS MCP data, and finally call `/coach/initialize`.

### Recommended Dialogue

1. Ask target race:

```text
我们来初始化跑步助手。我会问几个问题，然后结合 COROS 近期数据建立你的训练档案。
第 1 个问题：你的主要目标是 5K、10K、半马、全马，还是健康稳定跑？
```

Map answers to:

```text
5K -> goalRace: "5K"
10K -> goalRace: "10K"
半马 -> goalRace: "HALF_MARATHON"
全马 -> goalRace: "MARATHON"
健康稳定跑 -> goalRace: "HEALTH"
```

2. Ask target time:

```text
目标成绩是多少？如果没有明确成绩，可以说“暂时没有”。
```

Convert to `goalTimeSeconds` when possible.

3. Ask recent race or test result:

```text
你最近有没有可靠比赛成绩或测试跑？例如 5K 23:00、10K 48:00、半马 1:50。没有就说“没有”。
```

Convert to `knownRaceResult` when possible.

4. Ask known VDOT:

```text
你是否知道自己的 Daniels VDOT？如果知道直接告诉我；不知道就说“不知道”。
```

Convert to `knownVdot` when possible. If both `knownVdot` and `knownRaceResult` exist, `knownVdot` wins.

5. Ask recent manual load:

```text
最近 7 天有没有篮球、力量训练、熬夜、加班、疼痛或生病？简单描述即可。
```

Convert to `recentManualEvents`.

6. Read COROS data:

```text
我会读取你 COROS 近期跑步和恢复数据，然后完成初始化。
```

OpenClaw should call China COROS MCP, then map recent runs and recovery metrics to the schemas below.

## Health

`GET /health`

Response:

```json
{
  "ok": true,
  "service": "running-coach"
}
```

## Initialize

`POST /coach/initialize`

Request:

```json
{
  "userId": "default",
  "goalRace": "10K",
  "goalTimeSeconds": 2700,
  "knownVdot": 45,
  "recentRuns": [
    {
      "id": "run-1",
      "startedAt": "2026-05-18T12:00:00.000Z",
      "durationMinutes": 48,
      "distanceKm": 8,
      "averagePaceSecondsPerKm": 360,
      "averageHeartRate": 145
    }
  ],
  "recentRecovery": [
    {
      "date": "2026-05-18",
      "recoveryStatus": "normal",
      "sleepHours": 7,
      "restingHeartRate": 52,
      "hrvStatus": "normal",
      "fatigueLevel": "normal"
    }
  ],
  "recentManualEvents": []
}
```

Response includes:

- `message`
- `estimatedVdot`
- `vdotSource`
- `trainingPaces`
- `riskFlags`
- `initialAdvice`

OpenClaw should send `message` back to WeChat / QQ.

## Profile

`POST /coach/profile`

Use only for direct correction or admin-style updates. Normal users should initialize through the dialogue flow.

## Manual Event

`POST /coach/manual-event`

Use this when the user reports basketball, strength training, sleep debt, overtime, pain, travel, illness, or mobility work.

```json
{
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
}
```

## Daily Advice

`POST /coach/daily-advice`

```json
{
  "userId": "default",
  "date": "2026-05-19",
  "availableMinutes": 45,
  "sleepQuality": "poor",
  "fatigue": "high",
  "hasOvertime": true
}
```

Response includes a WeChat/QQ-ready `message` and structured `advice`.

## Run Review

`POST /coach/run-review`

```json
{
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
}
```

Response includes `message` and structured `review`.

## Summaries

### Weekly

`POST /coach/summary/weekly`

```json
{
  "periodStart": "2026-05-13",
  "periodEnd": "2026-05-19",
  "totalRunKm": 32,
  "qualitySessions": 1,
  "manualEvents": []
}
```

### Monthly

`POST /coach/summary/monthly`

```json
{
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31",
  "totalRunKm": 120,
  "currentVdot": 45,
  "manualEventCount": 4
}
```

### Cycle

`POST /coach/summary/cycle`

```json
{
  "periodStart": "2026-04-01",
  "periodEnd": "2026-05-31",
  "cycleGoal": "10K threshold block",
  "completedQualitySessions": 8,
  "currentVdot": 45
}
```

## VDOT Notes

The service estimates VDOT and training paces with public formulas and approximate intensity ranges. It does not copy official Daniels VDOT tables.

For important training blocks, compare against the official V.O2 Calculator:

```text
https://vdoto2.com/calculator
```
