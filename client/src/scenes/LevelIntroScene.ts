import Phaser from 'phaser';
import type { LevelId } from '@pixel-hero/shared';
import { AUTOTILE_BASE, DIR_E, DIR_S, DIR_W, MASK_TO_47_INDEX } from '../art/autotile';
import { GAME_WIDTH } from '../config';
import { getLevelById, getSession } from '../systems/GameSession';

export interface LevelIntroData {
  levelId: LevelId;
}

export class LevelIntroScene extends Phaser.Scene {
  constructor() {
    super('LevelIntroScene');
  }

  create(data?: LevelIntroData): void {
    const session = getSession();
    const levelId: LevelId = data?.levelId ?? session.currentLevelId;
    session.currentLevelId = levelId;
    const lvl = getLevelById(levelId);
    const snap = session.scoreManager.getSnapshot();

    this.cameras.main.setBackgroundColor('#0c0a18');
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // Small theme illustration diorama inside a 9-slice frame
    const cardW = 160;
    const cardH = 66;
    const cx = GAME_WIDTH / 2;
    const cy = 62;
    this.add.nineslice(cx, cy, 'ui-panel-9', 0, cardW + 8, cardH + 8, 8, 8, 8, 8);

    const skyTex =
      lvl.theme === 'grass'
        ? 'bg-grass-sky'
        : lvl.theme === 'cave'
          ? 'bg-cave-sky'
          : 'bg-castle-sky';
    this.add.tileSprite(cx - cardW / 2, cy - cardH / 2, cardW, cardH, skyTex).setOrigin(0, 0);

    const topOffset = MASK_TO_47_INDEX.get(DIR_E | DIR_S | DIR_W) ?? 0;
    if (lvl.theme === 'grass') {
      this.add.image(cx - 48, cy + 16, 'deco-bush', 0);
      this.add.sprite(cx + 42, cy + 14, 'deco-flower', 0).play('deco-flower-sway');
      for (let i = 0; i < 10; i++) {
        this.add.image(cx - cardW / 2 + i * 16 + 8, cy + 25, 'tileset', AUTOTILE_BASE.grass + topOffset);
      }
    } else if (lvl.theme === 'cave') {
      this.add.image(cx - 40, cy - 18, 'deco-stalactite', 0);
      this.add.sprite(cx + 38, cy + 12, 'deco-crystal', 0).play('deco-crystal-twinkle');
      this.add.sprite(cx - 26, cy + 12, 'deco-mushroom', 0).play('deco-mushroom-glow');
      for (let i = 0; i < 10; i++) {
        this.add.image(cx - cardW / 2 + i * 16 + 8, cy + 25, 'tileset', AUTOTILE_BASE.cave + topOffset);
      }
    } else {
      this.add.sprite(cx - 44, cy + 12, 'deco-torch', 0).play('deco-torch-flicker');
      this.add.sprite(cx + 44, cy + 12, 'deco-torch', 0).play('deco-torch-flicker');
      this.add.sprite(cx, cy + 12, 'magma-king', 0).setScale(0.65).play('boss-idle');
      for (let i = 0; i < 10; i++) {
        this.add.image(cx - cardW / 2 + i * 16 + 8, cy + 25, 'tileset', AUTOTILE_BASE.castle + topOffset);
      }
    }

    this.add
      .bitmapText(GAME_WIDTH / 2, 118, 'pixel-font', `WORLD ${levelId}`, 12)
      .setOrigin(0.5)
      .setTint(0xffffff);

    this.add
      .text(GAME_WIDTH / 2, 138, lvl.name.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffe030',
        resolution: 2,
      })
      .setOrigin(0.5);

    const pip = this.add.sprite(GAME_WIDTH / 2 - 22, 172, 'pip-small', 0).setOrigin(0.5);
    pip.play('pip-small-idle');
    this.add
      .bitmapText(GAME_WIDTH / 2 + 6, 172, 'pixel-font', `x ${snap.lives}`, 8)
      .setOrigin(0, 0.5);

    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { levelId });
      });
    });
  }
}
