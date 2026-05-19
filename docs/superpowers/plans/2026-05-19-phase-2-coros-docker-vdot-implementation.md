# Phase 2 COROS Docker VDOT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker Compose deployment, standardized COROS MCP inputs, initialization assessment, run review and summary HTTP endpoints, and Daniels-style VDOT estimation/training pace output.

**Architecture:** Keep OpenClaw as the COROS MCP caller and chat gateway, while this service remains a deterministic training-logic HTTP service. Add typed COROS input schemas, a VDOT module, initialization service, new HTTP routes, Docker artifacts, and README/OpenClaw contract updates.

**Tech Stack:** Node.js 24+, TypeScript, Fastify, Zod, Vitest, Node `node:sqlite`, Docker Compose.

---

## File Structure

- Create `Dockerfile`: production image for the HTTP service.
- Create `docker-compose.yml`: NAS deployment with persistent `./data` volume and China COROS MCP endpoint env.
- Create `.dockerignore`: exclude local generated files from Docker build context.
- Create `src/domain/corosTypes.ts`: standardized COROS-like schemas accepted from OpenClaw.
- Create `src/domain/vdot.ts`: VDOT estimation and Daniels-style training pace approximation.
- Create `src/domain/initializeService.ts`: initialization assessment and profile persistence.
- Modify `src/domain/summaryService.ts`: add monthly and cycle summaries.
- Modify `src/domain/reviewService.ts`: keep core review and expose route-friendly output.
- Modify `src/routes/coachRoutes.ts`: add `/coach/initialize`, `/coach/run-review`, `/coach/summary/weekly`, `/coach/summary/monthly`, `/coach/summary/cycle`.
- Modify `src/config.ts`: include `corosMcpEndpoint`.
- Modify `README.md`: add Docker Compose deployment and phase-2 HTTP examples.
- Modify `docs/openclaw-agent-contract.md`: document new endpoints and OpenClaw COROS forwarding contract.
- Add tests under `tests/` for each new unit and route.

## Task 1: Docker Compose Deployment

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml`
- Modify: `README.md`
- Test: build command and health command documented in README

- [ ] **Step 1: Create Docker artifacts**

Create `Dockerfile`:

```Dockerfile
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 8787
CMD ["node", "dist/src/index.js"]
```

Create `.dockerignore`:

```text
node_modules
dist
.git
.npm-cache
data
coverage
*.log
```

Create `docker-compose.yml`:

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

- [ ] **Step 2: Update README Docker section**

Add a Docker Compose section to `README.md`:

```md
## Docker Compose 部署

```bash
docker compose up -d --build
curl http://127.0.0.1:8787/health
```

默认挂载：

```text
./data:/data/running-coach
```

中国区 COROS MCP endpoint 默认配置为：

```text
https://mcpcn.coros.com/mcp
```
```

- [ ] **Step 3: Verify Docker config syntax**

Run: `docker compose config`

Expected: exits 0 and prints normalized compose config.

- [ ] **Step 4: Run tests and build**

Run: `npm.cmd test`

Expected: all tests pass.

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml README.md
git commit -m "feat: add docker compose deployment"
```

## Task 2: COROS Input Schemas and Config

**Files:**
- Create: `src/domain/corosTypes.ts`
- Modify: `src/config.ts`
- Test: `tests/corosTypes.test.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Write schema and config tests**

Create `tests/corosTypes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CorosInitializationInputSchema } from "../src/domain/corosTypes.js";

