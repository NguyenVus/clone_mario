import Phaser from 'phaser';
import type { PaletteMap } from './palette';

export interface SpriteAnimationSpec {
  key: string;
  frames: number[];
  frameRate: number;
  repeat: number;
}

export interface SpriteSheetSpec {
  name: string;
  palette: PaletteMap;
  frames: string[][];
  animations?: SpriteAnimationSpec[];
}

export interface OverrideManifestEntry {
  key: string;
  frameWidth: number;
  frameHeight: number;
  atlas?: boolean;
}

export interface OverrideManifest {
  overrides: OverrideManifestEntry[];
}

export function parseHexColor(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

export function generateSpriteSheet(
  scene: Phaser.Scene,
  spec: SpriteSheetSpec,
  skipIfExists = false,
): void {
  const { name, palette, frames, animations } = spec;
  if (frames.length === 0) {
    throw new Error(`SpriteSheetSpec "${name}" has no frames`);
  }
  const firstFrame = frames[0];
  if (!firstFrame || firstFrame.length === 0) {
    throw new Error(`SpriteSheetSpec "${name}" has empty first frame`);
  }
  const frameHeight = firstFrame.length;
  const frameWidth = firstFrame[0]?.length ?? 0;
  if (frameWidth === 0) {
    throw new Error(`SpriteSheetSpec "${name}" has zero width`);
  }

  const alreadyLoaded = skipIfExists && scene.textures.exists(name);
  if (!alreadyLoaded) {
    if (scene.textures.exists(name)) {
      scene.textures.remove(name);
    }

    const totalWidth = frameWidth * frames.length;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

    for (let f = 0; f < frames.length; f++) {
      const rows = frames[f];
      if (!rows || rows.length !== frameHeight) {
        graphics.destroy();
        throw new Error(`Sprite "${name}" frame ${f} height mismatch`);
      }
      const offsetX = f * frameWidth;
      for (let y = 0; y < frameHeight; y++) {
        const row = rows[y];
        if (!row || row.length !== frameWidth) {
          graphics.destroy();
          throw new Error(`Sprite "${name}" frame ${f} row ${y} width mismatch`);
        }
        for (let x = 0; x < frameWidth; x++) {
          const ch = row[x];
          if (!ch || ch === '.') continue;
          const hex = palette[ch];
          if (!hex) continue;
          graphics.fillStyle(parseHexColor(hex), 1);
          graphics.fillRect(offsetX + x, y, 1, 1);
        }
      }
    }

    graphics.generateTexture(name, totalWidth, frameHeight);
    graphics.destroy();

    const texture = scene.textures.get(name);
    for (let f = 0; f < frames.length; f++) {
      texture.add(f, 0, f * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  if (animations) {
    for (const anim of animations) {
      if (scene.anims.exists(anim.key)) {
        scene.anims.remove(anim.key);
      }
      scene.anims.create({
        key: anim.key,
        frames: anim.frames.map((frameIndex) => ({ key: name, frame: frameIndex })),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }
  }
}

/**
 * Generates an 8x8 pixel bitmap font with 1px dark hue-shifted outline + 1px drop shadow.
 * Each glyph in `glyphs` is a 5x5 or 6x6 bitmap padded into a 9x9 cell (with outline + shadow).
 */
export function generateBitmapFont8x8(
  scene: Phaser.Scene,
  key: string,
  glyphs: Record<string, string[]>,
  mainColorHex = '#ffffff',
  outlineHex = '#1e1a36',
  shadowHex = '#120e22',
): void {
  const chars = Object.keys(glyphs);
  const cellW = 8;
  const cellH = 9;
  const totalW = chars.length * cellW;

  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  const mainColor = parseHexColor(mainColorHex);
  const outlineColor = parseHexColor(outlineHex);
  const shadowColor = parseHexColor(shadowHex);

  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!ch) continue;
    const rows = glyphs[ch];
    if (!rows) continue;
    const ox = i * cellW + 1;
    const oy = 1;

    // 1) Drop shadow (+1, +2)
    graphics.fillStyle(shadowColor, 1);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y] ?? '';
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') {
          graphics.fillRect(ox + x + 1, oy + y + 1, 1, 1);
          graphics.fillRect(ox + x + 1, oy + y + 2, 1, 1);
        }
      }
    }

    // 2) 1px outline around glyph
    graphics.fillStyle(outlineColor, 1);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y] ?? '';
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') {
          for (const [dx, dy] of offsets) {
            graphics.fillRect(ox + x + dx, oy + y + dy, 1, 1);
          }
        }
      }
    }

    // 3) Foreground glyph
    graphics.fillStyle(mainColor, 1);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y] ?? '';
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') {
          graphics.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    }
  }

  graphics.generateTexture(key, totalW, cellH);
  graphics.destroy();

  const charSet = chars.join('');
  const fontData = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: key,
    width: cellW,
    height: cellH,
    chars: charSet,
    charsPerRow: chars.length,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 1,
  });

  scene.cache.bitmapFont.add(key, fontData);
}

