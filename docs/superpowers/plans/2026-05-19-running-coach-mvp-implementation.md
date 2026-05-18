# Running Coach MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local MVP service for a Daniels-based private running coach that OpenClaw can call from WeChat or QQ.

**Architecture:** Implement a small TypeScript Node service with a SQLite persistence layer, a configurable Daniels rules engine, and HTTP endpoints for initialization, daily advice, manual activity logging, post-run review, and summary generation. COROS MCP is abstracted behind a provider interface so the MVP can run with fixtures before the real MCP integration is wired.

**Tech Stack:** Node.js 20+, TypeScript, Vitest, Fastify, SQLite via better-sqlite3, Zod.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `tsconfig.json`: TypeScript compiler configuration.
- `vitest.config.ts`: test configuration.
- `src/index.ts`: service entry point.
- `src/server.ts`: Fastify app construction and route registration.
- `src/config.ts`: environment and path configuration.
- `src/domain/types.ts`: shared domain types.
- `src/domain/danielsRules.ts`: Daniels training rules and downgrade logic.
- `src/domain/adviceService.ts`: daily advice orchestration.
- `src/domain/reviewService.ts`: post-run review orchestration.
- `src/domain/summaryService.ts`: weekly, monthly, and cycle summary orchestration.
- `src/storage/db.ts`: SQLite connection and schema initialization.
- `src/storage/repositories.ts`: typed repository functions for profile, events, and summaries.
- `src/providers/corosProvider.ts`: COROS provider interface and fixture implementation.
- `src/routes/coachRoutes.ts`: HTTP routes for OpenClaw.
- `src/templates/messages.ts`: WeChat / QQ friendly message formatting.
- `tests/fixtures/corosSample.ts`: sample COROS-like training data.
- `tests/*.test.ts`: unit and route tests.
- `docs/openclaw-agent-contract.md`: request and response contract for OpenClaw.

## Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/server.ts`
- Test: `tests/server.test.ts`

- [ ] **Step 1: Write the failing server test**

Create `tests/server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server";

describe("server", () => {
  it("responds to health checks", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "running-coach" });
  });
});
```

- [ ] **Step 2: Add project configuration**

Create `package.json`:

```json
{
  "name": "dn-running-coach",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fastify/sensible": "^6.0.2",
    "better-sqlite3": "^11.9.1",
    "fastify": "^5.2.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.13.10",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2",
    "vitest": "^3.0.8"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false
  }
});
```

- [ ] **Step 3: Implement the minimal Fastify server**

Create `src/server.ts`:

```ts
import Fastify from "fastify";
import sensible from "@fastify/sensible";

export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(sensible);

  app.get("/health", async () => {
    return { ok: true, service: "running-coach" };
  });

  return app;
}
```

Create `src/index.ts`:

```ts
import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildServer();

await app.listen({ port, host });
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 5: Run the server test**

Run: `npm test -- tests/server.test.ts`

Expected: PASS with `server > responds to health checks`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/index.ts src/server.ts tests/server.test.ts
git commit -m "chore: scaffold running coach service"
```

## Task 2: Domain Types

**Files:**
- Create: `src/domain/types.ts`
- Test: `tests/types.test.ts`

- [ ] **Step 1: Write the type validation test**

Create `tests/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ManualEventSchema, UserProfileSchema } from "../src/domain/types";

describe("domain schemas", () => {
  it("validates a running profile", () => {
    const profile = UserProfileSchema.parse({
      id: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      currentVdot: 45,
      injuryNotes: ["left achilles sensitive"],
      preferredTrainingDays: ["Tue", "Thu", "Sun"],
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z"
    });

    expect(profile.currentVdot).toBe(45);
  });

  it("validates a manual basketball event", () => {
    const event = ManualEventSchema.parse({
      type: "basketball",
      occurredAt: "2026-05-19T12:00:00.000Z",
      durationMinutes: 90,
      intensity: "hard",
      lowerBodyLoad: "high",
      notes: "小腿紧",
      affectsNextRun: true
    });

    expect(event.type).toBe("basketball");
    expect(event.affectsNextRun).toBe(true);
  });
});
```

