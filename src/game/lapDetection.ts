/**
 * Directed gates on the X axis prevent oscillation at the finish line from
 * counting extra laps. A lap requires crossing the checkpoint first and then
 * the finish line in the configured direction and within the gate's Z bounds.
 */
import type { Point2 } from "./trackGeometry";
import type { TrackDef, TrackGate } from "./tracks";

export interface LapProgress {
  checkpointPassed: boolean;
}

export interface LapUpdate {
  progress: LapProgress;
  lapCompleted: boolean;
}

export const INITIAL_LAP_PROGRESS: LapProgress = { checkpointPassed: false };

/** Finds the exact gate crossing point so a long frame cannot skip the gate. */
export function crossesGate(previous: Point2, current: Point2, gate: TrackGate): boolean {
  const crossedInDirection = gate.direction < 0
    ? previous.x > gate.x && current.x <= gate.x
    : previous.x < gate.x && current.x >= gate.x;
  if (!crossedInDirection || current.x === previous.x) return false;

  const fraction = (gate.x - previous.x) / (current.x - previous.x);
  const crossingZ = previous.z + (current.z - previous.z) * fraction;
  return fraction >= 0 && fraction <= 1 && crossingZ >= gate.zMin && crossingZ <= gate.zMax;
}

export function updateLapProgress(
  previous: Point2,
  current: Point2,
  track: Pick<TrackDef, "checkpoint" | "finish">,
  progress: LapProgress,
): LapUpdate {
  // Checkpoint progress is retained until the finish line is crossed legally.
  let checkpointPassed = progress.checkpointPassed;
  if (!checkpointPassed && crossesGate(previous, current, track.checkpoint)) {
    checkpointPassed = true;
  }

  if (checkpointPassed && crossesGate(previous, current, track.finish)) {
    return { progress: INITIAL_LAP_PROGRESS, lapCompleted: true };
  }

  return { progress: { checkpointPassed }, lapCompleted: false };
}
