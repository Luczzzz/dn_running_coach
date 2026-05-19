# OpenClaw Agent Contract

DN Running Coach exposes HTTP endpoints for OpenClaw. OpenClaw should call COROS MCP first, normalize the data, then call this service.

## Runtime

- Node.js 24+
- SQLite via Node built-in `node:sqlite`
- Default China COROS MCP endpoint: `https://mcpcn.coros.com/mcp`
- Environment variable: `COROS_MCP_ENDPOINT=https://mcpcn.coros.com/mcp`

## Health

`GET /health`

Response:

```json
{
  "ok": true,
  "service": "running-coach"
}
```

## Profile

`POST /coach/profile`

Use this for direct profile creation or manual correction.

```json
{
  "id": "default",
  "goalRace": "10K",
  "goalTimeSeconds": 2700,
  "currentVdot": 45,
  "injuryNotes": [],
  "preferredTrainingDays": ["Tue", "Thu", "Sun"],
  "createdAt": "2026-05-19T00:00:00.000Z",
  "updatedAt": "2026-05-19T00:00:00.000Z"
}
```

## Initialize

`POST /coach/initialize`

OpenClaw should call this after reading recent COROS data or when the user sets a target.

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

Response includes `message`, `estimatedVdot`, `vdotSource`, `trainingPaces`, `riskFlags`, and `initialAdvice`.

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
