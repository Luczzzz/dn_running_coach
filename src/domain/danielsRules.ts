import type { DailyContext, ManualEvent, TrainingAdvice, TrainingType } from "./types.js";

export type CycleFocus = "base" | "threshold" | "interval" | "race_specific";

type ChooseDailyTrainingInput = {
  currentVdot: number;
  cycleFocus: CycleFocus;
  context: DailyContext;
  recentManualLoad: ManualEvent[];
};

export function chooseDailyTraining(input: ChooseDailyTrainingInput): TrainingAdvice {
  const downgrade = getDowngradeReason(input.context, input.recentManualLoad);
  if (downgrade) {
    return {
      type: "E",
      purpose: "轻松跑用于维持有氧刺激并降低恢复成本",
      durationMinutes: Math.min(input.context.availableMinutes, 45),
      paceGuidance: easyPaceGuidance(input.currentVdot),
      rationale: ["Daniels 体系下，恢复不足时优先保留 E 跑而不是硬做质量课。", downgrade.rationale],
      downgradeReason: downgrade.reason,
      alternative: "如果疲劳继续偏高，改为休息或 20-30 分钟轻松活动。"
    };
  }

  const type = focusToTrainingType(input.cycleFocus);
  return {
    type,
    purpose: purposeFor(type),
    durationMinutes: Math.min(input.context.availableMinutes, defaultDuration(type)),
    paceGuidance: paceGuidanceFor(type, input.currentVdot),
    rationale: [
      `当前周期重点是 ${input.cycleFocus}，今日状态允许安排 ${type} 课。`,
      "训练配速以当前 VDOT 为依据，不按目标成绩硬推。"
    ]
  };
}

function getDowngradeReason(context: DailyContext, recentManualLoad: ManualEvent[]) {
  if (context.sleepQuality === "poor" || context.fatigue === "high" || context.hasOvertime) {
    return {
      reason: "恢复不足或现实压力偏高",
      rationale: "睡眠、疲劳或加班会提高质量课失败和恢复延迟的风险。"
    };
  }

  const hardLowerBody = recentManualLoad.find(
    (event) =>
      event.affectsNextRun ||
      event.type === "basketball" ||
      (event.type === "strength" && event.lowerBodyLoad === "high")
  );

  if (hardLowerBody) {
    return {
      reason: "近期存在下肢或高冲击负荷",
      rationale: `近期记录了${eventLabel(hardLowerBody)}，今天不叠加强度课。`
    };
  }

  return undefined;
}

function focusToTrainingType(focus: CycleFocus): TrainingType {
  if (focus === "threshold") return "T";
  if (focus === "interval") return "I";
  if (focus === "race_specific") return "M";
  return "E";
}

function purposeFor(type: TrainingType): string {
  const purposes: Record<TrainingType, string> = {
    E: "轻松跑用于有氧基础、恢复和跑量积累",
    M: "马拉松配速跑用于专项耐力和配速经济性",
    T: "阈值跑用于提高可持续输出能力",
    I: "间歇跑用于最大摄氧量相关刺激",
    R: "重复跑用于速度、跑姿和神经肌肉效率",
    REST: "休息用于恢复和适应"
  };
  return purposes[type];
}

function defaultDuration(type: TrainingType): number {
  const durations: Record<TrainingType, number> = {
    E: 45,
    M: 70,
    T: 60,
    I: 55,
    R: 45,
    REST: 0
  };
  return durations[type];
}

function paceGuidanceFor(type: TrainingType, vdot: number): string {
  if (type === "E") return easyPaceGuidance(vdot);
  return `按 VDOT ${vdot} 对应的 ${type} 配速区间执行；第一版仅输出类型，具体表格由 rules 配置补齐。`;
}

function easyPaceGuidance(vdot: number): string {
  return `按 VDOT ${vdot} 对应 E 配速或轻松心率执行，必须能完整说话。`;
}

function eventLabel(event: ManualEvent): string {
  if (event.type === "basketball") return "篮球";
  if (event.type === "strength") return "力量训练";
  return event.type;
}
