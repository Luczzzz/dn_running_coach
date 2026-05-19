import type { RunActivity, TrainingType } from "./types.js";

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
