import Phaser from 'phaser';
import { DEFAULT_GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ObjectPool } from './Pool';

interface PooledSprite extends Phaser.GameObjects.Image {
  vx: number;
  vy: number;
  gravity: number;
  lifeMs: number;
  maxLifeMs: number;
}

export class EffectsSystem {
  private readonly particlePool: ObjectPool<PooledSprite>;
  private readonly brickPiecePool: ObjectPool<PooledSprite>;
  private readonly scoreTextPool: ObjectPool<Phaser.GameObjects.BitmapText>;
  private readonly popupGemPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private shakeEnabled = true;
  private lowParticleMode = false;

  private irisRt: Phaser.GameObjects.RenderTexture | null = null;
  private irisDisc: Phaser.GameObjects.Image | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.particlePool = new ObjectPool<PooledSprite>(() => {
      const img = scene.add.image(0, 0, 'dust', 0).setDepth(25) as PooledSprite;
      img.vx = 0;
      img.vy = 0;
      img.gravity = 0;
      img.lifeMs = 0;
      img.maxLifeMs = 300;
      return img;
    }, 40);

    this.brickPiecePool = new ObjectPool<PooledSprite>(() => {
      const img = scene.add.image(0, 0, 'brick-piece', 0).setDepth(25) as PooledSprite;
      img.vx = 0;
      img.vy = 0;
      img.gravity = 900;
      img.lifeMs = 0;
      img.maxLifeMs = 700;
      return img;
    }, 16);

    this.scoreTextPool = new ObjectPool<Phaser.GameObjects.BitmapText>(() => {
      return scene.add.bitmapText(0, 0, 'pixel-font', '', 8).setOrigin(0.5).setDepth(35);
    }, 12);

    this.popupGemPool = new ObjectPool<Phaser.GameObjects.Sprite>(() => {
      return scene.add.sprite(0, 0, 'gem', 0).setDepth(22);
    }, 6);

