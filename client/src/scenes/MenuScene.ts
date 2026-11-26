import Phaser from 'phaser';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import { AUTOTILE_BASE, DIR_E, DIR_S, DIR_W, MASK_TO_47_INDEX } from '../art/autotile';
import { GAME_HEIGHT, TILE_SIZE } from '../config';
import { getSession } from '../systems/GameSession';
import { MobileRuntime } from '../systems/MobileRuntime';
import { PixelButton } from '../ui/Button';

export class MenuScene extends Phaser.Scene {
  private buttons: PixelButton[] = [];
  private selectedIndex = 0;
  private demoPip!: Phaser.GameObjects.Sprite;
  private demoPipY = 208;
  private demoVy = 0;
  private bgTiles: Phaser.GameObjects.Image[] = [];
  private clouds!: Phaser.GameObjects.TileSprite;
  private hills!: Phaser.GameObjects.TileSprite;
  private mountains!: Phaser.GameObjects.TileSprite;
  private logo!: Phaser.GameObjects.Image;
  private logoBaseY = 30;
  private logoSheen!: Phaser.GameObjects.Rectangle;
  private audioPrompt!: Phaser.GameObjects.Text;
  private audioUnlocked = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.buttons = [];
    this.bgTiles = [];
    this.selectedIndex = 0;
    this.cameras.main.fadeIn(250, 0, 0, 0);
    MobileRuntime.get().getTouchControls()?.setGameplayVisible(false);

    const w = this.scale.width;
    const h = this.scale.height;
    const isTouch = Boolean(this.registry.get('isTouchDevice'));
    const session = getSession(isTouch);
    session.refreshSave();

    this.add.tileSprite(0, 0, w, h, 'bg-grass-sky').setOrigin(0, 0).setDepth(0);
    this.mountains = this.add
      .tileSprite(0, h - 138, w, 120, 'bg-grass-mountains')
      .setOrigin(0, 0)
      .setDepth(1);
    this.hills = this.add
      .tileSprite(0, h - 102, w, 80, 'bg-grass-hills')
      .setOrigin(0, 0)
      .setDepth(2);
    this.clouds = this.add
      .tileSprite(0, 12, w, 64, 'bg-grass-clouds')
      .setOrigin(0, 0)
      .setDepth(3);

    const topTile = AUTOTILE_BASE.grass + (MASK_TO_47_INDEX.get(DIR_E | DIR_S | DIR_W) ?? 0);
    const fillTile = AUTOTILE_BASE.grass + 46;
    const cols = Math.ceil(w / TILE_SIZE) + 2;
    for (let c = 0; c < cols; c++) {
      const top = this.add.image(c * TILE_SIZE, 208, 'tileset', topTile).setOrigin(0, 0).setDepth(4);
      const fill = this.add.image(c * TILE_SIZE, 224, 'tileset', fillTile).setOrigin(0, 0).setDepth(4);
      this.bgTiles.push(top, fill);
    }

    this.demoPipY = 208;
    this.demoVy = 0;
    this.demoPip = this.add.sprite(56, this.demoPipY, 'pip-small', 0).setOrigin(0.5, 1).setDepth(6);
    this.demoPip.play('pip-small-walk');

    this.add.nineslice(w / 2, 134, 'ui-panel-9', 0, 204, 138, 8, 8, 8, 8).setDepth(7);

