import { describe, expect, it } from 'vitest';
import { nextPowerState } from '../entities/powerState';
import { GAMEPLAY_CONFIG } from '../config';
import { SAVE_STORAGE_KEY, SaveManager, type StorageLike } from './SaveManager';
import { ScoreManager } from './ScoreManager';

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('ScoreManager', () => {
  it('tracks score, stomp combo chain, 100 gems -> 1UP, lives, and high score', () => {
    const sm = new ScoreManager(500);
    expect(sm.getSnapshot().lives).toBe(GAMEPLAY_CONFIG.STARTING_LIVES);
    expect(sm.getSnapshot().highScore).toBe(500);

    sm.addScore(600);
    expect(sm.getSnapshot().score).toBe(600);
    expect(sm.getSnapshot().highScore).toBe(600);

    const expectedCombos = [
      '100',
      '200',
      '400',
      '500',
      '800',
      '1000',
      '2000',
      '4000',
      '5000',
      '8000',
      '1UP',
    ];
    for (const label of expectedCombos) {
      expect(sm.registerComboKill().label).toBe(label);
    }
    expect(sm.getSnapshot().lives).toBe(GAMEPLAY_CONFIG.STARTING_LIVES + 1);

    sm.resetCombo();
    expect(sm.registerComboKill().label).toBe('100');

    // 100 gems -> +1 life and gems reset to 0
    for (let i = 0; i < 99; i++) {
      expect(sm.addGem(100).gainedOneUp).toBe(false);
    }
    expect(sm.addGem(100).gainedOneUp).toBe(true);
    expect(sm.getSnapshot().gems).toBe(0);
    expect(sm.getSnapshot().lives).toBe(GAMEPLAY_CONFIG.STARTING_LIVES + 2);

    const left = sm.loseLife();
    expect(left).toBe(GAMEPLAY_CONFIG.STARTING_LIVES + 1);
  });
});

describe('SaveManager', () => {
  it('returns default data when storage has corrupted JSON and round-trips valid data', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_STORAGE_KEY, '{corrupted json');

    const saveManager = new SaveManager(storage, false);
    const loadedCorrupt = saveManager.load();
    expect(loadedCorrupt.unlockedLevel).toBe(1);
    expect(loadedCorrupt.highScore).toBe(0);

    saveManager.save({
      version: 1,
      unlockedLevel: 3,
      highScore: 42500,
      settings: {
        sfx: 40,
        music: 70,
        touch: true,
        shake: false,
        highEffects: true,
        effectQuality: 'high',
        touchSize: 'large',
        touchAlpha: 65,
        touchLeftHanded: true,
        touchMoveMode: 'joystick',
        alwaysRun: true,
        vibrate: false,
      },
      playerName: 'PipHero',
    });

    const loaded = saveManager.load();
    expect(loaded.unlockedLevel).toBe(3);
    expect(loaded.highScore).toBe(42500);
    expect(loaded.settings).toEqual({
      sfx: 40,
      music: 70,
      touch: true,
      shake: false,
      highEffects: true,
      effectQuality: 'high',
      touchSize: 'large',
      touchAlpha: 65,
      touchLeftHanded: true,
      touchMoveMode: 'joystick',
      alwaysRun: true,
      vibrate: false,
    });
    expect(loaded.playerName).toBe('PipHero');
  });
});

describe('Pip PowerState transitions', () => {
  it('handles power-up and damage transitions cleanly', () => {
    expect(nextPowerState('small', 'powerCell').nextState).toBe('big');
    expect(nextPowerState('big', 'flameCore').nextState).toBe('fire');
    expect(nextPowerState('small', 'flameCore').nextState).toBe('big');
    expect(nextPowerState('fire', 'powerCell')).toMatchObject({
      nextState: 'fire',
      changed: false,
      points: 1000,
    });
    expect(nextPowerState('fire', 'hurt')).toMatchObject({ nextState: 'big', died: false });
    expect(nextPowerState('big', 'hurt')).toMatchObject({ nextState: 'small', died: false });
    expect(nextPowerState('small', 'hurt')).toMatchObject({ died: true });
  });
});
