/**
 * Owns countdown and finish timers for one race generation. `begin()`
 * invalidates the previous token and `cancel()` clears all timers, so stale
 * callbacks cannot modify a restarted race or finish it twice.
 */
export interface TimerScheduler {
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(id: number): void;
  setInterval(callback: () => void, delay: number): number;
  clearInterval(id: number): void;
}

const browserScheduler: TimerScheduler = {
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: (id) => window.clearTimeout(id),
  setInterval: (callback, delay) => window.setInterval(callback, delay),
  clearInterval: (id) => window.clearInterval(id),
};

export class RaceLifecycle {
  private generation = 0;
  private completionClaimed = false;
  private timeouts = new Set<number>();
  private intervals = new Set<number>();

  constructor(private readonly scheduler: TimerScheduler = browserScheduler) {}

  begin(): number {
    this.cancel();
    this.completionClaimed = false;
    return this.generation;
  }

  isCurrent(token: number): boolean {
    return token === this.generation;
  }

  claimCompletion(token: number): boolean {
    if (!this.isCurrent(token) || this.completionClaimed) return false;
    this.completionClaimed = true;
    return true;
  }

  setTimeout(token: number, callback: () => void, delay: number): number {
    const id = this.scheduler.setTimeout(() => {
      this.timeouts.delete(id);
      if (this.isCurrent(token)) callback();
    }, delay);
    this.timeouts.add(id);
    return id;
  }

  setInterval(token: number, callback: () => void, delay: number): number {
    const id = this.scheduler.setInterval(() => {
      if (this.isCurrent(token)) callback();
    }, delay);
    this.intervals.add(id);
    return id;
  }

  clearInterval(id: number): void {
    this.scheduler.clearInterval(id);
    this.intervals.delete(id);
  }

  cancel(): void {
    this.generation += 1;
    this.timeouts.forEach((id) => this.scheduler.clearTimeout(id));
    this.intervals.forEach((id) => this.scheduler.clearInterval(id));
    this.timeouts.clear();
    this.intervals.clear();
    this.completionClaimed = false;
  }
}
