import Phaser from 'phaser';
import type { LevelId } from '@pixel-hero/shared';
import { GAME_HEIGHT, GAMEPLAY_CONFIG } from '../config';
import { getSession } from '../systems/GameSession';
import type { ScoreSnapshot } from '../systems/ScoreManager';
import { cssInsetsToLogical, readCssSafeAreaInsets } from '../systems/viewport';

export interface UISceneData {
  levelId: LevelId | '1-2-bonus';
}

export class UIScene extends Phaser.Scene {
  private hudBg!: Phaser.GameObjects.Rectangle;
  private pipIcon!: Phaser.GameObjects.Image;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private gemIcon!: Phaser.GameObjects.Sprite;
  private gemText!: Phaser.GameObjects.BitmapText;
  private worldText!: Phaser.GameObjects.BitmapText;
  private timeText!: Phaser.GameObjects.BitmapText;
  private livesText!: Phaser.GameObjects.BitmapText;
  private clockParts: Phaser.GameObjects.Shape[] = [];
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossLabel!: Phaser.GameObjects.BitmapText;
  private unsubscribeScore: (() => void) | null = null;
  private lastScore = -1;

  constructor() {
    super('UIScene');
  }

  create(data: UISceneData): void {
    const session = getSession();
    this.lastScore = -1;
    this.clockParts = [];

    const w = this.scale.width;
    this.hudBg = this.add.rectangle(w / 2, 12, w, 24, 0x100e22, 0.45).setDepth(0);

    this.pipIcon = this.add.image(14, 12, 'pip-small', 0).setScale(0.75);
    this.scoreText = this.add.bitmapText(24, 8, 'pixel-font', '000000', 8).setOrigin(0, 0);

    this.gemIcon = this.add.sprite(96, 12, 'gem', 0).setScale(0.75);
    this.gemIcon.play('gem-spin');
    this.gemText = this.add.bitmapText(105, 8, 'pixel-font', 'x00', 8).setTint(0xffe030);

    this.livesText = this.add.bitmapText(146, 8, 'pixel-font', 'L:3', 8).setTint(0xa8ffb8);

    const worldLabel = data.levelId === '1-2-bonus' ? 'BONUS' : `WORLD ${data.levelId}`;
    this.worldText = this.add.bitmapText(w / 2, 8, 'pixel-font', worldLabel, 8).setOrigin(0.5, 0);

    const cBg = this.add.circle(w - 52, 12, 4, 0xf8c420).setStrokeStyle(1, 0x1e1a36);
    const cH = this.add.rectangle(w - 52, 11, 1, 3, 0x1e1a36);
    const cM = this.add.rectangle(w - 51, 12, 2, 1, 0x1e1a36);
    this.clockParts.push(cBg, cH, cM);
    this.timeText = this.add.bitmapText(w - 43, 8, 'pixel-font', '300', 8);

    this.bossLabel = this.add
      .bitmapText(w / 2, 28, 'pixel-font', 'MAGMA KING', 8)
      .setOrigin(0.5, 0)
      .setTint(0xff5c18)
      .setVisible(false);
    this.bossBarBg = this.add
      .rectangle(w / 2, 41, 122, 7, 0x1a1428)
      .setStrokeStyle(1, 0xd8e4f8)
      .setVisible(false);
    this.bossBarFill = this.add
      .rectangle(w / 2 - 60, 41, 120, 5, 0xe83030)
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.layoutHud();

    this.unsubscribeScore = session.scoreManager.subscribe((snap: ScoreSnapshot) => {
      this.scoreText.setText(String(snap.score).padStart(6, '0'));
      if (this.lastScore >= 0 && snap.score > this.lastScore) {
        this.tweens.killTweensOf(this.scoreText);
        const baseScale = this.scoreText.scaleX;
        this.scoreText.setScale(baseScale * 1.18, baseScale * 1.18);
        this.tweens.add({
          targets: this.scoreText,
          scaleX: baseScale,
          scaleY: baseScale,
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

    const onResize = (): void => {
      if (this.scene.isActive('UIScene')) {
        this.layoutHud();
      }
    };

    gameScene.events.on('time-update', onTimeUpdate);
    gameScene.events.on('boss-hp', onBossHp);
    gameScene.events.on('boss-hide', onBossHide);
    this.scale.on('resize', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeScore?.();
      this.unsubscribeScore = null;
      gameScene.events.off('time-update', onTimeUpdate);
      gameScene.events.off('boss-hp', onBossHp);
      gameScene.events.off('boss-hide', onBossHide);
      this.scale.off('resize', onResize);
    });
  }

  private layoutHud(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const displayW = this.game.canvas?.clientWidth || w;
    const displayH = this.game.canvas?.clientHeight || h;
    const insets = cssInsetsToLogical(readCssSafeAreaInsets(), displayW, displayH, w, h);

    // Ensure HUD text is >= 10 CSS px when displayed on small screens
    const cssPerLogical = displayH / GAME_HEIGHT;
    const fontScale = cssPerLogical > 0 && 8 * cssPerLogical < 10 ? 10 / (8 * cssPerLogical) : 1;
    const topY = 6 + insets.top;

    this.hudBg.setPosition(w / 2, topY + 6).setSize(w, 22 + insets.top);

    const leftX = 8 + insets.left;
    this.pipIcon.setPosition(leftX + 6, topY + 5);
    this.scoreText.setPosition(leftX + 16, topY + 1).setScale(fontScale);
    this.gemIcon.setPosition(leftX + 82, topY + 5);
    this.gemText.setPosition(leftX + 91, topY + 1).setScale(fontScale);
    this.livesText.setPosition(leftX + 132, topY + 1).setScale(fontScale);

    this.worldText.setPosition(Math.round(w * 0.54), topY + 1).setScale(fontScale);

    const rightAnchor = w - 8 - insets.right;
    // Leave clearance if touch pause button is in top-right corner
    const touchOffset = getSession().saveData.settings.touch ? 48 : 0;
    const timeX = rightAnchor - touchOffset - 34;

    this.clockParts[0]?.setPosition(timeX - 10, topY + 5);
    this.clockParts[1]?.setPosition(timeX - 10, topY + 4);
    this.clockParts[2]?.setPosition(timeX - 9, topY + 5);
    this.timeText.setPosition(timeX, topY + 1).setScale(fontScale);

    this.bossLabel.setPosition(w / 2, topY + 20);
    this.bossBarBg.setPosition(w / 2, topY + 33);
    this.bossBarFill.setPosition(w / 2 - 60, topY + 33);
  }
}
