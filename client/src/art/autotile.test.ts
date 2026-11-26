import { describe, expect, it } from 'vitest';
import {
  CANONICAL_47_MASKS,
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  EXTRA_TILE_INDEX,
  computeGroundBitmask,
  getGroundTileIndex,
  positionVariantHash,
  renderAutotileMatrix,
} from './autotile';
import { PALETTE, PALETTE_GROUPS } from './palette';

describe('16-bit Palette & Hue-Shifting Rules', () => {
  it('uses hue-shifted dark outlines and never #000000 for material outlines', () => {
    for (const [groupName, group] of Object.entries(PALETTE_GROUPS)) {
      if (typeof group === 'object' && group !== null && 'outline' in group) {
        expect(group.outline.toLowerCase(), `Group ${groupName}`).not.toBe('#000000');
      }
    }
    for (const [key, hex] of Object.entries(PALETTE)) {
      if (key === 'P' || key === '.') continue;
      expect(hex.toLowerCase(), `Palette key ${key}`).not.toBe('#000000');
    }
  });
});

describe('47-Tile 8-Direction Autotiler', () => {
  it('builds exactly 47 canonical bitmasks', () => {
    expect(CANONICAL_47_MASKS).toHaveLength(47);
    expect(CANONICAL_47_MASKS[0]).toBe(0);
    expect(CANONICAL_47_MASKS[CANONICAL_47_MASKS.length - 1]).toBe(255);
  });

  it('rounds outer corners and darkens inner corners cleanly', () => {
    const isolated = renderAutotileMatrix(0, 'grass');
    expect(isolated[0]![0]).toBe('');
    expect(isolated[0]![15]).toBe('');
    expect(isolated[15]![0]).toBe('');
    expect(isolated[15]![15]).toBe('');

    const innerCornerNW = renderAutotileMatrix(DIR_N | DIR_E | DIR_S | DIR_W | 16 | 32 | 64, 'grass');
    expect(innerCornerNW[0]![0]).toBe(PALETTE_GROUPS.dirt.outline);
    expect(innerCornerNW[1]![1]).toBe(PALETTE_GROUPS.dirt.shadow);
  });

  it('assigns interior variants deterministically and separates themes', () => {
    const rows = [
      '.....',
      '.###.',
      '.###.',
      '.###.',
      '.....',
    ];
    const centerMask = computeGroundBitmask(rows, 2, 2);
    expect(centerMask).toBe(255);

    const gIdx = getGroundTileIndex(rows, 2, 2, 'grass');
    const cIdx = getGroundTileIndex(rows, 2, 2, 'cave');
    const kIdx = getGroundTileIndex(rows, 2, 2, 'castle');

    expect(gIdx).toBeGreaterThanOrEqual(1);
    expect(gIdx).toBeLessThan(50);
    expect(cIdx).toBeGreaterThanOrEqual(50);
    expect(cIdx).toBeLessThan(99);
    expect(kIdx).toBeGreaterThanOrEqual(99);
    expect(kIdx).toBeLessThan(EXTRA_TILE_INDEX.HARD_BLOCK);

    const variants = new Set([
      positionVariantHash(0, 0),
      positionVariantHash(1, 0),
      positionVariantHash(2, 0),
      positionVariantHash(3, 1),
      positionVariantHash(4, 2),
    ]);
    expect(variants.size).toBe(3);
  });
});
