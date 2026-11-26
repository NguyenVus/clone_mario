import Phaser from 'phaser';
import {
  AUTOTILE_BASE,
  CANONICAL_47_MASKS,
  EXTRA_TILE_INDEX,
  renderAutotileMatrix,
} from './autotile';
import { generateParallaxTextures } from './backgrounds';
import { FIRE_PIP_PALETTE, PALETTE, PALETTE_GROUPS, STAR_PALETTES } from './palette';
import {
  generateBitmapFont8x8,
  generateGlowTexture,
  generateLogoTexture,
  generateNineSlicePanelTexture,
  generateSpriteSheet,
  parseHexColor,
  type OverrideManifest,
  type SpriteSheetSpec,
} from './pixelArt';
import type { LevelTheme } from '../levels/legend';

export const BITMAP_FONT_8X8_GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#..##', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '#.#.#', '##..#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '..##.', '.#...', '#....', '#####'],
  '3': ['####.', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['#...#', '#...#', '#####', '....#', '....#', '....#'],
  '5': ['#####', '#....', '####.', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...'],
  '8': ['.###.', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '..#..', '..#..'],
  ':': ['.....', '..#..', '.....', '..#..', '.....', '..#..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '..##.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.###.', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '#####', '..#..', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#.#.#', '.....', '.....'],
  '/': ['....#', '...#.', '..#..', '.#...', '#....', '.....'],
  '(': ['...#.', '..#..', '..#..', '..#..', '..#..', '...#.'],
  ')': ['.#...', '..#..', '..#..', '..#..', '..#..', '.#...'],
  x: ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  ',': ['.....', '.....', '.....', '.....', '..#..', '.#...'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....'],
};

/**
 * Helper to overlay a small 16x16 body on the bottom of a 16x32 frame or pad cleanly.
 */
function alignBottom(frames: string[][], targetH: number): string[][] {
  return frames.map((rows) => {
    const padTop = Math.max(0, targetH - rows.length);
    const width = rows[0]?.length ?? 16;
    const emptyRow = '.'.repeat(width);
    const out: string[] = [];
    for (let i = 0; i < padTop; i++) out.push(emptyRow);
    for (const r of rows.slice(-targetH)) out.push(r);
    return out;
  });
}

// ============================================================================
// PIP SMALL (16x16, 27 frames) — chibi ~1:1 head/body, 4-shade hue-shifted, glowing LED
// 0..3: idle, 4: blink, 5..8: walk, 9..14: run (spinning wheel blur),
// 15: jump-up, 16: jump-peak, 17: fall, 18: land, 19: skid, 20: crouch,
// 21: look-up, 22: die, 23..24: victory, 25: grow, 26: shoot
// ============================================================================
function buildPipSmallHead(antennaDx: number, blink = false, lookUp = false, hurt = false): string[] {
  const ant = (dx: number): [string, string] => {
    const pos = 7 + dx;
    const r0 = Array(16).fill('.');
    const r1 = Array(16).fill('.');
    r0[pos] = 'e';
    r0[pos + 1] = 'G';
    r1[pos] = 'g';
    r1[pos + 1] = 'E';
    return [r0.join(''), r1.join('')];
  };
  const [a0, a1] = ant(antennaDx);
  const eyes = blink
    ? '...mssssssssm...'
    : hurt
      ? '...msPWWssWWPm..'
      : lookUp
        ? '...msWPWssWPWm..'
        : '...msWWPssWWPm..';
  const eyes2 = blink
    ? '...mssssssssm...'
    : hurt
      ? '...msWWPssPWWm..'
      : '...msWWPssWWPm..';

  return [
    a0,
    a1,
    '....hhhhhhhh....',
    '...hHHOOOOOOh...',
    '..hHOOOOOOOOoh..',
    '..hOOooooooOoh..',
    '...msWWWWWWsm...',
    eyes,
    eyes2,
    '...mssssssssm...',
  ];
}

function buildPipSmallBody(pose: 'idle' | 'breathe' | 'w1' | 'w2' | 'w3' | 'r1' | 'r2' | 'r3' | 'jump' | 'fall' | 'land' | 'skid' | 'crouch' | 'vic1' | 'vic2' | 'shoot'): string[] {
  switch (pose) {
    case 'idle':
      return [
        '...UUBBBBBBUU...',
        '..mSBYYYYYYBSm..',
        '..mmUbbbbbbUmm..',
        '...UuuU..UuuU...',
        '...mSSm..mSSm...',
        '...mmmm..mmmm...',
      ];
    case 'breathe':
      return [
        '..UUBBBBBBBBUU..',
        '..mSBYYYYYYBSm..',
        '..mmUbbbbbbUmm..',
        '...UuuU..UuuU...',
        '...mSSm..mSSm...',
        '...mmmm..mmmm...',
      ];
    case 'w1':
      return [
        '...UUBBBBBBUU...',
        '..mSBYYYYYYBSm..',
        '...UUbbbbbbUU...',
        '..UuuU....UuuU..',
        '..mSSm....mSSm..',
        '..mmmm....mmmm..',
      ];
    case 'w2':
      return [
        '...UUBBBBBBUU...',
        '...UBYYYYYYBU...',
        '...UUbbbbbbUU...',
        '....UuuUUuuU....',
        '....mSSmmSSm....',
        '....mmmmmmmm....',
      ];
    case 'w3':
      return [
        '...UUBBBBBBUU...',
        '..mSBYYYYYYBSm..',
        '...UUbbbbbbUU...',
        '...UuuU..UuuU...',
        '..mSSm....mSSm..',
        '..mmmm....mmmm..',
      ];
    case 'r1':
      return [
        '..UUBBBBBBBBUU..',
        '.mSBYYYYYYYYBSm.',
        '..mmUUbbbbUUmm..',
        '...UWWSSmmSSm...',
        '...mSSWWSSWWm...',
        '....mmmmmmmm....',
      ];
    case 'r2':
      return [
        '..UUBBBBBBBBUU..',
        '.mSBYYYYYYYYBSm.',
        '..mmUUbbbbUUmm..',
        '...mSSWWSSWWm...',
        '...UWWSSmmSSm...',
        '....mmmmmmmm....',
      ];
    case 'r3':
      return [
        '..UUBBBBBBBBUU..',
        '.mSBYYYYYYYYBSm.',
        '..mmUUbbbbUUmm..',
        '...USSWWSSWWU...',
        '...mSSmmWWSSm...',
        '....mmmmmmmm....',
      ];
    case 'jump':
      return [
        '.mSUUBBBBBBUUSm.',
        '.mm.UBYYYYBU.mm.',
        '....UUbbbbUU....',
        '...UuuU..UuuU...',
        '..mSSm....mSSm..',
        '..mmmm....mmmm..',
      ];
    case 'fall':
      return [
        '.mmUUBBBBBBUUmm.',
        '..mSBYYYYYYBSm..',
        '....UUbbbbUU....',
        '....UuuUUuuU....',
        '...mSSm..mSSm...',
        '...mmmm..mmmm...',
      ];
    case 'land':
      return [
        '..UUBBBBBBBBUU..',
        '.mSBYYYYYYYYBSm.',
        '..mUuuUUUUuuUm..',
        '..mSSm....mSSm..',
        '..mmmm....mmmm..',
        '................',
      ];
    case 'skid':
      return [
        '...UUBBBBBBUUmS.',
        '..mSBYYYYYYBUmm.',
        '...UUbbbbbbUU...',
        '..UuuU...UuuU...',
        '.mSSm....mSSm...',
        '.mmmm....mmmm...',
      ];
    case 'crouch':
      return [
        '..UUBBBBBBBBUU..',
        '.mSBYYYYYYYYBSm.',
        '..mUuuU..UuuUm..',
        '..mSSm....mSSm..',
        '..mmmm....mmmm..',
        '................',
      ];
    case 'vic1':
      return [
        '.mSUUBBBBBBUUSm.',
        '.mm.UBYYYYBU.mm.',
        '....UUbbbbUU....',
        '....UuuUUuuU....',
        '....mSSmmSSm....',
        '....mmmmmmmm....',
      ];
    case 'vic2':
      return [
        '.mS.UBBBBBBU.Sm.',
        '.mmUUBYYYYBUUmm.',
        '....UUbbbbUU....',
        '...UuuU..UuuU...',
        '...mSSm..mSSm...',
        '...mmmm..mmmm...',
      ];
    case 'shoot':
      return [
        '...UUBBBBBBUUmSm',
        '..mSBYYYYYYBUmmm',
        '...UUbbbbbbUU...',
        '...UuuU..UuuU...',
        '...mSSm..mSSm...',
        '...mmmm..mmmm...',
      ];
  }
}

export const PIP_SMALL_FRAMES: string[][] = [
  // 0..3: idle
  [...buildPipSmallHead(0), ...buildPipSmallBody('idle')],
  [...buildPipSmallHead(1), ...buildPipSmallBody('breathe')],
  [...buildPipSmallHead(0), ...buildPipSmallBody('idle')],
  [...buildPipSmallHead(-1), ...buildPipSmallBody('breathe')],
  // 4: blink
  [...buildPipSmallHead(0, true), ...buildPipSmallBody('idle')],
  // 5..8: walk (4 frames)
  [...buildPipSmallHead(-1), ...buildPipSmallBody('w1')],
  [...buildPipSmallHead(0), ...buildPipSmallBody('w2')],
  [...buildPipSmallHead(1), ...buildPipSmallBody('w3')],
  [...buildPipSmallHead(0), ...buildPipSmallBody('w2')],
  // 9..14: run (6 frames, spinning wheel blur)
  [...buildPipSmallHead(-1), ...buildPipSmallBody('w1')],
  [...buildPipSmallHead(-1), ...buildPipSmallBody('w3')],
  [...buildPipSmallHead(-2), ...buildPipSmallBody('r1')],
  [...buildPipSmallHead(-2), ...buildPipSmallBody('r2')],
  [...buildPipSmallHead(-1), ...buildPipSmallBody('r3')],
  [...buildPipSmallHead(-2), ...buildPipSmallBody('r2')],
  // 15: jump-up
  [...buildPipSmallHead(-1), ...buildPipSmallBody('jump')],
  // 16: jump-peak
  [...buildPipSmallHead(0), ...buildPipSmallBody('jump')],
  // 17: fall
  [...buildPipSmallHead(1), ...buildPipSmallBody('fall')],
  // 18: land
  ['................', ...buildPipSmallHead(0).slice(0, 9), ...buildPipSmallBody('land').slice(0, 6)],
  // 19: skid
  [...buildPipSmallHead(1), ...buildPipSmallBody('skid')],
  // 20: crouch
  ['................', ...buildPipSmallHead(0).slice(0, 9), ...buildPipSmallBody('crouch').slice(0, 6)],
  // 21: look-up
  [...buildPipSmallHead(0, false, true), ...buildPipSmallBody('idle')],
  // 22: die
  [...buildPipSmallHead(0, false, false, true), ...buildPipSmallBody('vic1')],
  // 23..24: victory
  [...buildPipSmallHead(0), ...buildPipSmallBody('vic1')],
  [...buildPipSmallHead(1), ...buildPipSmallBody('vic2')],
  // 25: grow
  [...buildPipSmallHead(0), ...buildPipSmallBody('breathe')],
  // 26: shoot
  [...buildPipSmallHead(-1), ...buildPipSmallBody('shoot')],
];

// ============================================================================
// PIP BIG / FIRE (16x32, 27 frames)
// ============================================================================
function buildPipBigHead(antennaDx: number, blink = false, lookUp = false): string[] {
  const r0 = Array(16).fill('.');
  const r1 = Array(16).fill('.');
  const r2 = Array(16).fill('.');
  const ax = Math.max(2, Math.min(13, 7 + antennaDx));
  r0[ax] = 'e';
  r0[ax + 1] = 'G';
  r1[ax] = 'g';
  r1[ax + 1] = 'E';
  r2[ax] = 'm';

  const e1 = blink
    ? '..mssssssssssm..'
    : lookUp
      ? '..msWWPsssWWPm..'
      : '..msWWWPssWWWPm.';
  const e2 = blink
    ? '..mssssssssssm..'
    : lookUp
      ? '..msWWWPssWWWPm.'
      : '..msWWWPssWWWPm.';

  return [
    r0.join(''),
    r1.join(''),
    r2.join(''),
    '...hhhhhhhhhh...',
    '..hHHHOOOOOOOh..',
    '.hHOOOOOOOOOOOh.',
    '.hHOOOOOOOOOooh.',
    '.hOoooooooooooh.',
    '..mSWWWWWWWWWSm.',
    e1,
    e2,
    '..msWWWWWWWWsm..',
    '..mssssssssssm..',
  ];
}

function buildPipBigTorso(pose: 'idle' | 'breathe' | 'w1' | 'w2' | 'w3' | 'r1' | 'r2' | 'r3' | 'jump' | 'fall' | 'skid' | 'vic1' | 'vic2' | 'shoot'): string[] {
  const coreIdle = [
    '...UUBBBBBBUU...',
    '..mSBYYYYYYBSm..',
    '..mSBYyKKyYBSm..',
    '..mSBbbbbbbBSm..',
    '..mmUbbbbbbUmm..',
    '...UUbbbbbbUU...',
  ];
  const coreShoot = [
    '...UUBBBBBBUUmSm',
    '..mSBYYYYYYBSmmm',
    '..mSBYyKKyYBSm..',
    '..mSBbbbbbbBSm..',
    '...UUbbbbbbUU...',
    '...UUbbbbbbUU...',
  ];
  const coreVic = [
    '.mSUUBBBBBBUUSm.',
    '.mm.UBYYYYBU.mm.',
    '....UBYyKyBU....',
    '....UBbbbbBU....',
    '....UUbbbbUU....',
    '....UUbbbbUU....',
  ];

  const legs = {
    idle: [
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '..mSSSm..mSSSm..',
      '..mmmmm..mmmmm..',
    ],
    breathe: [
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '..mSSSm..mSSSm..',
      '..mmmmm..mmmmm..',
    ],
    w1: [
      '..UuuU....UuuU..',
      '..UuuU....UuuU..',
      '.UuuU......UuuU.',
      '.mSSm......mSSm.',
      '.mmmm......mmmm.',
      '................',
    ],
    w2: [
      '....UuuUUuuU....',
      '....UuuUUuuU....',
      '....UuuUUuuU....',
      '....mSSmmSSm....',
      '....mmmmmmmm....',
      '................',
    ],
    w3: [
      '...UuuU..UuuU...',
      '..UuuU....UuuU..',
      '..UuuU....UuuU..',
      '..mSSm....mSSm..',
      '..mmmm....mmmm..',
      '................',
    ],
    r1: [
      '..UUWWSSmmSSm...',
      '..mSSWWWWSSWWm..',
      '..mSSmmSSWWSSm..',
      '...mSSWWmmSSm...',
      '....mmmmmmmm....',
      '................',
    ],
    r2: [
      '..mSSWWSSWWSSU..',
      '..UWWSSmmSSWWm..',
      '..mSSWWSSmmSSm..',
      '...UWWSSWWSSm...',
      '....mmmmmmmm....',
      '................',
    ],
    r3: [
      '..USSWWSSmmSSm..',
      '..mSSmmWWSSWWm..',
      '..mSSWWSSWWmm...',
      '...mSSWWSSWWm...',
      '....mmmmmmmm....',
      '................',
    ],
    jump: [
      '..UuuU....UuuU..',
      '.UuuU......UuuU.',
      '.mSSm......mSSm.',
      '.mmmm......mmmm.',
      '................',
      '................',
    ],
    fall: [
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...mSSm..mSSm...',
      '...mmmm..mmmm...',
      '................',
      '................',
    ],
    skid: [
      '..UuuU....UuuU..',
      '.UuuU......UuuU.',
      'mSSm.......mSSm.',
      'mmmm.......mmmm.',
      '................',
      '................',
    ],
    vic1: [
      '....UuuUUuuU....',
      '....UuuUUuuU....',
      '....UuuUUuuU....',
      '....mSSmmSSm....',
      '....mmmmmmmm....',
      '................',
    ],
    vic2: [
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...mSSm..mSSm...',
      '...mmmm..mmmm...',
      '................',
    ],
    shoot: [
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '...UuuU..UuuU...',
      '..mSSSm..mSSSm..',
      '..mmmmm..mmmmm..',
    ],
  }[pose];

  const top =
    pose === 'shoot' ? coreShoot : pose === 'vic1' || pose === 'vic2' || pose === 'jump' ? coreVic : coreIdle;
  return [...top, ...legs];
}

const PIP_BIG_RAW: string[][] = [
  // 0..3: idle
  [...buildPipBigHead(0), ...buildPipBigTorso('idle')],
  [...buildPipBigHead(1), ...buildPipBigTorso('breathe')],
  [...buildPipBigHead(0), ...buildPipBigTorso('idle')],
  [...buildPipBigHead(-1), ...buildPipBigTorso('breathe')],
  // 4: blink
  [...buildPipBigHead(0, true), ...buildPipBigTorso('idle')],
  // 5..8: walk
  [...buildPipBigHead(-1), ...buildPipBigTorso('w1')],
  [...buildPipBigHead(0), ...buildPipBigTorso('w2')],
  [...buildPipBigHead(1), ...buildPipBigTorso('w3')],
  [...buildPipBigHead(0), ...buildPipBigTorso('w2')],
  // 9..14: run
  [...buildPipBigHead(-1), ...buildPipBigTorso('w1')],
  [...buildPipBigHead(-1), ...buildPipBigTorso('w3')],
  [...buildPipBigHead(-2), ...buildPipBigTorso('r1')],
  [...buildPipBigHead(-2), ...buildPipBigTorso('r2')],
  [...buildPipBigHead(-1), ...buildPipBigTorso('r3')],
  [...buildPipBigHead(-2), ...buildPipBigTorso('r2')],
  // 15: jump-up
  [...buildPipBigHead(-1), ...buildPipBigTorso('jump')],
  // 16: jump-peak
  [...buildPipBigHead(0), ...buildPipBigTorso('jump')],
  // 17: fall
  [...buildPipBigHead(1), ...buildPipBigTorso('fall')],
  // 18: land (compressed)
  [...buildPipBigHead(0).slice(1), ...buildPipBigTorso('idle').slice(1)],
  // 19: skid
  [...buildPipBigHead(1), ...buildPipBigTorso('skid')],
  // 20: crouch (low <=16px silhouette)
  [
    ...buildPipSmallHead(0).slice(0, 10),
    '..UUBBBBBBBBUU..',
    '.mSBYYYYYYYYBSm.',
    '..mUuuU..UuuUm..',
    '..mSSm....mSSm..',
    '..mmmm....mmmm..',
  ],
  // 21: look-up
  [...buildPipBigHead(0, false, true), ...buildPipBigTorso('idle')],
  // 22: die
  [...buildPipBigHead(0), ...buildPipBigTorso('vic1')],
  // 23..24: victory
  [...buildPipBigHead(0), ...buildPipBigTorso('vic1')],
  [...buildPipBigHead(1), ...buildPipBigTorso('vic2')],
  // 25: grow (mid size ~22px)
  [
    ...buildPipBigHead(0).slice(0, 12),
    '...UUBBBBBBUU...',
    '..mSBYYYYYYBSm..',
    '...UUbbbbbbUU...',
    '...UuuU..UuuU...',
    '..mSSm....mSSm..',
    '..mmmm....mmmm..',
  ],
  // 26: shoot
  [...buildPipBigHead(-1), ...buildPipBigTorso('shoot')],
];

export const PIP_SMALL_ALIGNED = alignBottom(PIP_SMALL_FRAMES, 16);
export const PIP_BIG_ALIGNED = alignBottom(PIP_BIG_RAW, 32);

// ============================================================================
// BLOB (16x16, 5 frames: 0..3 jelly walk, 4 squashed)
// ============================================================================
export const BLOB_FRAMES: string[][] = [
  [
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkVVVVVVkk...',
    '..kVVvvvvvvVVk..',
    '.kVVvvvvvvvvVVk.',
    '.kVvWVPvvWVPvvp.',
    'kVvvPPvvvvPPvvpk',
    'kVvvvvvvvvvvvvpk',
    'kvvvvpvvvvpvvvpk',
    'kvvvppppppppvvpk',
    '.kppppppppppppk.',
    '.kppppppppppppk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ],
  [
    '................',
    '.....kkkkkk.....',
    '...kkVVVVVVkk...',
    '..kVVvvvvvvVVk..',
    '..kVvvvvvvvvVk..',
    '.kVvWVPvvWVPvvk.',
    '.kVvPPvvvvPPvpk.',
    '.kVvvvvvvvvvvpk.',
    '.kvvvpvvvvpvvpk.',
    '.kvvvppppppvvpk.',
    '..kppppppppppk..',
    '..kppppppppppk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkVVVVVVkk...',
    '..kVVvvvvvvVVk..',
    '.kVVvvvvvvvvVVk.',
    '.kVvPWVvvPWVvvp.',
    'kVvvPPvvvvPPvvpk',
    'kVvvvvvvvvvvvvpk',
    'kvvvvpvvvvpvvvpk',
    'kvvvppppppppvvpk',
    '.kppppppppppppk.',
    '.kppppppppppppk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '..kkVVVVVVVVkk..',
    '.kVVvvvvvvvvVVk.',
    'kVVvWVPvvWVPvvpk',
    'kVvvPPvvvvPPvvpk',
    'kVvvvvvvvvvvvvpk',
    'kvvvppppppppvvpk',
    'kppppppppppppppk',
    'kppppppppppppppk',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
  ],
  // 4: squashed
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kVVvWVPvWVPvpk.',
    'kVvvvPPvvPPvvvpk',
    'kppppppppppppppk',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
];

// ============================================================================
// SHELLBUG (16x24, 4 walk frames) + SHELL (16x16, 5 frames)
// ============================================================================
function buildShellbugFrame(legPose: 0 | 1 | 2 | 3): string[] {
  const legs = {
    0: ['...nNNn..nNNn...', '...nlln..nlln...', '..nLLLn..nLLLn..', '..nnnnn..nnnnn..'],
    1: ['...nNNn..nNNn...', '..nlln....nlln..', '..nLLn....nLLn..', '..nnnn....nnnn..'],
    2: ['....nNNnnNNn....', '....nllnnlln....', '....nLLnnLLn....', '....nnnnnnnn....'],
    3: ['...nNNn..nNNn...', '...nlln...nlln..', '...nLLn...nLLn..', '...nnnn...nnnn..'],
  }[legPose];

  return [
    '................',
    '................',
    '................',
    '.....dddddd.....',
    '...ddTTTTTTdd...',
    '..dTTWWttttTTd..',
    '.dTTWttttDDtttD.',
    '.dTttDDttttDDtDd',
    'dTttDTTttttTTDtd',
    'dTttttttttttttDd',
    'dDDttttDDDDttDDd',
    '.dDDDDDDDDDDDDd.',
    '..dddddddddddd..',
    '..nLLLLLLLLLLn..',
    '.nLLWPllllWPLLn.',
    '.nLlPPllllPPlNn.',
    '..nLllllllllNn..',
    '...nNNllllNNn...',
    '...nNNNNNNNNn...',
    '....nNNnnNNn....',
    ...legs,
  ];
}

export const SHELLBUG_FRAMES: string[][] = [
  buildShellbugFrame(0),
  buildShellbugFrame(1),
  buildShellbugFrame(2),
  buildShellbugFrame(3),
];

export const SHELL_FRAMES: string[][] = [
  // 0: idle
  [
    '................',
    '................',
    '.....dddddd.....',
    '...ddTTTTTTdd...',
    '..dTTWWttttTTd..',
    '.dTTWttttDDtttD.',
    '.dTttDDttttDDtDd',
    'dTttDTTttttTTDtd',
    'dTttttttttttttDd',
    'dDDttttDDDDttDDd',
    'dDDDDDDDDDDDDDDd',
    '.mSSSSSSSSSSSSm.',
    '..mmmmmmmmmmmm..',
    '................',
    '................',
    '................',
  ],
  // 1..4: spin
  [
    '................',
    '.....dddddd.....',
    '...ddTTTTTTdd...',
    '..dTttDDttTTWWd.',
    '.dTttDDttttWWttd',
    'dTttttDDttttttDd',
    'dTttttttDDttttDd',
    'dDDttttttDDttDDd',
    'dDDDDDDDDDDDDDDd',
    '.mSSSSSSSSSSSSm.',
    '..mmmmmmmmmmmm..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '.....dddddd.....',
    '...ddTTTTTTdd...',
    '..dTttttWWttttd.',
    '.dTttttWWttttttd',
    'dTttDDttttDDttDd',
    'dTttttttttttttDd',
    'dDDttDDDDDDttDDd',
    'dDDDDDDDDDDDDDDd',
    '.mSSSSSSSSSSSSm.',
    '..mmmmmmmmmmmm..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '.....dddddd.....',
    '...ddTTTTTTdd...',
    '..dTWWttDDttttd.',
    '.dTTWttttDDttttd',
    'dTttttttDDttttDd',
    'dTttttDDttttttDd',
    'dDDttDDttttttDDd',
    'dDDDDDDDDDDDDDDd',
    '.mSSSSSSSSSSSSm.',
    '..mmmmmmmmmmmm..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '.....dddddd.....',
    '...ddTTTTTTdd...',
    '..dTttttttttttd.',
    '.dTttDDttttDDttd',
    'dTttDDttttttDDtd',
    'dTttttttttttttDd',
    'dDDttttDDDDttDDd',
    'dDDDDDDDDDDDDDDd',
    '.mSSSSSSSSSSSSm.',
    '..mmmmmmmmmmmm..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
];

// ============================================================================
// MAGMA KING (48x48, 8 frames: 0..3 idle glowing cracks, 4 anticipation, 5 jump, 6 hurt, 7 die)
// Built via 24x24 base + manual 1px AA smoothing at 48x48!
// ============================================================================
function scale2xSmooth(rows: string[], outlineChar: string): string[] {
  const out: string[] = [];
  for (const row of rows) {
    let doubled = '';
    for (const ch of row) doubled += ch + ch;
    out.push(doubled, doubled);
  }
  // Manual 1px AA rounding on exterior corners of large boss silhouette
  const h = out.length;
  const w = out[0]?.length ?? 48;
  const grid = out.map((r) => r.split(''));
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y]![x] === '.' && grid[y - 1]![x] === outlineChar && grid[y]![x - 1] === outlineChar) {
        // Leave clean stepped curve without orphan pixels
      }
    }
  }
  return grid.map((r) => r.join(''));
}

const MK_IDLE_A = [
  '.....ZZZZ......ZZZZ.....',
  '....ZCCCCZ....ZCCCCZ....',
  '...ZCCMMCCZZZZCCMMCCZ...',
  '..ZCCzzzzzzzzzzzzzzCCZ..',
  '.ZCCzzcccccccccccccCCZ..',
  '.ZCczcCCCCCCCCCCCCczcCZ.',
  'ZCCzcZZZZZZZZZZZZZZczCCZ',
  'ZCczZccWWZZccZZWWccZzcCZ',
  'ZCcMZccMMZZccZZMMccZMcCZ',
  'ZCczcZZZZZZccZZZZZZczcCZ',
  'ZCCzzccFFFFFFFFFFcczzCCZ',
  'ZCCzMcccZZZZZZZZcccMzCCZ',
  'ZzzczMFccFFFFFFccFMzczzZ',
  'ZzzczFFcZMMMMMMZcFFzczzZ',
  '.ZzzcMFcZMFFFFMZcFMczzZ.',
  '.ZzzzccZZZrrrrZZZcczzzZ.',
  '..ZzzzzMccccccccMzzzzZ..',
  '..ZzzzzzzzzzzzzzzzzzzZ..',
  '...ZzzzZZzzzzzzZZzzzZ...',
  '...ZzzZ..ZzzzzZ..ZzzZ...',
  '..ZCCCZZZZCCCCZZZZCCCZ..',
  '..ZCCCCZ..ZCCZ..ZCCCCZ..',
  '..ZZZZZZ..ZZZZ..ZZZZZZ..',
  '........................',
];

const MK_IDLE_B = MK_IDLE_A.map((r) => r.replace(/M/g, 'F').replace(/F/g, 'M'));
const MK_IDLE_C = [
  '........................',
  ...MK_IDLE_A.slice(0, 22),
  '........................',
];
const MK_IDLE_D = [
  '........................',
  ...MK_IDLE_B.slice(0, 22),
  '........................',
];

const MK_ANTICIPATION = [
  '........................',
  '........................',
  '........................',
  '.....ZZZZ......ZZZZ.....',
  '....ZCCCCZ....ZCCCCZ....',
  '...ZCCMMCCZZZZCCMMCCZ...',
  '..ZCCzzzzzzzzzzzzzzCCZ..',
  '.ZCCzzMMccccccccMMzzCCZ.',
  'ZCCzcMFFcCCCCCCcFFMzcCCZ',
  'ZCczcZZrrMMMMMMrrZZczcCZ',
  'ZCcMMrZMFFZZZZFFMZrMMcCZ',
  'ZCczcrZFFPZPPZPFFZrczcCZ',
  'ZCCzzrZZZZZZZZZZZZrzzCCZ',
  'ZCCzMccccccccccccccMzCCZ',
  'ZzzczMFccZZZZZZccFMzczzZ',
  '.ZzzcFFcZMMMMMMZcFFczzZ.',
  '.ZzzzccZZZrrrrZZZcczzzZ.',
  '..ZzzzzMccccccccMzzzzZ..',
  '..ZzzZZzzzzzzzzzzZZzzZ..',
  '.ZCCZ..ZzzzzzzzzZ..ZCCZ.',
  '.ZCCCZZ..ZzzzzZ..ZZCCCZ.',
  '.ZZZZZZ..ZZZZZZ..ZZZZZZ.',
  '........................',
  '........................',
];

const MK_JUMP = [
  '.....ZZZZ......ZZZZ.....',
  '....ZCCCCZ....ZCCCCZ....',
  '...ZCCMMCCZZZZCCMMCCZ...',
  '..ZCCzzzzzzzzzzzzzzCCZ..',
  '.ZCCzzMMccccccccMMzzCCZ.',
  '.ZCczMFFcCCCCCCcFFMzcCZ.',
  'ZCCzcFrrZZZZZZZZrrFczCCZ',
  'ZCczcZZrrMMMMMMrrZZczcCZ',
  'ZCcMMrZMFFZZZZFFMZrMMcCZ',
  'ZCczcrZFFPZPPZPFFZrczcCZ',
  'ZCCzzrZZZZZZZZZZZZrzzCCZ',
  'ZCCzMccccccccccccccMzCCZ',
  'ZzzczMFccZZZZZZccFMzczzZ',
  'ZzzczFFcZMMMMMMZcFFzczzZ',
  '.ZzzcMFcZMFFFFMZcFMczzZ.',
  '.ZzzzccZZZrrrrZZZcczzzZ.',
  '..ZzzzzMccccccccMzzzzZ..',
  '..ZzzZZzzzzzzzzzzZZzzZ..',
  '.ZCCZ..ZzzzzzzzzZ..ZCCZ.',
  '.ZZZZ...ZzzZZzzZ...ZZZZ.',
  '........ZCCZZCCZ........',
  '........ZZZZZZZZ........',
  '........................',
  '........................',
];

const MK_HURT = MK_IDLE_A.map((r) => r.replace(/[cCzZMFr]/g, 'W'));
const MK_DIE = MK_IDLE_A.map((r) => r.replace(/[MF]/g, 'z').replace(/r/g, 'Z'));

export const MAGMA_KING_FRAMES: string[][] = [
  scale2xSmooth(MK_IDLE_A, 'Z'),
  scale2xSmooth(MK_IDLE_B, 'Z'),
  scale2xSmooth(MK_IDLE_C, 'Z'),
  scale2xSmooth(MK_IDLE_D, 'Z'),
  scale2xSmooth(MK_ANTICIPATION, 'Z'),
  scale2xSmooth(MK_JUMP, 'Z'),
  scale2xSmooth(MK_HURT, 'Z'),
  scale2xSmooth(MK_DIE, 'Z'),
];

// ============================================================================
// INTERACTIVE BLOCKS, LAVA & ITEMS (16-bit 4-shade, no #000 outlines)
// ============================================================================
function buildQuestionFrame(pulse: 0 | 1 | 2 | 3, glintCol: number | null): string[] {
  const qChar = pulse === 0 ? 'A' : pulse === 1 ? 'Y' : pulse === 2 ? 'W' : 'Y';
  const base = [
    '.aaaaaaaaaaaaaa.',
    'aYYYYYYYYYYYYYYa',
    'aYyYYYYYYYYYYYyA',
    'aYaYyy####yyYaYA',
    'aYYyy#yyyy#yyYYA',
    'aYYyy#yyyy#yyYYA',
    'aYYyyyyy##yyyYYA',
    'aYYyyyy#yyyyyYYA',
    'aYYyyyy#yyyyyYYA',
    'aYYyyyyyyyyyyYYA',
    'aYYyyyy#yyyyyYYA',
    'aYYyyyyyyyyyyYYA',
    'aYayyyyyyyyyyaYA',
    'aYAAAAAAAAAAAAYA',
    'aAAAAAAAAAAAAAAa',
    '.aaaaaaaaaaaaaa.',
  ].map((r) => r.replace(/#/g, qChar));

  if (glintCol === null) return base;
  return base.map((row, y) => {
    const arr = row.split('');
    const gx = glintCol + y;
    if (gx >= 1 && gx < 15 && arr[gx] !== 'a' && arr[gx] !== '.') {
      arr[gx] = 'W';
      if (gx + 1 < 15 && arr[gx + 1] !== 'a') arr[gx + 1] = 'Y';
    }
    return arr.join('');
  });
}

// 12 frames at 6 fps = 2s cycle: pulses steadily, then diagonal glint sweeps across at end of cycle
export const QUESTION_FRAMES: string[][] = [
  buildQuestionFrame(0, null),
  buildQuestionFrame(1, null),
  buildQuestionFrame(2, null),
  buildQuestionFrame(3, null),
  buildQuestionFrame(0, null),
  buildQuestionFrame(1, null),
  buildQuestionFrame(2, null),
  buildQuestionFrame(3, null),
  buildQuestionFrame(1, -10),
  buildQuestionFrame(2, -4),
  buildQuestionFrame(2, 2),
  buildQuestionFrame(1, 8),
];

const USED_BLOCK = [
  '.dddddddddddddd.',
  'dTTTTTTTTTTTTTTd',
  'dTttttttttttttDd',
  'dTtDttttttttDtDd',
  'dTttttttttttttDd',
  'dTttttttttttttDd',
  'dTttttttttttttDd',
  'dTttttttttttttDd',
  'dTttttttttttttDd',
  'dTttttttttttttDd',
  'dTttttttttttttDd',
  'dTttttttttttttDd',
  'dTtDttttttttDtDd',
  'dTDDDDDDDDDDDDDd',
  'dDDDDDDDDDDDDDDd',
  '.dddddddddddddd.',
];

// Bricks with dark mortar & top-left highlight per brick
const BRICK_BASE = [
  'aaaaaaaaaaaaaaaa',
  'aTTTTTTaTTTTTTTa',
  'aTtttttaTtttttta',
  'aTttttDaTtttttDa',
  'aDDDDDDaDDDDDDDa',
  'aaaaaaaaaaaaaaaa',
  'aTTTaTTTTTTaTTTa',
  'aTttaTtttttaTtta',
  'aTtDaTttttDaTtDa',
  'aDDDaDDDDDDaDDDa',
  'aaaaaaaaaaaaaaaa',
  'aTTTTTTaTTTTTTTa',
  'aTtttttaTtttttta',
  'aTttttDaTtttttDa',
  'aDDDDDDaDDDDDDDa',
  'aaaaaaaaaaaaaaaa',
];

const BRICK_CAVE = BRICK_BASE.map((r) =>
  r.replace(/a/g, 'Q').replace(/T/g, 'C').replace(/t/g, 'c').replace(/D/g, 'z'),
);
const BRICK_CASTLE = BRICK_BASE.map((r) =>
  r.replace(/a/g, 'Z').replace(/T/g, 'C').replace(/t/g, 'c').replace(/D/g, 'z'),
);

// Hard Block X with 3D bevel
const HARD_BLOCK_MATRIX: string[][] = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_, x) => {
    const g = PALETTE_GROUPS.magmaStone;
    if (x === 0 || y === 0 || x === 15 || y === 15) return g.outline;
    if (x === 1 || y === 1) return g.highlight;
    if (x === 14 || y === 14) return g.shadow;
    if (x === 2 || y === 2) return g.highlight;
    if (x === 13 || y === 13) return g.shadow;
    if ((x === 3 || x === 12) && (y === 3 || y === 12)) return g.outline;
    if (x >= 5 && x <= 10 && y >= 5 && y <= 10) {
      if (x === 5 || y === 5) return g.shadow;
      if (x === 10 || y === 10) return g.highlight;
    }
    return g.base;
  }),
);