- [ ] **Step 2: Implement shared domain schemas and types**

Create `src/domain/types.ts`:

```ts
import { z } from "zod";

export const TrainingTypeSchema = z.enum(["E", "M", "T", "I", "R", "REST"]);
export type TrainingType = z.infer<typeof TrainingTypeSchema>;

export const IntensitySchema = z.enum(["easy", "moderate", "hard"]);
export type Intensity = z.infer<typeof IntensitySchema>;

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  goalRace: z.enum(["5K", "10K", "HALF_MARATHON", "MARATHON", "HEALTH"]),
  goalTimeSeconds: z.number().int().positive().optional(),
  currentVdot: z.number().min(20).max(85),
  injuryNotes: z.array(z.string()).default([]),
  preferredTrainingDays: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ManualEventSchema = z.object({
  type: z.enum(["basketball", "strength", "sleep_debt", "overtime", "pain", "travel", "illness", "mobility"]),
  occurredAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().optional(),
  intensity: IntensitySchema.optional(),
  lowerBodyLoad: z.enum(["low", "moderate", "high"]).optional(),
  notes: z.string().default(""),
  affectsNextRun: z.boolean().default(false)
});
export type ManualEvent = z.infer<typeof ManualEventSchema>;

export const RunActivitySchema = z.object({
  id: z.string().min(1),
  startedAt: z.string().datetime(),
  durationMinutes: z.number().positive(),
  distanceKm: z.number().positive(),
  averagePaceSecondsPerKm: z.number().positive(),
  averageHeartRate: z.number().positive().optional(),
  perceivedEffort: IntensitySchema.optional(),
  notes: z.string().default("")
});
export type RunActivity = z.infer<typeof RunActivitySchema>;

export type DailyContext = {
  date: string;
  availableMinutes: number;
  sleepQuality?: "good" | "normal" | "poor";
  fatigue?: "low" | "normal" | "high";
  hasOvertime?: boolean;
  plannedManualEvents?: ManualEvent[];
};

export type TrainingAdvice = {
  type: TrainingType;
  purpose: string;
  durationMinutes: number;
  paceGuidance: string;
  rationale: string[];
  downgradeReason?: string;
  alternative?: string;
};
```

- [ ] **Step 3: Run the type tests**

Run: `npm test -- tests/types.test.ts`

Expected: PASS with both schema tests.

- [ ] **Step 4: Commit**

```bash
git add src/domain/types.ts tests/types.test.ts
git commit -m "feat: define running coach domain types"
```

## Task 3: SQLite Persistence

**Files:**
- Create: `src/config.ts`
- Create: `src/storage/db.ts`
- Create: `src/storage/repositories.ts`
- Test: `tests/storage.test.ts`

- [ ] **Step 1: Write persistence tests**

Create `tests/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/storage/db";
import { createRepositories } from "../src/storage/repositories";

describe("storage", () => {
  it("saves and loads the user profile", () => {
    const db = createDatabase(":memory:");
    const repos = createRepositories(db);

    repos.profile.save({
      id: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      currentVdot: 45,
      injuryNotes: ["left achilles sensitive"],
      preferredTrainingDays: ["Tue", "Thu", "Sun"],
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z"
    });

    expect(repos.profile.get("default")?.currentVdot).toBe(45);
  });

  it("saves and lists manual events", () => {
    const db = createDatabase(":memory:");
    const repos = createRepositories(db);

    repos.events.addManual({
      type: "basketball",
      occurredAt: "2026-05-19T12:00:00.000Z",
      durationMinutes: 90,
      intensity: "hard",
      lowerBodyLoad: "high",
      notes: "小腿紧",
      affectsNextRun: true
    });

    const events = repos.events.listManualSince("2026-05-18T00:00:00.000Z");
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("basketball");
  });
});
```

- [ ] **Step 2: Implement database schema**

Create `src/storage/db.ts`:

```ts
import Database from "better-sqlite3";

export type AppDatabase = Database.Database;

export function createDatabase(path: string): AppDatabase {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manual_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
```

