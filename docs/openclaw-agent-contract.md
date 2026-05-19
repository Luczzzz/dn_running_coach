# OpenClaw Agent Contract

The running coach service exposes HTTP endpoints for OpenClaw to call from WeChat or QQ messages.

## Runtime Notes

- The service targets Node.js 24+.
- SQLite uses Node's built-in `node:sqlite` module, so the MVP does not require `better-sqlite3` or a native build chain.
- `node:sqlite` is currently experimental in Node and may print an experimental warning during tests or startup.

## Health

`GET /health`

Response:

```json
{
  "ok": true,
  "service": "running-coach"
}
```

## Manual Event

`POST /coach/manual-event`

Use this when the user reports basketball, strength training, sleep debt, overtime, pain, travel, illness, or mobility work.

Request:

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

Response:

```json
{
  "ok": true
}
```

## Daily Advice

`POST /coach/daily-advice`

Request:

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

Response:

```json
{
  "ok": true,
  "message": "今日建议：E\n目的：轻松跑用于维持有氧刺激并降低恢复成本\n时长：45 分钟\n强度：按 VDOT 45 对应 E 配速或轻松心率执行，必须能完整说话。",
  "advice": {
    "type": "E",
    "purpose": "轻松跑用于维持有氧刺激并降低恢复成本",
    "durationMinutes": 45,
    "paceGuidance": "按 VDOT 45 对应 E 配速或轻松心率执行，必须能完整说话。",
    "rationale": ["Daniels 体系下，恢复不足时优先保留 E 跑而不是硬做质量课。"],
    "downgradeReason": "恢复不足或现实压力偏高"
  }
}
```

If the user has not been initialized yet, the route returns:

```json
{
  "ok": false,
  "error": "PROFILE_NOT_FOUND",
  "message": "Profile not found: default"
}
```