    if (!scene.textures.exists('iris-disc')) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(32, 32, 32);
      g.generateTexture('iris-disc', 64, 64);
      g.destroy();
    }
  }

  public setShakeEnabled(enabled: boolean): void {
    this.shakeEnabled = enabled;
  }

  public setLowParticleMode(low: boolean): void {
    this.lowParticleMode = low;
  }

  public shake(durationMs: number, intensity: number): void {
    if (!this.shakeEnabled) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  public playIrisOpen(
    screenX = this.scene.scale.width / 2,
    screenY = GAME_HEIGHT / 2,
    durationMs = 420,
  ): void {
    this.ensureIris();
    if (!this.irisRt || !this.irisDisc) return;

    this.irisRt.setVisible(true);
    const maxR = Math.hypot(this.scene.scale.width, GAME_HEIGHT);
    const state = { radius: 4 };
    this.scene.tweens.add({
      targets: state,
      radius: maxR,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.drawIrisFrame(screenX, screenY, state.radius),
      onComplete: () => {
        this.irisRt?.setVisible(false);
      },
    });
    this.drawIrisFrame(screenX, screenY, state.radius);
  }

  public playIrisClose(
    screenX = this.scene.scale.width / 2,
    screenY = GAME_HEIGHT / 2,
    durationMs = 450,
    onComplete?: () => void,
  ): void {
    this.ensureIris();
    if (!this.irisRt || !this.irisDisc) {
      onComplete?.();
      return;
    }

    this.irisRt.setVisible(true);
    const state = { radius: Math.hypot(this.scene.scale.width, GAME_HEIGHT) };
    this.scene.tweens.add({
      targets: state,
      radius: 0,
      duration: durationMs,
      ease: 'Cubic.easeIn',
      onUpdate: () => this.drawIrisFrame(screenX, screenY, state.radius),
      onComplete: () => {
        this.drawIrisFrame(screenX, screenY, 0);
        onComplete?.();
      },
    });
  }

  private ensureIris(): void {
    const w = this.scene.scale.width || DEFAULT_GAME_WIDTH;
    if (!this.irisRt) {
      this.irisRt = this.scene.add
        .renderTexture(0, 0, w, GAME_HEIGHT)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(200)
        .setVisible(false);
    } else if (this.irisRt.width !== w) {
      this.irisRt.resize(w, GAME_HEIGHT);
    }
    if (!this.irisDisc) {
      this.irisDisc = this.scene.make.image({ x: 0, y: 0, key: 'iris-disc', add: false });
    }
  }

  private drawIrisFrame(sx: number, sy: number, radius: number): void {
    if (!this.irisRt || !this.irisDisc) return;
    this.irisRt.clear();
    this.irisRt.fill(0x0c0a18, 1);
    if (radius > 1) {
      this.irisDisc.setScale(radius / 32);
      this.irisRt.erase(this.irisDisc, Math.round(sx), Math.round(sy));
    }
  }

  public emitDust(x: number, y: number, count = 2): void {
    for (let i = 0; i < count; i++) {
      const p = this.particlePool.acquire();
      p.setTexture('dust', 0);
      p.clearTint();
      p.setBlendMode(Phaser.BlendModes.NORMAL);
      p.setPosition(x + Phaser.Math.Between(-3, 3), y + Phaser.Math.Between(-2, 1));
      p.setScale(1);
      p.setAlpha(0.9);
      p.vx = Phaser.Math.Between(-25, 25);
      p.vy = Phaser.Math.Between(-35, -10);
      p.gravity = 0;
      p.lifeMs = 0;
      p.maxLifeMs = 260;
    }
  }

  public emitGemSparkle(x: number, y: number): void {
    const colors = [0xfff8a0, 0xf8c420, 0xffffff];
    const total = this.lowParticleMode ? 4 : 8;
    for (let i = 0; i < total; i++) {
      const p = this.particlePool.acquire();
      p.setTexture('particle', 0);
      p.setTint(colors[i % colors.length]!);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.setPosition(x, y);
      p.setScale(0.65);
      p.setAlpha(1);
      const ang = (Math.PI * 2 * i) / 8;
      const spd = Phaser.Math.Between(35, 75);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd - 18;
      p.gravity = 160;
      p.lifeMs = 0;
      p.maxLifeMs = 360;
    }
  }

  public emitStarTrail(x: number, y: number): void {
    const rainbow = [0xff5838, 0xffe030, 0x48e878, 0x40e8f8, 0xe878ff];
    const p = this.particlePool.acquire();
    p.setTexture('particle', 0);
    p.setTint(rainbow[Phaser.Math.Between(0, rainbow.length - 1)]!);
    p.setBlendMode(Phaser.BlendModes.ADD);
    p.setPosition(x + Phaser.Math.Between(-4, 4), y + Phaser.Math.Between(-6, 6));
    p.setScale(0.8);
    p.setAlpha(0.95);
    p.vx = Phaser.Math.Between(-15, 15);
    p.vy = Phaser.Math.Between(-20, 10);
    p.gravity = 0;
    p.lifeMs = 0;
    p.maxLifeMs = 280;
  }

  public emitFireSparks(x: number, y: number): void {
    const colors = [0xfff068, 0xff5c18, 0xb82410];
    for (let i = 0; i < 8; i++) {
      const p = this.particlePool.acquire();
      p.setTexture('particle', 0);
      p.setTint(colors[i % colors.length]!);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.setPosition(x, y);
      p.setScale(0.75);
      p.setAlpha(1);
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const spd = Phaser.Math.Between(45, 110);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd - 30;
      p.gravity = 380;
      p.lifeMs = 0;
      p.maxLifeMs = 340;
    }
  }

  public emitPowerRays(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const p = this.particlePool.acquire();
      p.setTexture('particle', 0);
      p.setTint(i % 2 === 0 ? 0xfff8a0 : 0x40e8f8);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.setPosition(x, y);
      p.setScale(0.9);
      p.setAlpha(1);
      const ang = (Math.PI * 2 * i) / 12;
      p.vx = Math.cos(ang) * 95;
      p.vy = Math.sin(ang) * 95;
      p.gravity = 0;
      p.lifeMs = 0;
      p.maxLifeMs = 440;
    }
  }

  public emitRockDebris(x: number, y: number): void {
    const colors = [0x9ca0b4, 0x6c6478, 0x443c4c];
    for (let i = 0; i < 10; i++) {
      const p = this.particlePool.acquire();
      p.setTexture('particle', 0);
      p.setTint(colors[i % colors.length]!);
      p.setBlendMode(Phaser.BlendModes.NORMAL);
      p.setPosition(x + Phaser.Math.Between(-16, 16), y);
      p.setScale(1);
      p.setAlpha(1);
      p.vx = Phaser.Math.Between(-90, 90);
      p.vy = Phaser.Math.Between(-170, -80);
      p.gravity = 700;
      p.lifeMs = 0;
      p.maxLifeMs = 520;
    }
  }

  public emitLavaBubble(x: number, y: number): void {
    const p = this.particlePool.acquire();
    p.setTexture('particle', 0);
    p.setTint(0xfff058);
    p.setBlendMode(Phaser.BlendModes.ADD);
    p.setPosition(x, y);
    p.setScale(0.6);
    p.setAlpha(0.95);
    p.vx = Phaser.Math.Between(-12, 12);
    p.vy = Phaser.Math.Between(-65, -35);
    p.gravity = 220;
    p.lifeMs = 0;
    p.maxLifeMs = 360;
  }

  public emitBurst(x: number, y: number, color: number, count = 12): void {
    const total = this.lowParticleMode ? Math.max(4, Math.floor(count / 2)) : count;
    for (let i = 0; i < total; i++) {
      const p = this.particlePool.acquire();
      p.setTexture('particle', 0);
      p.setTint(color);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.setPosition(x, y);
      p.setScale(1);
      p.setAlpha(1);
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.2, 0.2);
      const speed = Phaser.Math.Between(50, 150);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 40;
      p.gravity = 500;
      p.lifeMs = 0;
      p.maxLifeMs = 520;
    }
  }

  public emitBrickBreak(x: number, y: number): void {
    const velocities = [
      { vx: -65, vy: -220 },
      { vx: 65, vy: -220 },
      { vx: -45, vy: -140 },
      { vx: 45, vy: -140 },
    ];
    for (const v of velocities) {
      const piece = this.brickPiecePool.acquire();
      piece.setPosition(x, y);
      piece.setAlpha(1);
      piece.vx = v.vx;
      piece.vy = v.vy;
      piece.gravity = 950;
      piece.lifeMs = 0;
      piece.maxLifeMs = 800;
    }
    this.shake(80, 0.003);
  }

  public spawnPopupGem(x: number, y: number): void {
    const gem = this.popupGemPool.acquire();
    gem.setPosition(x, y - 8);
    gem.setAlpha(1);
    gem.play('gem-spin');
    this.scene.tweens.add({
      targets: gem,
      y: y - 34,
      duration: 280,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.popupGemPool.release(gem);
      },
    });
  }

  public spawnScoreText(x: number, y: number, label: string, color = 0xffffff): void {
    const txt = this.scoreTextPool.acquire();
    txt.setText(label);
    txt.setPosition(Math.round(x), Math.round(y - 6));
    txt.setTint(color);
    txt.setAlpha(1);
    this.scene.tweens.killTweensOf(txt);
    this.scene.tweens.add({
      targets: txt,
      y: Math.round(y - 30),
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scoreTextPool.release(txt);
      },
    });
  }

  public update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const p of this.particlePool.getActive()) {
      p.lifeMs += dtMs;
      if (p.lifeMs >= p.maxLifeMs) {
        this.particlePool.release(p);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.setAlpha(1 - p.lifeMs / p.maxLifeMs);
    }

    for (const piece of this.brickPiecePool.getActive()) {
      piece.lifeMs += dtMs;
      if (piece.lifeMs >= piece.maxLifeMs) {
        this.brickPiecePool.release(piece);
        continue;
      }
      piece.vy += piece.gravity * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += 360 * dt;
    }
  }
}
