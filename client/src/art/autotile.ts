import type { LevelTheme } from '../levels/legend';
import { PALETTE_GROUPS, type ShadeGroup } from './palette';

export const DIR_N = 1;
export const DIR_E = 2;
export const DIR_S = 4;
export const DIR_W = 8;
export const DIR_NE = 16;
export const DIR_SE = 32;
export const DIR_SW = 64;
export const DIR_NW = 128;

/**
 * Generates the canonical 47 normalized 8-bit autotile masks (Blob TileSet).
 * Diagonal bits are only kept when both adjacent cardinal neighbors are solid.
 */
export function buildCanonical47Masks(): number[] {
  const seen = new Set<number>();
  const list: number[] = [];
  for (let raw = 0; raw < 256; raw++) {
    const norm = normalizeMask(raw);
    if (!seen.has(norm)) {
      seen.add(norm);
      list.push(norm);
    }
  }
  return list.sort((a, b) => a - b);
}

export function normalizeMask(raw: number): number {
  const card = raw & 0x0f;
  let norm = card;
  if ((card & (DIR_N | DIR_E)) === (DIR_N | DIR_E) && raw & DIR_NE) norm |= DIR_NE;
  if ((card & (DIR_S | DIR_E)) === (DIR_S | DIR_E) && raw & DIR_SE) norm |= DIR_SE;
  if ((card & (DIR_S | DIR_W)) === (DIR_S | DIR_W) && raw & DIR_SW) norm |= DIR_SW;
  if ((card & (DIR_N | DIR_W)) === (DIR_N | DIR_W) && raw & DIR_NW) norm |= DIR_NW;
  return norm;
}

export const CANONICAL_47_MASKS: readonly number[] = buildCanonical47Masks();

export const MASK_TO_47_INDEX: ReadonlyMap<number, number> = new Map(
  CANONICAL_47_MASKS.map((mask, idx) => [mask, idx]),
);

/**
 * Deterministic position hash so interior tile variants never repeat uniformly.
 */
export function positionVariantHash(col: number, row: number): number {
  const h = ((col * 73856093) ^ (row * 19349663) ^ (col * row * 83492791)) >>> 0;
  return h % 3;
}

/**
 * Computes normalized 8-neighbor bitmask for a '#' ground tile in ASCII rows.
 * Level edges count as solid so boundary ground flows cleanly off-screen.
 */
export function computeGroundBitmask(rows: readonly string[], row: number, col: number): number {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;

  const isGround = (r: number, c: number): boolean => {
    if (c < 0 || c >= w || r >= h) return true;
    if (r < 0) return true;
    return rows[r]?.[c] === '#';
  };

  let raw = 0;
  if (isGround(row - 1, col)) raw |= DIR_N;
  if (isGround(row, col + 1)) raw |= DIR_E;
  if (isGround(row + 1, col)) raw |= DIR_S;
  if (isGround(row, col - 1)) raw |= DIR_W;
  if (isGround(row - 1, col + 1)) raw |= DIR_NE;
  if (isGround(row + 1, col + 1)) raw |= DIR_SE;
  if (isGround(row + 1, col - 1)) raw |= DIR_SW;
  if (isGround(row - 1, col - 1)) raw |= DIR_NW;

  return normalizeMask(raw);
}

/**
 * Layout of the unified tileset spritesheet (16x16 tiles):
 * 0: empty
 * 1..47: grass autotile (47 canonical masks)
 * 48..49: grass interior variants 1 & 2 (mask 255 alt variants)
 * 50..96: cave autotile (47)
 * 97..98: cave interior variants 1 & 2
 * 99..145: castle autotile (47)
 * 146..147: castle interior variants 1 & 2
 * 148: hard-block X
 * 149..152: pipe top-l, top-r, body-l, body-r
 * 153: bridge
 * 154: lava static fallback
 */
export const AUTOTILE_BASE = {
  grass: 1,
  cave: 50,
  castle: 99,
} as const;

export const EXTRA_TILE_INDEX = {
  HARD_BLOCK: 148,
  PIPE_TOP_L: 149,
  PIPE_TOP_R: 150,
  PIPE_BODY_L: 151,
  PIPE_BODY_R: 152,
  BRIDGE: 153,
  LAVA: 154,
} as const;

export function getGroundTileIndex(
  rows: readonly string[],
  row: number,
  col: number,
  theme: LevelTheme,
): number {
  const mask = computeGroundBitmask(rows, row, col);
  const slot = MASK_TO_47_INDEX.get(mask) ?? 46;
  const base = AUTOTILE_BASE[theme];
  if (mask === 255) {
    const variant = positionVariantHash(col, row);
    if (variant === 1) return base + 47;
    if (variant === 2) return base + 48;
  }
  return base + slot;
}

function getThemeMaterial(theme: LevelTheme): { cap: ShadeGroup; body: ShadeGroup } {
  if (theme === 'grass') {
    return { cap: PALETTE_GROUPS.grass, body: PALETTE_GROUPS.dirt };
  }
  if (theme === 'cave') {
    return { cap: PALETTE_GROUPS.caveStone, body: PALETTE_GROUPS.caveStone };
  }
  return { cap: PALETTE_GROUPS.castleBrick, body: PALETTE_GROUPS.castleBrick };
}

/**
 * Renders one 16x16 autotile frame as a 16-row palette-keyed hex/char matrix,
 * returning 16x16 array of hex strings ('' = transparent).
 */
