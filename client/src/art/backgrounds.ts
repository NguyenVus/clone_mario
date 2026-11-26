import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config';
import { PALETTE_GROUPS } from './palette';
import { parseHexColor } from './pixelArt';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function drawDitheredBands(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  bands: readonly { yStart: number; yEnd: number; color: string }[],
): void {
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!;
    const c1 = parseHexColor(band.color);
    g.fillStyle(c1, 1);
    g.fillRect(0, band.yStart, width, band.yEnd - band.yStart);

    // 4x4 Bayer dither transition into next band
    const next = bands[i + 1];
    if (next) {
      const c2 = parseHexColor(next.color);
      const transH = 24;
      const startY = Math.max(band.yStart, band.yEnd - transH);
      g.fillStyle(c2, 1);
      for (let y = startY; y < band.yEnd; y++) {
        const t = (y - startY) / transH;
        for (let x = 0; x < width; x++) {
          const threshold = (BAYER_4X4[y % 4]![x % 4]! + 0.5) / 16;
          if (t > threshold) {
            g.fillRect(x, y, 1, 1);
          }
        }
      }
    }
  }
  void height;
}

export function generateParallaxTextures(scene: Phaser.Scene): void {
  // 1. Grass Sky (64x240 seamless TileSprite with smooth dithered gradient bands)
  if (!scene.textures.exists('bg-grass-sky')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const sky = PALETTE_GROUPS.bgGrassSky;
    drawDitheredBands(g, 64, GAME_HEIGHT, [
      { yStart: 0, yEnd: 56, color: sky[0] },
      { yStart: 56, yEnd: 112, color: sky[1] },
      { yStart: 112, yEnd: 176, color: sky[2] },
      { yStart: 176, yEnd: GAME_HEIGHT, color: sky[3] },
    ]);
    g.generateTexture('bg-grass-sky', 64, GAME_HEIGHT);
    g.destroy();
  }

  // 2. Grass Far Mountains (256x120 seamless rounded silhouettes with top-left highlights)
  if (!scene.textures.exists('bg-grass-mountains')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const cols = PALETTE_GROUPS.bgGrassHills;
    const peaks = [
      { cx: 40, w: 88, h: 68 },
      { cx: 122, w: 96, h: 86 },
      { cx: 204, w: 84, h: 62 },
    ];
    for (const p of peaks) {
      for (let dx = -p.w / 2; dx <= p.w / 2; dx++) {
        const norm = dx / (p.w / 2);
        const yTop = Math.round(120 - p.h * (1 - norm * norm));
        for (let y = yTop; y < 120; y++) {
          const x = ((Math.round(p.cx + dx) % 256) + 256) % 256;
          const isLit = dx < -4 && y - yTop < 5;
          const isShade = dx > p.w * 0.16;
          const color = isLit
            ? parseHexColor(cols.farHighlight)
            : isShade
              ? parseHexColor(cols.farShadow)
              : parseHexColor(cols.farBase);
          g.fillStyle(color, 1);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    g.generateTexture('bg-grass-mountains', 256, 120);
    g.destroy();
  }

  // 3. Grass Near Hills (256x80 seamless darker green rolling hills with subtle dots)
  if (!scene.textures.exists('bg-grass-hills')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const cols = PALETTE_GROUPS.bgGrassHills;
    const hills = [
      { cx: 44, r: 52 },
      { cx: 136, r: 64 },
      { cx: 224, r: 48 },
    ];
    for (const h of hills) {
      for (let dx = -h.r; dx <= h.r; dx++) {
        const norm = dx / h.r;
        const yTop = Math.round(80 - (h.r * 0.72) * Math.sqrt(Math.max(0, 1 - norm * norm)));
        for (let y = yTop; y < 80; y++) {
          const x = ((Math.round(h.cx + dx) % 256) + 256) % 256;
          let color = parseHexColor(cols.nearBase);
          if (dx < -4 && y - yTop < 3) color = parseHexColor(cols.nearHighlight);
          else if (dx > h.r * 0.35) color = parseHexColor(cols.nearShadow);
          else if ((x + y * 3) % 19 === 0 && y > yTop + 6) color = parseHexColor(cols.nearHighlight);
          g.fillStyle(color, 1);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    g.generateTexture('bg-grass-hills', 256, 80);
    g.destroy();
  }

  // 4. Grass Clouds (256x64 seamless soft clouds)
  if (!scene.textures.exists('bg-grass-clouds')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const clouds = [
      { x: 24, y: 20, w: 46, h: 16 },
      { x: 112, y: 12, w: 58, h: 18 },
      { x: 200, y: 26, w: 42, h: 14 },
    ];
    for (const c of clouds) {
      g.fillStyle(0xcce4f8, 1);
      g.fillRoundedRect(c.x, c.y + 4, c.w, c.h - 2, 6);
      g.fillStyle(0xf4faff, 1);
      g.fillRoundedRect(c.x, c.y + 2, c.w, c.h - 5, 6);
      g.fillCircle(c.x + c.w * 0.35, c.y + 4, c.h * 0.45);
      g.fillCircle(c.x + c.w * 0.65, c.y + 5, c.h * 0.38);
    }
    g.generateTexture('bg-grass-clouds', 256, 64);
    g.destroy();
  }

  // 5. Cave Background Gradient & Far Stalactites & Crystals
  if (!scene.textures.exists('bg-cave-sky')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = PALETTE_GROUPS.bgCave;
    drawDitheredBands(g, 64, GAME_HEIGHT, [
      { yStart: 0, yEnd: 80, color: c.top },
      { yStart: 80, yEnd: 160, color: c.mid },
      { yStart: 160, yEnd: GAME_HEIGHT, color: c.bottom },
    ]);
    g.generateTexture('bg-cave-sky', 64, GAME_HEIGHT);
    g.destroy();
  }

  if (!scene.textures.exists('bg-cave-rocks')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = PALETTE_GROUPS.bgCave;
    for (let x = 0; x < 256; x += 24) {
      const h = 24 + ((x * 17) % 34);
      g.fillStyle(parseHexColor(c.farRock), 1);
      g.fillTriangle(x, 0, x + 22, 0, x + 11, h);
      g.fillStyle(parseHexColor(c.farRockLit), 1);
      g.fillTriangle(x + 2, 0, x + 11, 0, x + 11, h - 2);

      // Bottom stalagmites
      const bh = 20 + ((x * 29) % 28);
      g.fillStyle(parseHexColor(c.farRock), 1);
      g.fillTriangle(x + 6, 240, x + 26, 240, x + 16, 240 - bh);
    }
    g.generateTexture('bg-cave-rocks', 256, GAME_HEIGHT);
    g.destroy();
  }

  if (!scene.textures.exists('bg-cave-crystals')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const clusters = [
      { x: 24, y: 186, s: 8 },
      { x: 96, y: 192, s: 10 },
      { x: 164, y: 184, s: 7 },
      { x: 220, y: 194, s: 9 },
    ];
    for (const sp of clusters) {
      // Distant dark rock base anchoring crystals
      g.fillStyle(0x222642, 0.9);
      g.fillTriangle(sp.x - 16, 224, sp.x + 16, 224, sp.x, sp.y + 4);
      g.fillStyle(0x18687c, 0.85);
      g.fillTriangle(sp.x, sp.y - sp.s, sp.x - sp.s / 2, sp.y + sp.s, sp.x + sp.s / 2, sp.y + sp.s);
      g.fillStyle(0x48e0e8, 0.9);
      g.fillTriangle(sp.x, sp.y - sp.s, sp.x - sp.s / 2, sp.y + sp.s, sp.x, sp.y + sp.s);
    }
    g.generateTexture('bg-cave-crystals', 256, GAME_HEIGHT);
    g.destroy();
  }

  // 6. Castle Background Gradient, Distant Wall + Arched Moonlight Windows, Stone Pillars
  if (!scene.textures.exists('bg-castle-sky')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = PALETTE_GROUPS.bgCastle;
    drawDitheredBands(g, 64, GAME_HEIGHT, [
      { yStart: 0, yEnd: 96, color: c.top },
      { yStart: 96, yEnd: 184, color: c.mid },
      { yStart: 184, yEnd: GAME_HEIGHT, color: c.bottom },
    ]);
    g.generateTexture('bg-castle-sky', 64, GAME_HEIGHT);
    g.destroy();
  }

  if (!scene.textures.exists('bg-castle-wall')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const c = PALETTE_GROUPS.bgCastle;
    g.fillStyle(parseHexColor(c.farWall), 1);
    g.fillRect(0, 28, 256, 176);

    // Subtle mortar brick lines
    g.fillStyle(parseHexColor(c.farBrick), 1);
    for (let y = 32; y < 200; y += 12) {
      g.fillRect(0, y, 256, 1);
      const offset = (y / 12) % 2 === 0 ? 0 : 12;
      for (let x = offset; x < 256; x += 24) {
        g.fillRect(x, y, 1, 12);
      }
    }

    // Arched windows with moonlight glow
    for (const wx of [48, 176]) {
      g.fillStyle(0x161224, 1);
      g.fillRoundedRect(wx - 14, 62, 28, 44, { tl: 14, tr: 14, bl: 0, br: 0 });
      g.fillStyle(parseHexColor(c.moonlight), 0.75);
      g.fillRoundedRect(wx - 11, 65, 22, 38, { tl: 11, tr: 11, bl: 0, br: 0 });
      // Window bars
      g.fillStyle(0x281c28, 1);
      g.fillRect(wx - 1, 65, 2, 38);
      g.fillRect(wx - 11, 84, 22, 2);
    }
    g.generateTexture('bg-castle-wall', 256, GAME_HEIGHT);
    g.destroy();
  }

  if (!scene.textures.exists('bg-castle-pillars')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    for (const px of [20, 148]) {
      g.fillStyle(0x241a24, 1);
      g.fillRect(px, 24, 22, 192);
      g.fillStyle(0x463844, 1);
      g.fillRect(px + 2, 24, 5, 192);
      g.fillStyle(0x5c4c58, 1);
      g.fillRect(px - 3, 24, 28, 8);
      g.fillRect(px - 3, 206, 28, 8);
    }
    g.generateTexture('bg-castle-pillars', 256, GAME_HEIGHT);
    g.destroy();
  }
}
