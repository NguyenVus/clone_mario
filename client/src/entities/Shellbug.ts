import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, PHYSICS_CONFIG, TILE_SIZE } from '../config';

export type ShellbugState = 'walk' | 'shell-idle' | 'shell-slide' | 'dying';

export class Shellbug extends Phaser.Physics.Arcade.Sprite {
  public activated = false;
  public override state: ShellbugState = 'walk';
  private dir: -1 | 1 = -1;
  private shellIdleMs = 0;
  private readonly baseScaleX = 1;
  private shellImmuneMs = 0;

  constructor(scene: Phaser.Scene, col: number, row: number) {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = (row + 1) * TILE_SIZE;
    super(scene, x, y, 'shellbug', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(8);
    const body = this.getArcadeBody();
    body.setSize(12, 20);
    body.setOffset(2, 4);
    body.setAllowGravity(false);
    body.setVelocity(0, 0);
    this.play('shellbug-walk');
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public isDead(): boolean {
    return this.state === 'dying';
  }

  public isDangerousSlide(): boolean {
    return this.state === 'shell-slide' && this.shellImmuneMs <= 0;
  }

  public activateIfNear(cameraRightX: number): void {
    if (this.activated || this.state === 'dying') return;
    if (this.x <= cameraRightX + GAMEPLAY_CONFIG.ENEMY_ACTIVATE_MARGIN_PX) {
      this.activated = true;
      const body = this.getArcadeBody();
      body.setAllowGravity(true);
      body.setGravityY(PHYSICS_CONFIG.GRAVITY);
      body.setMaxVelocityY(PHYSICS_CONFIG.MAX_FALL_SPEED);
      body.setVelocityX(GAMEPLAY_CONFIG.ENEMY_SPEED * this.dir);
    }
  }

  public reverseDirection(): void {
    if (!this.activated || this.state !== 'walk') return;
    this.dir = this.dir === -1 ? 1 : -1;
    this.getArcadeBody().setVelocityX(GAMEPLAY_CONFIG.ENEMY_SPEED * this.dir);
  }

  public enterShellIdle(): void {
    this.state = 'shell-idle';
    this.shellIdleMs = 0;
    const bottom = this.y;
    this.anims.stop();
    this.setTexture('shell', 0);
    const body = this.getArcadeBody();
    body.setSize(14, 14);
    body.setOffset(1, 2);
    body.setVelocityX(0);
    this.y = bottom;
  }

  public kickShell(kickDir: -1 | 1): void {
    this.state = 'shell-slide';
    this.dir = kickDir;
    this.shellIdleMs = 0;
    this.shellImmuneMs = 150;
    this.x += kickDir * 4;
    this.setScale(this.baseScaleX, 1);
    this.play('shell-spin');
    this.getArcadeBody().setVelocityX(GAMEPLAY_CONFIG.SHELL_SLIDE_SPEED * this.dir);
  }

  public flipKill(pushDir: -1 | 1 = 1): void {
    if (this.state === 'dying') return;
    this.state = 'dying';
    const body = this.getArcadeBody();
    body.setAllowGravity(true);
    body.setGravityY(PHYSICS_CONFIG.GRAVITY);
    body.checkCollision.none = true;
    body.setVelocity(pushDir * 60, -210);
    this.anims.stop();
    this.setTexture('shell', 0);
    this.setFlipY(true);
  }

  private recoverToWalk(): void {
    this.state = 'walk';
    this.shellIdleMs = 0;
    const bottom = this.y;
    this.setTexture('shellbug', 0);
    this.play('shellbug-walk');
    const body = this.getArcadeBody();
    body.setSize(12, 20);
    body.setOffset(2, 4);
    body.setVelocityX(GAMEPLAY_CONFIG.ENEMY_SPEED * this.dir);
    this.y = bottom;
    this.x = Math.round(this.x);
  }

  public updateShellbug(
    dtMs: number,
    hasGroundAt: (worldX: number, worldY: number) => boolean,
    worldHeightPx: number,
  ): void {
    if (!this.active || !this.activated) return;
    if (this.y > worldHeightPx + 48) {
      this.destroy();
      return;
    }
    if (this.state === 'dying') return;

    if (this.shellImmuneMs > 0) {
      this.shellImmuneMs = Math.max(0, this.shellImmuneMs - dtMs);
    }

    const body = this.getArcadeBody();

    if (this.state === 'walk') {
      if (body.blocked.left) this.dir = 1;
      else if (body.blocked.right) this.dir = -1;
      else if (body.blocked.down) {
        const aheadX = this.x + this.dir * 8;
        const footY = body.bottom + 4;
        if (!hasGroundAt(aheadX, footY)) {
          this.dir = this.dir === -1 ? 1 : -1;
        }
      }
      body.setVelocityX(GAMEPLAY_CONFIG.ENEMY_SPEED * this.dir);
      this.setFlipX(this.dir === 1);
      return;
    }

    if (this.state === 'shell-idle') {
      body.setVelocityX(0);
      this.shellIdleMs += dtMs;
      const warnAt = GAMEPLAY_CONFIG.SHELL_RECOVER_MS - GAMEPLAY_CONFIG.SHELL_WARN_MS;
      if (this.shellIdleMs >= warnAt) {
        const jitter = Math.sin(this.shellIdleMs * 0.08) * 1.5;
        this.setOrigin(0.5 + jitter * 0.06, 1);
      } else {
        this.setOrigin(0.5, 1);
      }
      if (this.shellIdleMs >= GAMEPLAY_CONFIG.SHELL_RECOVER_MS) {
        this.setOrigin(0.5, 1);
        this.recoverToWalk();
      }
      return;
    }

    if (this.state === 'shell-slide') {
      if (body.blocked.left) this.dir = 1;
      else if (body.blocked.right) this.dir = -1;
      body.setVelocityX(GAMEPLAY_CONFIG.SHELL_SLIDE_SPEED * this.dir);
    }
  }
}
