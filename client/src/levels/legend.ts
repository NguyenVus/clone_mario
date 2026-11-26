import type { LevelId } from '@pixel-hero/shared';

export type LevelTheme = 'grass' | 'cave' | 'castle';
export type MusicTrackId = 'grass' | 'cave' | 'castle' | 'star';

export interface LevelSource {
  id: LevelId | '1-2-bonus';
  name: string;
  theme: LevelTheme;
  timeLimit: number;
  music: MusicTrackId;
  isBonus?: boolean;
  edgeAwareEnemies?: boolean;
  rows: readonly string[];
}

export const LEVEL_ROWS = 15;

export const VALID_LEGEND_CHARS = new Set<string>([
  '.', // empty
  '#', // ground (top or fill auto)
  'X', // indestructible hard block
  'B', // breakable brick
  '?', // question block (gem)
  'M', // question block (power-up: PowerCell / FlameCore)
  '*', // question block (Nova Star)
  'U', // hidden 1UP block
  'G', // multi-gem brick
  'C', // floating gem
  '[', // pipe top-left
  ']', // pipe top-right
  '{', // pipe body-left
  '}', // pipe body-right
  'p', // enterable pipe top-left (warp)
  'L', // lava
  '=', // bridge (one-way pass-through)
  '^', // moving platform horizontal
  'v', // moving platform vertical
  'R', // firebar anchor block
  'E', // Blob
  'K', // Shellbug
  'W', // Magma King
  'S', // Spawn point
  'c', // Checkpoint
  'F', // Flagpole base
  'D', // Castle exit door
]);
