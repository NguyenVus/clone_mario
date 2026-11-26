import { EXTRA_TILE_INDEX, getGroundTileIndex } from '../art/tileIndex';
import { LEVEL_ROWS, VALID_LEGEND_CHARS, type LevelSource, type LevelTheme, type MusicTrackId } from './legend';

export interface GridPos {
  col: number;
  row: number;
}

export type BlockKind =
  | 'question-gem'
  | 'question-powerup'
  | 'question-star'
  | 'hidden-1up'
  | 'multi-gem'
  | 'brick';

export interface BlockSpawn extends GridPos {
  kind: BlockKind;
}

export type EnemyKind = 'blob' | 'shellbug';

export interface EnemySpawn extends GridPos {
  kind: EnemyKind;
}

export interface PlatformSpawn extends GridPos {
  axis: 'horizontal' | 'vertical';
}

export interface FirebarSpawn extends GridPos {
  clockwise: boolean;
}

export type DecorationKind =
  | 'flower'
  | 'tallgrass'
  | 'bush'
  | 'mushroom'
  | 'crystal'
  | 'stalactite'
  | 'torch'
  | 'banner'
  | 'chain';

export interface DecorationSpawn extends GridPos {
  kind: DecorationKind;
}

export interface LevelData {
  id: LevelSource['id'];
  name: string;
  theme: LevelTheme;
  timeLimit: number;
  music: MusicTrackId;
  isBonus: boolean;
  edgeAwareEnemies: boolean;
  widthTiles: number;
  heightTiles: number;
  tileGrid: number[][];
  passThroughTiles: GridPos[];
  lavaTiles: GridPos[];
  blocks: BlockSpawn[];
  gems: GridPos[];
  enemies: EnemySpawn[];
  boss: GridPos | null;
  platforms: PlatformSpawn[];
  firebars: FirebarSpawn[];
  warpPipes: GridPos[];
  decorations: DecorationSpawn[];
  spawn: GridPos;
  checkpoints: GridPos[];
  flagpole: GridPos | null;
  door: GridPos | null;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number, col: number, row: number): number {
  let x = (seed ^ Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263)) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function generateDecorations(
  id: string,
  theme: LevelTheme,
  rows: readonly string[],
  widthTiles: number,
): DecorationSpawn[] {
  const seed = hashSeed(id);
  const decorations: DecorationSpawn[] = [];

  for (let c = 1; c < widthTiles - 1; c++) {
    for (let r = 1; r < LEVEL_ROWS - 1; r++) {
      const ch = rows[r]![c]!;
      const above = rows[r - 1]![c]!;
      const below = rows[r + 1]![c]!;
      const roll = seededRand(seed, c, r);

      if (theme === 'grass') {
        // Place on empty cell directly above ground '#'
        if (ch === '.' && below === '#') {
          if (roll < 0.08 && c + 1 < widthTiles - 1 && rows[r]![c + 1] === '.' && rows[r + 1]![c + 1] === '#') {
            decorations.push({ col: c, row: r, kind: 'bush' });
          } else if (roll < 0.17) {
            decorations.push({ col: c, row: r, kind: 'flower' });
          } else if (roll < 0.28) {
            decorations.push({ col: c, row: r, kind: 'tallgrass' });
          }
        }
      } else if (theme === 'cave') {
        if (ch === '.' && above === '#' && r <= 4 && roll < 0.18) {
          decorations.push({ col: c, row: r, kind: 'stalactite' });
        } else if (ch === '.' && below === '#') {
          if (roll < 0.1) {
            decorations.push({ col: c, row: r, kind: 'mushroom' });
          } else if (roll < 0.17) {
            decorations.push({ col: c, row: r, kind: 'crystal' });
          }
        }
      } else if (theme === 'castle') {
        if (ch === '.' && above === '#' && r <= 7) {
          if (roll < 0.06 && r + 1 < 12 && rows[r + 1]![c] === '.') {
            decorations.push({ col: c, row: r, kind: 'chain' });
          } else if (roll < 0.11 && r + 1 < 12 && rows[r + 1]![c] === '.') {
            decorations.push({ col: c, row: r, kind: 'banner' });
          }
        } else if (ch === '.' && r >= 8 && r <= 10 && roll < 0.085) {
          decorations.push({ col: c, row: r, kind: 'torch' });
        }
      }
    }
  }

  return decorations;
}

