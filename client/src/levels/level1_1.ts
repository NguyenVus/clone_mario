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

function putPipe(grid: string[][], col: number, topRow: number, bottomRow = 12, enterable = false): void {
  grid[topRow]![col] = enterable ? 'p' : '[';
  grid[topRow]![col + 1] = ']';
  for (let r = topRow + 1; r <= bottomRow; r++) {
    grid[r]![col] = '{';
    grid[r]![col + 1] = '}';
  }
}

function putStr(grid: string[][], row: number, startCol: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    grid[row]![startCol + i] = text[i]!;
  }
}

const ROWS_1_1 = buildGrid(220, (g) => {
  // Ground segments with 2-tile pit (71..72), 3-tile pit (95..97), 2-tile pit (145..146)
  fillGround(g, 0, 70);
  fillGround(g, 73, 94);
  fillGround(g, 98, 144);
  fillGround(g, 147, 219);

  // Spawn & intro
  g[12]![3] = 'S';
  g[9]![14] = '?';
  g[12]![18] = 'E';

  // Early M block (col 24 < 30) & blocks
  putStr(g, 9, 22, 'B?M?B');
  g[5]![24] = '?';
  putStr(g, 7, 29, 'CCC');

  // 3 pipes of increasing height with Blobs in between
  putPipe(g, 36, 11);
  g[12]![41] = 'E';
  putPipe(g, 44, 10);
  g[12]![49] = 'E';
  g[12]![51] = 'E';
  putPipe(g, 54, 9);

  // Hidden 1UP & gems
  g[9]![63] = 'U';
  putStr(g, 11, 61, 'CCCC');

  // First pit (2 tiles at 71..72) + jump gems
  putStr(g, 10, 71, 'CC');

  // Multi-gem brick & Shellbug
  putStr(g, 9, 78, 'BGB');
  g[12]![82] = 'E';
  g[12]![88] = 'K';
  putStr(g, 8, 84, 'CCCC');

  // Second pit (3 tiles at 95..97)
  putStr(g, 9, 95, 'CCC');

  // Checkpoint + Nova Star
  g[12]![104] = 'c';
  putStr(g, 9, 108, 'B*B');
  g[12]![112] = 'E';
  g[12]![115] = 'E';

  // Elevated bricks & Shellbug
  putStr(g, 9, 120, 'BBBB');
  putStr(g, 5, 126, 'BB?B');
  putStr(g, 8, 120, 'CCCC');
  g[12]![124] = 'K';
  g[12]![132] = 'E';
  g[12]![135] = 'E';

  // Third pit (145..146) + powerup & multi-gem
  putStr(g, 10, 145, 'CC');
  putStr(g, 9, 150, '?M?');
  g[9]![156] = 'G';
  g[12]![155] = 'E';
  g[12]![159] = 'E';

  // Dual-tier brick bridge with gems and Shellbug
  putStr(g, 9, 164, 'BBBBBB');
  putStr(g, 8, 164, 'CCCCCC');
  g[12]![166] = 'K';
  g[12]![171] = 'E';
  g[12]![175] = 'E';
  putStr(g, 10, 178, 'CCC');

  // Pyramid stairs of X blocks (cols 186..193)
  for (let step = 0; step < 6; step++) {
    const h = step + 1;
    for (let y = 13 - h; y < 13; y++) {
      g[y]![186 + step] = 'X';
    }
  }
  for (let y = 7; y < 13; y++) {
    g[y]![192] = 'X';
  }

  // Flagpole & Castle exit
  g[12]![202] = 'F';
  g[12]![209] = 'D';
});

export const level1_1: LevelSource = {
  id: '1-1',
  name: 'Green Hills',
  theme: 'grass',
  timeLimit: 300,
  music: 'grass',
  rows: ROWS_1_1,
};
