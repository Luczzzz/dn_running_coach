import { chooseDailyTraining } from "./danielsRules.js";
import type { DailyContext, TrainingAdvice } from "./types.js";
import type { createRepositories } from "../storage/repositories.js";

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
