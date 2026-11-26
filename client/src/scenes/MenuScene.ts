import Phaser from 'phaser';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import { AUTOTILE_BASE, DIR_E, DIR_S, DIR_W, MASK_TO_47_INDEX } from '../art/autotile';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../config';
import { getSession } from '../systems/GameSession';
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
  private logoBaseY = 34;
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
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const isTouch = Boolean(this.registry.get('isTouchDevice'));
    const session = getSession(isTouch);
    session.refreshSave();

    // Multi-layer parallax sky, mountains, hills, clouds
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-grass-sky').setOrigin(0, 0).setDepth(0);
    this.mountains = this.add
      .tileSprite(0, GAME_HEIGHT - 138, GAME_WIDTH, 120, 'bg-grass-mountains')
      .setOrigin(0, 0)
      .setDepth(1);
    this.hills = this.add
      .tileSprite(0, GAME_HEIGHT - 102, GAME_WIDTH, 80, 'bg-grass-hills')
      .setOrigin(0, 0)
      .setDepth(2);
    this.clouds = this.add
      .tileSprite(0, 12, GAME_WIDTH, 64, 'bg-grass-clouds')
      .setOrigin(0, 0)
      .setDepth(3);

    // Scrolling autotiled grass ground strip
    const topTile = AUTOTILE_BASE.grass + (MASK_TO_47_INDEX.get(DIR_E | DIR_S | DIR_W) ?? 0);
    const fillTile = AUTOTILE_BASE.grass + 46;
    const cols = Math.ceil(GAME_WIDTH / TILE_SIZE) + 2;
    for (let c = 0; c < cols; c++) {
      const top = this.add.image(c * TILE_SIZE, 208, 'tileset', topTile).setOrigin(0, 0).setDepth(4);
      const fill = this.add.image(c * TILE_SIZE, 224, 'tileset', fillTile).setOrigin(0, 0).setDepth(4);
      this.bgTiles.push(top, fill);
    }

    // Demo Pip running
    this.demoPipY = 208;
    this.demoVy = 0;
    this.demoPip = this.add.sprite(60, this.demoPipY, 'pip-small', 0).setOrigin(0.5, 1).setDepth(6);
    this.demoPip.play('pip-small-walk');

    // 9-slice menu panel
    this.add.nineslice(GAME_WIDTH / 2, 134, 'ui-panel-9', 0, 198, 132, 8, 8, 8, 8).setDepth(7);

    // Chunky 3-color gradient logo + bob + 3s sheen sweep
    this.logoBaseY = 34;
    this.logo = this.add.image(GAME_WIDTH / 2, this.logoBaseY, 'logo-pixel-hero').setDepth(8);
    this.logoSheen = this.add
      .rectangle(GAME_WIDTH / 2 - 120, this.logoBaseY, 12, 34, 0xffffff, 0.55)
      .setAngle(22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9)
      .setVisible(false);

    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (!this.scene.isActive('MenuScene')) return;
        this.logoSheen.setVisible(true).setPosition(GAME_WIDTH / 2 - 110, this.logo.y);
        this.tweens.add({
          targets: this.logoSheen,
          x: GAME_WIDTH / 2 + 110,
          duration: 420,
          ease: 'Quad.easeInOut',
          onComplete: () => this.logoSheen.setVisible(false),
        });
      },
    });

    this.add
      .bitmapText(
        GAME_WIDTH / 2,
        59,
        'pixel-font',
        `HIGH SCORE ${String(session.saveData.highScore).padStart(6, '0')}`,
        8,
      )
      .setOrigin(0.5)
      .setTint(0xfff8a0)
      .setDepth(8);

    const startY = 86;
    const stepY = 25;
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
        x: GAME_WIDTH / 2,
        y: startY + idx * stepY,
        width: 164,
        height: 20,
        label: entry.label,
        onClick: entry.action,
      });
      btn.setDepth(10);
      this.buttons.push(btn);
    });
    this.selectButton(0);

    this.audioPrompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 12, 'Nhấn để bắt đầu / mở khóa âm thanh', {
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
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, data);
    });
  }

  override update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.mountains.tilePositionX += 8 * dt;
    this.hills.tilePositionX += 22 * dt;
    this.clouds.tilePositionX += 14 * dt;

    // Gentle logo bobbing
    this.logo.y = Math.round(this.logoBaseY + Math.sin(time * 0.004) * 2.5);

    for (const t of this.bgTiles) {
      t.x -= 48 * dt;
      if (t.x <= -TILE_SIZE) {
        t.x += (Math.ceil(GAME_WIDTH / TILE_SIZE) + 2) * TILE_SIZE;
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