describe("coros input schemas", () => {
  it("validates initialization data forwarded by OpenClaw", () => {
    const parsed = CorosInitializationInputSchema.parse({
      userId: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      knownVdot: 45,
      recentRuns: [
        {
          id: "run-1",
          startedAt: "2026-05-18T12:00:00.000Z",
          durationMinutes: 48,
          distanceKm: 8,
          averagePaceSecondsPerKm: 360,
          averageHeartRate: 145
        }
      ],
      recentRecovery: [
        {
          date: "2026-05-18",
          recoveryStatus: "normal",
          sleepHours: 7,
          restingHeartRate: 52,
          hrvStatus: "normal",
          fatigueLevel: "normal"
        }
      ]
    });

    expect(parsed.userId).toBe("default");
    expect(parsed.recentRuns[0]?.distanceKm).toBe(8);
  });
});
```

Create `tests/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config", () => {
  it("defaults to the China COROS MCP endpoint", () => {
    const config = loadConfig({});
    expect(config.corosMcpEndpoint).toBe("https://mcpcn.coros.com/mcp");
  });
});
```

- [ ] **Step 2: Implement schemas**

Create `src/domain/corosTypes.ts`:

```ts
import { z } from "zod";
import { ManualEventSchema } from "./types.js";

export const CorosRunInputSchema = z.object({
  id: z.string().min(1),
  startedAt: z.string().datetime(),
  durationMinutes: z.number().positive(),
  distanceKm: z.number().positive(),
  averagePaceSecondsPerKm: z.number().positive(),
  averageHeartRate: z.number().positive().optional(),
  maxHeartRate: z.number().positive().optional(),
  elevationGainMeters: z.number().optional(),
  trainingLoad: z.number().nonnegative().optional(),
  cadence: z.number().positive().optional(),
  notes: z.string().default("")
});
export type CorosRunInput = z.infer<typeof CorosRunInputSchema>;

export const CorosRecoveryInputSchema = z.object({
  date: z.string(),
  recoveryStatus: z.enum(["good", "normal", "poor"]).optional(),
  sleepHours: z.number().nonnegative().optional(),
  restingHeartRate: z.number().positive().optional(),
  hrvStatus: z.enum(["good", "normal", "poor"]).optional(),
  fatigueLevel: z.enum(["low", "normal", "high"]).optional()
});
export type CorosRecoveryInput = z.infer<typeof CorosRecoveryInputSchema>;

export const KnownRaceResultSchema = z.object({
  race: z.enum(["5K", "10K", "HALF_MARATHON", "MARATHON"]),
  distanceKm: z.number().positive(),
  timeSeconds: z.number().int().positive(),
  occurredAt: z.string().datetime().optional()
});
export type KnownRaceResult = z.infer<typeof KnownRaceResultSchema>;

export const CorosInitializationInputSchema = z.object({
  userId: z.string().default("default"),
  goalRace: z.enum(["5K", "10K", "HALF_MARATHON", "MARATHON", "HEALTH"]),
  goalTimeSeconds: z.number().int().positive().optional(),
  knownVdot: z.number().min(20).max(85).optional(),
  knownRaceResult: KnownRaceResultSchema.optional(),
  recentRuns: z.array(CorosRunInputSchema).default([]),
  recentRecovery: z.array(CorosRecoveryInputSchema).default([]),
  recentManualEvents: z.array(ManualEventSchema).default([])
});
export type CorosInitializationInput = z.infer<typeof CorosInitializationInputSchema>;
```

- [ ] **Step 3: Add COROS endpoint config**

Modify `src/config.ts`:

```ts
export type AppConfig = {
  dataDir: string;
  databasePath: string;
  corosMcpEndpoint: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.RUNNING_COACH_DATA_DIR ?? "/data/running-coach";
  return {
    dataDir,
    databasePath: env.RUNNING_COACH_DB ?? `${dataDir}/events/running-coach.sqlite`,
    corosMcpEndpoint: env.COROS_MCP_ENDPOINT ?? "https://mcpcn.coros.com/mcp"
  };
}
```

- [ ] **Step 4: Run tests and build**

Run: `npm.cmd test -- tests/corosTypes.test.ts tests/config.test.ts`

Expected: both tests pass.

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/domain/corosTypes.ts src/config.ts tests/corosTypes.test.ts tests/config.test.ts
git commit -m "feat: add coros input schemas"
```