Create `src/config.ts`:

```ts
export type AppConfig = {
  dataDir: string;
  databasePath: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.RUNNING_COACH_DATA_DIR ?? "/data/running-coach";
  return {
    dataDir,
    databasePath: env.RUNNING_COACH_DB ?? `${dataDir}/events/running-coach.sqlite`
  };
}
```

- [ ] **Step 3: Implement repositories**

Create `src/storage/repositories.ts`:

```ts
import type { AppDatabase } from "./db";
import { ManualEvent, ManualEventSchema, UserProfile, UserProfileSchema } from "../domain/types";

export function createRepositories(db: AppDatabase) {
  return {
    profile: {
      save(profile: UserProfile) {
        const parsed = UserProfileSchema.parse(profile);
        db.prepare(
          "INSERT INTO profiles (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
        ).run(parsed.id, JSON.stringify(parsed), parsed.updatedAt);
      },
      get(id: string): UserProfile | undefined {
        const row = db.prepare("SELECT data FROM profiles WHERE id = ?").get(id) as { data: string } | undefined;
        return row ? UserProfileSchema.parse(JSON.parse(row.data)) : undefined;
      }
    },
    events: {
      addManual(event: ManualEvent) {
        const parsed = ManualEventSchema.parse(event);
        db.prepare("INSERT INTO manual_events (occurred_at, type, data) VALUES (?, ?, ?)").run(
          parsed.occurredAt,
          parsed.type,
          JSON.stringify(parsed)
        );
      },
      listManualSince(isoDate: string): ManualEvent[] {
        const rows = db
          .prepare("SELECT data FROM manual_events WHERE occurred_at >= ? ORDER BY occurred_at ASC")
          .all(isoDate) as { data: string }[];
        return rows.map((row) => ManualEventSchema.parse(JSON.parse(row.data)));
      }
    },
    summaries: {
      save(scope: "daily" | "weekly" | "monthly" | "cycle", periodStart: string, periodEnd: string, content: string) {
        db.prepare(
          "INSERT INTO summaries (scope, period_start, period_end, content, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(scope, periodStart, periodEnd, content, new Date().toISOString());
      }
    }
  };
}
```

- [ ] **Step 4: Run persistence tests**

Run: `npm test -- tests/storage.test.ts`

Expected: PASS with profile and manual event persistence.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/storage/db.ts src/storage/repositories.ts tests/storage.test.ts
git commit -m "feat: add sqlite persistence"
```

## Task 4: Daniels Rules Engine

**Files:**
- Create: `src/domain/danielsRules.ts`
- Test: `tests/danielsRules.test.ts`

- [ ] **Step 1: Write Daniels rule tests**

Create `tests/danielsRules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { chooseDailyTraining } from "../src/domain/danielsRules";

describe("daniels rules", () => {
  it("recommends easy running when recovery is poor", () => {
    const advice = chooseDailyTraining({
      currentVdot: 45,
      cycleFocus: "threshold",
      context: {
        date: "2026-05-19",
        availableMinutes: 50,
        sleepQuality: "poor",
        fatigue: "high"
      },
      recentManualLoad: []
    });

    expect(advice.type).toBe("E");
    expect(advice.downgradeReason).toContain("恢复不足");
  });

  it("downgrades quality after hard basketball", () => {
    const advice = chooseDailyTraining({
      currentVdot: 45,
      cycleFocus: "interval",
      context: {
        date: "2026-05-19",
        availableMinutes: 60,
        sleepQuality: "normal",
        fatigue: "normal"
      },
      recentManualLoad: [
        {
          type: "basketball",
          occurredAt: "2026-05-18T20:00:00.000Z",
          durationMinutes: 90,
          intensity: "hard",
          lowerBodyLoad: "high",
          notes: "full court",
          affectsNextRun: true
        }
      ]
    });

    expect(advice.type).toBe("E");
    expect(advice.rationale.join(" ")).toContain("篮球");
  });

  it("keeps threshold focus when conditions are normal", () => {
    const advice = chooseDailyTraining({
      currentVdot: 45,
      cycleFocus: "threshold",
      context: {
        date: "2026-05-19",
        availableMinutes: 60,
        sleepQuality: "good",
        fatigue: "low"
      },
      recentManualLoad: []
    });

    expect(advice.type).toBe("T");
    expect(advice.purpose).toContain("阈值");
  });
});
```

- [ ] **Step 2: Implement Daniels rule engine**

Create `src/domain/danielsRules.ts`:

```ts
import type { DailyContext, ManualEvent, TrainingAdvice, TrainingType } from "./types";

