export type PaletteMap = Record<string, string>;

export interface ShadeGroup {
  outline: string;
  shadow: string;
  base: string;
  highlight: string;
}

/**
 * 16-bit hue-shifted 4-shade material groups.
 * Outlines use dark hue-shifted tones; pure #000000 is reserved strictly for eye pupils.
 */
export const PALETTE_GROUPS = {
  pipHelmet: {
    outline: '#481818',
    shadow: '#b83c14',
    base: '#f07020',
    highlight: '#ffd048',
  },
  pipBody: {
    outline: '#16204c',
    shadow: '#204ca0',
    base: '#3088f0',
    highlight: '#70d0ff',
  },
  pipMetal: {
    outline: '#2c3248',
    shadow: '#687898',
    base: '#a8b8d0',
    highlight: '#eef6ff',
  },
  pipLed: {
    outline: '#143820',
    shadow: '#1c8040',
    base: '#38d868',
    highlight: '#a8ffb8',
  },
  pipFireHelmet: {
    outline: '#543c38',
    shadow: '#c0b09c',
    base: '#f4ead8',
    highlight: '#fffdf2',
  },
  pipFireBody: {
    outline: '#4c1020',
    shadow: '#a81828',
    base: '#e83030',
    highlight: '#ff8848',
  },
  blob: {
    outline: '#2a1244',
    shadow: '#682898',
    base: '#a848e0',
    highlight: '#e890ff',
  },
  shellbugBody: {
    outline: '#143824',
    shadow: '#1c7c3c',
    base: '#3cd058',
    highlight: '#98f888',
  },
  shellbugShell: {
    outline: '#3c2210',
    shadow: '#8c501c',
    base: '#d89028',
    highlight: '#ffe060',
  },
  magmaStone: {
    outline: '#221c28',
    shadow: '#443c4c',
    base: '#6c6478',
    highlight: '#9ca0b4',
  },
  magmaCore: {
    outline: '#5c1414',
    shadow: '#b82410',
    base: '#ff5c18',
    highlight: '#fff068',
  },
  grass: {
    outline: '#143824',
    shadow: '#1c7c34',
    base: '#34b844',
    highlight: '#98f058',
  },
  dirt: {
    outline: '#3e1e18',
    shadow: '#7c3c24',
    base: '#b86834',
    highlight: '#e8a860',
  },
  caveStone: {
    outline: '#181c34',
    shadow: '#323c64',
    base: '#546490',
    highlight: '#88a0c8',
  },
  crystal: {
    outline: '#10384c',
    shadow: '#147c9c',
    base: '#2cd8e8',
    highlight: '#b0fff8',
  },
  castleBrick: {
    outline: '#2c2028',
    shadow: '#544448',
    base: '#7c6c68',
    highlight: '#b0a098',
  },
  lava: {
    outline: '#5c1018',
    shadow: '#b42018',
    base: '#f85818',
    highlight: '#fff058',
  },
  gem: {
    outline: '#4c2808',
    shadow: '#c06c10',
    base: '#f8c420',
    highlight: '#fff8a0',
  },
  powerCell: {
    outline: '#103824',
    shadow: '#188844',
    base: '#30e870',
    highlight: '#b8ffd0',
  },
  flameCore: {
    outline: '#4e1414',
    shadow: '#b42414',
    base: '#f85820',
    highlight: '#ffe868',
  },
  pipe: {
    outline: '#123828',
    shadow: '#187848',
    base: '#28c068',
    highlight: '#98f8a0',
  },
  bgGrassSky: ['#4488e8', '#5ca8f4', '#84ccfc', '#b4e4ff'] as const,
  bgGrassHills: {
    farShadow: '#6498c8',
    farBase: '#7eb2dc',
    farHighlight: '#a2ccf0',
    nearShadow: '#3c7858',
    nearBase: '#509468',
    nearHighlight: '#6eb27c',
  },
  bgCave: {
    top: '#121226',
    mid: '#1c1e3a',
    bottom: '#26284a',
    farRock: '#2a3052',
    farRockLit: '#3c446c',
  },
  bgCastle: {
    top: '#1a101a',
    mid: '#281822',
    bottom: '#441c18',
    farWall: '#2c2028',
    farBrick: '#3a2c34',
    moonlight: '#8ca0c8',
  },
} as const satisfies Record<string, ShadeGroup | Record<string, string> | readonly string[]>;

/**
 * Unified 16-bit character & item palette (no pure black outlines; '.' is transparent).
 */
