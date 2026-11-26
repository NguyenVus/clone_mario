import type { LevelSource } from './legend';
import { parseLevel } from './parser';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const SOLID_CHARS = new Set(['#', 'X', 'B', '?', 'M', '*', 'G', '[', ']', '{', '}', 'p', 'R']);
const STANDABLE_CHARS = new Set([...SOLID_CHARS, '=']);
const HAZARD_CHARS = new Set(['L']);

export function validateLevelReachability(source: LevelSource): ValidationResult {
  const data = parseLevel(source);
  const rows = source.rows;
  const H = data.heightTiles;
  const W = data.widthTiles;

  // Build platform support map (moving platforms bridge up to 4 horizontal or 4 vertical tiles)
  const platformStandable = new Set<number>();
  const key = (c: number, r: number): number => r * W + c;

  for (const p of data.platforms) {
    if (p.axis === 'horizontal') {
      // Platform is 3 tiles wide and sweeps +-2..+4 tiles horizontally
      for (let dc = -2; dc <= 5; dc++) {
        const c = p.col + dc;
        if (c >= 0 && c < W && p.row - 1 >= 0) {
          platformStandable.add(key(c, p.row - 1));
        }
      }
    } else {
      // Vertical platform sweeps +-2..4 tiles vertically
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const c = p.col + dc;
          const r = p.row + dr - 1;
          if (c >= 0 && c < W && r >= 0 && r < H) {
            platformStandable.add(key(c, r));
          }
        }
      }
    }
  }

  const isSolid = (c: number, r: number): boolean => {
    if (c < 0 || c >= W || r < 0 || r >= H) return false;
    return SOLID_CHARS.has(rows[r]![c]!);
  };

  const isHazard = (c: number, r: number): boolean => {
    if (c < 0 || c >= W || r < 0 || r >= H) return false;
    return HAZARD_CHARS.has(rows[r]![c]!);
  };

  const isPassable = (c: number, r: number): boolean => {
    if (c < 0 || c >= W || r < 0 || r >= H) return false;
    return !isSolid(c, r) && !isHazard(c, r);
  };

  const canStandAt = (c: number, r: number): boolean => {
    if (!isPassable(c, r)) return false;
    if (platformStandable.has(key(c, r))) return true;
    if (r + 1 >= H) return false;
    return STANDABLE_CHARS.has(rows[r + 1]![c]!);
  };

  const targets = new Set<number>();
  if (data.flagpole) {
    // Allow touching any column adjacent or at flagpole base up to 8 tiles high
    for (let dr = 0; dr <= 8; dr++) {
      const r = data.flagpole.row - dr;
      if (r >= 0) targets.add(key(data.flagpole.col, r));
    }
  }
  if (data.door) {
    targets.add(key(data.door.col, data.door.row));
    if (data.door.col + 1 < W) targets.add(key(data.door.col + 1, data.door.row));
  }
  if (data.isBonus) {
    for (const wp of data.warpPipes) {
      if (wp.row - 1 >= 0) targets.add(key(wp.col, wp.row - 1));
    }
  }

  // Drop spawn down to first standable tile if spawn is 1 tile above ground
  let startC = data.spawn.col;
  let startR = data.spawn.row;
  while (startR + 1 < H && !canStandAt(startC, startR) && isPassable(startC, startR + 1)) {
    startR++;
  }

  const visited = new Set<number>();
  const queue: Array<[number, number]> = [];
  const enqueue = (c: number, r: number): void => {
    if (c < 0 || c >= W || r < 0 || r >= H) return;
    const k = key(c, r);
    if (visited.has(k)) return;
    visited.add(k);
    queue.push([c, r]);
  };

  enqueue(startC, startR);

  let head = 0;
  while (head < queue.length) {
    const [c, r] = queue[head++]!;
    if (targets.has(key(c, r))) {
      return { valid: true };
    }

    // Check if adjacent to target while falling/passing
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (targets.has(key(c + dc, r + dr))) {
          return { valid: true };
        }
      }
    }

    // 1. Walk left/right or step down off a ledge
    for (const dir of [-1, 1]) {
      const nc = c + dir;
      if (nc < 0 || nc >= W) continue;
      if (isPassable(nc, r)) {
        if (canStandAt(nc, r)) {
          enqueue(nc, r);
        } else {
          // Fall down to nearest standable tile below
          let fallR = r + 1;
          while (fallR < H && isPassable(nc, fallR)) {
            if (targets.has(key(nc, fallR))) return { valid: true };
            if (canStandAt(nc, fallR)) {
              enqueue(nc, fallR);
              break;
            }
            fallR++;
          }
        }
      }
    }

    // 2. Jump arcs: up to 5 tiles horizontally (running), 4 tiles high
    for (let dx = -5; dx <= 5; dx++) {
      const targetC = c + dx;
      if (targetC < 0 || targetC >= W) continue;

      // Check vertical headroom at takeoff (at least 1 tile up if jumping)
      for (let peakUp = 1; peakUp <= 4; peakUp++) {
        const apexR = r - peakUp;
        if (apexR < 0) continue;
        // Verify clear path straight up or slanted near takeoff
        let ceilingClear = true;
        for (let step = 1; step <= peakUp; step++) {
          if (isSolid(c, r - step)) {
            ceilingClear = false;
            break;
          }
        }
        if (!ceilingClear) break;

        // From apexR, descend to any standable tile at targetC
        // Midpoint clearance check for wide jumps
        if (Math.abs(dx) >= 3) {
          const midC = c + Math.trunc(dx / 2);
          if (isSolid(midC, apexR) && isSolid(midC, Math.min(H - 1, apexR + 1))) {
            continue;
          }
        }

        for (let landR = apexR; landR < H; landR++) {
          if (!isPassable(targetC, landR)) break;
          if (targets.has(key(targetC, landR))) return { valid: true };
          if (canStandAt(targetC, landR)) {
            enqueue(targetC, landR);
          }
        }
      }
    }
  }

  return {
    valid: false,
    reason: `Màn ${data.id}: không thể đi từ S (${startC}, ${startR}) tới đích.`,
  };
}