export type CycleFocus = "base" | "threshold" | "interval" | "race_specific";

type ChooseDailyTrainingInput = {
  currentVdot: number;
  cycleFocus: CycleFocus;
  context: DailyContext;
  recentManualLoad: ManualEvent[];
};

export function chooseDailyTraining(input: ChooseDailyTrainingInput): TrainingAdvice {
  const downgrade = getDowngradeReason(input.context, input.recentManualLoad);
  if (downgrade) {
    return {
      type: "E",
      purpose: "轻松跑用于维持有氧刺激并降低恢复成本",
      durationMinutes: Math.min(input.context.availableMinutes, 45),
      paceGuidance: easyPaceGuidance(input.currentVdot),
      rationale: ["Daniels 体系下，恢复不足时优先保留 E 跑而不是硬做质量课。", downgrade.rationale],
      downgradeReason: downgrade.reason,
      alternative: "如果疲劳继续偏高，改为休息或 20-30 分钟轻松活动。"
    };
  }

  const type = focusToTrainingType(input.cycleFocus);
  return {
    type,
    purpose: purposeFor(type),
    durationMinutes: Math.min(input.context.availableMinutes, defaultDuration(type)),
    paceGuidance: paceGuidanceFor(type, input.currentVdot),
    rationale: [
      `当前周期重点是 ${input.cycleFocus}，今日状态允许安排 ${type} 课。`,
      "训练配速以当前 VDOT 为依据，不按目标成绩硬推。"
    ]
  };
}

function getDowngradeReason(context: DailyContext, recentManualLoad: ManualEvent[]) {
  if (context.sleepQuality === "poor" || context.fatigue === "high" || context.hasOvertime) {
    return {
      reason: "恢复不足或现实压力偏高",
      rationale: "睡眠、疲劳或加班会提高质量课失败和恢复延迟的风险。"
    };
  }

  const hardLowerBody = recentManualLoad.find(
    (event) =>
      event.affectsNextRun ||
      event.type === "basketball" ||
      (event.type === "strength" && event.lowerBodyLoad === "high")
  );

  if (hardLowerBody) {
    return {
      reason: "近期存在下肢或高冲击负荷",
      rationale: `近期记录了${eventLabel(hardLowerBody)}，今天不叠加强度课。`
    };
  }

  return undefined;
}

function focusToTrainingType(focus: CycleFocus): TrainingType {
  if (focus === "threshold") return "T";
  if (focus === "interval") return "I";
  if (focus === "race_specific") return "M";
  return "E";
}

function purposeFor(type: TrainingType): string {
  const purposes: Record<TrainingType, string> = {
    E: "轻松跑用于有氧基础、恢复和跑量积累",
    M: "马拉松配速跑用于专项耐力和配速经济性",
    T: "阈值跑用于提高可持续输出能力",
    I: "间歇跑用于最大摄氧量相关刺激",
    R: "重复跑用于速度、跑姿和神经肌肉效率",
    REST: "休息用于恢复和适应"
  };
  return purposes[type];
}

function defaultDuration(type: TrainingType): number {
  const durations: Record<TrainingType, number> = {
    E: 45,
    M: 70,
    T: 60,
    I: 55,
    R: 45,
    REST: 0
  };
  return durations[type];
}

function paceGuidanceFor(type: TrainingType, vdot: number): string {
  if (type === "E") return easyPaceGuidance(vdot);
  return `按 VDOT ${vdot} 对应的 ${type} 配速区间执行；第一版仅输出类型，具体表格由 rules 配置补齐。`;
}

