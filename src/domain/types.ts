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
