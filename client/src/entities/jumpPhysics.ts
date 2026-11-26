import { FIXED_DT_SEC, PHYSICS_CONFIG, TILE_SIZE } from '../config';

export interface VerticalState {
  y: number;
  vy: number;
  vx: number;
  onGround: boolean;
  coyoteTimerMs: number;
  jumpBufferTimerMs: number;
  jumpElapsedMs: number;
  isJumping: boolean;
}

export interface VerticalStepInput {
  jumpHeld: boolean;
  jumpPressed: boolean;
}

export interface VerticalStepResult {
  jumped: boolean;
  gravityApplied: number;
}

/**
 * Pure frame-rate-independent vertical jump & asymmetric gravity step.
 * Uses only downward clamping (vy <= MAX_FALL_SPEED) so upward jump velocity is never clipped.
 */
export function stepPlayerVertical(
  state: VerticalState,
  input: VerticalStepInput,
  dtSec: number,
): VerticalStepResult {
  const dtMs = dtSec * 1000;

  if (state.onGround) {
    state.coyoteTimerMs = PHYSICS_CONFIG.COYOTE_TIME_MS;
    if (state.vy >= 0) {
      state.isJumping = false;
    }
  } else {
    state.coyoteTimerMs = Math.max(0, state.coyoteTimerMs - dtMs);
  }

  if (input.jumpPressed) {
    state.jumpBufferTimerMs = PHYSICS_CONFIG.JUMP_BUFFER_MS;
  } else {
    state.jumpBufferTimerMs = Math.max(0, state.jumpBufferTimerMs - dtMs);
  }

  let jumped = false;
  if (state.jumpBufferTimerMs > 0 && state.coyoteTimerMs > 0) {
    const isFast = Math.abs(state.vx) > PHYSICS_CONFIG.RUN_JUMP_SPEED_THRESHOLD;
    state.vy = isFast ? PHYSICS_CONFIG.RUN_JUMP_VELOCITY : PHYSICS_CONFIG.JUMP_VELOCITY;
    state.coyoteTimerMs = 0;
    state.jumpBufferTimerMs = 0;
    state.jumpElapsedMs = 0;
    state.isJumping = true;
    state.onGround = false;
    jumped = true;
  }

  let gravity: number = PHYSICS_CONFIG.GRAVITY_FALL;
  if (state.vy < 0) {
    const minWindow = state.isJumping && state.jumpElapsedMs < PHYSICS_CONFIG.MIN_JUMP_TIME_MS;
    gravity =
      input.jumpHeld || minWindow
        ? PHYSICS_CONFIG.GRAVITY_RISE_HOLD
        : PHYSICS_CONFIG.GRAVITY_RISE_RELEASE;
  } else {
    gravity = PHYSICS_CONFIG.GRAVITY_FALL;
  }

  if (
    Math.abs(state.vy) < PHYSICS_CONFIG.APEX_VY_THRESHOLD &&
    input.jumpHeld &&
    !state.onGround
  ) {
    gravity *= PHYSICS_CONFIG.APEX_GRAVITY_MULT;
  }

  if (state.isJumping) {
    state.jumpElapsedMs += dtMs;
  }

  state.vy += gravity * dtSec;
  if (state.vy > PHYSICS_CONFIG.MAX_FALL_SPEED) {
    state.vy = PHYSICS_CONFIG.MAX_FALL_SPEED;
  }

  state.y += state.vy * dtSec;
  return { jumped, gravityApplied: gravity };
}

export interface JumpMetrics {
  walkHeightTiles: number;
  runHeightTiles: number;
  maxReachHeightTiles: number;
  maxWalkGapTiles: number;
  maxRunGapTiles: number;
}

/**
 * Simulates full jumps using stepPlayerVertical and PHYSICS_CONFIG to compute reachability
 * limits for the level validator (rounded down minus 0.25 tile safety margin).
 */
export function computeJumpMetrics(): JumpMetrics {
  const simulate = (vx: number): { maxHeightPx: number; airTimeSec: number } => {
    const s: VerticalState = {
      y: 0,
      vy: 0,
      vx,
      onGround: true,
      coyoteTimerMs: PHYSICS_CONFIG.COYOTE_TIME_MS,
      jumpBufferTimerMs: 0,
      jumpElapsedMs: 0,
      isJumping: false,
    };
    let minY = 0;
    let steps = 0;
    for (let i = 0; i < 180; i++) {
      stepPlayerVertical(s, { jumpHeld: true, jumpPressed: i === 0 }, FIXED_DT_SEC);
      if (s.y < minY) minY = s.y;
      steps++;
      if (i > 0 && s.y >= 0) break;
    }
    return { maxHeightPx: -minY, airTimeSec: steps * FIXED_DT_SEC };
  };

  const walkSim = simulate(PHYSICS_CONFIG.WALK_MAX_SPEED);
  const runSim = simulate(PHYSICS_CONFIG.RUN_MAX_SPEED);

  const walkHeightTiles = walkSim.maxHeightPx / TILE_SIZE;
  const runHeightTiles = runSim.maxHeightPx / TILE_SIZE;
  const walkHorizTiles = (PHYSICS_CONFIG.WALK_MAX_SPEED * walkSim.airTimeSec) / TILE_SIZE;
  const runHorizTiles = (PHYSICS_CONFIG.RUN_MAX_SPEED * runSim.airTimeSec) / TILE_SIZE;

  const safeFloor = (v: number): number => Math.max(1, Math.floor(v - 0.25));

  return {
    walkHeightTiles,
    runHeightTiles,
    maxReachHeightTiles: safeFloor(Math.max(walkHeightTiles, runHeightTiles)),
    maxWalkGapTiles: safeFloor(walkHorizTiles),
    maxRunGapTiles: safeFloor(runHorizTiles),
  };
}
