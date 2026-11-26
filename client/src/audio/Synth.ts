export class Synth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private sfxVol = 0.8;
  private musicVol = 0.6;
  private muted = false;

  public unlock(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMusicGain(): GainNode | null {
    return this.musicGain;
  }

  public setVolumes(sfxPercent: number, musicPercent: number): void {
    this.sfxVol = Math.max(0, Math.min(1, sfxPercent / 100));
    this.musicVol = Math.max(0, Math.min(1, musicPercent / 100));
    this.applyGains();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGains();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyGains();
    return this.muted;
  }

  private applyGains(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, now);
    this.sfxGain.gain.setValueAtTime(this.sfxVol * 0.45, now);
    this.musicGain.gain.setValueAtTime(this.musicVol * 0.3, now);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate;
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private playTone(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    durationSec: number,
    delaySec = 0,
    gainLevel = 0.5,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || this.muted || this.sfxVol <= 0) return;

    const t0 = ctx.currentTime + delaySec;
    const t1 = t0 + durationSec;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t0);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t1);
    }

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(gainLevel, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t1 + 0.01);
  }

  public playNoise(durationSec: number, filterHz = 1200, delaySec = 0, gainLevel = 0.5): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.noiseBuffer || this.muted || this.sfxVol <= 0) return;

    const t0 = ctx.currentTime + delaySec;
    const t1 = t0 + durationSec;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterHz, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t1);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t0);
    src.stop(t1 + 0.01);
  }

  public jump(): void {
    this.playTone('square', 300, 600, 0.12, 0, 0.45);
  }

  public bigJump(): void {
    this.playTone('square', 200, 500, 0.15, 0, 0.5);
  }

  public gem(): void {
    this.playTone('square', 987.77, 987.77, 0.06, 0, 0.4); // B5
    this.playTone('square', 1318.51, 1318.51, 0.11, 0.055, 0.45); // E6
  }

  public stomp(): void {
    this.playTone('triangle', 400, 100, 0.1, 0, 0.65);
  }

  public bump(): void {
    this.playTone('square', 120, 90, 0.06, 0, 0.5);
  }

  public breakBrick(): void {
    this.playNoise(0.15, 700, 0, 0.7);
    this.playTone('triangle', 180, 70, 0.12, 0, 0.5);
  }

  public powerupAppear(): void {
    const notes = [330, 392, 494, 587, 659];
    notes.forEach((f, idx) => this.playTone('square', f, f, 0.075, idx * 0.07, 0.35));
  }

  public powerup(): void {
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((f, idx) => this.playTone('square', f, f, 0.08, idx * 0.075, 0.45));
  }

  public fireball(): void {
    this.playNoise(0.06, 2200, 0, 0.4);
    this.playTone('sawtooth', 850, 250, 0.08, 0, 0.35);
  }

  public hurt(): void {
    const notes = [659, 523, 440, 330, 247];
    notes.forEach((f, idx) => this.playTone('sawtooth', f, f * 0.92, 0.08, idx * 0.075, 0.4));
  }

  public kick(): void {
    this.playTone('square', 600, 350, 0.05, 0, 0.5);
  }

  public oneUp(): void {
    const notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((f, idx) => this.playTone('square', f, f, 0.095, idx * 0.09, 0.45));
  }

  public die(): void {
    const notes = [523, 494, 440, 392, 349, 330, 294, 220];
    notes.forEach((f, idx) => this.playTone('square', f, f * 0.96, 0.14, idx * 0.14, 0.45));
  }

  public flagpole(): void {
    this.playTone('triangle', 880, 220, 0.95, 0, 0.55);
  }

  public levelClear(): void {
    const melody: Array<[number, number, number]> = [
      [523, 0, 0.14],
      [659, 0.14, 0.14],
      [784, 0.28, 0.14],
      [1046, 0.44, 0.3],
      [784, 0.78, 0.14],
      [1046, 0.94, 0.55],
    ];
    for (const [f, d, dur] of melody) {
      this.playTone('square', f, f, dur, d, 0.45);
      this.playTone('triangle', f / 2, f / 2, dur, d, 0.4);
    }
  }

  public bossHit(): void {
    this.playNoise(0.12, 500, 0, 0.65);
    this.playTone('sawtooth', 260, 110, 0.18, 0, 0.55);
  }

  public bossDie(): void {
    for (let i = 0; i < 6; i++) {
      this.playNoise(0.18, 400 + i * 180, i * 0.14, 0.7);
      this.playTone('sawtooth', 320 - i * 35, 90, 0.18, i * 0.14, 0.45);
    }
    this.levelClear();
  }

  public pause(): void {
    this.playTone('square', 660, 660, 0.06, 0, 0.4);
    this.playTone('square', 440, 440, 0.08, 0.06, 0.4);
  }

  public timeWarn(): void {
    this.playTone('square', 880, 880, 0.08, 0, 0.45);
    this.playTone('square', 1174, 1174, 0.12, 0.09, 0.45);
  }

  public tick(): void {
    this.playTone('square', 1046, 1046, 0.025, 0, 0.25);
  }
}

export const synth = new Synth();
