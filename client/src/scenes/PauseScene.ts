import Phaser from 'phaser';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import { getSession } from '../systems/GameSession';
import { MobileRuntime } from '../systems/MobileRuntime';
import { PixelButton } from '../ui/Button';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    MobileRuntime.get().getTouchControls()?.setGameplayVisible(false);

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.65);
    this.add.nineslice(w / 2, h / 2, 'ui-panel-9', 0, 210, 152, 8, 8, 8, 8);
    this.add
      .bitmapText(w / 2, 58, 'pixel-font', 'PAUSED', 12)
      .setOrigin(0.5)
      .setTint(0xffe030);

    const resumeGame = (): void => {
      synth.pause();
      music.resume();
      this.scene.resume('GameScene');
      MobileRuntime.get().getTouchControls()?.setGameplayVisible(true);
      this.scene.stop();
    };

    new PixelButton(this, {
      x: w / 2,
      y: 96,
      width: 170,
      height: 24,
      label: 'TIẾP TỤC',
      onClick: resumeGame,
    });

    new PixelButton(this, {
      x: w / 2,
      y: 128,
      width: 170,
      height: 24,
      label: 'CHƠI LẠI MÀN',
      onClick: () => {
        const session = getSession();
        session.checkpointPos = null;
        session.bonusReturnState = null;
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('LevelIntroScene', { levelId: session.currentLevelId });
        this.scene.stop();
      },
    });

    new PixelButton(this, {
      x: w / 2,
      y: 160,
      width: 170,
      height: 24,
      label: 'VỀ MENU',
      onClick: () => {
        music.stop();
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
        this.scene.stop();
      },
    });

    this.input.keyboard?.on('keydown-ESC', resumeGame);
    this.input.keyboard?.on('keydown-P', resumeGame);
  }
}
