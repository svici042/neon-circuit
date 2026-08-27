/**
 * Defensive localStorage boundary for the client-only leaderboard. Persisted
 * data is untrusted: reads are size-bounded before parsing, every field is
 * normalized against current tracks, and quota/privacy failures stay recoverable.
 */
import { TRACKS } from "./tracks";

export const LEADERBOARD_STORAGE_KEY = "futuristic-racing-leaderboard-v3";
const LEGACY_STORAGE_KEY = "futuristic-racing-leaderboard-v2";
export const MAX_RESULTS_PER_TRACK = 10;
export const MAX_TOTAL_RESULTS = 50;
const MAX_TOTAL_TIME = 24 * 60 * 60 * 1_000;
const MAX_LAP_TIME = 6 * 60 * 60 * 1_000;
export const MAX_STORED_CHARACTERS = 100_000;

export interface LeaderboardEntry {
  id: string;
  trackId: number;
  trackName: string;
  totalTime: number;
  bestLap: number;
  date: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const tracksById = new Map(TRACKS.map((track) => [track.id, track]));
const tracksByName = new Map(TRACKS.map((track) => [track.name, track]));

function validDuration(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= maximum;
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function stableId(trackId: number, totalTime: number, bestLap: number, date: string): string {
  return `${trackId}-${Math.round(totalTime)}-${Math.round(bestLap)}-${date}`;
}

export function validateLeaderboardEntry(value: unknown): LeaderboardEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const track =
    (typeof candidate.trackId === "number" && tracksById.get(candidate.trackId)) ||
    (typeof candidate.trackName === "string" && tracksByName.get(candidate.trackName)) ||
    (typeof candidate.name === "string" && tracksByName.get(candidate.name));
  if (!track) return null;
  if (!validDuration(candidate.totalTime, MAX_TOTAL_TIME)) return null;
  if (!validDuration(candidate.bestLap, MAX_LAP_TIME) || candidate.bestLap > candidate.totalTime) return null;
  if (!validDate(candidate.date)) return null;

  const date = new Date(candidate.date).toISOString();
  const id =
    typeof candidate.id === "string" && candidate.id.length > 0 && candidate.id.length <= 160
      ? candidate.id
      : stableId(track.id, candidate.totalTime, candidate.bestLap, date);
  return {
    id,
    trackId: track.id,
    trackName: track.name,
    totalTime: candidate.totalTime,
    bestLap: candidate.bestLap,
    date,
  };
}

export function normalizeLeaderboard(value: unknown): LeaderboardEntry[] {
  if (!Array.isArray(value)) return [];
  const valid = value.slice(0, 500).map(validateLeaderboardEntry).filter((entry): entry is LeaderboardEntry => entry !== null);
  const perTrack = new Map<number, number>();
  return valid
    .sort((a, b) => a.totalTime - b.totalTime)
    .filter((entry) => {
      const count = perTrack.get(entry.trackId) ?? 0;
      if (count >= MAX_RESULTS_PER_TRACK) return false;
      perTrack.set(entry.trackId, count + 1);
      return true;
    })
    .slice(0, MAX_TOTAL_RESULTS);
}

export function loadLeaderboard(storage?: StorageLike): LeaderboardEntry[] {
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(LEADERBOARD_STORAGE_KEY) ?? target.getItem(LEGACY_STORAGE_KEY);
    if (!raw || raw.length > MAX_STORED_CHARACTERS) return [];
    return normalizeLeaderboard(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[], storage?: StorageLike): boolean {
  try {
    const target = storage ?? globalThis.localStorage;
    target.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(normalizeLeaderboard(entries)));
    return true;
  } catch {
    return false;
  }
}

export function createLeaderboardEntry(trackId: number, totalTime: number, bestLap: number, now = new Date()): LeaderboardEntry {
  const track = tracksById.get(trackId);
  if (!track) throw new Error("Unknown track");
  const date = now.toISOString();
  const randomId = globalThis.crypto?.randomUUID?.();
  return {
    id: randomId ?? stableId(trackId, totalTime, bestLap, date),
    trackId,
    trackName: track.name,
    totalTime,
    bestLap,
    date,
  };
}
