/** Measures race time in monotonic milliseconds while excluding paused intervals. */
export interface RaceTimeSnapshot {
  lapTime: number;
  totalTime: number;
}

type Now = () => number;

export class RaceClock {
  private raceStartedAt = 0;
  private lapStartedAt = 0;
  private pauseStartedAt: number | null = null;
  private totalPaused = 0;
  private lapPaused = 0;
  private running = false;

  constructor(private readonly now: Now = () => performance.now()) {}

  start(): void {
    const now = this.now();
    this.raceStartedAt = now;
    this.lapStartedAt = now;
    this.pauseStartedAt = null;
    this.totalPaused = 0;
    this.lapPaused = 0;
    this.running = true;
  }

  reset(): void {
    this.running = false;
    this.pauseStartedAt = null;
    this.totalPaused = 0;
    this.lapPaused = 0;
  }

  pause(): void {
    if (this.running && this.pauseStartedAt === null) {
      this.pauseStartedAt = this.now();
    }
  }

  resume(): void {
    if (!this.running || this.pauseStartedAt === null) return;
    const pausedFor = Math.max(0, this.now() - this.pauseStartedAt);
    this.totalPaused += pausedFor;
    this.lapPaused += pausedFor;
    this.pauseStartedAt = null;
  }

  snapshot(): RaceTimeSnapshot {
    if (!this.running) return { lapTime: 0, totalTime: 0 };
    const now = this.pauseStartedAt ?? this.now();
    return {
      lapTime: Math.max(0, now - this.lapStartedAt - this.lapPaused),
      totalTime: Math.max(0, now - this.raceStartedAt - this.totalPaused),
    };
  }

  completeLap(): number {
    const snapshot = this.snapshot();
    const now = this.pauseStartedAt ?? this.now();
    this.lapStartedAt = now;
    this.lapPaused = 0;
    return snapshot.lapTime;
  }
}

export function formatTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "0:00.000";
  const ms = Math.floor(milliseconds);
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const remainder = ms % 1_000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(remainder).padStart(3, "0")}`;
}