## Task 3: VDOT Estimation and Training Paces

**Files:**
- Create: `src/domain/vdot.ts`
- Test: `tests/vdot.test.ts`

- [ ] **Step 1: Write VDOT tests**

Create `tests/vdot.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { estimateVdotFromRace, estimateTrainingPaces } from "../src/domain/vdot.js";

describe("vdot", () => {
  it("estimates a plausible VDOT from a 10K race", () => {
    const result = estimateVdotFromRace({ distanceKm: 10, timeSeconds: 2700 });
    expect(result.vdot).toBeGreaterThanOrEqual(44);
    expect(result.vdot).toBeLessThanOrEqual(48);
    expect(result.source).toBe("race_result");
  });

  it("returns Daniels-style training pace labels", () => {
    const paces = estimateTrainingPaces(45);
    expect(paces.easy).toContain("/km");
    expect(paces.threshold).toContain("/km");
    expect(paces.interval).toContain("/km");
  });
});
```

- [ ] **Step 2: Implement VDOT module**

Create `src/domain/vdot.ts`:

```ts
export type VdotEstimate = {
  vdot: number;
  source: "manual" | "race_result" | "recent_training_estimate" | "insufficient_data";
  confidence: "high" | "medium" | "low";
};

export type TrainingPaces = {
  vdot: number;
  easy: string;
  marathon: string;
  threshold: string;
  interval: string;
  repetition: string;
};

export function estimateVdotFromRace(input: { distanceKm: number; timeSeconds: number }): VdotEstimate {
  const minutes = input.timeSeconds / 60;
  const meters = input.distanceKm * 1000;
  const velocity = meters / minutes;
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
  const oxygenCost = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
  const vdot = oxygenCost / percentMax;

  return {
    vdot: roundToHalf(clamp(vdot, 20, 85)),
    source: "race_result",
    confidence: "high"
  };
}

export function estimateTrainingPaces(vdot: number): TrainingPaces {
  const raceVelocity = velocityForVdot(vdot);
  return {
    vdot,
    easy: paceRange(raceVelocity * 0.72, raceVelocity * 0.78),
    marathon: paceRange(raceVelocity * 0.80, raceVelocity * 0.84),
    threshold: paceRange(raceVelocity * 0.86, raceVelocity * 0.90),
    interval: paceRange(raceVelocity * 0.97, raceVelocity * 1.02),
    repetition: paceRange(raceVelocity * 1.05, raceVelocity * 1.12)
  };
}

function velocityForVdot(vdot: number): number {
  let bestVelocity = 180;
  let bestError = Number.POSITIVE_INFINITY;
  for (let velocity = 120; velocity <= 400; velocity += 0.25) {
    const oxygenCost = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
    const error = Math.abs(oxygenCost - vdot);
    if (error < bestError) {
      bestError = error;
      bestVelocity = velocity;
    }
  }
  return bestVelocity;
}

function paceRange(slowerVelocity: number, fasterVelocity: number): string {
  const slower = secondsPerKm(slowerVelocity);
  const faster = secondsPerKm(fasterVelocity);
  return `${formatPace(faster)}-${formatPace(slower)}/km`;
}

function secondsPerKm(metersPerMinute: number): number {
  return Math.round(1000 / metersPerMinute * 60);
}

function formatPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 3: Run VDOT tests and build**

Run: `npm.cmd test -- tests/vdot.test.ts`

Expected: both tests pass.

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/domain/vdot.ts tests/vdot.test.ts
git commit -m "feat: add vdot estimation"
```

## Task 4: Initialization Assessment

**Files:**
- Create: `src/domain/initializeService.ts`
- Modify: `src/routes/coachRoutes.ts`
- Test: `tests/initializeService.test.ts`
- Test: `tests/routesInitialize.test.ts`

- [ ] **Step 1: Write initialization service tests**