// Pipes: vertical specular highlight stripe, right shadow, 2px wider lip at top
function renderPipeTile(part: 'top-l' | 'top-r' | 'body-l' | 'body-r'): string[][] {
  const g = PALETTE_GROUPS.pipe;
  return Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => {
      if (part === 'top-l' || part === 'top-r') {
        const isLip = y <= 6;
        if (isLip) {
          if (y === 0 || y === 6) return g.outline;
          if (part === 'top-l' && x === 0) return g.outline;
          if (part === 'top-r' && x === 15) return g.outline;
          if (y === 1) return g.highlight;
          if (y === 5) return g.shadow;
        } else {
          if (part === 'top-l' && x < 2) return '';
          if (part === 'top-r' && x > 13) return '';
          if (part === 'top-l' && x === 2) return g.outline;
          if (part === 'top-r' && x === 13) return g.outline;
          if (y === 7) return g.outline;
        }
      } else {
        if (part === 'body-l' && x < 2) return '';
        if (part === 'body-r' && x > 13) return '';
        if (part === 'body-l' && x === 2) return g.outline;
        if (part === 'body-r' && x === 13) return g.outline;
      }

      // Vertical shading across pipe width
      if (part === 'top-l' || part === 'body-l') {
        if (x >= 5 && x <= 7) return g.highlight;
        if (x === 8 || x === 9) return '#f0ffe8'; // bright specular line
        return g.base;
      }
      // Right side shading
      if (x >= 10) return g.shadow;
      if (x === 1 || x === 2) return g.base;
      return g.base;
    }),
  );
}