function easyPaceGuidance(vdot: number): string {
  return `按 VDOT ${vdot} 对应 E 配速或轻松心率执行，必须能完整说话。`;
}

function eventLabel(event: ManualEvent): string {
  if (event.type === "basketball") return "篮球";
  if (event.type === "strength") return "力量训练";
  return event.type;
}
```

- [ ] **Step 3: Run Daniels rule tests**

Run: `npm test -- tests/danielsRules.test.ts`

Expected: PASS with three rule tests.

- [ ] **Step 4: Commit**

```bash
git add src/domain/danielsRules.ts tests/danielsRules.test.ts
git commit -m "feat: add daniels daily training rules"
```

## Task 5: COROS Provider Fixture

**Files:**
- Create: `src/providers/corosProvider.ts`
- Create: `tests/fixtures/corosSample.ts`
- Test: `tests/corosProvider.test.ts`

- [ ] **Step 1: Write provider fixture test**

Create `tests/corosProvider.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FixtureCorosProvider } from "../src/providers/corosProvider";
import { corosSample } from "./fixtures/corosSample";

describe("coros provider", () => {
  it("returns recent runs from fixtures", async () => {
    const provider = new FixtureCorosProvider(corosSample);
    const runs = await provider.getRecentRuns("default", 7);

    expect(runs).toHaveLength(1);
    expect(runs[0].distanceKm).toBe(8);
  });
});
```

- [ ] **Step 2: Add fixture data**

Create `tests/fixtures/corosSample.ts`:

```ts
import type { RunActivity } from "../../src/domain/types";

export const corosSample: RunActivity[] = [
  {
    id: "run-1",
    startedAt: "2026-05-18T22:00:00.000Z",
    durationMinutes: 48,
    distanceKm: 8,
    averagePaceSecondsPerKm: 360,
    averageHeartRate: 145,
    perceivedEffort: "easy",
    notes: "evening easy run"
  }
];
```

- [ ] **Step 3: Implement provider interface and fixture**

Create `src/providers/corosProvider.ts`:

```ts
import type { RunActivity } from "../domain/types";

export interface CorosProvider {
  getRecentRuns(userId: string, days: number): Promise<RunActivity[]>;
}

export class FixtureCorosProvider implements CorosProvider {
  constructor(private readonly runs: RunActivity[]) {}

  async getRecentRuns(_userId: string, days: number): Promise<RunActivity[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.runs.filter((run) => new Date(run.startedAt).getTime() >= cutoff);
  }
}
```

- [ ] **Step 4: Run provider tests**

Run: `npm test -- tests/corosProvider.test.ts`

Expected: PASS with fixture provider test.

- [ ] **Step 5: Commit**

```bash
git add src/providers/corosProvider.ts tests/fixtures/corosSample.ts tests/corosProvider.test.ts
git commit -m "feat: add coros provider abstraction"
```

## Task 6: Daily Advice Service

**Files:**
- Create: `src/domain/adviceService.ts`
- Test: `tests/adviceService.test.ts`

- [ ] **Step 1: Write daily advice service test**

Create `tests/adviceService.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/storage/db";
import { createRepositories } from "../src/storage/repositories";
import { createDailyAdvice } from "../src/domain/adviceService";

describe("daily advice service", () => {
  it("uses profile and recent manual load to produce advice", () => {
    const db = createDatabase(":memory:");
    const repos = createRepositories(db);
    repos.profile.save({
      id: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      currentVdot: 45,
      injuryNotes: [],
      preferredTrainingDays: [],
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z"
    });
    repos.events.addManual({
      type: "basketball",
      occurredAt: new Date().toISOString(),
      durationMinutes: 90,
      intensity: "hard",
      lowerBodyLoad: "high",
      notes: "full court",
      affectsNextRun: true
    });

    const advice = createDailyAdvice(repos, "default", {
      date: "2026-05-19",
      availableMinutes: 60,
      sleepQuality: "normal",
      fatigue: "normal"
    });

    expect(advice.type).toBe("E");
    expect(advice.rationale.join(" ")).toContain("篮球");
  });
});
```

- [ ] **Step 2: Implement daily advice service**

Create `src/domain/adviceService.ts`:

```ts
import { chooseDailyTraining } from "./danielsRules";
import type { DailyContext, TrainingAdvice } from "./types";
import type { createRepositories } from "../storage/repositories";

