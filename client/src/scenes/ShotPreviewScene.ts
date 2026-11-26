import Phaser from 'phaser';
import { EXTRA_TILE_INDEX, getGroundTileIndex } from '../art/autotile';
import { DEFAULT_GAME_WIDTH, GAME_HEIGHT, getShotTheme, TILE_SIZE } from '../config';
import type { LevelTheme } from '../levels/legend';

/**
 * Diorama Showcase Scene (?debug=1&shot=1&theme=grass|cave|castle)
 * Renders each theme with autotiled ground, parallax, sprites, blocks, items, decorations, and lighting.
 */
export class ShotPreviewScene extends Phaser.Scene {
  private currentTheme: LevelTheme = 'grass';

  constructor() {
    super('ShotPreviewScene');
  }

  create(data?: { theme?: LevelTheme }): void {
    this.currentTheme = data?.theme ?? getShotTheme();
    this.buildDiorama(this.currentTheme);

    this.input.keyboard?.on('keydown-ONE', () => this.scene.restart({ theme: 'grass' }));
    this.input.keyboard?.on('keydown-TWO', () => this.scene.restart({ theme: 'cave' }));
    this.input.keyboard?.on('keydown-THREE', () => this.scene.restart({ theme: 'castle' }));
  }

  private buildDiorama(theme: LevelTheme): void {
    const viewW = this.scale.width || DEFAULT_GAME_WIDTH;
    // Multi-layer parallax
    if (theme === 'grass') {
      this.add.tileSprite(0, 0, viewW, GAME_HEIGHT, 'bg-grass-sky').setOrigin(0, 0).setDepth(0);
      this.add
        .tileSprite(0, GAME_HEIGHT - 138, viewW, 120, 'bg-grass-mountains')
        .setOrigin(0, 0)
        .setDepth(1);
      this.add
        .tileSprite(0, GAME_HEIGHT - 102, viewW, 80, 'bg-grass-hills')
        .setOrigin(0, 0)
        .setDepth(2);
      this.add.tileSprite(0, 14, viewW, 64, 'bg-grass-clouds').setOrigin(0, 0).setDepth(3);
    } else if (theme === 'cave') {
      this.add.tileSprite(0, 0, viewW, GAME_HEIGHT, 'bg-cave-sky').setOrigin(0, 0).setDepth(0);
      this.add.tileSprite(0, 0, viewW, GAME_HEIGHT, 'bg-cave-rocks').setOrigin(0, 0).setDepth(1);
      this.add
        .tileSprite(0, 0, viewW, GAME_HEIGHT, 'bg-cave-crystals')
        .setOrigin(0, 0)
        .setDepth(2);
    } else {
      this.add.tileSprite(0, 0, viewW, GAME_HEIGHT, 'bg-castle-sky').setOrigin(0, 0).setDepth(0);
      this.add.tileSprite(0, 0, viewW, GAME_HEIGHT, 'bg-castle-wall').setOrigin(0, 0).setDepth(1);
      this.add
        .tileSprite(0, 0, viewW, GAME_HEIGHT, 'bg-castle-pillars')
        .setOrigin(0, 0)
        .setDepth(2);
    }

    // Build 25x15 autotiled grid for the theme showcase
    const cols = 25;
    const rows = 15;
    const ascii: string[][] = Array.from({ length: rows }, () => Array(cols).fill('.'));

    for (let c = 0; c < cols; c++) {
      if (theme === 'castle' && c >= 9 && c <= 13) {
        ascii[14]![c] = '.';
      } else if (theme === 'grass' && c >= 11 && c <= 12) {
        ascii[14]![c] = '.';
      } else {
        ascii[13]![c] = '#';
        ascii[14]![c] = '#';
      }
      if (theme !== 'grass') {
        ascii[0]![c] = '#';
        ascii[1]![c] = '#';
      }
    }
    // Raised terrain terrace to showcase autotile outer & inner corners!
    for (let c = 16; c < cols; c++) {
      ascii[11]![c] = '#';
      ascii[12]![c] = '#';
    }
    ascii[10]![17] = '#';
    ascii[10]![18] = '#';
    ascii[11]![17] = '#';
    ascii[11]![18] = '#';

    const rowStrs = ascii.map((r) => r.join(''));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rowStrs[r]![c] === '#') {
          const tileIdx = getGroundTileIndex(rowStrs, r, c, theme);
          this.add.image(c * TILE_SIZE, r * TILE_SIZE, 'tileset', tileIdx).setOrigin(0, 0).setDepth(4);
        }
      }
    }

    // Blocks & Gems
    const brickKey =
      theme === 'cave' ? 'brick-cave' : theme === 'castle' ? 'brick-castle' : 'brick-grass';
    this.add.image(7 * 16, 9 * 16, brickKey).setOrigin(0, 0).setDepth(5);
    this.add.sprite(8 * 16, 9 * 16, 'question-block', 0).setOrigin(0, 0).setDepth(5).play('question-blink');
    this.add.image(9 * 16, 9 * 16, brickKey).setOrigin(0, 0).setDepth(5);
    this.add.image(10 * 16, 9 * 16, 'used-block').setOrigin(0, 0).setDepth(5);
    this.add.image(13 * 16, 9 * 16, 'tileset', EXTRA_TILE_INDEX.HARD_BLOCK).setOrigin(0, 0).setDepth(5);

    this.add.sprite(7 * 16 + 8, 8 * 16, 'gem', 0).setDepth(6).play('gem-spin');
    this.add.sprite(8 * 16 + 8, 8 * 16, 'power-cell', 0).setDepth(6).play('power-cell-idle');
    this.add.sprite(9 * 16 + 8, 8 * 16, 'flame-core', 0).setDepth(6).play('flame-core-idle');
    this.add.sprite(10 * 16 + 8, 8 * 16, 'nova-star', 0).setDepth(6).play('nova-star-idle');

    // Theme-specific props, decorations, enemies & lighting
    if (theme === 'grass') {
      // Pipe
      this.add.image(14 * 16, 11 * 16, 'tileset', EXTRA_TILE_INDEX.PIPE_TOP_L).setOrigin(0, 0).setDepth(5);
      this.add.image(15 * 16, 11 * 16, 'tileset', EXTRA_TILE_INDEX.PIPE_TOP_R).setOrigin(0, 0).setDepth(5);
      this.add.image(14 * 16, 12 * 16, 'tileset', EXTRA_TILE_INDEX.PIPE_BODY_L).setOrigin(0, 0).setDepth(5);
      this.add.image(15 * 16, 12 * 16, 'tileset', EXTRA_TILE_INDEX.PIPE_BODY_R).setOrigin(0, 0).setDepth(5);

      this.add.image(3 * 16, 12 * 16, 'deco-bush').setOrigin(0, 0).setDepth(3);
      this.add.sprite(6 * 16, 12 * 16, 'deco-flower', 0).setOrigin(0, 0).setDepth(4).play('deco-flower-sway');
      this.add.sprite(19 * 16, 10 * 16, 'deco-tallgrass', 0).setOrigin(0, 0).setDepth(4).play('deco-tallgrass-sway');

      this.add.sprite(9 * 16, 13 * 16, 'blob', 0).setOrigin(0.5, 1).setDepth(8).play('blob-walk');
      this.add.sprite(17 * 16, 10 * 16, 'shellbug', 0).setOrigin(0.5, 1).setDepth(8).play('shellbug-walk');
    } else if (theme === 'cave') {
      this.add.image(5 * 16, 2 * 16, 'deco-stalactite').setOrigin(0, 0).setDepth(4);
      this.add.image(18 * 16, 2 * 16, 'deco-stalactite').setOrigin(0, 0).setDepth(4);
      this.add.sprite(4 * 16, 12 * 16, 'deco-mushroom', 0).setOrigin(0, 0).setDepth(4).play('deco-mushroom-glow');
      this.add.sprite(19 * 16, 10 * 16, 'deco-crystal', 0).setOrigin(0, 0).setDepth(4).play('deco-crystal-twinkle');

      this.add
        .image(4 * 16 + 8, 12 * 16 + 8, 'glow-cyan')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.7)
        .setDepth(9);
      this.add
        .image(19 * 16 + 8, 10 * 16 + 8, 'glow-cyan')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.85)
        .setDepth(9);

      this.add.sprite(9 * 16, 13 * 16, 'blob', 0).setOrigin(0.5, 1).setDepth(8).play('blob-walk');
      this.add.sprite(14 * 16, 13 * 16, 'shellbug', 0).setOrigin(0.5, 1).setDepth(8).play('shellbug-walk');
    } else {
      for (let c = 9; c <= 13; c++) {
        this.add.sprite(c * 16, 14 * 16, 'lava-anim', 0).setOrigin(0, 0).setDepth(6).play('lava-wave');
        this.add
          .image(c * 16 + 8, 14 * 16, 'glow-warm')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.65)
          .setDepth(9);
        this.add.image(c * 16, 12 * 16, 'tileset', EXTRA_TILE_INDEX.BRIDGE).setOrigin(0, 0).setDepth(5);
      }
      this.add.image(4 * 16, 2 * 16, 'deco-banner').setOrigin(0, 0).setDepth(3);
      this.add.image(14 * 16, 2 * 16, 'deco-chain').setOrigin(0, 0).setDepth(3);
      this.add.sprite(6 * 16, 10 * 16, 'deco-torch', 0).setOrigin(0, 0).setDepth(4).play('deco-torch-flicker');
      this.add
        .image(6 * 16 + 8, 10 * 16 + 4, 'glow-warm')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.8)
        .setDepth(9);

      this.add.sprite(20 * 16 + 8, 11 * 16, 'magma-king', 0).setOrigin(0.5, 1).setDepth(8).play('boss-idle');
      this.add
        .image(20 * 16 + 8, 11 * 16 - 24, 'glow-warm')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.55)
        .setDepth(9);
    }

    // Pip heroes in scene
    const pipX = 5 * 16;
    const pipY = 13 * 16;
    this.add
      .sprite(pipX, pipY, theme === 'castle' ? 'pip-fire' : 'pip-big', 0)
      .setOrigin(0.5, 1)
      .setDepth(10)
      .play(theme === 'castle' ? 'pip-fire-idle' : 'pip-big-idle');

    // Cave/Castle darkness cutout around Pip
    if (theme === 'cave' || theme === 'castle') {
      const darkRt = this.add.renderTexture(0, 0, viewW, GAME_HEIGHT).setOrigin(0, 0).setDepth(20);
      darkRt.fill(0x060410, 0.35);
      const cutout = this.make.image({ x: 0, y: 0, key: 'light-cutout', add: false });
      darkRt.erase(cutout, pipX, pipY - 14);
      if (theme === 'castle') {
        darkRt.erase(cutout, 6 * 16 + 8, 10 * 16 + 6);
        darkRt.erase(cutout, 11 * 16 + 8, 14 * 16);
      } else {
        darkRt.erase(cutout, 19 * 16 + 8, 10 * 16 + 8);
      }
      cutout.destroy();
    }

    // HUD preview label
    this.add
      .bitmapText(8, 8, 'pixel-font', `SHOWCASE: ${theme.toUpperCase()}`, 8)
      .setTint(0xffe030)
      .setDepth(30);
  }
}
