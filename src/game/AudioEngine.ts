/**
 * Owns one lazily-created Web Audio graph. Scheduled music sources and helper
 * nodes are tracked until their ended event; stop/destroy cancels the scheduler,
 * stops sources, disconnects nodes, and finally closes the AudioContext.
 */
function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(256);
  for (let index = 0; index < curve.length; index++) {
    const x = (index * 2) / curve.length - 1;
    curve[index] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

const BASS_NOTES = [65.41, 65.41, 98, 98, 116.54, 98, 87.31, 87.31];
const BEAT_SECONDS = 60 / 128;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOscillators: OscillatorNode[] = [];
  private engineGain: GainNode | null = null;
  private musicSources = new Set<AudioScheduledSourceNode>();
  private musicNodes = new Set<AudioNode>();
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;
  private musicPlaying = false;
  private audioPaused = false;
  private muted = false;
  private destroyed = false;

  async init(): Promise<boolean> {
    if (this.destroyed || typeof AudioContext === "undefined") return false;
    try {
      if (this.ctx) {
        if (this.ctx.state === "suspended") await this.ctx.resume();
        return this.ctx.state !== "closed";
      }
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      this.engineGain = ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, ctx.currentTime);
      const distortion = ctx.createWaveShaper();
      distortion.curve = makeDistortionCurve(180);
      distortion.oversample = "4x";
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 380;
      filter.Q.value = 1.2;
      const secondaryGain = ctx.createGain();
      secondaryGain.gain.value = 0.4;
      const primary = ctx.createOscillator();
      primary.type = "sawtooth";
      primary.frequency.value = 80;
      const secondary = ctx.createOscillator();
      secondary.type = "square";
      secondary.frequency.value = 85;
      primary.connect(distortion);
      secondary.connect(secondaryGain).connect(distortion);
      distortion.connect(filter).connect(this.engineGain).connect(this.masterGain);
      primary.start();
      secondary.start();
      this.engineOscillators = [primary, secondary];
      return true;
    } catch {
      await this.closeContext();
      return false;
    }
  }

  setSpeed(speed: number): void {
    const [primary, secondary] = this.engineOscillators;
    if (!this.ctx || !primary || !secondary || !this.engineGain) return;
    const time = this.ctx.currentTime;
    const normalized = Math.max(0, Math.min(1, Math.abs(speed) / 0.55));
    const frequency = 80 + normalized * 150;
    const volume = normalized < 0.02 ? 0.08 + normalized * 2 : 0.2 + normalized * 0.35;
    primary.frequency.linearRampToValueAtTime(frequency, time + 0.06);
    secondary.frequency.linearRampToValueAtTime(frequency * 1.055, time + 0.06);
    this.engineGain.gain.linearRampToValueAtTime(volume, time + 0.06);
  }

  playBoost(): void {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime;
    const sweep = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(180, time);
    sweep.frequency.exponentialRampToValueAtTime(900, time + 0.25);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
    sweep.connect(gain).connect(this.masterGain);
    this.trackSource(sweep, [gain]);
    sweep.start(time);
    sweep.stop(time + 0.5);
  }

  startMusic(): void {
    if (!this.ctx || !this.masterGain || this.musicPlaying) return;
    this.stopMusic();
    this.musicPlaying = true;
    this.audioPaused = false;
    this.noteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.playAtmosphericPad();
    this.scheduleMusic();
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.musicPlaying || this.audioPaused) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playBassNote(BASS_NOTES[this.noteIndex % BASS_NOTES.length], this.nextNoteTime, BEAT_SECONDS * 1.7);
      this.playBeat(this.noteIndex, this.nextNoteTime);
      this.noteIndex++;
      this.nextNoteTime += BEAT_SECONDS * 2;
    }
    this.schedulerId = window.setTimeout(() => this.scheduleMusic(), 40);
  }

  private trackSource(source: AudioScheduledSourceNode, nodes: AudioNode[] = []): void {
    this.musicSources.add(source);
    nodes.forEach((node) => this.musicNodes.add(node));
    source.addEventListener("ended", () => {
      this.musicSources.delete(source);
      try { source.disconnect(); } catch { /* already disconnected */ }
      nodes.forEach((node) => {
        this.musicNodes.delete(node);
        try { node.disconnect(); } catch { /* already disconnected */ }
      });
    }, { once: true });
  }

  private playBassNote(frequency: number, when: number, duration: number): void {
    if (!this.ctx || !this.masterGain) return;
    const oscillator = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, when);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, when);
    filter.frequency.linearRampToValueAtTime(80, when + duration * 0.5);
    gain.gain.setValueAtTime(0.001, when);
    gain.gain.linearRampToValueAtTime(0.09, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    oscillator.connect(filter).connect(gain).connect(this.masterGain);
    this.trackSource(oscillator, [filter, gain]);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.05);
  }

  private playBeat(beat: number, when: number): void {
    if (!this.ctx || !this.masterGain) return;
    if (beat % 2 === 0) {
      const kick = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      kick.frequency.setValueAtTime(160, when);
      kick.frequency.exponentialRampToValueAtTime(35, when + 0.12);
      gain.gain.setValueAtTime(0.28, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
      kick.connect(gain).connect(this.masterGain);
      this.trackSource(kick, [gain]);
      kick.start(when);
      kick.stop(when + 0.2);
    }
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    noise.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 7000;
    gain.gain.setValueAtTime(beat % 4 === 0 ? 0.07 : 0.04, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
    noise.connect(filter).connect(gain).connect(this.masterGain);
    this.trackSource(noise, [filter, gain]);
    noise.start(when);
    noise.stop(when + 0.06);
  }

  private playAtmosphericPad(): void {
    if (!this.ctx || !this.masterGain) return;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 2);
    gain.connect(this.masterGain);
    this.musicNodes.add(gain);
    for (const frequency of [130.8, 164.8, 196, 261.6]) {
      const oscillator = this.ctx.createOscillator();
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      oscillator.frequency.value = frequency;
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = 1.5;
      vibrato.connect(vibratoGain).connect(oscillator.frequency);
      oscillator.connect(gain);
      this.trackSource(oscillator, [vibratoGain]);
      this.trackSource(vibrato);
      oscillator.start();
      vibrato.start();
    }
  }

  stopMusic(): void {
    this.musicPlaying = false;
    this.audioPaused = false;
    if (this.schedulerId !== null) clearTimeout(this.schedulerId);
    this.schedulerId = null;
    for (const source of this.musicSources) {
      try { source.stop(); } catch { /* source already stopped */ }
      try { source.disconnect(); } catch { /* source already disconnected */ }
    }
    this.musicSources.clear();
    for (const node of this.musicNodes) {
      try { node.disconnect(); } catch { /* node already disconnected */ }
    }
    this.musicNodes.clear();
  }

  async pauseAudio(): Promise<void> {
    this.audioPaused = true;
    if (this.schedulerId !== null) clearTimeout(this.schedulerId);
    this.schedulerId = null;
    try { await this.ctx?.suspend(); } catch { /* browser denied state transition */ }
  }

  async resumeAudio(): Promise<void> {
    try {
      await this.ctx?.resume();
      this.audioPaused = false;
      if (this.musicPlaying && this.ctx) {
        this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.05);
        if (this.schedulerId === null) this.scheduleMusic();
      }
    } catch { /* browser denied state transition */ }
  }

  stopEngine(): void {
    if (this.ctx && this.engineGain) this.engineGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, this.ctx.currentTime + 0.1);
  }

  get isMuted(): boolean { return this.muted; }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopMusic();
    for (const oscillator of this.engineOscillators) {
      try { oscillator.stop(); } catch { /* oscillator already stopped */ }
      try { oscillator.disconnect(); } catch { /* oscillator already disconnected */ }
    }
    this.engineOscillators = [];
    await this.closeContext();
  }

  private async closeContext(): Promise<void> {
    const ctx = this.ctx;
    this.ctx = null;
    this.masterGain = null;
    this.engineGain = null;
    if (ctx && ctx.state !== "closed") {
      try { await ctx.close(); } catch { /* context already unavailable */ }
    }
  }
}