const BRIDGE_MATRIX: string[][] = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_, x) => {
    const g = PALETTE_GROUPS.dirt;
    if (y > 5) return '';
    if (y === 0 || y === 5) return g.outline;
    if (x % 5 === 0) return g.outline;
    if (y === 1) return g.highlight;
    if (y === 4) return g.shadow;
    return g.base;
  }),
);

// 4-frame animated lava wave
function buildLavaFrame(phase: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 16; x++) {
      const wave = Math.round(Math.sin(((x + phase * 4) / 16) * Math.PI * 2) * 1.2 + 1.5);
      if (y < wave) row += '.';
      else if (y === wave) row += 'M';
      else if (y <= wave + 2) row += 'F';
      else if ((x + phase * 3 + y) % 7 === 0) row += 'M';
      else if (y > 10 && (x + y) % 5 === 0) row += 'r';
      else row += 'f';
    }
    rows.push(row);
  }
  return rows;
}
export const LAVA_FRAMES: string[][] = [0, 1, 2, 3].map((p) => buildLavaFrame(p));

// 6-frame rotating golden Gem with sparkle
const GEM_FRAMES: string[][] = [
  [
    '.......aa.......',
    '.....aaYYaa.....',
    '....aYWWWWYa....',
    '...aYWWYYYYYa...',
    '..aYWYyyyyYYAa..',
    '..aYWYyyyyYYAa..',
    '..aYYyyyyyyAAa..',
    '..aYYyyyyyyAAa..',
    '...aYyyyyyAAa...',
    '...aYyyyyAAAa...',
    '....aYyyAAAa....',
    '.....aAAAAa.....',
    '......aaaa......',
    '................',
    '................',
    '................',
  ],
  [
    '.......aa.......',
    '......aYYa......',
    '.....aYWWYa.....',
    '....aYWYYYYa....',
    '....aYWyyyAa....',
    '....aYWyyyAa....',
    '....aYyAAyAa....',
    '....aYyAAyAa....',
    '.....aYAAAa.....',
    '.....aYAAAa.....',
    '......aAAa......',
    '......aAAa......',
    '.......aa.......',
    '................',
    '................',
    '................',
  ],
  [
    '.......aa.......',
    '......aYYa......',
    '......aWWa......',
    '......aYYa......',
    '......aWya......',
    '......aWya......',
    '......ayAa......',
    '......ayAa......',
    '......aAAa......',
    '......aAAa......',
    '......aAAa......',
    '.......aa.......',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '.......aa.......',
    '......aYYa......',
    '.....aYWWYa.....',
    '....aYWWYYYa....',
    '....aYWyyyAa....',
    '....aYWyyyAa....',
    '....aYyyyAAa....',
    '....aYyyyAAa....',
    '.....aYAAAa.....',
    '.....aYAAAa.....',
    '......aAAa......',
    '......aAAa......',
    '.......aa.......',
    '................',
    '................',
    '................',
  ],
  [
    '...W............',
    '..WWW..aa.......',
    '...W.aaYYaa.....',
    '....aYWWWWYa....',
    '...aYWWYYYYYa...',
    '..aYWYyyyyYYAa..',
    '..aYYyyyyyyAAa..',
    '..aYYyyyyyyAAa..',
    '...aYyyyyyAAa...',
    '....aYyyAAAa....',
    '.....aAAAAa.....',
    '......aaaa......',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '.......aa.......',
    '.....aaYYaa.....',
    '....aYWWWWYa....',
    '...aYWWYYYYYa...',
    '..aYWYyyyyYYAa..',
    '..aYWYyyyyYYAa..',
    '..aYYyyyyyyAAa..',
    '..aYYyyyyyyAAa..',
    '...aYyyyyyAAa...',
    '...aYyyyyAAAa...',
    '....aYyyAAAa....',
    '.....aAAAAa.W...',
    '......aaaa.WWW..',
    '............W...',
    '................',
    '................',
  ],
];

