import { describe, expect, it } from "vitest";
import { INITIAL_LAP_PROGRESS, updateLapProgress } from "./lapDetection";
import { TRACKS } from "./tracks";

const track = TRACKS[0];
const checkpointZ = (track.checkpoint.zMin + track.checkpoint.zMax) / 2;
const finishZ = (track.finish.zMin + track.finish.zMax) / 2;

describe("lap direction and sequence", () => {
  it("counts one lap after checkpoint and finish are crossed in the correct direction", () => {
    const checkpoint = updateLapProgress(
      { x: -1, z: checkpointZ },
      { x: 1, z: checkpointZ },
      track,
      INITIAL_LAP_PROGRESS,
    );
    expect(checkpoint.progress.checkpointPassed).toBe(true);
    expect(checkpoint.lapCompleted).toBe(false);

    const finish = updateLapProgress(
      { x: 1, z: finishZ },
      { x: -1, z: finishZ },
      track,
      checkpoint.progress,
    );
    expect(finish.lapCompleted).toBe(true);
    expect(finish.progress.checkpointPassed).toBe(false);
  });

  it("does not count a finish without a checkpoint", () => {
    const result = updateLapProgress(
      { x: 1, z: finishZ },
      { x: -1, z: finishZ },
      track,
      INITIAL_LAP_PROGRESS,
    );
    expect(result.lapCompleted).toBe(false);
  });

  it("rejects backward checkpoint and finish crossings", () => {
    const checkpoint = updateLapProgress(
      { x: 1, z: checkpointZ },
      { x: -1, z: checkpointZ },
      track,
      INITIAL_LAP_PROGRESS,
    );
    expect(checkpoint.progress.checkpointPassed).toBe(false);

    const finish = updateLapProgress(
      { x: -1, z: finishZ },
      { x: 1, z: finishZ },
      track,
      { checkpointPassed: true },
    );
    expect(finish.lapCompleted).toBe(false);
  });

  it("does not repeat a lap while remaining beyond the finish line", () => {
    const first = updateLapProgress(
      { x: 1, z: finishZ },
      { x: -1, z: finishZ },
      track,
      { checkpointPassed: true },
    );
    const second = updateLapProgress(
      { x: -1, z: finishZ },
      { x: -2, z: finishZ },
      track,
      first.progress,
    );
    expect(first.lapCompleted).toBe(true);
    expect(second.lapCompleted).toBe(false);
  });
});
