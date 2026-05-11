function makeDistortionCurve(amount: number): Float32Array {
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

const BASS_NOTES = [65.41, 65.41, 98.0, 98.0, 116.54, 98.0, 87.31, 87.31];
const BPM = 128;
const BEAT_SEC = 60 / BPM;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private musicPlaying = false;
  private musicSchedulerId: number | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;
  private beatIndex = 0;

  private muted = false;

  init() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(1, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // Engine oscillator chain
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, ctx.currentTime);

    const distortion = ctx.createWaveShaper();
    distortion.curve = makeDistortionCurve(180);
    distortion.oversample = "4x";

    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = "bandpass";
    engineFilter.frequency.value = 380;
    engineFilter.Q.value = 1.2;

    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(80, ctx.currentTime);

    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = "square";
    this.engineOsc2.frequency.setValueAtTime(85, ctx.currentTime);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.4, ctx.currentTime);

    this.engineOsc.connect(distortion);
    this.engineOsc2.connect(osc2Gain);
    osc2Gain.connect(distortion);
    distortion.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.engineOsc2.start();
  }

  setSpeed(speed: number) {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2 || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const norm = Math.max(0, Math.min(1, speed / 0.55));
    const freq = 80 + norm * 150;
    const vol = norm < 0.02 ? 0.08 + norm * 2 : 0.2 + norm * 0.35;

    this.engineOsc.frequency.linearRampToValueAtTime(freq, t + 0.06);
    this.engineOsc2.frequency.linearRampToValueAtTime(freq * 1.055, t + 0.06);
    this.engineGain.gain.linearRampToValueAtTime(this.muted ? 0 : vol, t + 0.06);
  }

  playBoost() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const sweep = ctx.createOscillator();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(180, t);
    sweep.frequency.exponentialRampToValueAtTime(900, t + 0.25);

    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(0, t);
    sweepGain.gain.linearRampToValueAtTime(0.22, t + 0.04);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 200;

    sweep.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(this.masterGain);
    sweep.start(t);
    sweep.stop(t + 0.5);

    const noise = ctx.createOscillator();
    noise.type = "sine";
    noise.frequency.setValueAtTime(600, t);
    noise.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.25);
  }

  startMusic() {
    if (!this.ctx || !this.masterGain || this.musicPlaying) return;
    this.musicPlaying = true;
    this.noteIndex = 0;
    this.beatIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this._scheduleMusic();
    this._playAtmosphericPad();
  }

  private _scheduleMusic() {
    if (!this.ctx || !this.musicPlaying) return;
    const LOOKAHEAD = 0.15;

    while (this.nextNoteTime < this.ctx.currentTime + LOOKAHEAD) {
      this._playBassNote(
        BASS_NOTES[this.noteIndex % BASS_NOTES.length],
        this.nextNoteTime,
        BEAT_SEC * 1.7
      );
      this._playBeat(this.beatIndex, this.nextNoteTime);
      this.noteIndex++;
      this.beatIndex++;
      this.nextNoteTime += BEAT_SEC * 2;
    }

    this.musicSchedulerId = window.setTimeout(() => this._scheduleMusic(), 40);
  }

  private _playBassNote(freq: number, when: number, dur: number) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, when);

    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(280, when);
    filt.frequency.linearRampToValueAtTime(80, when + dur * 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.09, when + 0.01);
    gain.gain.setValueAtTime(0.07, when + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    osc.connect(filt);
    filt.connect(gain);
    gain.connect(this.masterGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  private _playBeat(beatIdx: number, when: number) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const ctx = this.ctx;

    // Kick on beats 0, 4
    if (beatIdx % 4 === 0 || beatIdx % 4 === 2) {
      const kick = ctx.createOscillator();
      kick.frequency.setValueAtTime(160, when);
      kick.frequency.exponentialRampToValueAtTime(35, when + 0.12);
      const kickGain = ctx.createGain();
      kickGain.gain.setValueAtTime(0.28, when);
      kickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
      kick.connect(kickGain);
      kickGain.connect(this.masterGain);
      kick.start(when);
      kick.stop(when + 0.2);
    }

    // Hi-hat every other beat
    const bufSize = ctx.sampleRate * 0.05;
    const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hhFilter = ctx.createBiquadFilter();
    hhFilter.type = "highpass";
    hhFilter.frequency.value = 7000;

    const hhGain = ctx.createGain();
    const accent = beatIdx % 4 === 0 ? 0.07 : 0.04;
    hhGain.gain.setValueAtTime(accent, when);
    hhGain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

    noise.connect(hhFilter);
    hhFilter.connect(hhGain);
    hhGain.connect(this.masterGain);
    noise.start(when);
    noise.stop(when + 0.06);
  }

  private _playAtmosphericPad() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const ctx = this.ctx;
    const padNotes = [130.8, 164.8, 196.0, 261.6];
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0, ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
    padGain.connect(this.masterGain);

    for (const freq of padNotes) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const vib = ctx.createOscillator();
      vib.frequency.value = 5;
      const vibGain = ctx.createGain();
      vibGain.gain.value = 1.5;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);
      osc.connect(padGain);
      osc.start();
      vib.start();
    }
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicSchedulerId !== null) {
      clearTimeout(this.musicSchedulerId);
      this.musicSchedulerId = null;
    }
  }

  pauseAudio() {
    this.ctx?.suspend();
  }

  resumeAudio() {
    this.ctx?.resume();
  }

  stopEngine() {
    if (!this.engineGain || !this.ctx) return;
    this.engineGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, this.ctx.currentTime + 0.1);
  }

  get isMuted() {
    return this.muted;
  }

  destroy() {
    this.stopMusic();
    this.ctx?.close();
    this.ctx = null;
  }
}
