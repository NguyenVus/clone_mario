import Phaser from 'phaser';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getSession } from '../systems/GameSession';
import { PixelButton } from '../ui/Button';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65);
    this.add
      .bitmapText(GAME_WIDTH / 2, 54, 'pixel-font', 'PAUSED', 14)
      .setOrigin(0.5)
      .setTint(0xffe030);

    const resumeGame = (): void => {
      synth.pause();
      music.resume();
      this.scene.resume('GameScene');
      this.scene.stop();
    };

    new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 98,
      width: 160,
      height: 22,
      label: 'TIẾP TỤC',
      onClick: resumeGame,
    });

    new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 128,
      width: 160,
      height: 22,
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
      x: GAME_WIDTH / 2,
      y: 158,
      width: 160,
      height: 22,
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
