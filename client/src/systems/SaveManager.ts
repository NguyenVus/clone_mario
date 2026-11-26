export type TouchSizePreset = 'small' | 'medium' | 'large';
export type TouchMoveMode = 'buttons' | 'joystick';
export type EffectQualityMode = 'auto' | 'high' | 'low';

export interface CustomTouchLayout {
  leftPad?: { x: number; y: number };
  jumpBtn?: { x: number; y: number };
  runBtn?: { x: number; y: number };
  pauseBtn?: { x: number; y: number };
}

export interface GameSettings {
  sfx: number;
  music: number;
  touch: boolean;
  shake: boolean;
  highEffects: boolean;
  effectQuality: EffectQualityMode;
  touchSize: TouchSizePreset;
  touchAlpha: number; // 20..80
  touchLeftHanded: boolean;
  touchMoveMode: TouchMoveMode;
  alwaysRun: boolean;
  vibrate: boolean;
  customTouchLayout?: CustomTouchLayout;
}

export interface SaveDataV1 {
  version: 1;
  unlockedLevel: number; // 1..3
  highScore: number;
  settings: GameSettings;
  playerName?: string;
}

export const SAVE_STORAGE_KEY = 'pixelhero.save.v1';

export function createDefaultSaveData(defaultTouch = false): SaveDataV1 {
  return {
    version: 1,
    unlockedLevel: 1,
    highScore: 0,
    settings: {
      sfx: 80,
      music: 60,
      touch: defaultTouch,
      shake: true,
      highEffects: true,
      effectQuality: 'auto',
      touchSize: 'medium',
      touchAlpha: 50,
      touchLeftHanded: false,
      touchMoveMode: 'buttons',
      alwaysRun: false,
      vibrate: true,
    },
    playerName: '',
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function sanitizePoint(raw: unknown): { x: number; y: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.x === 'number' &&
    Number.isFinite(obj.x) &&
    typeof obj.y === 'number' &&
    Number.isFinite(obj.y)
  ) {
    return { x: Math.round(obj.x), y: Math.round(obj.y) };
  }
  return undefined;
}

function sanitizeCustomLayout(raw: unknown): CustomTouchLayout | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const obj = raw as Record<string, unknown>;
  const out: CustomTouchLayout = {};
  const lp = sanitizePoint(obj.leftPad);
  const jb = sanitizePoint(obj.jumpBtn);
  const rb = sanitizePoint(obj.runBtn);
  const pb = sanitizePoint(obj.pauseBtn);
  if (lp) out.leftPad = lp;
  if (jb) out.jumpBtn = jb;
  if (rb) out.runBtn = rb;
  if (pb) out.pauseBtn = pb;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeSaveData(raw: unknown, defaultTouch = false): SaveDataV1 {
  const def = createDefaultSaveData(defaultTouch);
  if (typeof raw !== 'object' || raw === null) return def;

  const obj = raw as Record<string, unknown>;
  const unlockedRaw = obj.unlockedLevel;
  const unlockedLevel =
    typeof unlockedRaw === 'number' && Number.isFinite(unlockedRaw)
      ? Math.max(1, Math.min(3, Math.floor(unlockedRaw)))
      : def.unlockedLevel;

  const highRaw = obj.highScore;
  const highScore =
    typeof highRaw === 'number' && Number.isFinite(highRaw) && highRaw >= 0
      ? Math.floor(highRaw)
      : def.highScore;

  const rawSettings =
    typeof obj.settings === 'object' && obj.settings !== null
      ? (obj.settings as Record<string, unknown>)
      : {};

  const effectQuality: EffectQualityMode =
    rawSettings.effectQuality === 'high' ||
    rawSettings.effectQuality === 'low' ||
    rawSettings.effectQuality === 'auto'
      ? rawSettings.effectQuality
      : rawSettings.highEffects === false
        ? 'low'
        : def.settings.effectQuality;

  const touchSize: TouchSizePreset =
    rawSettings.touchSize === 'small' ||
    rawSettings.touchSize === 'medium' ||
    rawSettings.touchSize === 'large'
      ? rawSettings.touchSize
      : def.settings.touchSize;

  const touchMoveMode: TouchMoveMode =
    rawSettings.touchMoveMode === 'joystick' || rawSettings.touchMoveMode === 'buttons'
      ? rawSettings.touchMoveMode
      : def.settings.touchMoveMode;

  const settings: GameSettings = {
    sfx: clampInt(rawSettings.sfx, 0, 100, def.settings.sfx),
    music: clampInt(rawSettings.music, 0, 100, def.settings.music),
    touch: typeof rawSettings.touch === 'boolean' ? rawSettings.touch : def.settings.touch,
    shake: typeof rawSettings.shake === 'boolean' ? rawSettings.shake : def.settings.shake,
    highEffects: effectQuality !== 'low',
    effectQuality,
    touchSize,
    touchAlpha: clampInt(rawSettings.touchAlpha, 20, 80, def.settings.touchAlpha),
    touchLeftHanded:
      typeof rawSettings.touchLeftHanded === 'boolean'
        ? rawSettings.touchLeftHanded
        : def.settings.touchLeftHanded,
    touchMoveMode,
    alwaysRun:
      typeof rawSettings.alwaysRun === 'boolean'
        ? rawSettings.alwaysRun
        : def.settings.alwaysRun,
    vibrate:
      typeof rawSettings.vibrate === 'boolean' ? rawSettings.vibrate : def.settings.vibrate,
    customTouchLayout: sanitizeCustomLayout(rawSettings.customTouchLayout),
  };

  const playerName =
    typeof obj.playerName === 'string' ? obj.playerName.trim().slice(0, 16) : def.playerName;

  return {
    version: 1,
    unlockedLevel,
    highScore,
    settings,
    playerName,
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveManager {
  private readonly storage: StorageLike | null;
  private readonly defaultTouch: boolean;

  constructor(storage?: StorageLike | null, defaultTouch = false) {
    if (storage !== undefined) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
    this.defaultTouch = defaultTouch;
  }

  public load(): SaveDataV1 {
    if (!this.storage) return createDefaultSaveData(this.defaultTouch);
    try {
      const raw = this.storage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return createDefaultSaveData(this.defaultTouch);
      const parsed: unknown = JSON.parse(raw);
      return sanitizeSaveData(parsed, this.defaultTouch);
    } catch {
      return createDefaultSaveData(this.defaultTouch);
    }
  }

  public save(data: SaveDataV1): boolean {
    if (!this.storage) return false;
    try {
      const clean = sanitizeSaveData(data, this.defaultTouch);
      this.storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(clean));
      return true;
    } catch {
      return false;
    }
  }

  public update(mutator: (current: SaveDataV1) => SaveDataV1): SaveDataV1 {
    const next = sanitizeSaveData(mutator(this.load()), this.defaultTouch);
    this.save(next);
    return next;
  }

  public unlockLevel(levelIndex: number): SaveDataV1 {
    return this.update((d) => ({
      ...d,
      unlockedLevel: Math.max(d.unlockedLevel, Math.min(3, levelIndex)),
    }));
  }

  public recordHighScore(score: number): SaveDataV1 {
    return this.update((d) => ({
      ...d,
      highScore: Math.max(d.highScore, Math.floor(score)),
    }));
  }

  public clear(): SaveDataV1 {
    const def = createDefaultSaveData(this.defaultTouch);
    if (this.storage) {
      try {
        this.storage.removeItem(SAVE_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    }
    return def;
  }
}
