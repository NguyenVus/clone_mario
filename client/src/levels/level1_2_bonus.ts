import { LEVEL_ROWS, type LevelSource } from './legend';

function buildGrid(cols: number, edits: (grid: string[][]) => void): string[] {
  const grid: string[][] = Array.from({ length: LEVEL_ROWS }, () =>
    Array.from({ length: cols }, () => '.'),
  );
  edits(grid);
  return grid.map((r) => r.join(''));
}

const ROWS_BONUS = buildGrid(25, (g) => {
  for (let c = 0; c < 25; c++) {
    g[0]![c] = '#';
    g[1]![c] = '#';
    g[13]![c] = '#';
    g[14]![c] = '#';
  }
  for (let r = 2; r < 13; r++) {
    g[r]![0] = '#';
    g[r]![24] = '#';
  }

  g[12]![2] = 'S';

  // Rows of gems + '?' blocks
  for (let c = 5; c <= 17; c++) {
    g[10]![c] = 'C';
    g[8]![c] = 'C';
    if (c >= 7 && c <= 15) {
      g[6]![c] = 'C';
    }
  }
  g[11]![6] = 'B';
  g[11]![7] = '?';
  g[11]![8] = 'G';
  g[11]![9] = '?';
  g[11]![10] = 'B';

  // Exit pipe back to 1-2
  g[11]![21] = 'p';
  g[11]![22] = ']';
  g[12]![21] = '{';
  g[12]![22] = '}';
});

export const level1_2_bonus: LevelSource = {
  id: '1-2-bonus',
  name: 'Secret Vault',
  theme: 'cave',
  timeLimit: 300,
  music: 'cave',
  isBonus: true,
  rows: ROWS_BONUS,
};
