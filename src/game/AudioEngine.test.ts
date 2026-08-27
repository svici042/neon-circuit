import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "./AudioEngine";

describe("AudioEngine", () => {
  const originalAudioContext = globalThis.AudioContext;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalAudioContext) vi.stubGlobal("AudioContext", originalAudioContext);
  });

  it("handles unavailable audio without throwing", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const engine = new AudioEngine();
    await expect(engine.init()).resolves.toBe(false);
    await expect(engine.destroy()).resolves.toBeUndefined();
  });

  it("handles AudioContext construction failure without crashing", async () => {
    vi.stubGlobal("AudioContext", class { constructor() { throw new Error("denied"); } });
    const engine = new AudioEngine();
    await expect(engine.init()).resolves.toBe(false);
    await expect(engine.destroy()).resolves.toBeUndefined();
  });
});
