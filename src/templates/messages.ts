import type { TrainingAdvice } from "../domain/types.js";
import type { RunReview } from "../domain/reviewService.js";

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

export function formatRunReview(review: RunReview): string {
  return [
    `跑后复盘：${review.matchedType}`,
    review.summary,
    `完成意图：${review.completedIntent ? "是" : "否"}`,
    `偏差：${review.deviations.length ? review.deviations.join(" ") : "无明显偏差。"}`,
    `下次调整：${review.nextAdjustment}`
  ].join("\n");
}