export function parseLevel(source: LevelSource): LevelData {
  const { id, rows, theme } = source;
  if (rows.length !== LEVEL_ROWS) {
    throw new Error(`Màn ${id}: phải có đúng ${LEVEL_ROWS} hàng (nhận được ${rows.length} hàng).`);
  }

  const widthTiles = rows[0]?.length ?? 0;
  if (widthTiles === 0) {
    throw new Error(`Màn ${id}: hàng 0 không được rỗng.`);
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? '';
    if (row.length !== widthTiles) {
      throw new Error(
        `Màn ${id}, hàng ${r}: độ dài không khớp (kỳ vọng ${widthTiles}, nhận được ${row.length}).`,
      );
    }
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]!;
      if (!VALID_LEGEND_CHARS.has(ch)) {
        throw new Error(`Màn ${id}, hàng ${r}, cột ${c}: ký tự lạ "${ch}".`);
      }
    }
  }

  const tileGrid: number[][] = Array.from({ length: LEVEL_ROWS }, () =>
    Array.from({ length: widthTiles }, () => 0),
  );
  const passThroughTiles: GridPos[] = [];
  const lavaTiles: GridPos[] = [];
  const blocks: BlockSpawn[] = [];
  const gems: GridPos[] = [];
  const enemies: EnemySpawn[] = [];
  let boss: GridPos | null = null;
  const platforms: PlatformSpawn[] = [];
  const firebars: FirebarSpawn[] = [];
  const warpPipes: GridPos[] = [];
  let spawn: GridPos | null = null;
  const checkpoints: GridPos[] = [];
  let flagpole: GridPos | null = null;
  let door: GridPos | null = null;

  let firebarIndex = 0;

  for (let r = 0; r < LEVEL_ROWS; r++) {
    const row = rows[r]!;
    for (let c = 0; c < widthTiles; c++) {
      const ch = row[c]!;
      switch (ch) {
        case '#':
          tileGrid[r]![c] = getGroundTileIndex(rows, r, c, theme);
          break;
        case 'X':
          tileGrid[r]![c] = EXTRA_TILE_INDEX.HARD_BLOCK;
          break;
        case '[':
          tileGrid[r]![c] = EXTRA_TILE_INDEX.PIPE_TOP_L;
          break;
        case ']':
          tileGrid[r]![c] = EXTRA_TILE_INDEX.PIPE_TOP_R;
          break;
        case '{':
          tileGrid[r]![c] = EXTRA_TILE_INDEX.PIPE_BODY_L;
          break;
        case '}':
          tileGrid[r]![c] = EXTRA_TILE_INDEX.PIPE_BODY_R;
          break;
        case 'p':
          tileGrid[r]![c] = EXTRA_TILE_INDEX.PIPE_TOP_L;
          warpPipes.push({ col: c, row: r });
          break;
        case 'R':
          tileGrid[r]![c] = EXTRA_TILE_INDEX.HARD_BLOCK;
          firebars.push({ col: c, row: r, clockwise: firebarIndex % 2 === 0 });
          firebarIndex++;
          break;
        case '=':
          passThroughTiles.push({ col: c, row: r });
          break;
        case 'L':
          lavaTiles.push({ col: c, row: r });
          break;
        case '?':
          blocks.push({ col: c, row: r, kind: 'question-gem' });
          break;
        case 'M':
          blocks.push({ col: c, row: r, kind: 'question-powerup' });
          break;
        case '*':
          blocks.push({ col: c, row: r, kind: 'question-star' });
          break;
        case 'U':
          blocks.push({ col: c, row: r, kind: 'hidden-1up' });
          break;
        case 'G':
          blocks.push({ col: c, row: r, kind: 'multi-gem' });
          break;
        case 'B':
          blocks.push({ col: c, row: r, kind: 'brick' });
          break;
        case 'C':
          gems.push({ col: c, row: r });
          break;
        case 'E':
          enemies.push({ col: c, row: r, kind: 'blob' });
          break;
        case 'K':
          enemies.push({ col: c, row: r, kind: 'shellbug' });
          break;
        case 'W':
          boss = { col: c, row: r };
          break;
        case '^':
          platforms.push({ col: c, row: r, axis: 'horizontal' });
          break;
        case 'v':
          platforms.push({ col: c, row: r, axis: 'vertical' });
          break;
        case 'S':
          if (spawn !== null) {
            throw new Error(`Màn ${id}, hàng ${r}, cột ${c}: có nhiều hơn một điểm xuất phát S.`);
          }
          spawn = { col: c, row: r };
          break;
        case 'c':
          checkpoints.push({ col: c, row: r });
          break;
        case 'F':
          flagpole = { col: c, row: r };
          break;
        case 'D':
          door = { col: c, row: r };
          break;
        case '.':
        default:
          break;
      }
    }
  }

  if (spawn === null) {
    throw new Error(`Màn ${id}: thiếu điểm xuất phát S.`);
  }

  const isBonus = Boolean(source.isBonus);
  if (flagpole === null && door === null && !(isBonus && warpPipes.length > 0)) {
    throw new Error(`Màn ${id}: thiếu đích kết thúc F hoặc D.`);
  }

  const decorations = generateDecorations(id, theme, rows, widthTiles);

  return {
    id,
    name: source.name,
    theme,
    timeLimit: source.timeLimit,
    music: source.music,
    isBonus,
    edgeAwareEnemies: Boolean(source.edgeAwareEnemies),
    widthTiles,
    heightTiles: LEVEL_ROWS,
    tileGrid,
    passThroughTiles,
    lavaTiles,
    blocks,
    gems,
    enemies,
    boss,
    platforms,
    firebars,
    warpPipes,
    decorations,
    spawn,
    checkpoints,
    flagpole,
    door,
  };
}
