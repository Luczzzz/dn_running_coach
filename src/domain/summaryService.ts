import type { ManualEvent } from "./types.js";

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