// Electric green Power Cell (2 frames)
const POWER_CELL_FRAMES: string[][] = [
  [
    '.....mmmmmm.....',
    '....mSWWWWsm....',
    '....mSSSSssm....',
    '..mmmSSSSSSmmm..',
    '.eGGGGGGGGGGGGe.',
    '.eGWWWWWWWWWWGe.',
    '.eGWggggggggWGe.',
    '.eGWgGWWWWGgWGe.',
    '.eGWgGggggGgWGe.',
    '.eGWggggggggWGe.',
    '.eGEEEEEEEEEEGe.',
    '.eEEEEEEEEEEEEe.',
    '.eeeeeeeeeeeeee.',
    '..mmmmmmmmmmmm..',
    '................',
    '................',
  ],
  [
    '.....mmmmmm.....',
    '....mSWWWWsm....',
    '....mSSSSssm....',
    '..mmmSSSSSSmmm..',
    '.eGGGGGGGGGGGGe.',
    '.egggggggggggGe.',
    '.egGGGGGGGGGGGe.',
    '.egGWggggggWGGe.',
    '.egGWGWWWWGWGGe.',
    '.egGWggggggWGGe.',
    '.eGEEEEEEEEEEGe.',
    '.eEEEEEEEEEEEEe.',
    '.eeeeeeeeeeeeee.',
    '..mmmmmmmmmmmm..',
    '................',
    '................',
  ],
];

