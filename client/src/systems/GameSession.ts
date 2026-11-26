import type { LevelId } from '@pixel-hero/shared';
import { synth } from '../audio/Synth';
import type { PowerState } from '../entities/Player';
import { level1_1 } from '../levels/level1_1';
import { level1_2 } from '../levels/level1_2';
import { level1_2_bonus } from '../levels/level1_2_bonus';
import { level1_3 } from '../levels/level1_3';
import type { LevelSource } from '../levels/legend';
import { SaveManager, type SaveDataV1 } from './SaveManager';
import { ScoreManager } from './ScoreManager';

export const MAIN_LEVELS: readonly LevelSource[] = [level1_1, level1_2, level1_3];

export function getLevelById(id: LevelId | '1-2-bonus'): LevelSource {
  if (id === '1-2-bonus') return level1_2_bonus;
  return MAIN_LEVELS.find((l) => l.id === id) ?? level1_1;
}

export function getNextLevelId(id: LevelId): LevelId | null {
  if (id === '1-1') return '1-2';
  if (id === '1-2') return '1-3';
  return null;
}

export function getLevelNumber(id: LevelId): number {
  if (id === '1-1') return 1;
  if (id === '1-2') return 2;
  return 3;
}

export class GameSession {
  public readonly saveManager: SaveManager;
  public readonly scoreManager: ScoreManager;
  public saveData: SaveDataV1;

  public currentLevelId: LevelId = '1-1';
  public highestClearedLevel: LevelId = '1-1';
  public playerPower: PowerState = 'small';
  public checkpointPos: { x: number; y: number } | null = null;
  public bonusReturnState: {
    levelId: LevelId;
    returnX: number;
    returnY: number;
    timeRemaining: number;
  } | null = null;
  public runElapsedSec = 0;

  constructor(isTouchDevice = false) {
    this.saveManager = new SaveManager(undefined, isTouchDevice);
    this.saveData = this.saveManager.load();
    this.scoreManager = new ScoreManager(this.saveData.highScore);
    this.applyAudioSettings();
  }

  public applyAudioSettings(): void {
    synth.setVolumes(this.saveData.settings.sfx, this.saveData.settings.music);
  }

  public startNewGame(startLevel: LevelId = '1-1'): void {
    this.currentLevelId = startLevel;
    this.highestClearedLevel = startLevel;
    this.playerPower = 'small';
    this.checkpointPos = null;
    this.bonusReturnState = null;
    this.runElapsedSec = 0;
    this.scoreManager.resetRun(this.saveData.highScore);
  }

  public refreshSave(): void {
    this.saveData = this.saveManager.load();
    this.applyAudioSettings();
  }
}

let globalSession: GameSession | null = null;

export function getSession(isTouchDevice = false): GameSession {
  if (!globalSession) {
    globalSession = new GameSession(isTouchDevice);
  }
  return globalSession;
}