export function renderAutotileMatrix(
  mask: number,
  theme: LevelTheme,
  variant = 0,
): string[][] {
  const { cap, body } = getThemeMaterial(theme);
  const grid: string[][] = Array.from({ length: 16 }, () =>
    Array.from({ length: 16 }, () => body.base),
  );

  const hasN = Boolean(mask & DIR_N);
  const hasE = Boolean(mask & DIR_E);
  const hasS = Boolean(mask & DIR_S);
  const hasW = Boolean(mask & DIR_W);
  const hasNE = Boolean(mask & DIR_NE);
  const hasSE = Boolean(mask & DIR_SE);
  const hasSW = Boolean(mask & DIR_SW);
  const hasNW = Boolean(mask & DIR_NW);

  // 1) Interior texture details (pebbles, roots, cracks) for variety
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (variant === 0) {
        if ((x === 3 && y === 7) || (x === 11 && y === 11)) grid[y]![x] = body.shadow;
        if ((x === 4 && y === 7) || (x === 12 && y === 11)) grid[y]![x] = body.highlight;
      } else if (variant === 1) {
        // Pebbles
        if ((x >= 4 && x <= 6 && y >= 6 && y <= 7) || (x >= 10 && x <= 12 && y >= 10 && y <= 11)) {
          grid[y]![x] = y === 6 || y === 10 ? body.highlight : body.shadow;
        }
      } else {
        // Cracks / subtle roots
        if ((y === 6 && x >= 3 && x <= 6) || (y === 7 && x >= 6 && x <= 8) || (x === 11 && y >= 9 && y <= 12)) {
          grid[y]![x] = body.shadow;
        }
      }
    }
  }

  // 2) Top surface cap (lush grass overhanging or beveled stone ledge)
  if (!hasN) {
    for (let x = 0; x < 16; x++) {
      const tuftDepth = theme === 'grass' ? (x % 4 === 1 ? 5 : x % 2 === 0 ? 4 : 3) : 3;
      for (let y = 0; y < tuftDepth; y++) {
        if (y === 0) grid[y]![x] = cap.outline;
        else if (y === 1) grid[y]![x] = cap.highlight;
        else if (y === tuftDepth - 1) grid[y]![x] = cap.shadow;
        else grid[y]![x] = cap.base;
      }
      // Shadow directly under overhanging cap
      if (tuftDepth < 15) {
        grid[tuftDepth]![x] = body.shadow;
      }
    }
  }

  // 3) Exposed Left edge (lit side -> selective outline + highlight rim)
  if (!hasW) {
    for (let y = 0; y < 16; y++) {
      grid[y]![0] = y < 4 && !hasN ? cap.outline : body.outline;
      grid[y]![1] = y < 4 && !hasN ? cap.highlight : body.highlight;
    }
  }

  // 4) Exposed Right edge (shaded side -> shadow + dark outline)
  if (!hasE) {
    for (let y = 0; y < 16; y++) {
      grid[y]![15] = y < 4 && !hasN ? cap.outline : body.outline;
      grid[y]![14] = y < 4 && !hasN ? cap.shadow : body.shadow;
    }
  }

  // 5) Exposed Bottom edge (darkest underside)
  if (!hasS) {
    for (let x = 0; x < 16; x++) {
      grid[15]![x] = body.outline;
      grid[14]![x] = body.shadow;
    }
  }

  // 6) Smooth rounded outer corners (1-2-3px curve, no sharp 90deg corners)
  if (!hasN && !hasW) {
    grid[0]![0] = '';
    grid[0]![1] = '';
    grid[1]![0] = '';
    grid[1]![1] = cap.outline;
    grid[0]![2] = cap.outline;
    grid[2]![0] = cap.outline;
    grid[1]![2] = cap.highlight;
    grid[2]![1] = cap.highlight;
  }
  if (!hasN && !hasE) {
    grid[0]![15] = '';
    grid[0]![14] = '';
    grid[1]![15] = '';
    grid[1]![14] = cap.outline;
    grid[0]![13] = cap.outline;
    grid[2]![15] = cap.outline;
    grid[1]![13] = cap.base;
    grid[2]![14] = cap.shadow;
  }
  if (!hasS && !hasW) {
    grid[15]![0] = '';
    grid[15]![1] = '';
    grid[14]![0] = '';
    grid[14]![1] = body.outline;
    grid[15]![2] = body.outline;
    grid[13]![0] = body.outline;
  }
  if (!hasS && !hasE) {
    grid[15]![15] = '';
    grid[15]![14] = '';
    grid[14]![15] = '';
    grid[14]![14] = body.outline;
    grid[15]![13] = body.outline;
    grid[13]![15] = body.outline;
  }

  // 7) Inner corner bevels/shadows when adjacent cardinals exist but diagonal is air
  if (hasN && hasW && !hasNW) {
    grid[0]![0] = body.outline;
    grid[0]![1] = body.shadow;
    grid[1]![0] = body.shadow;
    grid[1]![1] = body.shadow;
  }
  if (hasN && hasE && !hasNE) {
    grid[0]![15] = body.outline;
    grid[0]![14] = body.shadow;
    grid[1]![15] = body.shadow;
    grid[1]![14] = body.shadow;
  }
  if (hasS && hasW && !hasSW) {
    grid[15]![0] = body.outline;
    grid[15]![1] = body.shadow;
    grid[14]![0] = body.shadow;
    grid[14]![1] = body.shadow;
  }
  if (hasS && hasE && !hasSE) {
    grid[15]![15] = body.outline;
    grid[15]![14] = body.shadow;
    grid[14]![15] = body.shadow;
    grid[14]![14] = body.shadow;
  }

  return grid;
}