type Repositories = ReturnType<typeof createRepositories>;

export function createDailyAdvice(repos: Repositories, userId: string, context: DailyContext): TrainingAdvice {
  const profile = repos.profile.get(userId);
  if (!profile) {
    throw new Error(`Profile not found: ${userId}`);
  }

  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const recentManualLoad = repos.events.listManualSince(since);

  return chooseDailyTraining({
    currentVdot: profile.currentVdot,
    cycleFocus: profile.goalRace === "MARATHON" ? "race_specific" : "threshold",
    context,
    recentManualLoad
  });
}
```

- [ ] **Step 3: Run advice service tests**

Run: `npm test -- tests/adviceService.test.ts`

Expected: PASS with manual basketball load affecting advice.

- [ ] **Step 4: Commit**

```bash
git add src/domain/adviceService.ts tests/adviceService.test.ts
git commit -m "feat: create daily advice service"
```

## Task 7: Post-Run Review Service

**Files:**
- Create: `src/domain/reviewService.ts`
- Test: `tests/reviewService.test.ts`

- [ ] **Step 1: Write post-run review test**

Create `tests/reviewService.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { reviewRun } from "../src/domain/reviewService";

describe("review service", () => {
  it("classifies an easy run that was likely too fast", () => {
    const review = reviewRun({
      plannedType: "E",
      currentVdot: 45,
      run: {
        id: "run-1",
        startedAt: "2026-05-19T12:00:00.000Z",
        durationMinutes: 45,
        distanceKm: 9,
        averagePaceSecondsPerKm: 300,
        averageHeartRate: 168,
        perceivedEffort: "hard",
        notes: ""
      },
      recentContextNotes: ["昨晚睡眠差"]
    });

    expect(review.summary).toContain("E");
    expect(review.deviations.join(" ")).toContain("偏快");
    expect(review.nextAdjustment).toContain("轻松");
  });
});
```

- [ ] **Step 2: Implement review service**

Create `src/domain/reviewService.ts`:

```ts
import type { RunActivity, TrainingType } from "./types";

export type RunReview = {
  summary: string;
  matchedType: TrainingType;
  completedIntent: boolean;
  deviations: string[];
  nextAdjustment: string;
};

export function reviewRun(input: {
  plannedType: TrainingType;
  currentVdot: number;
  run: RunActivity;
  recentContextNotes: string[];
}): RunReview {
  const deviations: string[] = [];

  if (input.plannedType === "E" && (input.run.perceivedEffort === "hard" || (input.run.averageHeartRate ?? 0) >= 165)) {
    deviations.push("这次 E 跑恢复成本偏高，可能跑得偏快。");
  }

  if (input.recentContextNotes.length > 0) {
    deviations.push(`上下文因素：${input.recentContextNotes.join("；")}。`);
  }

  const completedIntent = deviations.length === 0;
  return {
    summary: `本次训练按 ${input.plannedType} 课复盘，当前 VDOT ${input.currentVdot}。`,
    matchedType: input.plannedType,
    completedIntent,
    deviations,
    nextAdjustment: completedIntent
      ? "下一次训练可按原计划推进。"
      : "下一次优先安排轻松跑或休息，确认疲劳下降后再恢复质量课。"
  };
}
```

- [ ] **Step 3: Run review tests**

Run: `npm test -- tests/reviewService.test.ts`

Expected: PASS with easy-run deviation detection.

- [ ] **Step 4: Commit**

```bash
git add src/domain/reviewService.ts tests/reviewService.test.ts
git commit -m "feat: add post-run review service"
```

## Task 8: Summary Service

**Files:**
- Create: `src/domain/summaryService.ts`
- Test: `tests/summaryService.test.ts`

- [ ] **Step 1: Write summary service test**

Create `tests/summaryService.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createWeeklySummary } from "../src/domain/summaryService";