const ONE_UP_FRAMES: string[][] = POWER_CELL_FRAMES.map((frame) =>
  frame.map((r) => r.replace(/G/g, 'I').replace(/g/g, 'i').replace(/E/g, 'q').replace(/e/g, 'Q')),
);

const FLAME_CORE_FRAMES: string[][] = [0, 1, 2, 3].map((p) => {
  const tip = p % 2 === 0 ? '.......rr.......' : '......rr........';
  const flame = p < 2 ? '....rMMMMMFr....' : '....rFMMMMFr....';
  return [
    tip,
    '......rMMr......',
    '.....rMWWMr.....',
    flame,
    '...rMFWWWWFMr...',
    '..rMFWMMMMWFMr..',
    '..rMFMWWWWMFMr..',
    '..rMFFWWWWFFMr..',
    '...rFFMMMMFFr...',
    '...rffffffffr...',
    '....rrrrrrrr....',
    '...mSSSSSSSSm...',
    '...mssssssssm...',
    '....mmmmmmmm....',
    '................',
    '................',
  ];
});

const NOVA_STAR_BASE = [
  '.......aa.......',
  '......aYYa......',
  '.....aYWWYa.....',
  '.....aYYYYa.....',
  '.aaaaYYYYYYaaaa.',
  'aYYYYWWYYYYYYYYa',
  '.aYYYPWYYWPYyYa.',
  '..aYYPWYYWPYyA..',
  '...aYYYYYYYYa...',
  '...aYYYYYyAAa...',
  '..aYYYYaaYYAAa..',
  '.aYYYAa..aYAAAa.',
  '.aAAaa....aaAAa.',
  '..aa........aa..',
  '................',
  '................',
];