Create `tests/initializeService.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { initializeProfile } from "../src/domain/initializeService.js";
import { createDatabase } from "../src/storage/db.js";
import { createRepositories } from "../src/storage/repositories.js";

describe("initialize service", () => {
  it("uses known VDOT when provided", () => {
    const repos = createRepositories(createDatabase(":memory:"));
    const result = initializeProfile(repos, {
      userId: "default",
      goalRace: "10K",
      goalTimeSeconds: 2700,
      knownVdot: 45,
      recentRuns: [],
      recentRecovery: [],
      recentManualEvents: []
    });

    expect(result.estimatedVdot).toBe(45);
    expect(result.vdotSource).toBe("manual");
    expect(repos.profile.get("default")?.currentVdot).toBe(45);
  });
});
```

- [ ] **Step 2: Implement initialization service**

Create `src/domain/initializeService.ts`:

```ts
import type { CorosInitializationInput } from "./corosTypes.js";
import { estimateTrainingPaces, estimateVdotFromRace, type VdotEstimate } from "./vdot.js";
import { chooseDailyTraining } from "./danielsRules.js";
import type { createRepositories } from "../storage/repositories.js";

type Repositories = ReturnType<typeof createRepositories>;

export type InitializationResult = {
  profile: ReturnType<Repositories["profile"]["get"]>;
  estimatedVdot: number;
  vdotSource: VdotEstimate["source"];
  trainingStatus: string;
  riskFlags: string[];
  trainingPaces: ReturnType<typeof estimateTrainingPaces>;
  initialAdvice: ReturnType<typeof chooseDailyTraining>;
  message: string;
};

export function initializeProfile(repos: Repositories, input: CorosInitializationInput): InitializationResult {
  const vdot = resolveVdot(input);
  const now = new Date().toISOString();
  const riskFlags = buildRiskFlags(input);

  const profile = {
    id: input.userId,
    goalRace: input.goalRace,
    goalTimeSeconds: input.goalTimeSeconds,
    currentVdot: vdot.vdot,
    injuryNotes: [],
    preferredTrainingDays: [],
    createdAt: now,
    updatedAt: now
  };
  repos.profile.save(profile);

  for (const event of input.recentManualEvents) {
    repos.events.addManual(event);
  }

  const initialAdvice = chooseDailyTraining({
    currentVdot: vdot.vdot,
    cycleFocus: input.goalRace === "MARATHON" ? "race_specific" : "threshold",
    context: {
      date: now.slice(0, 10),
      availableMinutes: 45,
      sleepQuality: hasPoorRecovery(input) ? "poor" : "normal",
      fatigue: hasPoorRecovery(input) ? "high" : "normal"
    },
    recentManualLoad: input.recentManualEvents
  });

  const trainingPaces = estimateTrainingPaces(vdot.vdot);
  const savedProfile = repos.profile.get(input.userId);

  return {
    profile: savedProfile,
    estimatedVdot: vdot.vdot,
    vdotSource: vdot.source,
    trainingStatus: riskFlags.length > 0 ? "需要保守推进" : "可以进入常规训练",
    riskFlags,
    trainingPaces,
    initialAdvice,
    message: `初始化完成：当前 VDOT ${vdot.vdot}，来源 ${vdot.source}。${riskFlags.length ? `风险提示：${riskFlags.join("；")}` : "暂无明显风险。"}`
  };
}

function resolveVdot(input: CorosInitializationInput): VdotEstimate {
  if (input.knownVdot) {
    return { vdot: input.knownVdot, source: "manual", confidence: "high" };
  }
  if (input.knownRaceResult) {
    return estimateVdotFromRace({
      distanceKm: input.knownRaceResult.distanceKm,
      timeSeconds: input.knownRaceResult.timeSeconds
    });
  }
  return { vdot: 35, source: "insufficient_data", confidence: "low" };
}

function buildRiskFlags(input: CorosInitializationInput): string[] {
  const flags: string[] = [];
  if (input.recentManualEvents.some((event) => event.type === "basketball" && event.affectsNextRun)) {
    flags.push("近期篮球负荷会影响跑步恢复");
  }
  if (hasPoorRecovery(input)) {
    flags.push("近期恢复指标偏弱");
  }
  if (input.recentRuns.length === 0 && !input.knownVdot && !input.knownRaceResult) {
    flags.push("缺少近期跑步数据，VDOT 仅为保守默认值");
  }
  return flags;
}

function hasPoorRecovery(input: CorosInitializationInput): boolean {
  return input.recentRecovery.some(
    (item) => item.recoveryStatus === "poor" || item.hrvStatus === "poor" || item.fatigueLevel === "high"
  );
}
```