describe("summary service", () => {
  it("creates a weekly summary that mentions non-running load", () => {
    const summary = createWeeklySummary({
      periodStart: "2026-05-13",
      periodEnd: "2026-05-19",
      totalRunKm: 32,
      qualitySessions: 1,
      manualEvents: [
        {
          type: "basketball",
          occurredAt: "2026-05-18T20:00:00.000Z",
          durationMinutes: 90,
          intensity: "hard",
          lowerBodyLoad: "high",
          notes: "",
          affectsNextRun: true
        }
      ]
    });

    expect(summary).toContain("32 km");
    expect(summary).toContain("篮球");
  });
});
```

- [ ] **Step 2: Implement summary service**

Create `src/domain/summaryService.ts`:

```ts
import type { ManualEvent } from "./types";

export function createWeeklySummary(input: {
  periodStart: string;
  periodEnd: string;
  totalRunKm: number;
  qualitySessions: number;
  manualEvents: ManualEvent[];
}): string {
  const basketballCount = input.manualEvents.filter((event) => event.type === "basketball").length;
  const strengthCount = input.manualEvents.filter((event) => event.type === "strength").length;

  return [
    `周总结 ${input.periodStart} 至 ${input.periodEnd}`,
    `跑量：${input.totalRunKm} km。`,
    `质量课：${input.qualitySessions} 次。`,
    `非跑步负荷：篮球 ${basketballCount} 次，力量 ${strengthCount} 次。`,
    "下周建议：优先保证 E 跑和恢复质量，再安排 Daniels 质量课。"
  ].join("\n");
}
```

- [ ] **Step 3: Run summary tests**

Run: `npm test -- tests/summaryService.test.ts`

Expected: PASS with weekly non-running load summary.

- [ ] **Step 4: Commit**

```bash
git add src/domain/summaryService.ts tests/summaryService.test.ts
git commit -m "feat: add weekly summary service"
```

## Task 9: OpenClaw HTTP Routes

**Files:**
- Modify: `src/server.ts`
- Create: `src/routes/coachRoutes.ts`
- Create: `src/templates/messages.ts`
- Test: `tests/routes.test.ts`

- [ ] **Step 1: Write route tests**

Create `tests/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server";

