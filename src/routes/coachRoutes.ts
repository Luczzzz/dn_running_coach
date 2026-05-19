import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CorosInitializationInputSchema } from "../domain/corosTypes.js";
import { createDailyAdvice } from "../domain/adviceService.js";
import { initializeProfile } from "../domain/initializeService.js";
import { reviewRun } from "../domain/reviewService.js";
import { createCycleSummary, createMonthlySummary, createWeeklySummary } from "../domain/summaryService.js";
import { ManualEventSchema, RunActivitySchema, TrainingTypeSchema, UserProfileSchema } from "../domain/types.js";
import type { createRepositories } from "../storage/repositories.js";
import { formatAdvice, formatRunReview } from "../templates/messages.js";

type Repositories = ReturnType<typeof createRepositories>;

export async function registerCoachRoutes(app: FastifyInstance, repos: Repositories) {
  app.post("/coach/initialize", async (request) => {
    const body = CorosInitializationInputSchema.parse(request.body);
    const result = initializeProfile(repos, body);
    return { ok: true, ...result };
  });

  app.post("/coach/profile", async (request) => {
    const profile = UserProfileSchema.parse(request.body);
    repos.profile.save(profile);
    return { ok: true, profile };
  });

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

  app.post("/coach/daily-advice", async (request, reply) => {
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

    try {
      const advice = createDailyAdvice(repos, body.userId, {
        date: body.date,
        availableMinutes: body.availableMinutes,
        sleepQuality: body.sleepQuality,
        fatigue: body.fatigue,
        hasOvertime: body.hasOvertime
      });

      return { ok: true, message: formatAdvice(advice), advice };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Profile not found")) {
        return reply.code(404).send({ ok: false, error: "PROFILE_NOT_FOUND", message: error.message });
      }
      throw error;
    }
  });

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

  app.post("/coach/summary/weekly", async (request) => {
    const body = z
      .object({
        periodStart: z.string(),
        periodEnd: z.string(),
        totalRunKm: z.number().nonnegative(),
        qualitySessions: z.number().int().nonnegative(),
        manualEvents: z.array(ManualEventSchema).default([])
      })
      .parse(request.body);
    const message = createWeeklySummary(body);
    return { ok: true, message };
  });

  app.post("/coach/summary/monthly", async (request) => {
    const body = z
      .object({
        periodStart: z.string(),
        periodEnd: z.string(),
        totalRunKm: z.number().nonnegative(),
        currentVdot: z.number().min(20).max(85),
        manualEventCount: z.number().int().nonnegative()
      })
      .parse(request.body);
    const message = createMonthlySummary(body);
    return { ok: true, message };
  });

  app.post("/coach/summary/cycle", async (request) => {
    const body = z
      .object({
        periodStart: z.string(),
        periodEnd: z.string(),
        cycleGoal: z.string(),
        completedQualitySessions: z.number().int().nonnegative(),
        currentVdot: z.number().min(20).max(85)
      })
      .parse(request.body);
    const message = createCycleSummary(body);
    return { ok: true, message };
  });
}
