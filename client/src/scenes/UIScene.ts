import Phaser from 'phaser';
import type { LevelId } from '@pixel-hero/shared';
import { GAME_WIDTH, GAMEPLAY_CONFIG } from '../config';
import { getSession } from '../systems/GameSession';
import type { InputManager } from '../systems/InputManager';
import type { ScoreSnapshot } from '../systems/ScoreManager';
import { TouchControls } from '../ui/TouchControls';

export interface UISceneData {
  levelId: LevelId | '1-2-bonus';
  inputManager: InputManager;
}

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.BitmapText;
  private gemText!: Phaser.GameObjects.BitmapText;
  private worldText!: Phaser.GameObjects.BitmapText;
  private timeText!: Phaser.GameObjects.BitmapText;
  private livesText!: Phaser.GameObjects.BitmapText;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossLabel!: Phaser.GameObjects.BitmapText;
  private touchControls: TouchControls | null = null;
  private unsubscribeScore: (() => void) | null = null;
  private lastScore = -1;

  constructor() {
    super('UIScene');
  }

  create(data: UISceneData): void {
    const session = getSession();
    this.lastScore = -1;

    this.add.rectangle(GAME_WIDTH / 2, 11, GAME_WIDTH, 22, 0x100e22, 0.45).setDepth(0);

    this.add.image(14, 11, 'pip-small', 0).setScale(0.75);
    this.scoreText = this.add.bitmapText(24, 7, 'pixel-font', '000000', 8).setOrigin(0, 0);

    const gemIcon = this.add.sprite(96, 11, 'gem', 0).setScale(0.75);
    gemIcon.play('gem-spin');
    this.gemText = this.add.bitmapText(105, 7, 'pixel-font', 'x00', 8).setTint(0xffe030);

    this.livesText = this.add.bitmapText(146, 7, 'pixel-font', 'L:3', 8).setTint(0xa8ffb8);

    const worldLabel = data.levelId === '1-2-bonus' ? 'BONUS' : `WORLD ${data.levelId}`;
    this.worldText = this.add.bitmapText(205, 7, 'pixel-font', worldLabel, 8);

    // Mini clock icon
    this.add.circle(GAME_WIDTH - 52, 11, 4, 0xf8c420).setStrokeStyle(1, 0x1e1a36);
    this.add.rectangle(GAME_WIDTH - 52, 10, 1, 3, 0x1e1a36);
    this.add.rectangle(GAME_WIDTH - 51, 11, 2, 1, 0x1e1a36);
    this.timeText = this.add.bitmapText(GAME_WIDTH - 43, 7, 'pixel-font', '300', 8);

    this.bossLabel = this.add
      .bitmapText(GAME_WIDTH / 2, 26, 'pixel-font', 'MAGMA KING', 8)
      .setOrigin(0.5, 0)
      .setTint(0xff5c18)
      .setVisible(false);
    this.bossBarBg = this.add
      .rectangle(GAME_WIDTH / 2, 39, 122, 7, 0x1a1428)
      .setStrokeStyle(1, 0xd8e4f8)
      .setVisible(false);
    this.bossBarFill = this.add
      .rectangle(GAME_WIDTH / 2 - 60, 39, 120, 5, 0xe83030)
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.unsubscribeScore = session.scoreManager.subscribe((snap: ScoreSnapshot) => {
      this.scoreText.setText(String(snap.score).padStart(6, '0'));
      if (this.lastScore >= 0 && snap.score > this.lastScore) {
        this.tweens.killTweensOf(this.scoreText);
        this.scoreText.setScale(1.18, 1.18);
        this.tweens.add({
          targets: this.scoreText,
          scaleX: 1,
          scaleY: 1,
          duration: 160,
          ease: 'Back.easeOut',
        });
      }
      this.lastScore = snap.score;
      this.gemText.setText(`x${String(snap.gems).padStart(2, '0')}`);
      this.livesText.setText(`L:${snap.lives}`);
    });

    const gameScene = this.scene.get('GameScene');
    const onTimeUpdate = (timeLeft: number): void => {
      const t = Math.max(0, Math.ceil(timeLeft));
      this.timeText.setText(String(t).padStart(3, '0'));
      if (t <= GAMEPLAY_CONFIG.LOW_TIME_THRESHOLD && t > 0) {
        this.timeText.setTint(Math.floor(this.time.now / 250) % 2 === 0 ? 0xff5c18 : 0xffe030);
      } else {
        this.timeText.clearTint();
      }
    };
    const onBossHp = (hp: number, maxHp: number): void => {
      this.bossLabel.setVisible(true);
      this.bossBarBg.setVisible(true);
      this.bossBarFill.setVisible(true);
      this.bossBarFill.width = Math.max(0, (120 * hp) / maxHp);
    };
    const onBossHide = (): void => {
      this.bossLabel.setVisible(false);
      this.bossBarBg.setVisible(false);
      this.bossBarFill.setVisible(false);
    };

    gameScene.events.on('time-update', onTimeUpdate);
    gameScene.events.on('boss-hp', onBossHp);
    gameScene.events.on('boss-hide', onBossHide);

    this.touchControls = new TouchControls(this, data.inputManager);
    this.touchControls.setVisible(session.saveData.settings.touch);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeScore?.();
      this.unsubscribeScore = null;
      gameScene.events.off('time-update', onTimeUpdate);
      gameScene.events.off('boss-hp', onBossHp);
      gameScene.events.off('boss-hide', onBossHide);
    });
  }

  public setWorldLabel(label: string): void {
    this.worldText.setText(label);
  }

  override update(): void {
    this.touchControls?.update();
  }
}
