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

const ROWS_1_2 = buildGrid(220, (g) => {
  // Underground ceiling (rows 0..1) up to col 185, leaving open sky near end
  for (let c = 0; c <= 185; c++) {
    g[0]![c] = '#';
    if (c < 38 || (c > 85 && c < 130) || c > 142) {
      g[1]![c] = '#';
    }
  }

  // Ground segments with pits
  fillGround(g, 0, 58);
  fillGround(g, 61, 102);
  fillGround(g, 106, 146);
  // Deep pit cols 147..155 bridged by vertical moving platform 'v'
  fillGround(g, 156, 219);

  // Entry
  g[12]![3] = 'S';
  putStr(g, 9, 12, '?M?B?');
  g[12]![16] = 'E';
  g[12]![18] = 'E';

  // Stepped blocks & Shellbug for shell-bowling into Blob pack
  putStr(g, 10, 24, 'BBBB');
  g[9]![25] = 'K';
  g[12]![29] = 'E';
  g[12]![31] = 'E';
  g[12]![33] = 'E';
  putStr(g, 8, 29, 'CCCCC');

  // Thick breakable brick wall + upper ceiling shortcut (cols 38..84)
  // Stepping blocks (cols 35..37) so Pip can also climb up to the upper shortcut
  putStr(g, 10, 35, 'XX');
  putStr(g, 7, 36, 'XX');
  for (let r = 6; r <= 12; r++) {
    g[r]![38] = 'B';
    g[r]![39] = 'B';
  }
  putStr(g, 5, 40, 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
  putStr(g, 4, 45, 'CCCCCCCCCCCCCCCCCCCC');
  putStr(g, 9, 44, 'B?G?B');
  g[12]![46] = 'E';
  g[12]![48] = 'E';
  g[12]![53] = 'K';

  // Pit 1 (cols 59..60)
  putStr(g, 10, 59, 'CC');

  // Checkpoint + Bonus warp pipe 'p' at col 74
  g[12]![64] = 'c';
  putStr(g, 9, 66, 'B*B');
  putPipe(g, 74, 11, 12, true);

  // Pack of Blobs + gems
  g[12]![80] = 'E';
  g[12]![82] = 'E';
  g[12]![84] = 'E';
  putStr(g, 9, 80, 'CCCCC');

  // Elevated platforms with Shellbug & bricks
  putStr(g, 10, 90, 'XXXXXX');
  g[9]![92] = 'K';
  g[9]![95] = 'M';
  putStr(g, 8, 91, 'CCCC');

  // Pit 2 (cols 103..105) with bridge '='
  putStr(g, 12, 103, '===');
  putStr(g, 10, 103, 'CCC');

  // Return pipe from bonus room around col 126
  g[12]![112] = 'E';
  g[12]![114] = 'E';
  putStr(g, 9, 110, 'B?B?B');
  g[9]![120] = 'U';
  putPipe(g, 126, 10, 12, false);

  // Upper shortcut drop + Shellbug
  putStr(g, 9, 134, 'BBBBBB');
  g[8]![136] = 'K';
  g[12]![138] = 'E';
  g[12]![140] = 'E';

  // Deep pit (cols 147..155) with vertical moving platform 'v'
  g[11]![149] = 'v';
  putStr(g, 8, 148, 'CCCCC');
  g[10]![153] = '=';
  g[10]![154] = '=';

  // Final underground stretch & exit pipe up to surface
  putStr(g, 9, 162, '?M?');
  g[12]![164] = 'E';
  g[12]![166] = 'E';
  g[12]![170] = 'K';
  putStr(g, 8, 174, 'CCCCCC');

  // Ascending blocks to exit pipe
  for (let step = 0; step < 4; step++) {
    for (let y = 12 - step; y <= 12; y++) {
      g[y]![182 + step] = 'X';
    }
  }
  putPipe(g, 188, 10, 12, false);

  // Surface flagpole & castle door
  g[12]![202] = 'F';
  g[12]![209] = 'D';
});

export const level1_2: LevelSource = {
  id: '1-2',
  name: 'Underground',
  theme: 'cave',
  timeLimit: 300,
  music: 'cave',
  rows: ROWS_1_2,
};