export const PALETTE: PaletteMap = {
  '.': '',
  P: '#000000', // Eye pupil ONLY

  // Pip Helmet (Orange)
  H: PALETTE_GROUPS.pipHelmet.highlight,
  O: PALETTE_GROUPS.pipHelmet.base,
  o: PALETTE_GROUPS.pipHelmet.shadow,
  h: PALETTE_GROUPS.pipHelmet.outline,

  // Pip Suit (Blue)
  B: PALETTE_GROUPS.pipBody.highlight,
  b: PALETTE_GROUPS.pipBody.base,
  u: PALETTE_GROUPS.pipBody.shadow,
  U: PALETTE_GROUPS.pipBody.outline,

  // Metal / Eyes / Visor
  W: PALETTE_GROUPS.pipMetal.highlight,
  S: PALETTE_GROUPS.pipMetal.base,
  s: PALETTE_GROUPS.pipMetal.shadow,
  m: PALETTE_GROUPS.pipMetal.outline,

  // Antenna glowing green LED
  G: PALETTE_GROUPS.pipLed.highlight,
  g: PALETTE_GROUPS.pipLed.base,
  E: PALETTE_GROUPS.pipLed.shadow,
  e: PALETTE_GROUPS.pipLed.outline,

  // Gold / Gem
  Y: PALETTE_GROUPS.gem.highlight,
  y: PALETTE_GROUPS.gem.base,
  A: PALETTE_GROUPS.gem.shadow,
  a: PALETTE_GROUPS.gem.outline,

  // Blob Purple
  V: PALETTE_GROUPS.blob.highlight,
  v: PALETTE_GROUPS.blob.base,
  p: PALETTE_GROUPS.blob.shadow,
  k: PALETTE_GROUPS.blob.outline,

  // Shellbug Body & Shell
  L: PALETTE_GROUPS.shellbugBody.highlight,
  l: PALETTE_GROUPS.shellbugBody.base,
  N: PALETTE_GROUPS.shellbugBody.shadow,
  n: PALETTE_GROUPS.shellbugBody.outline,
  T: PALETTE_GROUPS.shellbugShell.highlight,
  t: PALETTE_GROUPS.shellbugShell.base,
  D: PALETTE_GROUPS.shellbugShell.shadow,
  d: PALETTE_GROUPS.shellbugShell.outline,

  // Magma King / Lava / Flame
  M: PALETTE_GROUPS.magmaCore.highlight,
  F: PALETTE_GROUPS.magmaCore.base,
  f: PALETTE_GROUPS.magmaCore.shadow,
  r: PALETTE_GROUPS.magmaCore.outline,
  C: PALETTE_GROUPS.magmaStone.highlight,
  c: PALETTE_GROUPS.magmaStone.base,
  z: PALETTE_GROUPS.magmaStone.shadow,
  Z: PALETTE_GROUPS.magmaStone.outline,

  // Crystal / Cyan
  I: PALETTE_GROUPS.crystal.highlight,
  i: PALETTE_GROUPS.crystal.base,
  q: PALETTE_GROUPS.crystal.shadow,
  Q: PALETTE_GROUPS.crystal.outline,

  // Pipe / Power Cell
  J: PALETTE_GROUPS.pipe.highlight,
  j: PALETTE_GROUPS.pipe.base,
  K: PALETTE_GROUPS.pipe.shadow,
  x: PALETTE_GROUPS.pipe.outline,
};

export const FIRE_PIP_PALETTE: PaletteMap = {
  ...PALETTE,
  H: PALETTE_GROUPS.pipFireHelmet.highlight,
  O: PALETTE_GROUPS.pipFireHelmet.base,
  o: PALETTE_GROUPS.pipFireHelmet.shadow,
  h: PALETTE_GROUPS.pipFireHelmet.outline,
  B: PALETTE_GROUPS.pipFireBody.highlight,
  b: PALETTE_GROUPS.pipFireBody.base,
  u: PALETTE_GROUPS.pipFireBody.shadow,
  U: PALETTE_GROUPS.pipFireBody.outline,
};

export const STAR_PALETTES: readonly PaletteMap[] = [
  {
    ...PALETTE,
    H: '#fff8a0',
    O: '#ffd838',
    o: '#d89018',
    h: '#5c3410',
    B: '#a8fff8',
    b: '#38d8f8',
    u: '#1c78c8',
    U: '#142854',
  },
  {
    ...PALETTE,
    H: '#ffc8f0',
    O: '#ff68c0',
    o: '#b83088',
    h: '#48143c',
    B: '#fff8a0',
    b: '#ffd038',
    u: '#d87818',
    U: '#582410',
  },
  {
    ...PALETTE,
    H: '#c8ffd8',
    O: '#48e878',
    o: '#1c9844',
    h: '#103c20',
    B: '#ffffff',
    b: '#d8e8ff',
    u: '#7898c8',
    U: '#283458',
  },
  {
    ...PALETTE,
    H: '#b8f0ff',
    O: '#48b8ff',
    o: '#2068c8',
    h: '#142454',
    B: '#ffd080',
    b: '#ff5828',
    u: '#b42018',
    U: '#4c1018',
  },
];
