import { describe, expect, it, vi } from "vitest";
import { RaceLifecycle, type TimerScheduler } from "./raceLifecycle";

describe("RaceLifecycle", () => {
  it("cleans pending countdown and finish callbacks on cancellation", () => {
    vi.useFakeTimers();
    const scheduler: TimerScheduler = {
      setTimeout: (callback, delay) => Number(setTimeout(callback, delay)),
      clearTimeout: (id) => clearTimeout(id),
      setInterval: (callback, delay) => Number(setInterval(callback, delay)),
      clearInterval: (id) => clearInterval(id),
    };
    const lifecycle = new RaceLifecycle(scheduler);
    const token = lifecycle.begin();
    const callback = vi.fn();
    lifecycle.setInterval(token, callback, 100);
    lifecycle.setTimeout(token, callback, 500);
    lifecycle.cancel();
    vi.advanceTimersByTime(1_000);
    expect(callback).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("allows race completion exactly once per run", () => {
    const lifecycle = new RaceLifecycle({
      setTimeout: () => 1, clearTimeout: () => undefined, setInterval: () => 1, clearInterval: () => undefined,
    });
    const first = lifecycle.begin();
    expect(lifecycle.claimCompletion(first)).toBe(true);
    expect(lifecycle.claimCompletion(first)).toBe(false);
    const second = lifecycle.begin();
    expect(lifecycle.claimCompletion(first)).toBe(false);
    expect(lifecycle.claimCompletion(second)).toBe(true);
  });
});
