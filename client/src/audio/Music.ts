import type { MusicTrackId } from '../levels/legend';
import { synth } from './Synth';

interface TrackData {
  bpm: number;
  lead: readonly number[]; // Hz, 0 = rest (16th note steps)
  bass: readonly number[];
  drums: readonly ('.' | 'k' | 's' | 'h')[];
}

// Note frequencies in Hz (0 = rest)
const N = {
  _: 0,
  C3: 130.81,
  D3: 146.83,
  Eb3: 155.56,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  Ab3: 207.65,
  A3: 220.0,
  Bb3: 233.08,
  B3: 246.94,
  C4: 261.63,
  Cs4: 277.18,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  Ab4: 415.3,
  A4: 440.0,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  Eb5: 622.25,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
} as const;

const TRACKS: Record<MusicTrackId, TrackData> = {
  // Original cheerful C-major / Mixolydian 8-bit adventure theme (140 BPM)
  grass: {
    bpm: 140,
    lead: [
      N.E5, N._, N.G5, N._, N.A5, N._, N.G5, N._,
      N.E5, N.D5, N.C5, N._, N.D5, N.E5, N.G5, N._,
      N.A5, N._, N.G5, N.E5, N.D5, N._, N.C5, N._,
      N.D5, N.E5, N.G5, N.E5, N.D5, N._, N._, N._,
      N.C5, N._, N.E5, N._, N.G5, N._, N.E5, N._,
      N.F5, N.E5, N.D5, N._, N.G4, N.B4, N.D5, N._,
      N.E5, N.G5, N.C6, N._, N.A5, N.G5, N.E5, N._,
      N.D5, N.E5, N.D5, N.B4, N.C5, N._, N._, N._,
    ],
    bass: [
      N.C3, N._, N.G3, N._, N.C3, N._, N.G3, N._,
      N.A3, N._, N.E3, N._, N.G3, N._, N.D3, N._,
      N.F3, N._, N.C3, N._, N.G3, N._, N.E3, N._,
      N.D3, N._, N.A3, N._, N.G3, N._, N.G3, N._,
      N.C3, N._, N.G3, N._, N.E3, N._, N.C3, N._,
      N.F3, N._, N.C3, N._, N.G3, N._, N.D3, N._,
      N.C3, N._, N.E3, N._, N.F3, N._, N.C3, N._,
      N.G3, N._, N.G3, N._, N.C3, N._, N.G3, N._,
    ],
    drums: [
      'k', '.', 'h', '.', 's', '.', 'h', '.',
      'k', '.', 'h', '.', 's', '.', 'h', 'h',
      'k', '.', 'h', '.', 's', '.', 'h', '.',
      'k', '.', 'h', 'k', 's', '.', 'h', '.',
      'k', '.', 'h', '.', 's', '.', 'h', '.',
      'k', '.', 'h', '.', 's', '.', 'h', 'h',
      'k', '.', 'h', '.', 's', '.', 'h', '.',
      'k', 'k', 'h', '.', 's', '.', 's', '.',
    ],
  },
  // Mysterious underground A-minor / Phrygian theme (110 BPM)
  cave: {
    bpm: 110,
    lead: [
      N.A4, N._, N.C5, N._, N.E5, N._, N.Eb5, N._,
      N.D5, N._, N.C5, N._, N.B4, N._, N._, N._,
      N.A4, N._, N.B4, N.C5, N.D5, N._, N.C5, N._,
      N.Bb4, N._, N.A4, N._, N.E4, N._, N._, N._,
      N.A4, N._, N.E5, N._, N.F5, N._, N.E5, N._,
      N.D5, N.C5, N.B4, N._, N.C5, N._, N.A4, N._,
      N.G4, N._, N.B4, N._, N.D5, N._, N.C5, N._,
      N.B4, N._, N.Ab4, N._, N.A4, N._, N._, N._,
    ],
    bass: [
      N.A3, N._, N._, N.E3, N.A3, N._, N._, N.E3,
      N.F3, N._, N._, N.C3, N.E3, N._, N._, N.B3,
      N.A3, N._, N._, N.E3, N.D3, N._, N._, N.A3,
      N.Bb3, N._, N.F3, N._, N.E3, N._, N._, N._,
      N.A3, N._, N.E3, N._, N.D3, N._, N.A3, N._,
      N.G3, N._, N.D3, N._, N.A3, N._, N.E3, N._,
      N.G3, N._, N.D3, N._, N.E3, N._, N.B3, N._,
      N.E3, N._, N.E3, N._, N.A3, N._, N._, N._,
    ],
    drums: [
      'k', '.', '.', '.', 'h', '.', 's', '.',
      'k', '.', '.', '.', 'h', '.', '.', '.',
      'k', '.', 'h', '.', 's', '.', 'h', '.',
      'k', '.', '.', '.', 's', '.', 'h', '.',
      'k', '.', 'h', '.', 's', '.', 'h', '.',
      'k', '.', '.', '.', 'h', '.', 's', '.',
      'k', '.', 'h', '.', 's', '.', 'h', '.',
      'k', '.', 'h', '.', 's', '.', 's', '.',
    ],
  },
  // Tense fortress D-minor chromatic theme (150 BPM)
  castle: {
    bpm: 150,
    lead: [
      N.D5, N.F5, N.E5, N.D5, N.Cs4, N.D5, N.F5, N._,
      N.D5, N.G5, N.Fs5, N.F5, N.E5, N._, N.A4, N._,
      N.Bb4, N.D5, N.F5, N.E5, N.D5, N.C5, N.Bb4, N._,
      N.A4, N.Cs4, N.E5, N.D5, N.Cs4, N._, N._, N._,
      N.D5, N._, N.A5, N._, N.G5, N.F5, N.E5, N._,
      N.F5, N._, N.D5, N._, N.C5, N.Bb4, N.A4, N._,
      N.G4, N.Bb4, N.D5, N._, N.E5, N.G5, N.F5, N._,
      N.E5, N.D5, N.Cs4, N.E5, N.D5, N._, N._, N._,
    ],
    bass: [
      N.D3, N.D3, N.A3, N.D3, N.D3, N.D3, N.A3, N.D3,
      N.D3, N.D3, N.Bb3, N.D3, N.A3, N.A3, N.E3, N.A3,
      N.Bb3, N.Bb3, N.F3, N.Bb3, N.G3, N.G3, N.D3, N.G3,
      N.A3, N.A3, N.E3, N.A3, N.A3, N._, N.E3, N._,
      N.D3, N.D3, N.A3, N.D3, N.C3, N.C3, N.G3, N.C3,
      N.Bb3, N.Bb3, N.F3, N.Bb3, N.A3, N.A3, N.E3, N.A3,
      N.G3, N.G3, N.D3, N.G3, N.Bb3, N.Bb3, N.F3, N.Bb3,
      N.A3, N.A3, N.E3, N.A3, N.D3, N._, N.A3, N._,
    ],
    drums: [
      'k', 'h', 's', 'h', 'k', 'h', 's', 'h',
      'k', 'h', 's', 'h', 'k', 'k', 's', 'h',
      'k', 'h', 's', 'h', 'k', 'h', 's', 'h',
      'k', 'h', 's', 'k', 's', '.', 's', 'h',
      'k', 'h', 's', 'h', 'k', 'h', 's', 'h',
      'k', 'h', 's', 'h', 'k', 'k', 's', 'h',
      'k', 'h', 's', 'h', 'k', 'h', 's', 'h',
      'k', 'k', 's', 'k', 's', 'h', 's', '.',
    ],
  },
  // Fast Nova Star invincibility theme (180 BPM)
  star: {
    bpm: 180,
    lead: [
      N.C5, N.E5, N.G5, N.C6, N.G5, N.E5, N.C5, N.G5,
      N.D5, N.F5, N.A5, N.D5, N.A5, N.F5, N.D5, N.A5,
      N.E5, N.G5, N.B5, N.E5, N.B5, N.G5, N.E5, N.B5,
      N.F5, N.A5, N.C6, N.A5, N.G5, N.E5, N.D5, N.G5,
    ],
    bass: [
      N.C3, N.G3, N.C3, N.G3, N.C3, N.G3, N.C3, N.G3,
      N.D3, N.A3, N.D3, N.A3, N.D3, N.A3, N.D3, N.A3,
      N.E3, N.B3, N.E3, N.B3, N.E3, N.B3, N.E3, N.B3,
      N.F3, N.C3, N.G3, N.D3, N.C3, N.G3, N.G3, N.D3,
    ],
    drums: [
      'k', 'h', 's', 'h', 'k', 'h', 's', 'h',
      'k', 'h', 's', 'h', 'k', 'h', 's', 'h',
      'k', 'h', 's', 'h', 'k', 'h', 's', 'h',
      'k', 'k', 's', 'h', 'k', 's', 's', 'h',
    ],
  },
};

