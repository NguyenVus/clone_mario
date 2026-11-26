import Phaser from 'phaser';
import type { LevelId } from '@pixel-hero/shared';
import { getSession, MAIN_LEVELS } from '../systems/GameSession';
import { MobileRuntime } from '../systems/MobileRuntime';
import { PixelButton } from '../ui/Button';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#16182c');
    MobileRuntime.get().getTouchControls()?.setGameplayVisible(false);

    const w = this.scale.width;
    const h = this.scale.height;
    const session = getSession();
    session.refreshSave();
    const unlocked = session.saveData.unlockedLevel;

    this.add.nineslice(w / 2, h / 2, 'ui-panel-9', 0, 290, 212, 8, 8, 8, 8);

    this.add
      .bitmapText(w / 2, 28, 'pixel-font', 'SELECT WORLD', 12)
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
        x: w / 2,
        y,
        width: 240,
        height: 28,
        label,
        disabled: !isUnlocked,
        onClick: () => {
          session.startNewGame(lvl.id as LevelId);
          this.cameras.main.fadeOut(250, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LevelIntroScene', { levelId: lvl.id });
          });
        },
      });
    });

    new PixelButton(this, {
      x: w / 2,
      y: h - 30,
      width: 130,
      height: 24,
      label: 'QUAY LẠI',
      onClick: () => {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      },
    });

    const onResize = (): void => {
      if (this.scene.isActive('LevelSelectScene')) this.scene.restart();
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }
}
