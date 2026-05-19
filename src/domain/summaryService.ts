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
