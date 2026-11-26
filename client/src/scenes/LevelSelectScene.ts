import Phaser from 'phaser';
import type { LevelId } from '@pixel-hero/shared';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getSession, MAIN_LEVELS } from '../systems/GameSession';
import { PixelButton } from '../ui/Button';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#16182c');

    const session = getSession();
    session.refreshSave();
    const unlocked = session.saveData.unlockedLevel;

    this.add.nineslice(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel-9', 0, 290, 212, 8, 8, 8, 8);

    this.add
      .bitmapText(GAME_WIDTH / 2, 28, 'pixel-font', 'SELECT WORLD', 12)
      .setOrigin(0.5)
      .setTint(0xffe030);

    MAIN_LEVELS.forEach((lvl, idx) => {
      const levelNum = idx + 1;
      const isUnlocked = levelNum <= unlocked;
      const y = 70 + idx * 40;
      const label = isUnlocked
        ? `${lvl.id}  ${lvl.name.toUpperCase()}`
        : `[KHÓA] ${lvl.id}  ${lvl.name.toUpperCase()}`;

      new PixelButton(this, {
        x: GAME_WIDTH / 2,
        y,
        width: 240,
        height: 28,
        label,
        disabled: !isUnlocked,
        onClick: () => {
          session.startNewGame(lvl.id as LevelId);
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LevelIntroScene', { levelId: lvl.id });
          });
        },
      });
    });

    new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 30,
      width: 120,
      height: 22,
      label: 'QUAY LẠI',
      onClick: () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      },
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }
}
