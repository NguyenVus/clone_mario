import { describe, expect, it } from 'vitest';
import { LEVEL_ROWS, type LevelSource } from './legend';
import { level1_1 } from './level1_1';
import { level1_2 } from './level1_2';
import { level1_2_bonus } from './level1_2_bonus';
import { level1_3 } from './level1_3';
import { parseLevel } from './parser';
import { validateLevelReachability } from './validator';

function makeSyntheticLevel(mutator: (grid: string[][]) => void): LevelSource {
  const grid = Array.from({ length: LEVEL_ROWS }, () => Array.from({ length: 30 }, () => '.'));
  for (let c = 0; c < 30; c++) {
    grid[13]![c] = '#';
    grid[14]![c] = '#';
  }
  grid[12]![2] = 'S';
  grid[12]![27] = 'F';
  mutator(grid);
  return {
    id: '1-1',
    name: 'Test',
    theme: 'grass',
    timeLimit: 300,
    music: 'grass',
    rows: grid.map((r) => r.join('')),
  };
}

describe('Level Parser', () => {
  it('parses dimensions and entity coordinates accurately', () => {
    const src = makeSyntheticLevel((g) => {
      g[9]![10] = '?';
      g[12]![14] = 'E';
      g[12]![16] = 'K';
      g[12]![12] = 'c';
    });
    const data = parseLevel(src);
    expect(data.widthTiles).toBe(30);
    expect(data.heightTiles).toBe(15);
    expect(data.spawn).toEqual({ col: 2, row: 12 });
    expect(data.flagpole).toEqual({ col: 27, row: 12 });
    expect(data.blocks).toContainEqual({ col: 10, row: 9, kind: 'question-gem' });
    expect(data.enemies).toContainEqual({ col: 14, row: 12, kind: 'blob' });
    expect(data.enemies).toContainEqual({ col: 16, row: 12, kind: 'shellbug' });
    expect(data.checkpoints).toContainEqual({ col: 12, row: 12 });
  });

  it('reports clear errors with level, row, and column when malformed', () => {
    expect(() =>
      parseLevel({
        ...makeSyntheticLevel(() => {}),
        rows: ['....'],
      }),
    ).toThrow(/1-1.*15 hàng/);

    expect(() =>
      parseLevel(
        makeSyntheticLevel((g) => {
          g[4]!.push('.');
        }),
      ),
    ).toThrow(/hàng 4/);

    expect(() =>
      parseLevel(
        makeSyntheticLevel((g) => {
          g[5]![7] = '@';
        }),
      ),
    ).toThrow(/hàng 5, cột 7.*"@"/);

    expect(() =>
      parseLevel(
        makeSyntheticLevel((g) => {
          g[12]![2] = '.';
        }),
      ),
    ).toThrow(/thiếu điểm xuất phát S/);

    expect(() =>
      parseLevel(
        makeSyntheticLevel((g) => {
          g[12]![8] = 'S';
        }),
      ),
    ).toThrow(/hàng 12, cột 8.*nhiều hơn một/);

    expect(() =>
      parseLevel(
        makeSyntheticLevel((g) => {
          g[12]![27] = '.';
        }),
      ),
    ).toThrow(/thiếu đích kết thúc/);
  });

  it('parses all game levels cleanly and meets entity/gem counts', () => {
    const d1 = parseLevel(level1_1);
    const d2 = parseLevel(level1_2);
    const d2b = parseLevel(level1_2_bonus);
    const d3 = parseLevel(level1_3);

    expect(d1.enemies.filter((e) => e.kind === 'blob').length).toBeGreaterThanOrEqual(8);
    expect(d1.enemies.filter((e) => e.kind === 'shellbug').length).toBeGreaterThanOrEqual(2);
    const gems1_1 =
      d1.gems.length +
      d1.blocks.filter((b) => b.kind === 'question-gem').length +
      d1.blocks.filter((b) => b.kind === 'multi-gem').length * 10;
    expect(gems1_1).toBeGreaterThanOrEqual(30);

    expect(d2.enemies.length).toBeGreaterThanOrEqual(12);
    const gems1_2 =
      d2.gems.length +
      d2b.gems.length +
      d2.blocks.filter((b) => b.kind === 'question-gem' || b.kind === 'multi-gem').length +
      d2b.blocks.filter((b) => b.kind === 'question-gem' || b.kind === 'multi-gem').length;
    expect(gems1_2).toBeGreaterThanOrEqual(50);

    expect(d3.firebars.length).toBe(3);
    expect(d3.boss).not.toBeNull();
  });
});

describe('Level Validator (BFS)', () => {
  it('validates all playable game levels are reachable from S to F/D', () => {
    for (const lvl of [level1_1, level1_2, level1_2_bonus, level1_3]) {
      const res = validateLevelReachability(lvl);
      expect(res.valid, `${lvl.id}: ${res.reason ?? ''}`).toBe(true);
    }
  });

  it('fails validation for an uncrossable 7-tile pit', () => {
    const unplayable = makeSyntheticLevel((g) => {
      for (let c = 10; c <= 16; c++) {
        g[13]![c] = '.';
        g[14]![c] = '.';
      }
    });
    const res = validateLevelReachability(unplayable);
    expect(res.valid).toBe(false);
  });
});
