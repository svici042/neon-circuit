import { describe, expect, it } from "vitest";
import { loadLeaderboard, MAX_RESULTS_PER_TRACK, MAX_STORED_CHARACTERS, normalizeLeaderboard, saveLeaderboard, type StorageLike } from "./leaderboardStorage";

const valid = (index = 0) => ({ trackId: 1, trackName: "Neon Oval", totalTime: 10_000 + index, bestLap: 3_000, date: "2026-01-01T00:00:00.000Z" });

describe("leaderboard storage", () => {
  it("discards malformed, unbounded, and unknown-track records", () => {
    const entries = normalizeLeaderboard([valid(), null, { ...valid(), totalTime: Infinity }, { ...valid(), trackId: 999, trackName: "fake" }, { ...valid(), date: "invalid" }]);
    expect(entries).toHaveLength(1);
    expect(entries[0].trackId).toBe(1);
  });

  it("bounds results per track", () => {
    expect(normalizeLeaderboard(Array.from({ length: 20 }, (_, index) => valid(index)))).toHaveLength(MAX_RESULTS_PER_TRACK);
  });

  it("handles parse, privacy, and quota failures", () => {
    const brokenRead: StorageLike = { getItem: () => "{", setItem: () => undefined };
    const brokenWrite: StorageLike = { getItem: () => null, setItem: () => { throw new DOMException("quota"); } };
    expect(loadLeaderboard(brokenRead)).toEqual([]);
    expect(saveLeaderboard([normalizeLeaderboard([valid()])[0]], brokenWrite)).toBe(false);
  });

  it("rejects oversized persisted input before parsing", () => {
    const oversized: StorageLike = {
      getItem: () => `[${" ".repeat(MAX_STORED_CHARACTERS)}]`,
      setItem: () => undefined,
    };
    expect(loadLeaderboard(oversized)).toEqual([]);
  });
});