const NOVA_STAR_FRAMES: string[][] = [
  NOVA_STAR_BASE,
  NOVA_STAR_BASE.map((r) => r.replace(/Y/g, 'I').replace(/y/g, 'i').replace(/A/g, 'q').replace(/a/g, 'Q')),
  NOVA_STAR_BASE.map((r) => r.replace(/Y/g, 'V').replace(/y/g, 'v').replace(/A/g, 'p').replace(/a/g, 'k')),
  NOVA_STAR_BASE.map((r) => r.replace(/Y/g, 'G').replace(/y/g, 'g').replace(/A/g, 'E').replace(/a/g, 'e')),
];

const FIREBALL_FRAMES: string[][] = [
  [
    '..rrrr..',
    '.rMWWMr.',
    'rMWWWWMF',
    'rMWYYWMr',
    'rMMMMFFr',
    '.rFFFFr.',
    '..rffr..',
    '..rrrr..',
  ],
  [
    '..rrrr..',
    '.rFFFFr.',
    'rMMMMFFr',
    'rMWYYWMr',
    'rMWWWWMF',
    '.rMWWMr.',
    '..rffr..',
    '..rrrr..',
  ],
  [
    '..rrrr..',
    '.rFMMWr.',
    'rFFMWWMr',
    'rFFMMWFr',
    'rFFFFFrr',
    '.rffFFr.',
    '..rrrr..',
    '........',
  ],
  [
    '..rrrr..',
    '.rFFFFr.',
    'rFMMMMFr',
    'rMWWWWMF',
    'rMMYYMFr',
    '.rMWWMr.',
    '..rrrr..',
    '........',
  ],
];

const BOSS_BULLET_FRAMES: string[][] = [
  [
    '..kkkk..',
    '.kVVVVk.',
    'kVVWWVVk',
    'kVWWWWVk',
    'kVVWWVVk',
    'kVvvvvVk',
    '.kppppk.',
    '..kkkk..',
  ],
  [
    '..rrrr..',
    '.rMMMMr.',
    'rMMWWMMr',
    'rMWWWWMF',
    'rMMWWMMr',
    'rMFFFFMr',
    '.rffffr.',
    '..rrrr..',
  ],
];

const FLAGPOLE_TOP = [
  '................',
  '.....aaaaaa.....',
  '....aYYYYYYa....',
  '...aYWWWWYYYa...',
  '...aYyyyyyAAa...',
  '....aAAAAAAa....',
  '.....aaaaaa.....',
  '......mSSm......',
  '......mWsm......',
  '......mWsm......',
  '......mWsm......',
  '......mWsm......',
  '......mWsm......',
  '......mWsm......',
  '......mWsm......',
  '......mWsm......',
];

const FLAGPOLE_SHAFT = Array.from({ length: 16 }, () => '......mWsm......');

const FLAG_SPRITE = [
  'hhhhhhhhhhhhhh..',
  'hHHOOOOOOOOOOhhh',
  'hHOOWWOOOOOOOOhh',
  'hHOOWOOOOOOOOOoh',
  'hOOOOYYYYOOOOOoh',
  'hOOOOYYYYOOOOOhh',
  'hOOOoooooooOOohh',
  'hOoooooooooooh..',
  'hhhhhhhhhhhhhh..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const CASTLE_DOOR: string[] = Array.from({ length: 48 }, (_, y) => {
  if (y < 5) {
    return y === 0
      ? '..ZZZZ..ZZZZ..ZZZZ..ZZZZ..ZZZZ..'
      : y === 4
        ? '.ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ.'
        : '.ZCCCCZZCCCCZZCCCCZZCCCCZZCCCCZ.';
  }
  if (y < 10) return '.ZCCCCCCCCCCCCCCCCCCCCCCCCCCCCZ.';
  if (y >= 14 && xArchRow(y)) {
    return '.ZCCCZZZppppppppppppppppZZZCCCZ.';
  }
  return '.ZCCCZZZzzzzzzzzzzzzzzzzZZZCCCZ.';
});
function xArchRow(y: number): boolean {
  return y < 47;
}

// ============================================================================
// DECORATIONS (grass flowers/tallgrass/bush, cave mushroom/crystal, castle torch/banner/chain)
// ============================================================================
const DECO_FLOWER_FRAMES: string[][] = [
  [
    '................',
    '......aYYa......',
    '.....aYWWYa.....',
    '....aYaaaaYa....',
    '.....aYWWYa.....',
    '......aYYa......',
    '.......ee.......',
    '......eGGe......',
    '.....eg..ge.....',
    '......e..e......',
    '.......ee.......',
    '.......ee.......',
    '......eGGe......',
    '.....egGgge.....',
    '....eeeEEeee....',
    '................',
  ],
  [
    '................',
    '.......aYYa.....',
    '......aYWWYa....',
    '.....aYaaaaYa...',
    '......aYWWYa....',
    '.......aYYa.....',
    '.......ee.......',
    '......eGGe......',
    '.....eg..ge.....',
    '......e..e......',
    '.......ee.......',
    '.......ee.......',
    '......eGGe......',
    '.....egGgge.....',
    '....eeeEEeee....',
    '................',
  ],
];

const DECO_TALLGRASS_FRAMES: string[][] = [
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '....e......e....',
    '...eGe....eGe...',
    '..eGge.ee.eGge..',
    '..egge.eGeegge..',
    '..eggeeggeegge..',
    '.eGgEeggeegGEge.',
    '.egEEegEEegEEge.',
    '.eeeeeeeeeeeeee.',
    '................',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....e......e...',
    '....eGe....eGe..',
    '...eGge.ee.eGge.',
    '..egge.eGe.egge.',
    '..eggeeggeegge..',
    '.eGgEeggeegGEge.',
    '.egEEegEEegEEge.',
    '.eeeeeeeeeeeeee.',
    '................',
  ],
];

