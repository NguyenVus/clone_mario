export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 240;
export const TILE_SIZE = 16;
export const VIEWPORT_TILES_X = 25;
export const VIEWPORT_TILES_Y = 15;

export const PHYSICS_CONFIG = {
  GRAVITY: 1400,
  MAX_FALL_SPEED: 500,
  WALK_MAX_SPEED: 100,
  RUN_MAX_SPEED: 170,
  GROUND_ACCEL: 500,
  RUN_ACCEL: 700,
  GROUND_DECEL: 600,
  SKID_DECEL: 1000,
  AIR_ACCEL_MULT: 0.75,
  JUMP_VELOCITY: -445,
  RUN_JUMP_VELOCITY: -485,
  RUN_JUMP_SPEED_THRESHOLD: 140,
  JUMP_CUT_VY_THRESHOLD: -120,
  JUMP_CUT_MULT: 0.45,
  COYOTE_TIME_MS: 100,
  JUMP_BUFFER_MS: 100,
  STOMP_BOUNCE: -280,
  STOMP_BOUNCE_HOLD: -420,
  HURT_INVULN_MS: 2000,
  STAR_DURATION_MS: 10000,
  CORNER_CORRECTION_PX: 4,
  PREVENT_BACKTRACK: true,
} as const;

export const CAMERA_CONFIG = {
  LERP_X: 0.15,
  LERP_Y: 0.15,
  DEADZONE_W: 40,
  DEADZONE_H: 60,
} as const;

export const GAMEPLAY_CONFIG = {
  STARTING_LIVES: 3,
  GEMS_FOR_ONE_UP: 100,
  FIREBALL_SPEED: 220,
  FIREBALL_BOUNCE_VY: -200,
  FIREBALL_MAX_ACTIVE: 2,
  FIREBALL_COOLDOWN_MS: 250,
  ENEMY_SPEED: 35,
  SHELL_SLIDE_SPEED: 220,
  SHELL_RECOVER_MS: 8000,
  SHELL_WARN_MS: 1000,
  POWERUP_SLIDE_SPEED: 60,
  STAR_BOUNCE_VY: -350,
  STAR_SPEED_X: 90,
  MULTI_COIN_MAX_HITS: 10,
  MULTI_COIN_WINDOW_MS: 5000,
  PLATFORM_RANGE_PX: 64,
  PLATFORM_PERIOD_MS: 3000,
  FIREBAR_BALLS: 6,
  FIREBAR_DEG_PER_SEC: 90,
  LOW_TIME_THRESHOLD: 100,
  TIME_SCORE_PER_SEC: 50,
  ENEMY_ACTIVATE_MARGIN_PX: 32,
  STOMP_COMBO: [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000] as const,
} as const;

export const SCORE_VALUES = {
  GEM: 200,
  FLOATING_GEM: 100,
  BRICK_BREAK: 50,
  POWERUP: 1000,
  FIREBALL_KILL: 200,
  BOSS_KILL: 5000,
  FLAGPOLE_TIERS: [
    { minTiles: 8, score: 5000 },
    { minTiles: 6, score: 2000 },
    { minTiles: 4, score: 800 },
    { minTiles: 2, score: 400 },
    { minTiles: 0, score: 100 },
  ],
} as const;

export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

export function isSpritePreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1' && params.get('sprites') === '1';
}

export function isShotPreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1' && params.get('shot') === '1';
}

export function getShotTheme(): 'grass' | 'cave' | 'castle' {
  if (typeof window === 'undefined') return 'grass';
  const t = new URLSearchParams(window.location.search).get('theme');
  if (t === 'cave' || t === 'castle') return t;
  return 'grass';
}
