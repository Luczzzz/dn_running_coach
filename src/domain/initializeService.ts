import type { CorosInitializationInput } from "./corosTypes.js";
import { chooseDailyTraining } from "./danielsRules.js";
import { estimateTrainingPaces, estimateVdotFromRace, type VdotEstimate } from "./vdot.js";
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
    message: `初始化完成：当前 VDOT ${vdot.vdot}，来源 ${vdot.source}。${
      riskFlags.length ? `风险提示：${riskFlags.join("；")}` : "暂无明显风险。"
    }`
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
