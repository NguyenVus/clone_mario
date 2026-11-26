import { GAMEPLAY_CONFIG } from '../config';

export interface ScoreSnapshot {
  score: number;
  gems: number;
  lives: number;
  highScore: number;
  kills: number;
  totalGemsCollected: number;
}

export type ScoreListener = (snapshot: ScoreSnapshot) => void;

export class ScoreManager {
  private score = 0;
  private gems = 0;
  private lives: number = GAMEPLAY_CONFIG.STARTING_LIVES;
  private highScore = 0;
  private kills = 0;
  private totalGemsCollected = 0;
  private comboIndex = 0;
  private listeners = new Set<ScoreListener>();

  constructor(initialHighScore = 0) {
    this.highScore = Math.max(0, initialHighScore);
  }

  public subscribe(listener: ScoreListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): ScoreSnapshot {
    return {
      score: this.score,
      gems: this.gems,
      lives: this.lives,
      highScore: this.highScore,
      kills: this.kills,
      totalGemsCollected: this.totalGemsCollected,
    };
  }

  public resetRun(highScore = this.highScore): void {
    this.score = 0;
    this.gems = 0;
    this.lives = GAMEPLAY_CONFIG.STARTING_LIVES;
    this.highScore = Math.max(this.highScore, highScore);
    this.kills = 0;
    this.totalGemsCollected = 0;
    this.comboIndex = 0;
    this.emit();
  }

  public addScore(points: number): void {
    if (points <= 0) return;
    this.score += Math.floor(points);
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.emit();
  }

  public addGem(scoreValue: number): { gainedOneUp: boolean } {
    this.gems += 1;
    this.totalGemsCollected += 1;
    let gainedOneUp = false;
    if (this.gems >= GAMEPLAY_CONFIG.GEMS_FOR_ONE_UP) {
      this.gems = 0;
      this.lives += 1;
      gainedOneUp = true;
    }
    this.score += Math.floor(scoreValue);
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.emit();
    return { gainedOneUp };
  }

  public addLife(count = 1): void {
    this.lives = Math.max(0, this.lives + count);
    this.emit();
  }

  public loseLife(): number {
    this.lives = Math.max(0, this.lives - 1);
    this.comboIndex = 0;
    this.emit();
    return this.lives;
  }

  public resetCombo(): void {
    this.comboIndex = 0;
  }

  public registerKill(countKill = true): void {
    if (countKill) {
      this.kills += 1;
      this.emit();
    }
  }

  /**
   * Advances stomp / shell combo chain:
   * 100 -> 200 -> 400 -> 500 -> 800 -> 1000 -> 2000 -> 4000 -> 5000 -> 8000 -> 1UP
   */
  public registerComboKill(overrideIndex?: number): { points: number; oneUp: boolean; label: string } {
    const idx = overrideIndex ?? this.comboIndex;
    const table = GAMEPLAY_CONFIG.STOMP_COMBO;
    this.kills += 1;
    if (idx >= table.length) {
      this.comboIndex = table.length;
      this.lives += 1;
      this.emit();
      return { points: 0, oneUp: true, label: '1UP' };
    }
    const points = table[idx] ?? 8000;
    this.comboIndex = idx + 1;
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.emit();
    return { points, oneUp: false, label: String(points) };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}
