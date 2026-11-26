import { describe, expect, it } from 'vitest';
import { FIXED_DT_MS, FIXED_DT_SEC, PHYSICS_CONFIG, TILE_SIZE } from '../config';
import { level1_1 } from '../levels/level1_1';
import { computeJumpMetrics, stepPlayerVertical, type VerticalState } from './jumpPhysics';

function createInitialState(vx = 0): VerticalState {
  return {
    y: 0,
    vy: 0,
    vx,
    onGround: true,
    coyoteTimerMs: PHYSICS_CONFIG.COYOTE_TIME_MS,
    jumpBufferTimerMs: 0,
    jumpElapsedMs: 0,
    isJumping: false,
  };
}

function simulateFixedJump(vx: number, holdSteps: number): { maxHeightPx: number; airSteps: number } {
  const state = createInitialState(vx);
  let minY = 0;
  let airSteps = 0;

  for (let step = 0; step < 240; step++) {
    const held = step < holdSteps;
    const pressed = step === 0;
    stepPlayerVertical(state, { jumpHeld: held, jumpPressed: pressed }, FIXED_DT_SEC);
    if (state.y < minY) minY = state.y;
    airSteps++;
    if (step > 0 && state.y >= 0) {
      break;
    }
  }

  return { maxHeightPx: -minY, airSteps };
}

function simulateWithRefreshRateHz(hz: number, vx: number, holdDurationMs: number): number {
  const frameDtMs = 1000 / hz;
  const state = createInitialState(vx);
  let accumulator = 0;
  let elapsedMs = 0;
  let minY = 0;
  let jumpPressedConsumed = false;

  for (let frame = 0; frame < Math.ceil(hz * 2.5); frame++) {
    elapsedMs += frameDtMs;
    accumulator += frameDtMs;
    while (accumulator >= FIXED_DT_MS) {
      const held = elapsedMs <= holdDurationMs;
      const pressed = !jumpPressedConsumed;
      jumpPressedConsumed = true;
      stepPlayerVertical(state, { jumpHeld: held, jumpPressed: pressed }, FIXED_DT_SEC);
      if (state.y < minY) minY = state.y;
      accumulator -= FIXED_DT_MS;
      if (state.y >= 0 && elapsedMs > FIXED_DT_MS * 2) {
        return -minY;
      }
    }
  }
  return -minY;
}

describe('Asymmetric 60Hz jump physics', () => {
  it('standing / walking full hold reaches 4.25 to 4.9 tiles', () => {
    const standing = simulateFixedJump(0, 120);
    const walking = simulateFixedJump(PHYSICS_CONFIG.WALK_MAX_SPEED, 120);

    const standTiles = standing.maxHeightPx / TILE_SIZE;
    const walkTiles = walking.maxHeightPx / TILE_SIZE;

    expect(standTiles).toBeGreaterThanOrEqual(4.25);
    expect(standTiles).toBeLessThanOrEqual(4.9);
    expect(walkTiles).toBeCloseTo(standTiles, 4);
  });

  it('running full hold (|vx| > 140) reaches at least 5.0 tiles', () => {
    const running = simulateFixedJump(PHYSICS_CONFIG.RUN_MAX_SPEED, 120);
    const runTiles = running.maxHeightPx / TILE_SIZE;

    expect(runTiles).toBeGreaterThanOrEqual(5.0);
  });

  it('tapping jump for 1 fixed step then releasing stays at <= 2.5 tiles', () => {
    const tap = simulateFixedJump(0, 1);
    const tapTiles = tap.maxHeightPx / TILE_SIZE;

    expect(tapTiles).toBeGreaterThanOrEqual(1.5);
    expect(tapTiles).toBeLessThanOrEqual(2.5);
  });

  it('gives identical jump height (< 1px delta) across 60Hz, 120Hz, and 144Hz refresh rates', () => {
    const h60 = simulateWithRefreshRateHz(60, 0, 1000);
    const h120 = simulateWithRefreshRateHz(120, 0, 1000);
    const h144 = simulateWithRefreshRateHz(144, 0, 1000);

    expect(Math.abs(h60 - h120)).toBeLessThan(1);
    expect(Math.abs(h60 - h144)).toBeLessThan(1);
  });

  it('makes all 4-tile ? blocks above ground row 13 in level 1-1 comfortably reachable', () => {
    expect(level1_1.id).toBe('1-1');
    expect(level1_1.rows[13]![14]).toBe('#');
    expect(level1_1.rows[9]![14]).toBe('?');
    // Ground is row 13, ? block row is row 9 -> 4 tiles = 64px vertical clearance needed
    const metrics = computeJumpMetrics();
    expect(metrics.walkHeightTiles).toBeGreaterThan(4.2);
    expect(metrics.maxReachHeightTiles).toBeGreaterThanOrEqual(4);
  });
});