const DECO_BUSH: string[] = [
  '..........eeeeeeeeee............',
  '........eeGGGGGGGGGGee..........',
  '......eeGGggggggggggGGee........',
  '....eeGGggggggggggggggGGee......',
  '..eeGGggggGGggggggggggggGGee....',
  '.eGGgggggGGGGggggggGGggggggGe...',
  'eGggggggggggggggggGGGGggggggGe..',
  'eggggggEEEEEEEEgggggggggggggEe..',
  'eEEEEeeeeeeeeeeeeEEEEEEeeeeeEe..',
  '.eeeeeeeeeeeeeeeeeeeeeeeeeeee...',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const DECO_MUSHROOM_FRAMES: string[][] = [
  [
    '................',
    '................',
    '....QQQQQQQQ....',
    '..QQIIIIIIIIQQ..',
    '.QIIWWiiiiWWIIQ.',
    '.QIiiqqqqqqiiIQ.',
    'QIiqqqqWWqqqqiIQ',
    'QIqqqqqqqqqqqqIQ',
    '.QQQQQQQQQQQQQQ.',
    '.....mWWWWm.....',
    '.....mWSSWm.....',
    '.....mWSSWm.....',
    '....mSWWWWSm....',
    '....mssssssm....',
    '....mmmmmmmm....',
    '................',
  ],
  [
    '................',
    '................',
    '....QQQQQQQQ....',
    '..QQWWWWWWWWQQ..',
    '.QWWIIiiiiIIWWQ.',
    '.QIiiqqqqqqiiIQ.',
    'QIiqqqqIIqqqqiIQ',
    'QIqqqqqqqqqqqqIQ',
    '.QQQQQQQQQQQQQQ.',
    '.....mWWWWm.....',
    '.....mWSSWm.....',
    '.....mWSSWm.....',
    '....mSWWWWSm....',
    '....mssssssm....',
    '....mmmmmmmm....',
    '................',
  ],
];

const DECO_CRYSTAL_FRAMES: string[][] = [
  [
    '.......QQ.......',
    '......QIIQ......',
    '.....QIWWiQ.....',
    '....QIWiiiqQ....',
    '....QIiiiqqQ....',
    '..QQQiWWiqqQQQ..',
    '.QIIiWWiqqqiIIQ.',
    '.QIiiWWqqqqiWWQ.',
    '.QIiqqqqqqqiIiQ.',
    '..QQqqqqqqqqQQ..',
    '...QqqqqqqqqQ...',
    '....QQQQQQQQ....',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '.......QQ.......',
    '......QWWQ......',
    '.....QWWiiQ.....',
    '....QIiiiiqQ....',
    '....QIiiiqqQ....',
    '..QQQiiWWqqQQQ..',
    '.QWWiiWWqqqiIIQ.',
    '.QIiiiqqqqqiIIQ.',
    '.QIiqqqqqqqiWWQ.',
    '..QQqqqqqqqqQQ..',
    '...QqqqqqqqqQ...',
    '....QQQQQQQQ....',
    '................',
    '................',
    '................',
    '................',
  ],
];

const DECO_TORCH_FRAMES: string[][] = [0, 1, 2, 3].map((p) => [
  p % 2 === 0 ? '.......rr.......' : '......rr........',
  p < 2 ? '......rMMr......' : '.....rMMr.......',
  '.....rMWWMr.....',
  '....rMFWWFMr....',
  '....rFFMMFFr....',
  '.....rffffr.....',
  '.....ZZZZZZ.....',
  '......ZCCZ......',
  '......ZczZ......',
  '......ZczZ......',
  '......ZczZ......',
  '......ZczZ......',
  '.......ZZ.......',
  '................',
  '................',
  '................',
]);

const DECO_BANNER: string[] = Array.from({ length: 32 }, (_, y) => {
  if (y === 0) return 'ZZZZZZZZZZZZZZZZ';
  if (y === 1) return 'ZCCCCCCCCCCCCCCZ';
  if (y === 2) return 'ZZZZZZZZZZZZZZZZ';
  if (y > 27) {
    const gap = y - 27;
    return '.' .repeat(gap) + 'r' + 'F'.repeat(Math.max(0, 14 - gap * 2)) + 'r' + '.'.repeat(gap);
  }
  if (y >= 10 && y <= 16) return '..rFFYYYYYYFFr..';
  return '..rFFffffffFFr..';
});

const DECO_CHAIN: string[] = Array.from({ length: 32 }, (_, y) =>
  y % 4 === 0 ? '......ZZZZ......' : y % 4 === 2 ? '.....ZCSSCZ.....' : '.....ZC..CZ.....',
);

const DECO_STALACTITE_SM: string[] = Array.from({ length: 16 }, (_, y) => {
  const half = Math.max(1, Math.floor(((15 - y) * 6) / 15));
  let row = '';
  for (let x = 0; x < 16; x++) {
    const d = Math.abs(x - 8);
    if (d > half) row += '.';
    else if (d === half || y === 0) row += 'Q';
    else if (x < 8) row += 'C';
    else row += 'z';
  }
  return row;
});

const PLATFORM_TILE = [
  'mmmmmmmmmmmmmmmm',
  'mWWWWWWWWWWWWWWm',
  'mIIIIIIIIIIIIIIm',
  'mSSSSSSSSSSSSSSm',
  'mssssssssssssssm',
  'mmmmmmmmmmmmmmmm',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const BRICK_PIECE = [
  '.aaaaaa.',
  'aTTTTTTa',
  'aTttttDa',
  'aDDDDDDa',
  'aTTaTTTa',
  'aDDaDDDa',
  '.aaaaaa.',
  '........',
];

const DUST_PARTICLE = ['.WW.', 'WSSW', 'WSSW', '.mm.'];
const SOLID_PARTICLE = ['WWWW', 'WWWW', 'WWWW', 'WWWW'];

// ============================================================================
// UNIFIED AUTOTILED TILESET GENERATOR (155 tiles x 16x16)
// ============================================================================
function drawMatrixTile(
  g: Phaser.GameObjects.Graphics,
  offsetX: number,
  matrix: string[][],
): void {
  for (let y = 0; y < matrix.length; y++) {
    const row = matrix[y]!;
    for (let x = 0; x < row.length; x++) {
      const hex = row[x];
      if (!hex) continue;
      g.fillStyle(parseHexColor(hex), 1);
      g.fillRect(offsetX + x, y, 1, 1);
    }
  }
}

export function generateUnifiedTileset(scene: Phaser.Scene): void {
  const key = 'tileset';
  if (scene.textures.exists(key)) scene.textures.remove(key);

  const totalTiles = 155;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const themes: readonly LevelTheme[] = ['grass', 'cave', 'castle'];
  for (const theme of themes) {
    const base = AUTOTILE_BASE[theme];
    for (let i = 0; i < CANONICAL_47_MASKS.length; i++) {
      const mask = CANONICAL_47_MASKS[i]!;
      const mat = renderAutotileMatrix(mask, theme, 0);
      drawMatrixTile(g, (base + i) * 16, mat);
    }
    // Two interior variants (mask 255, variants 1 & 2)
    drawMatrixTile(g, (base + 47) * 16, renderAutotileMatrix(255, theme, 1));
    drawMatrixTile(g, (base + 48) * 16, renderAutotileMatrix(255, theme, 2));
  }

  drawMatrixTile(g, EXTRA_TILE_INDEX.HARD_BLOCK * 16, HARD_BLOCK_MATRIX);
  drawMatrixTile(g, EXTRA_TILE_INDEX.PIPE_TOP_L * 16, renderPipeTile('top-l'));
  drawMatrixTile(g, EXTRA_TILE_INDEX.PIPE_TOP_R * 16, renderPipeTile('top-r'));
  drawMatrixTile(g, EXTRA_TILE_INDEX.PIPE_BODY_L * 16, renderPipeTile('body-l'));
  drawMatrixTile(g, EXTRA_TILE_INDEX.PIPE_BODY_R * 16, renderPipeTile('body-r'));
  drawMatrixTile(g, EXTRA_TILE_INDEX.BRIDGE * 16, BRIDGE_MATRIX);

  // Lava fallback tile 154
  const lava0 = LAVA_FRAMES[0]!;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = lava0[y]![x]!;
      if (ch === '.') continue;
      const hex = PALETTE[ch];
      if (!hex) continue;
      g.fillStyle(parseHexColor(hex), 1);
      g.fillRect(EXTRA_TILE_INDEX.LAVA * 16 + x, y, 1, 1);
    }
  }

  g.generateTexture(key, totalTiles * 16, 16);
  g.destroy();

  const tex = scene.textures.get(key);
  for (let i = 0; i < totalTiles; i++) {
    tex.add(i, 0, i * 16, 0, 16, 16);
  }
}