export class MusicSequencer {
  private currentTrack: MusicTrackId | null = null;
  private step = 0;
  private timerId: number | null = null;
  private tempoMultiplier = 1;
  private paused = false;

  public play(track: MusicTrackId, tempoMultiplier = 1): void {
    if (this.currentTrack === track && this.tempoMultiplier === tempoMultiplier && this.timerId !== null) {
      return;
    }
    this.stop();
    this.currentTrack = track;
    this.tempoMultiplier = tempoMultiplier;
    this.paused = false;
    this.step = 0;

    const data = TRACKS[track];
    const stepMs = (60_000 / (data.bpm * this.tempoMultiplier)) / 4;

    if (typeof window !== 'undefined') {
      this.timerId = window.setInterval(() => {
        if (!this.paused) {
          this.tickStep();
        }
      }, stepMs);
    }
  }

  public setTempoMultiplier(mult: number): void {
    if (this.tempoMultiplier === mult) return;
    if (this.currentTrack) {
      const t = this.currentTrack;
      const wasPaused = this.paused;
      this.play(t, mult);
      this.paused = wasPaused;
    } else {
      this.tempoMultiplier = mult;
    }
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public stop(): void {
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentTrack = null;
  }

  private tickStep(): void {
    if (!this.currentTrack) return;
    const ctx = synth.getContext();
    const musicGain = synth.getMusicGain();
    if (!ctx || !musicGain || synth.isMuted()) return;

    const data = TRACKS[this.currentTrack];
    const idx = this.step % data.lead.length;
    this.step += 1;

    const now = ctx.currentTime;
    const stepSec = (60 / (data.bpm * this.tempoMultiplier)) / 4;

    const leadFreq = data.lead[idx] ?? 0;
    if (leadFreq > 0) {
      this.scheduleNote(ctx, musicGain, 'square', leadFreq, now, stepSec * 0.85, 0.22);
    }

    const bassFreq = data.bass[idx % data.bass.length] ?? 0;
    if (bassFreq > 0) {
      this.scheduleNote(ctx, musicGain, 'triangle', bassFreq, now, stepSec * 0.9, 0.34);
    }

    const drum = data.drums[idx % data.drums.length] ?? '.';
    if (drum === 'k') {
      this.scheduleDrumKick(ctx, musicGain, now);
    } else if (drum === 's') {
      this.scheduleNote(ctx, musicGain, 'sawtooth', 190, now, 0.045, 0.14);
    } else if (drum === 'h') {
      this.scheduleNote(ctx, musicGain, 'square', 2400, now, 0.015, 0.06);
    }
  }

  private scheduleNote(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    freq: number,
    startTime: number,
    durSec: number,
    vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durSec);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + durSec + 0.01);
  }

  private scheduleDrumKick(ctx: AudioContext, dest: AudioNode, startTime: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, startTime);
    osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.07);

    gain.gain.setValueAtTime(0.32, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.075);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + 0.08);
  }
}

export const music = new MusicSequencer();
