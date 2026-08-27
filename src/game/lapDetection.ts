/**
 * Directed X-axis gates prevent a finish-line oscillation from counting laps.
 * A lap requires the opposite-side checkpoint first, then the finish crossing
 * in each gate's authored direction and within its inclusive Z span.
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

/** Interpolates the swept segment at gate X so large frames cannot skip a gate. */
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
  let checkpointPassed = progress.checkpointPassed;
  if (!checkpointPassed && crossesGate(previous, current, track.checkpoint)) {
    checkpointPassed = true;
  }

  if (checkpointPassed && crossesGate(previous, current, track.finish)) {
    return { progress: INITIAL_LAP_PROGRESS, lapCompleted: true };
  }

  return { progress: { checkpointPassed }, lapCompleted: false };
}