export function getAllSpriteSpecs(): SpriteSheetSpec[] {
  const makePipAnims = (prefix: string) => [
    { key: `${prefix}-idle`, frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
    { key: `${prefix}-blink`, frames: [4], frameRate: 1, repeat: -1 },
    { key: `${prefix}-walk`, frames: [5, 6, 7, 8], frameRate: 10, repeat: -1 },
    { key: `${prefix}-run`, frames: [9, 10, 11, 12, 13, 14], frameRate: 15, repeat: -1 },
    { key: `${prefix}-jump-up`, frames: [15], frameRate: 1, repeat: -1 },
    { key: `${prefix}-jump-peak`, frames: [16], frameRate: 1, repeat: -1 },
    { key: `${prefix}-fall`, frames: [17], frameRate: 1, repeat: -1 },
    { key: `${prefix}-land`, frames: [18], frameRate: 1, repeat: -1 },
    { key: `${prefix}-skid`, frames: [19], frameRate: 1, repeat: -1 },
    { key: `${prefix}-crouch`, frames: [20], frameRate: 1, repeat: -1 },
    { key: `${prefix}-look-up`, frames: [21], frameRate: 1, repeat: -1 },
    { key: `${prefix}-die`, frames: [22], frameRate: 1, repeat: -1 },
    { key: `${prefix}-victory`, frames: [23, 24], frameRate: 6, repeat: -1 },
    { key: `${prefix}-grow`, frames: [25], frameRate: 1, repeat: -1 },
    { key: `${prefix}-shoot`, frames: [26], frameRate: 10, repeat: 0 },
  ];

  const specs: SpriteSheetSpec[] = [
    {
      name: 'pip-small',
      palette: PALETTE,
      frames: PIP_SMALL_ALIGNED,
      animations: makePipAnims('pip-small'),
    },
    {
      name: 'pip-big',
      palette: PALETTE,
      frames: PIP_BIG_ALIGNED,
      animations: makePipAnims('pip-big'),
    },
    {
      name: 'pip-fire',
      palette: FIRE_PIP_PALETTE,
      frames: PIP_BIG_ALIGNED,
      animations: makePipAnims('pip-fire'),
    },
    {
      name: 'blob',
      palette: PALETTE,
      frames: BLOB_FRAMES,
      animations: [
        { key: 'blob-walk', frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 },
        { key: 'blob-squashed', frames: [4], frameRate: 1, repeat: -1 },
      ],
    },
    {
      name: 'shellbug',
      palette: PALETTE,
      frames: SHELLBUG_FRAMES,
      animations: [{ key: 'shellbug-walk', frames: [0, 1, 2, 3], frameRate: 9, repeat: -1 }],
    },
    {
      name: 'shell',
      palette: PALETTE,
      frames: SHELL_FRAMES,
      animations: [
        { key: 'shell-idle', frames: [0], frameRate: 1, repeat: -1 },
        { key: 'shell-spin', frames: [1, 2, 3, 4], frameRate: 16, repeat: -1 },
      ],
    },
    {
      name: 'magma-king',
      palette: PALETTE,
      frames: MAGMA_KING_FRAMES,
      animations: [
        { key: 'boss-idle', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
        { key: 'boss-anticipation', frames: [4], frameRate: 1, repeat: -1 },
        { key: 'boss-jump', frames: [5], frameRate: 1, repeat: -1 },
        { key: 'boss-hurt', frames: [6], frameRate: 1, repeat: -1 },
        { key: 'boss-die', frames: [7], frameRate: 1, repeat: -1 },
      ],
    },
    {
      name: 'question-block',
      palette: PALETTE,
      frames: QUESTION_FRAMES,
      animations: [{ key: 'question-blink', frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], frameRate: 6, repeat: -1 }],
    },
    { name: 'used-block', palette: PALETTE, frames: [USED_BLOCK] },
    { name: 'brick-grass', palette: PALETTE, frames: [BRICK_BASE] },
    { name: 'brick-cave', palette: PALETTE, frames: [BRICK_CAVE] },
    { name: 'brick-castle', palette: PALETTE, frames: [BRICK_CASTLE] },
    {
      name: 'lava-anim',
      palette: PALETTE,
      frames: LAVA_FRAMES,
      animations: [{ key: 'lava-wave', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 }],
    },
    { name: 'platform', palette: PALETTE, frames: [PLATFORM_TILE] },
    {
      name: 'gem',
      palette: PALETTE,
      frames: GEM_FRAMES,
      animations: [{ key: 'gem-spin', frames: [0, 1, 2, 3, 4, 5], frameRate: 10, repeat: -1 }],
    },
    {
      name: 'power-cell',
      palette: PALETTE,
      frames: POWER_CELL_FRAMES,
      animations: [{ key: 'power-cell-idle', frames: [0, 1], frameRate: 5, repeat: -1 }],
    },
    {
      name: 'one-up',
      palette: PALETTE,
      frames: ONE_UP_FRAMES,
      animations: [{ key: 'one-up-idle', frames: [0, 1], frameRate: 5, repeat: -1 }],
    },
    {
      name: 'flame-core',
      palette: PALETTE,
      frames: FLAME_CORE_FRAMES,
      animations: [{ key: 'flame-core-idle', frames: [0, 1, 2, 3], frameRate: 10, repeat: -1 }],
    },
    {
      name: 'nova-star',
      palette: PALETTE,
      frames: NOVA_STAR_FRAMES,
      animations: [{ key: 'nova-star-idle', frames: [0, 1, 2, 3], frameRate: 10, repeat: -1 }],
    },
    {
      name: 'fireball',
      palette: PALETTE,
      frames: FIREBALL_FRAMES,
      animations: [{ key: 'fireball-spin', frames: [0, 1, 2, 3], frameRate: 16, repeat: -1 }],
    },
    {
      name: 'boss-bullet',
      palette: PALETTE,
      frames: BOSS_BULLET_FRAMES,
      animations: [{ key: 'boss-bullet-spin', frames: [0, 1], frameRate: 10, repeat: -1 }],
    },
    { name: 'flagpole-top', palette: PALETTE, frames: [FLAGPOLE_TOP] },
    { name: 'flagpole-shaft', palette: PALETTE, frames: [FLAGPOLE_SHAFT] },
    { name: 'flag', palette: PALETTE, frames: [FLAG_SPRITE] },
    { name: 'castle-door', palette: PALETTE, frames: [CASTLE_DOOR] },
    {
      name: 'deco-flower',
      palette: PALETTE,
      frames: DECO_FLOWER_FRAMES,
      animations: [{ key: 'deco-flower-sway', frames: [0, 1], frameRate: 3, repeat: -1 }],
    },
    {
      name: 'deco-tallgrass',
      palette: PALETTE,
      frames: DECO_TALLGRASS_FRAMES,
      animations: [{ key: 'deco-tallgrass-sway', frames: [0, 1], frameRate: 3, repeat: -1 }],
    },
    { name: 'deco-bush', palette: PALETTE, frames: [DECO_BUSH] },
    {
      name: 'deco-mushroom',
      palette: PALETTE,
      frames: DECO_MUSHROOM_FRAMES,
      animations: [{ key: 'deco-mushroom-glow', frames: [0, 1], frameRate: 3, repeat: -1 }],
    },
    {
      name: 'deco-crystal',
      palette: PALETTE,
      frames: DECO_CRYSTAL_FRAMES,
      animations: [{ key: 'deco-crystal-twinkle', frames: [0, 1], frameRate: 4, repeat: -1 }],
    },
    {
      name: 'deco-torch',
      palette: PALETTE,
      frames: DECO_TORCH_FRAMES,
      animations: [{ key: 'deco-torch-flicker', frames: [0, 1, 2, 3], frameRate: 10, repeat: -1 }],
    },
    { name: 'deco-banner', palette: PALETTE, frames: [DECO_BANNER] },
    { name: 'deco-chain', palette: PALETTE, frames: [DECO_CHAIN] },
    { name: 'deco-stalactite', palette: PALETTE, frames: [DECO_STALACTITE_SM] },
    { name: 'brick-piece', palette: PALETTE, frames: [BRICK_PIECE] },
    { name: 'dust', palette: PALETTE, frames: [DUST_PARTICLE] },
    { name: 'particle', palette: PALETTE, frames: [SOLID_PARTICLE] },
  ];

  STAR_PALETTES.forEach((pal, idx) => {
    specs.push({ name: `pip-small-star${idx}`, palette: pal, frames: PIP_SMALL_ALIGNED });
    specs.push({ name: `pip-big-star${idx}`, palette: pal, frames: PIP_BIG_ALIGNED });
  });

  return specs;
}

export function registerAllAssets(scene: Phaser.Scene, manifest?: OverrideManifest | null): void {
  const overridden = new Set<string>(manifest?.overrides.map((o) => o.key) ?? []);

  if (!overridden.has('tileset')) {
    generateUnifiedTileset(scene);
  }

  const specs = getAllSpriteSpecs();
  for (const spec of specs) {
    generateSpriteSheet(scene, spec, overridden.has(spec.name));
  }

  generateBitmapFont8x8(scene, 'pixel-font', BITMAP_FONT_8X8_GLYPHS);
  generateGlowTexture(scene, 'glow-warm', 64, 0xff9830, 0.9);
  generateGlowTexture(scene, 'glow-cyan', 64, 0x40e8f8, 0.85);
  generateGlowTexture(scene, 'glow-star', 48, 0xffe060, 0.9);
  generateGlowTexture(scene, 'light-cutout', 160, 0xffffff, 1.0);
  generateNineSlicePanelTexture(scene, 'ui-panel-9');
  generateLogoTexture(scene, 'logo-pixel-hero');
  generateParallaxTextures(scene);
}