    this.logoBaseY = 30;
    this.logo = this.add.image(w / 2, this.logoBaseY, 'logo-pixel-hero').setDepth(8);
    this.logoSheen = this.add
      .rectangle(w / 2 - 120, this.logoBaseY, 12, 34, 0xffffff, 0.55)
      .setAngle(22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9)
      .setVisible(false);

    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (!this.scene.isActive('MenuScene')) return;
        const cw = this.scale.width;
        this.logoSheen.setVisible(true).setPosition(cw / 2 - 110, this.logo.y);
        this.tweens.add({
          targets: this.logoSheen,
          x: cw / 2 + 110,
          duration: 420,
          ease: 'Quad.easeInOut',
          onComplete: () => this.logoSheen.setVisible(false),
        });
      },
    });

    this.add
      .bitmapText(
        w / 2,
        54,
        'pixel-font',
        `HIGH SCORE ${String(session.saveData.highScore).padStart(6, '0')}`,
        8,
      )
      .setOrigin(0.5)
      .setTint(0xfff8a0)
      .setDepth(8);

    const startY = 82;
    const stepY = 28;
    const entries: Array<{ label: string; action: () => void }> = [
      {
        label: 'CHƠI MỚI',
        action: () => {
          this.unlockAudio();
          session.startNewGame('1-1');
          this.transitionTo('LevelIntroScene', { levelId: '1-1' });
        },
      },
      {
        label: 'CHỌN MÀN',
        action: () => {
          this.unlockAudio();
          this.transitionTo('LevelSelectScene');
        },
      },
      {
        label: 'BẢNG XẾP HẠNG',
        action: () => {
          this.unlockAudio();
          this.transitionTo('LeaderboardScene');
        },
      },
      {
        label: 'CÀI ĐẶT',
        action: () => {
          this.unlockAudio();
          this.transitionTo('SettingsScene');
        },
      },
    ];

    entries.forEach((entry, idx) => {
      const btn = new PixelButton(this, {
        x: w / 2,
        y: startY + idx * stepY,
        width: 176,
        height: 24,
        label: entry.label,
        onClick: entry.action,
      });
      btn.setDepth(10);
      this.buttons.push(btn);
    });
    this.selectButton(0);

    this.audioPrompt = this.add
      .text(w / 2, GAME_HEIGHT - 12, 'Chạm để bắt đầu / mở khóa âm thanh', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffe030',
        backgroundColor: '#120e22cc',
        padding: { x: 6, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const onFirstGesture = (): void => {
      this.unlockAudio();
    };
    this.input.once('pointerdown', onFirstGesture);
    this.input.keyboard?.once('keydown', onFirstGesture);

    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-W', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-S', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.buttons[this.selectedIndex]?.trigger());
    this.input.keyboard?.on('keydown-SPACE', () => this.buttons[this.selectedIndex]?.trigger());

    const onResize = (): void => {
      if (this.scene.isActive('MenuScene')) {
        this.scene.restart();
      }
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });
  }

  private unlockAudio(): void {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    synth.unlock();
    const session = getSession();
    session.applyAudioSettings();
    music.play('grass', 1);
    if (this.audioPrompt.active) {
      this.audioPrompt.setVisible(false);
    }
  }

  private moveSelection(delta: number): void {
    this.unlockAudio();
    const len = this.buttons.length;
    const next = (this.selectedIndex + delta + len) % len;
    this.selectButton(next);
  }

  private selectButton(idx: number): void {
    this.selectedIndex = idx;
    this.buttons.forEach((b, i) => b.setSelected(i === idx));
  }

  private transitionTo(sceneKey: string, data?: Record<string, unknown>): void {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, data);
    });
  }

  override update(time: number, delta: number): void {
    const dt = delta / 1000;
    const w = this.scale.width;
    this.mountains.tilePositionX += 8 * dt;
    this.hills.tilePositionX += 22 * dt;
    this.clouds.tilePositionX += 14 * dt;

    this.logo.y = Math.round(this.logoBaseY + Math.sin(time * 0.004) * 2.5);

    for (const t of this.bgTiles) {
      t.x -= 48 * dt;
      if (t.x <= -TILE_SIZE) {
        t.x += (Math.ceil(w / TILE_SIZE) + 2) * TILE_SIZE;
      }
    }

    if (this.demoPipY >= 208 && Math.random() < 0.012) {
      this.demoVy = -260;
      this.demoPip.play('pip-small-jump-up', true);
    }
    if (this.demoPipY < 208 || this.demoVy < 0) {
      this.demoVy += 900 * dt;
      this.demoPipY += this.demoVy * dt;
      if (this.demoPipY >= 208) {
        this.demoPipY = 208;
        this.demoVy = 0;
        this.demoPip.play('pip-small-walk', true);
      } else if (this.demoVy > 40) {
        this.demoPip.play('pip-small-fall', true);
      }
    }
    this.demoPip.y = Math.round(this.demoPipY);
  }
}