- [ ] **Step 3: Add initialize route test**

Create `tests/routesInitialize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("initialize route", () => {
  it("initializes profile from known VDOT", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/initialize",
      payload: {
        userId: "default",
        goalRace: "10K",
        goalTimeSeconds: 2700,
        knownVdot: 45,
        recentRuns: [],
        recentRecovery: [],
        recentManualEvents: []
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().estimatedVdot).toBe(45);
    expect(response.json().message).toContain("初始化完成");
  });
});
```

- [ ] **Step 4: Implement initialize route**

Modify `src/routes/coachRoutes.ts`:

```ts
import { CorosInitializationInputSchema } from "../domain/corosTypes.js";
import { initializeProfile } from "../domain/initializeService.js";
```

Inside `registerCoachRoutes`, before `/coach/profile`:

```ts
  app.post("/coach/initialize", async (request) => {
    const body = CorosInitializationInputSchema.parse(request.body);
    const result = initializeProfile(repos, body);
    return { ok: true, ...result };
  });
```

- [ ] **Step 5: Run initialization tests and build**

Run: `npm.cmd test -- tests/initializeService.test.ts tests/routesInitialize.test.ts`

Expected: both tests pass.

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/domain/initializeService.ts src/routes/coachRoutes.ts tests/initializeService.test.ts tests/routesInitialize.test.ts
git commit -m "feat: add initialization assessment"
```

## Task 5: Run Review HTTP Route

**Files:**
- Modify: `src/routes/coachRoutes.ts`
- Modify: `src/templates/messages.ts`
- Test: `tests/routesRunReview.test.ts`

- [ ] **Step 1: Write route test**

Create `tests/routesRunReview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("run review route", () => {
  it("reviews a completed run", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/run-review",
      payload: {
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
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("跑后复盘");
    expect(response.json().review.deviations.join(" ")).toContain("偏快");
  });
});
```

- [ ] **Step 2: Add review formatter**

Modify `src/templates/messages.ts`:

```ts
import type { RunReview } from "../domain/reviewService.js";

export function formatRunReview(review: RunReview): string {
  return [
    `跑后复盘：${review.matchedType}`,
    review.summary,
    `完成意图：${review.completedIntent ? "是" : "否"}`,
    `偏差：${review.deviations.length ? review.deviations.join(" ") : "无明显偏差。"}`,
    `下次调整：${review.nextAdjustment}`
  ].join("\n");
}
```

- [ ] **Step 3: Implement route**

Modify `src/routes/coachRoutes.ts`:

```ts
import { reviewRun } from "../domain/reviewService.js";
import { RunActivitySchema, TrainingTypeSchema } from "../domain/types.js";
import { formatRunReview } from "../templates/messages.js";
```

Inside `registerCoachRoutes`:

```ts
  app.post("/coach/run-review", async (request) => {
    const body = z
      .object({
        plannedType: TrainingTypeSchema,
        currentVdot: z.number().min(20).max(85),
        run: RunActivitySchema,
        recentContextNotes: z.array(z.string()).default([])
      })
      .parse(request.body);

    const review = reviewRun(body);
    return { ok: true, message: formatRunReview(review), review };
  });
```

- [ ] **Step 4: Run route test and build**

Run: `npm.cmd test -- tests/routesRunReview.test.ts`

Expected: test passes.

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/routes/coachRoutes.ts src/templates/messages.ts tests/routesRunReview.test.ts
git commit -m "feat: add run review route"
```