describe("coach routes", () => {
  it("accepts manual event messages", async () => {
    const app = buildServer({ databasePath: ":memory:" });

    const response = await app.inject({
      method: "POST",
      url: "/coach/manual-event",
      payload: {
        userId: "default",
        event: {
          type: "basketball",
          occurredAt: "2026-05-19T12:00:00.000Z",
          durationMinutes: 90,
          intensity: "hard",
          lowerBodyLoad: "high",
          notes: "小腿紧",
          affectsNextRun: true
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Implement message templates**

Create `src/templates/messages.ts`:

```ts
import type { TrainingAdvice } from "../domain/types";

export function formatAdvice(advice: TrainingAdvice): string {
  const lines = [
    `今日建议：${advice.type}`,
    `目的：${advice.purpose}`,
    `时长：${advice.durationMinutes} 分钟`,
    `强度：${advice.paceGuidance}`,
    `原因：${advice.rationale.join(" ")}`
  ];

  if (advice.downgradeReason) {
    lines.push(`降级原因：${advice.downgradeReason}`);
  }
  if (advice.alternative) {
    lines.push(`替代方案：${advice.alternative}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 3: Implement coach routes**

Create `src/routes/coachRoutes.ts`:

```ts
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { createDailyAdvice } from "../domain/adviceService";
import { ManualEventSchema } from "../domain/types";
import { formatAdvice } from "../templates/messages";
import type { createRepositories } from "../storage/repositories";

type Repositories = ReturnType<typeof createRepositories>;

export async function registerCoachRoutes(app: FastifyInstance, repos: Repositories) {
  app.post("/coach/manual-event", async (request) => {
    const body = z
      .object({
        userId: z.string().default("default"),
        event: ManualEventSchema
      })
      .parse(request.body);

    repos.events.addManual(body.event);
    return { ok: true };
  });

  app.post("/coach/daily-advice", async (request) => {
    const body = z
      .object({
        userId: z.string().default("default"),
        date: z.string(),
        availableMinutes: z.number().int().positive(),
        sleepQuality: z.enum(["good", "normal", "poor"]).optional(),
        fatigue: z.enum(["low", "normal", "high"]).optional(),
        hasOvertime: z.boolean().optional()
      })
      .parse(request.body);

    const advice = createDailyAdvice(repos, body.userId, {
      date: body.date,
      availableMinutes: body.availableMinutes,
      sleepQuality: body.sleepQuality,
      fatigue: body.fatigue,
      hasOvertime: body.hasOvertime
    });

    return { ok: true, message: formatAdvice(advice), advice };
  });
}
```

- [ ] **Step 4: Register routes in server**

Modify `src/server.ts`:

```ts
import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { createDatabase } from "./storage/db";
import { createRepositories } from "./storage/repositories";
import { registerCoachRoutes } from "./routes/coachRoutes";

export type BuildServerOptions = {
  databasePath?: string;
};

export function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({ logger: false });
  app.register(sensible);

  const db = createDatabase(options.databasePath ?? process.env.RUNNING_COACH_DB ?? ":memory:");
  const repos = createRepositories(db);

  app.get("/health", async () => {
    return { ok: true, service: "running-coach" };
  });

  app.register(async (child) => {
    await registerCoachRoutes(child, repos);
  });

  return app;
}
```

- [ ] **Step 5: Run route tests**

Run: `npm test -- tests/routes.test.ts`

Expected: PASS with manual event route.

- [ ] **Step 6: Commit**

```bash
git add src/server.ts src/routes/coachRoutes.ts src/templates/messages.ts tests/routes.test.ts
git commit -m "feat: expose coach http routes"
```

## Task 10: OpenClaw Agent Contract Documentation

**Files:**
- Create: `docs/openclaw-agent-contract.md`

- [ ] **Step 1: Write OpenClaw contract documentation**

Create `docs/openclaw-agent-contract.md`:

```md
# OpenClaw Agent Contract

The running coach service exposes HTTP endpoints for OpenClaw to call from WeChat or QQ messages.

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
  "message": "今日建议：E\n目的：轻松跑用于维持有氧刺激并降低恢复成本\n...",
  "advice": {
    "type": "E",
    "purpose": "轻松跑用于维持有氧刺激并降低恢复成本",
    "durationMinutes": 45,
    "paceGuidance": "按 VDOT 45 对应 E 配速或轻松心率执行，必须能完整说话。",
    "rationale": ["..."],
    "downgradeReason": "恢复不足或现实压力偏高"
  }
}
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/openclaw-agent-contract.md
git commit -m "docs: add openclaw agent contract"
```

## Task 11: Final Verification

**Files:**
- Modify only if verification exposes defects.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript build**

Run: `npm run build`

Expected: TypeScript build completes with no errors.

- [ ] **Step 3: Start service locally**

Run: `npm run dev`

Expected: service listens on `0.0.0.0:8787`.

- [ ] **Step 4: Smoke test health endpoint**

Run: `curl http://127.0.0.1:8787/health`

Expected:

```json
{"ok":true,"service":"running-coach"}
```

- [ ] **Step 5: Commit verification fixes if needed**

```bash
git status --short
git add <changed-files>
git commit -m "fix: address final verification issues"
```

If no fixes are needed, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers initialization foundations through profile persistence, manual activity logging, Daniels daily advice, post-run review, weekly summary, OpenClaw HTTP routes, and NAS-compatible persistence. Real COROS MCP wiring is intentionally abstracted behind `CorosProvider` and can be implemented after the fixture MVP works.
- Placeholder scan: The implementation steps avoid `TBD` and unfinished placeholder instructions. The only deferred item is explicit and architectural: the first version uses fixture COROS data through a provider interface.
- Type consistency: The plan consistently uses `UserProfile`, `ManualEvent`, `RunActivity`, `TrainingAdvice`, `TrainingType`, and `createRepositories`.
