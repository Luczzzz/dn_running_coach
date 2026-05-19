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
