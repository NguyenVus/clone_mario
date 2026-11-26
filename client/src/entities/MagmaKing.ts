import Phaser from 'phaser';
import { PHYSICS_CONFIG, TILE_SIZE } from '../config';

export type BossPhase = 'walk' | 'anticipation' | 'jump' | 'hurt' | 'dead';

export class MagmaKing extends Phaser.Physics.Arcade.Sprite {
  public hp = 5;
  public readonly maxHp = 5;
  public activeInArena = false;
  public phase: BossPhase = 'walk';
  public invulnMs = 0;

  private walkDir: -1 | 1 = -1;
  private phaseTimerMs = 0;
  private arenaMinX = 0;
  private arenaMaxX = 0;
  private wasInAir = false;

  private onLandShake?: (x: number, y: number) => void;
  private onFireFan?: (
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    count: number,
    speedMult: number,
  ) => void;

  constructor(scene: Phaser.Scene, col: number, row: number) {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = (row + 1) * TILE_SIZE;
    super(scene, x, y, 'magma-king', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(9);
    const body = this.getArcadeBody();
    body.setSize(38, 42);
    body.setOffset(5, 6);
    body.setGravityY(PHYSICS_CONFIG.GRAVITY);
    body.setMaxVelocityY(PHYSICS_CONFIG.MAX_FALL_SPEED);
    this.play('boss-idle');
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public setArenaBounds(minX: number, maxX: number): void {
    this.arenaMinX = minX + 24;
    this.arenaMaxX = maxX - 24;
  }

  public setCallbacks(callbacks: {
    onLandShake: (x: number, y: number) => void;
    onFireFan: (
      x: number,
      y: number,
      targetX: number,
      targetY: number,
      count: number,
      speedMult: number,
    ) => void;
  }): void {
    this.onLandShake = callbacks.onLandShake;
    this.onFireFan = callbacks.onFireFan;
  }

  public activate(): void {
    if (this.activeInArena) return;
    this.activeInArena = true;
    this.phase = 'walk';
    this.phaseTimerMs = 0;
  }

  public takeDamage(amount = 1): boolean {
    if (this.phase === 'dead' || this.invulnMs > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnMs = 1000;

    if (this.hp <= 0) {
      this.phase = 'dead';
      const body = this.getArcadeBody();
      body.setVelocity(0, 0);
      body.checkCollision.none = true;
      this.play('boss-die');
      return true;
    }

    this.play('boss-hurt');
    this.scene.time.delayedCall(250, () => {
      if (this.active && this.phase !== 'dead') {
        if (this.phase === 'jump') this.play('boss-jump');
        else if (this.phase === 'anticipation') this.play('boss-anticipation');
        else this.play('boss-idle');
      }
    });
    return false;
  }

  public updateBoss(dtMs: number, pipX: number, pipY: number): void {
    if (!this.active || !this.activeInArena || this.phase === 'dead') return;

    const body = this.getArcadeBody();
    const enraged = this.hp <= 2;
    const speedMult = enraged ? 1.5 : 1;

    if (this.invulnMs > 0) {
      this.invulnMs = Math.max(0, this.invulnMs - dtMs);
      this.setTint(Math.floor(this.invulnMs / 80) % 2 === 0 ? 0xff7050 : 0xffffff);
      if (this.invulnMs === 0) this.clearTint();
    }

    const onGround = body.blocked.down;

    if (this.phase === 'walk') {
      const walkSpeed = 55 * speedMult;
      if (this.x <= this.arenaMinX || body.blocked.left) this.walkDir = 1;
      else if (this.x >= this.arenaMaxX || body.blocked.right) this.walkDir = -1;

      body.setVelocityX(walkSpeed * this.walkDir);
      this.setFlipX(pipX > this.x);
      this.phaseTimerMs += dtMs;

      if (this.phaseTimerMs >= 1800 / speedMult && onGround) {
        this.phase = 'anticipation';
        this.phaseTimerMs = 0;
        body.setVelocityX(0);
        this.play('boss-anticipation');
      }
    } else if (this.phase === 'anticipation') {
      body.setVelocityX(0);
      this.phaseTimerMs += dtMs;
      if (this.phaseTimerMs >= 260 / speedMult) {
        this.phase = 'jump';
        this.phaseTimerMs = 0;
        this.wasInAir = false;
        const jumpDir = pipX >= this.x ? 1 : -1;
        body.setVelocity(jumpDir * 95 * speedMult, -450);
        this.play('boss-jump');
      }
    } else if (this.phase === 'jump') {
      if (!onGround) {
        this.wasInAir = true;
      } else if (this.wasInAir) {
        body.setVelocityX(0);
        this.onLandShake?.(this.x, body.bottom);
        const count = enraged ? 5 : 3;
        this.onFireFan?.(this.x, this.y - 24, pipX, pipY - 10, count, speedMult);
        this.phase = 'walk';
        this.phaseTimerMs = 0;
        this.play('boss-idle');
      }
    }
  }
}