## Task 6: Weekly, Monthly, and Cycle Summary Routes

**Files:**
- Modify: `src/domain/summaryService.ts`
- Modify: `src/routes/coachRoutes.ts`
- Modify: `src/templates/messages.ts`
- Test: `tests/summaryServiceExtended.test.ts`
- Test: `tests/routesSummary.test.ts`

- [ ] **Step 1: Write summary service tests**

Create `tests/summaryServiceExtended.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createCycleSummary, createMonthlySummary } from "../src/domain/summaryService.js";

describe("extended summary service", () => {
  it("creates a monthly summary", () => {
    const summary = createMonthlySummary({
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      totalRunKm: 120,
      currentVdot: 45,
      manualEventCount: 4
    });
    expect(summary).toContain("月总结");
    expect(summary).toContain("120 km");
  });

  it("creates a cycle summary", () => {
    const summary = createCycleSummary({
      periodStart: "2026-04-01",
      periodEnd: "2026-05-31",
      cycleGoal: "10K threshold block",
      completedQualitySessions: 8,
      currentVdot: 45
    });
    expect(summary).toContain("周期总结");
    expect(summary).toContain("10K threshold block");
  });
});
```

- [ ] **Step 2: Extend summary service**

Modify `src/domain/summaryService.ts`:

```ts
export function createMonthlySummary(input: {
  periodStart: string;
  periodEnd: string;
  totalRunKm: number;
  currentVdot: number;
  manualEventCount: number;
}): string {
  return [
    `月总结 ${input.periodStart} 至 ${input.periodEnd}`,
    `跑量：${input.totalRunKm} km。`,
    `当前 VDOT：${input.currentVdot}。`,
    `非跑步事件：${input.manualEventCount} 次。`,
    "下月重点：保持训练一致性，按恢复状态安排 Daniels 质量课。"
  ].join("\n");
}

export function createCycleSummary(input: {
  periodStart: string;
  periodEnd: string;
  cycleGoal: string;
  completedQualitySessions: number;
  currentVdot: number;
}): string {
  return [
    `周期总结 ${input.periodStart} 至 ${input.periodEnd}`,
    `周期目标：${input.cycleGoal}。`,
    `完成质量课：${input.completedQualitySessions} 次。`,
    `当前 VDOT：${input.currentVdot}。`,
    "下一步：如果恢复稳定，可以进入下一周期；如果疲劳累积，先安排减量周。"
  ].join("\n");
}
```

- [ ] **Step 3: Write summary route tests**

Create `tests/routesSummary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("summary routes", () => {
  it("returns weekly summary", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/summary/weekly",
      payload: {
        periodStart: "2026-05-13",
        periodEnd: "2026-05-19",
        totalRunKm: 32,
        qualitySessions: 1,
        manualEvents: []
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("周总结");
  });

  it("returns monthly summary", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/summary/monthly",
      payload: {
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        totalRunKm: 120,
        currentVdot: 45,
        manualEventCount: 4
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("月总结");
  });

  it("returns cycle summary", async () => {
    const app = buildServer({ databasePath: ":memory:" });
    const response = await app.inject({
      method: "POST",
      url: "/coach/summary/cycle",
      payload: {
        periodStart: "2026-04-01",
        periodEnd: "2026-05-31",
        cycleGoal: "10K threshold block",
        completedQualitySessions: 8,
        currentVdot: 45
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("周期总结");
  });
});
```

- [ ] **Step 4: Implement routes**

Modify `src/routes/coachRoutes.ts` imports:

```ts
import { createCycleSummary, createMonthlySummary, createWeeklySummary } from "../domain/summaryService.js";
```

Inside `registerCoachRoutes`:

```ts
  app.post("/coach/summary/weekly", async (request) => {
    const body = z.object({
      periodStart: z.string(),
      periodEnd: z.string(),
      totalRunKm: z.number().nonnegative(),
      qualitySessions: z.number().int().nonnegative(),
      manualEvents: z.array(ManualEventSchema).default([])
    }).parse(request.body);
    const message = createWeeklySummary(body);
    return { ok: true, message };
  });

  app.post("/coach/summary/monthly", async (request) => {
    const body = z.object({
      periodStart: z.string(),
      periodEnd: z.string(),
      totalRunKm: z.number().nonnegative(),
      currentVdot: z.number().min(20).max(85),
      manualEventCount: z.number().int().nonnegative()
    }).parse(request.body);
    const message = createMonthlySummary(body);
    return { ok: true, message };
  });

  app.post("/coach/summary/cycle", async (request) => {
    const body = z.object({
      periodStart: z.string(),
      periodEnd: z.string(),
      cycleGoal: z.string(),
      completedQualitySessions: z.number().int().nonnegative(),
      currentVdot: z.number().min(20).max(85)
    }).parse(request.body);
    const message = createCycleSummary(body);
    return { ok: true, message };
  });
```

- [ ] **Step 5: Run summary tests and build**

Run: `npm.cmd test -- tests/summaryServiceExtended.test.ts tests/routesSummary.test.ts`

Expected: all tests pass.

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/domain/summaryService.ts src/routes/coachRoutes.ts tests/summaryServiceExtended.test.ts tests/routesSummary.test.ts
git commit -m "feat: add summary routes"
```

## Task 7: Documentation and Contract Updates

**Files:**
- Modify: `README.md`
- Modify: `docs/openclaw-agent-contract.md`
- Test: `npm.cmd test`
- Test: `npm.cmd run build`

- [ ] **Step 1: Update README**

Add sections for:

- Docker Compose deployment command.
- China COROS MCP endpoint.
- `/coach/initialize` example.
- `/coach/run-review` example.
- `/coach/summary/weekly`, monthly, and cycle examples.
- VDOT approximation disclaimer and V.O2 Calculator link.

- [ ] **Step 2: Update OpenClaw contract**

Document:

- OpenClaw calls COROS MCP first.
- OpenClaw forwards standardized JSON to `/coach/initialize`.
- New endpoint request and response examples.
- COROS endpoint env var `COROS_MCP_ENDPOINT=https://mcpcn.coros.com/mcp`.

- [ ] **Step 3: Run full verification**

Run: `npm.cmd test`

Expected: all tests pass.

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/openclaw-agent-contract.md
git commit -m "docs: update phase 2 deployment contract"
```

## Task 8: Final Verification and Push

**Files:**
- Modify only if final verification exposes defects.

- [ ] **Step 1: Verify working tree**

Run: `git -c safe.directory=D:/WorkSpace/DN_running_coach status --short --branch`

Expected: on `main`, no unexpected untracked files except intended changes before final commit.

- [ ] **Step 2: Run full test suite**

Run: `npm.cmd test`

Expected: all tests pass.

- [ ] **Step 3: Run build**

Run: `npm.cmd run build`

Expected: TypeScript build succeeds.

- [ ] **Step 4: Push main**

Run: `git -c safe.directory=D:/WorkSpace/DN_running_coach push origin main`

Expected: push succeeds.

## Self-Review

- Spec coverage: Docker Compose is covered by Task 1. COROS MCP standard inputs and China endpoint are covered by Task 2. Initialization assessment is Task 4. Run review route is Task 5. Weekly, monthly, and cycle summary routes are Task 6. VDOT estimation and pace output are Task 3. README and OpenClaw contract updates are Task 7.
- Placeholder scan: No TODO/TBD placeholders are present. The plan intentionally keeps COROS MCP invocation in OpenClaw and documents the service-side standardized JSON contract.
- Type consistency: `CorosInitializationInput`, `TrainingPaces`, `VdotEstimate`, `RunReview`, and summary function names are introduced before route tasks use them.