/**
 * Generates a soft radial glow texture for additive lighting & cave cutout brushes.
 */
export function generateGlowTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  colorHex: number,
  peakAlpha = 0.85,
): void {
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const cx = size / 2;
  const cy = size / 2;
  const steps = 16;

  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const radius = cx * t;
    const alpha = peakAlpha * Math.pow(1 - t, 1.8) * 0.28;
    g.fillStyle(colorHex, Math.max(0.01, alpha));
    g.fillCircle(cx, cy, radius);
  }

  g.generateTexture(key, size, size);
  g.destroy();
}

/**
 * Generates a 9-slice rounded pixel-art panel texture (24x24, 8px border slices).
 */
export function generateNineSlicePanelTexture(scene: Phaser.Scene, key = 'ui-panel-9'): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Outer drop shadow
  g.fillStyle(0x100e20, 0.9);
  g.fillRoundedRect(1, 2, 23, 22, 4);
  // Outer bright border
  g.fillStyle(0xe8eef8, 1);
  g.fillRoundedRect(0, 0, 23, 22, 4);
  // Inner dark rim
  g.fillStyle(0x283458, 1);
  g.fillRoundedRect(1, 1, 21, 20, 3);
  // Translucent navy interior
  g.fillStyle(0x181e36, 0.88);
  g.fillRoundedRect(2, 2, 19, 18, 2);

  g.generateTexture(key, 24, 24);
  g.destroy();
}

/**
 * Generates a chunky 3-color gradient "PIXEL HERO" logo texture with double outline.
 */
export function generateLogoTexture(scene: Phaser.Scene, key = 'logo-pixel-hero'): void {
  if (scene.textures.exists(key)) return;

  const letters: Record<string, string[]> = {
    P: ['####.', '#...#', '####.', '#....', '#....'],
    I: ['###', '.#.', '.#.', '.#.', '###'],
    X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    E: ['#####', '#....', '####.', '#....', '#####'],
    L: ['#....', '#....', '#....', '#....', '#####'],
    H: ['#...#', '#...#', '#####', '#...#', '#...#'],
    R: ['####.', '#...#', '####.', '#.#..', '#..#.'],
    O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
    ' ': ['..', '..', '..', '..', '..'],
  };

  const word = 'PIXEL HERO';
  const scale = 3;
  const charGap = 3;
  let totalW = 6;
  for (const ch of word) {
    totalW += (letters[ch]?.[0]?.length ?? 3) * scale + charGap;
  }
  const totalH = 5 * scale + 10;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const drawChar = (ch: string, ox: number, oy: number, color: number): void => {
    const rows = letters[ch];
    if (!rows) return;
    g.fillStyle(color, 1);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y]!;
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') {
          g.fillRect(ox + x * scale, oy + y * scale, scale, scale);
        }
      }
    }
  };

  // Pass 1: drop shadow + outer warm dark outline
  let xCursor = 4;
  for (const ch of word) {
    const w = (letters[ch]?.[0]?.length ?? 3) * scale;
    drawChar(ch, xCursor + 2, 6, 0x16142c);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        drawChar(ch, xCursor + dx, 4 + dy, 0x2c1a38);
      }
    }
    xCursor += w + charGap;
  }

  // Pass 2: inner bright rim
  xCursor = 4;
  for (const ch of word) {
    const w = (letters[ch]?.[0]?.length ?? 3) * scale;
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      drawChar(ch, xCursor + dx, 4 + dy, 0xfff0b0);
    }
    xCursor += w + charGap;
  }

  // Pass 3: 3-color vertical gradient per pixel row
  const bandColors = [0xfff488, 0xffe030, 0xff9420, 0xf05818, 0xc83018];
  xCursor = 4;
  for (const ch of word) {
    const rows = letters[ch] ?? [];
    const w = (rows[0]?.length ?? 3) * scale;
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y]!;
      g.fillStyle(bandColors[y] ?? 0xff9420, 1);
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') {
          g.fillRect(xCursor + x * scale, 4 + y * scale, scale, scale);
        }
      }
    }
    xCursor += w + charGap;
  }

  g.generateTexture(key, totalW + 4, totalH);
  g.destroy();
}
