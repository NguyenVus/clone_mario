import { LEVEL_ROWS, type LevelSource } from './legend';

function buildGrid(cols: number, edits: (grid: string[][]) => void): string[] {
  const grid: string[][] = Array.from({ length: LEVEL_ROWS }, () =>
    Array.from({ length: cols }, () => '.'),
  );
  edits(grid);
  return grid.map((r) => r.join(''));
}

function fillGround(grid: string[][], fromCol: number, toCol: number, topRow = 13): void {
  for (let c = fromCol; c <= toCol; c++) {
    for (let r = topRow; r < LEVEL_ROWS; r++) {
      grid[r]![c] = '#';
    }
  }
}

function fillLava(grid: string[][], fromCol: number, toCol: number): void {
  for (let c = fromCol; c <= toCol; c++) {
    grid[14]![c] = 'L';
  }
}

function putStr(grid: string[][], row: number, startCol: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    grid[row]![startCol + i] = text[i]!;
  }
}

const ROWS_1_3 = buildGrid(220, (g) => {
  // Fortress ceiling
  for (let c = 0; c < 220; c++) {
    g[0]![c] = '#';
    g[1]![c] = '#';
  }

  // Ground + lava segments
  fillGround(g, 0, 24);
  fillLava(g, 25, 39);
  fillGround(g, 40, 68);
  fillLava(g, 69, 85);
  fillGround(g, 86, 128);
  fillLava(g, 129, 149);
  fillGround(g, 150, 184);
  fillLava(g, 185, 191);
  fillGround(g, 192, 219); // Boss arena (cols 194..218)

  // Spawn & intro
  g[12]![3] = 'S';
  putStr(g, 9, 10, '?M?');
  g[12]![14] = 'E';
  g[12]![18] = 'K';

  // Lava pool 1 with bridge '=' and Firebar 1 'R'
  putStr(g, 12, 26, '====');
  g[11]![32] = 'R';
  putStr(g, 12, 34, '====');
  putStr(g, 9, 28, 'CCCC');

  // Narrow low-ceiling corridor (cols 42..66)
  for (let c = 42; c <= 66; c++) {
    for (let r = 2; r <= 6; r++) {
      g[r]![c] = '#';
    }
  }
  g[12]![48] = 'E';
  g[12]![54] = 'E';
  putStr(g, 9, 50, 'B?G?B');
  g[12]![62] = 'K';

  // Lava pool 2 with horizontal moving platform '^'
  g[12]![71] = '^';
  putStr(g, 9, 73, 'CCCC');
  g[11]![79] = 'X';
  g[11]![80] = 'X';
  g[12]![82] = '=';
  g[12]![83] = '=';

  // Checkpoint + Firebar 2 'R'
  g[12]![89] = 'c';
  putStr(g, 9, 93, 'B*B');
  g[9]![100] = 'R';
  putStr(g, 12, 97, 'XXXXXX');
  g[12]![106] = 'E';
  g[12]![110] = 'K';
  putStr(g, 9, 114, 'BBB');
  g[12]![118] = 'E';
  g[12]![122] = 'E';

  // Lava pool 3 with horizontal moving platform '^' & Firebar 3 'R'
  g[12]![131] = '^';
  g[10]![138] = 'R';
  putStr(g, 12, 141, '====');
  g[12]![147] = '=';
  g[12]![148] = '=';
  putStr(g, 9, 134, 'CCCCC');

  // Pre-boss corridor & mandatory M block before arena
  for (let c = 152; c <= 178; c++) {
    for (let r = 2; r <= 5; r++) {
      g[r]![c] = '#';
    }
  }
  g[12]![156] = 'E';
  g[12]![162] = 'K';
  g[9]![168] = '?';
  g[9]![170] = 'M';
  g[9]![172] = '?';
  putStr(g, 11, 176, 'CCCC');

  // Bridge into Boss Arena (cols 185..191)
  putStr(g, 12, 186, '=====');

  // Boss Arena (cols 194..218): 25 tiles wide, right wall at 219
  for (let r = 2; r <= 12; r++) {
    g[r]![219] = '#';
  }
  g[12]![210] = 'W'; // Magma King
  g[12]![216] = 'D'; // Castle Exit Door (locked until boss defeated)
});

export const level1_3: LevelSource = {
  id: '1-3',
  name: 'Magma Castle',
  theme: 'castle',
  timeLimit: 300,
  music: 'castle',
  edgeAwareEnemies: true,
  rows: ROWS_1_3,
};
