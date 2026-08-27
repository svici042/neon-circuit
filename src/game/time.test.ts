import { describe, expect, it } from "vitest";
import { formatTime, RaceClock } from "./time";

describe("RaceClock", () => {
  it("excludes pauses from lap and total time", () => {
    let now = 100;
    const clock = new RaceClock(() => now);
    clock.start();
    now = 1_100;
    clock.pause();
    now = 6_100;
    expect(clock.snapshot()).toEqual({ lapTime: 1_000, totalTime: 1_000 });
    clock.resume();
    now = 7_100;
    expect(clock.snapshot()).toEqual({ lapTime: 2_000, totalTime: 2_000 });
    expect(clock.completeLap()).toBe(2_000);
    now = 8_100;
    expect(clock.snapshot()).toEqual({ lapTime: 1_000, totalTime: 3_000 });
  });

  it("fully resets and restarts", () => {
    let now = 0;
    const clock = new RaceClock(() => now);
    clock.start();
    now = 500;
    clock.reset();
    expect(clock.snapshot()).toEqual({ lapTime: 0, totalTime: 0 });
    now = 1_000;
    clock.start();
    now = 1_250;
    expect(clock.snapshot().totalTime).toBe(250);
  });
});

describe("formatTime", () => {
  it("formats only finite positive millisecond values", () => {
    expect(formatTime(61_009.9)).toBe("1:01.009");
    expect(formatTime(Number.NaN)).toBe("0:00.000");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00.000");
  });
});
