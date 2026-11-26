import Phaser from 'phaser';
import { getAllSpriteSpecs, registerAllAssets } from '../art/sprites';
import type { OverrideManifest } from '../art/pixelArt';
import { DEFAULT_GAME_WIDTH, GAME_HEIGHT, isShotPreviewEnabled, isSpritePreviewEnabled } from '../config';

export class PreloadScene extends Phaser.Scene {
  private overrideManifest: OverrideManifest | null = null;

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.json('override-manifest', 'assets/override/manifest.json');
    this.load.on('filecomplete-json-override-manifest', (_key: string, _type: string, data: OverrideManifest) => {
      this.overrideManifest = data;
      if (data?.overrides) {
        for (const entry of data.overrides) {
          if (entry.atlas) {
            this.load.atlas(
              entry.key,
              `assets/override/${entry.key}.png`,
              `assets/override/${entry.key}.json`,
            );
          } else {
            this.load.spritesheet(entry.key, `assets/override/${entry.key}.png`, {
              frameWidth: entry.frameWidth,
              frameHeight: entry.frameHeight,
            });
          }
        }
      }
    });
  }

  create(): void {
    const w = this.scale.width || DEFAULT_GAME_WIDTH;
    const barBg = this.add.rectangle(w / 2, GAME_HEIGHT / 2, 200, 12, 0x222233);
    const barFill = this.add
      .rectangle(w / 2 - 98, GAME_HEIGHT / 2, 4, 8, 0xff7818)
      .setOrigin(0, 0.5);
    const label = this.add
      .text(w / 2, GAME_HEIGHT / 2 - 18, 'LOADING...', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        resolution: 2,
      })
      .setOrigin(0.5);

    registerAllAssets(this, this.overrideManifest);

    barFill.width = 196;
    label.setText('READY!');

    if (isSpritePreviewEnabled()) {
      barBg.destroy();
      barFill.destroy();
      label.destroy();
      this.showSpritePreview();
      return;
    }

    if (isShotPreviewEnabled()) {
      this.scene.start('ShotPreviewScene');
      return;
    }

    this.time.delayedCall(100, () => {
      this.scene.start('MenuScene');
    });
  }

  private showSpritePreview(): void {
    this.cameras.main.setBackgroundColor('#1a1c30');
    this.add
      .bitmapText(8, 6, 'pixel-font', '16-BIT SPRITES (4X) + AUTOTILES', 8)
      .setTint(0xffe030);

    // 2x Animated showcase rows with clean spacing
    const animShowcase: Array<{ key: string; anim: string; x: number; y: number }> = [
      { key: 'pip-small', anim: 'pip-small-run', x: 108, y: 58 },
      { key: 'pip-big', anim: 'pip-big-idle', x: 148, y: 80 },
      { key: 'pip-fire', anim: 'pip-fire-run', x: 188, y: 80 },
      { key: 'blob', anim: 'blob-walk', x: 228, y: 58 },
      { key: 'shellbug', anim: 'shellbug-walk', x: 268, y: 66 },
      { key: 'shell', anim: 'shell-spin', x: 308, y: 58 },
      { key: 'gem', anim: 'gem-spin', x: 344, y: 58 },
      { key: 'nova-star', anim: 'nova-star-idle', x: 378, y: 58 },
      { key: 'magma-king', anim: 'boss-idle', x: 48, y: 120 },
      { key: 'question-block', anim: 'question-blink', x: 118, y: 118 },
      { key: 'flame-core', anim: 'flame-core-idle', x: 158, y: 118 },
      { key: 'power-cell', anim: 'power-cell-idle', x: 198, y: 118 },
      { key: 'lava-anim', anim: 'lava-wave', x: 238, y: 118 },
      { key: 'deco-torch', anim: 'deco-torch-flicker', x: 278, y: 118 },
      { key: 'deco-mushroom', anim: 'deco-mushroom-glow', x: 318, y: 118 },
      { key: 'deco-flower', anim: 'deco-flower-sway', x: 358, y: 118 },
    ];

    for (const item of animShowcase) {
      const sp = this.add.sprite(item.x, item.y, item.key, 0).setScale(2).setOrigin(0.5, 1);
      sp.play(item.anim);
    }

    // 4x Zoomed Pip small & Blob inspection on left
    const pip4x = this.add.sprite(40, 198, 'pip-small', 0).setScale(4).setOrigin(0.5, 1);
    pip4x.play('pip-small-walk');
    const blob4x = this.add.sprite(104, 198, 'blob', 0).setScale(4).setOrigin(0.5, 1);
    blob4x.play('blob-walk');

    // Autotile grid preview (all 47 grass tiles + pipes)
    this.add.bitmapText(146, 134, 'pixel-font', 'AUTOTILE 47', 8).setTint(0x98f058);
    let tx = 146;
    let ty = 148;
    for (let i = 1; i <= 49; i++) {
      this.add.image(tx, ty, 'tileset', i).setOrigin(0, 0);
      tx += 18;
      if (tx > DEFAULT_GAME_WIDTH - 20) {
        tx = 146;
        ty += 18;
      }
    }

    // Also inspect all registered spec frames on bottom strip
    const specs = getAllSpriteSpecs();
    this.add.bitmapText(8, GAME_HEIGHT - 14, 'pixel-font', `TEXTURES:${specs.length}`, 8);
  }
}
