export type VdotEstimate = {
  vdot: number;
  source: "manual" | "race_result" | "recent_training_estimate" | "insufficient_data";
  confidence: "high" | "medium" | "low";
};

export type TrainingPaces = {
  vdot: number;
  easy: string;
  marathon: string;
  threshold: string;
  interval: string;
  repetition: string;
};

export function estimateVdotFromRace(input: { distanceKm: number; timeSeconds: number }): VdotEstimate {
  const minutes = input.timeSeconds / 60;
  const meters = input.distanceKm * 1000;
  const velocity = meters / minutes;
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
  const oxygenCost = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
  const vdot = oxygenCost / percentMax;

  return {
    vdot: roundToHalf(clamp(vdot, 20, 85)),
    source: "race_result",
    confidence: "high"
  };
}

export function estimateTrainingPaces(vdot: number): TrainingPaces {
  const raceVelocity = velocityForVdot(vdot);
  return {
    vdot,
    easy: paceRange(raceVelocity * 0.72, raceVelocity * 0.78),
    marathon: paceRange(raceVelocity * 0.8, raceVelocity * 0.84),
    threshold: paceRange(raceVelocity * 0.86, raceVelocity * 0.9),
    interval: paceRange(raceVelocity * 0.97, raceVelocity * 1.02),
    repetition: paceRange(raceVelocity * 1.05, raceVelocity * 1.12)
  };
}

function velocityForVdot(vdot: number): number {
  let bestVelocity = 180;
  let bestError = Number.POSITIVE_INFINITY;
  for (let velocity = 120; velocity <= 400; velocity += 0.25) {
    const oxygenCost = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
    const error = Math.abs(oxygenCost - vdot);
    if (error < bestError) {
      bestError = error;
      bestVelocity = velocity;
    }
  }
  return bestVelocity;
}

function paceRange(slowerVelocity: number, fasterVelocity: number): string {
  const slower = secondsPerKm(slowerVelocity);
  const faster = secondsPerKm(fasterVelocity);
  return `${formatPace(faster)}-${formatPace(slower)}/km`;
}

function secondsPerKm(metersPerMinute: number): number {
  return Math.round((1000 / metersPerMinute) * 60);
}

function formatPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
