import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, PHYSICS_CONFIG } from '../config';

export type PowerUpType = 'power-cell' | 'flame-core' | 'nova-star' | 'one-up';

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  public readonly powerUpType: PowerUpType;
  public emerging = true;
  private dir: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, type, 0);
    this.powerUpType = type;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(4);
    const body = this.getArcadeBody();
    body.setSize(14, 14);
    body.setOffset(1, 1);
    body.setAllowGravity(false);
    body.setImmovable(true);

    if (type === 'flame-core') {
      this.play('flame-core-idle');
    } else if (type === 'nova-star') {
      this.play('nova-star-idle');
    } else if (type === 'power-cell') {
      this.play('power-cell-idle');
    } else if (type === 'one-up') {
      this.play('one-up-idle');
    }

    // Emerge smoothly out of the top of the block over 500ms
    scene.tweens.add({
      targets: this,
      y: y - 16,
      duration: 500,
      ease: 'Linear',
      onComplete: () => {
        if (!this.active) return;
        this.emerging = false;
        this.setDepth(8);
        body.setImmovable(false);
        if (type === 'power-cell' || type === 'one-up') {
          body.setAllowGravity(true);
          body.setGravityY(PHYSICS_CONFIG.GRAVITY);
          body.setMaxVelocityY(PHYSICS_CONFIG.MAX_FALL_SPEED);
          body.setVelocityX(GAMEPLAY_CONFIG.POWERUP_SLIDE_SPEED * this.dir);
        } else if (type === 'nova-star') {
          body.setAllowGravity(true);
          body.setGravityY(PHYSICS_CONFIG.GRAVITY);
          body.setMaxVelocityY(PHYSICS_CONFIG.MAX_FALL_SPEED);
          body.setVelocity(GAMEPLAY_CONFIG.STAR_SPEED_X * this.dir, GAMEPLAY_CONFIG.STAR_BOUNCE_VY);
        } else {
          // flame-core stands still
          body.setAllowGravity(false);
          body.setVelocity(0, 0);
        }
      },
    });
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public updatePowerUp(): void {
    if (!this.active || this.emerging) return;
    const body = this.getArcadeBody();

    if (this.powerUpType === 'power-cell' || this.powerUpType === 'one-up') {
      if (body.blocked.left) this.dir = 1;
      else if (body.blocked.right) this.dir = -1;
      body.setVelocityX(GAMEPLAY_CONFIG.POWERUP_SLIDE_SPEED * this.dir);
    } else if (this.powerUpType === 'nova-star') {
      if (body.blocked.left) this.dir = 1;
      else if (body.blocked.right) this.dir = -1;
      body.setVelocityX(GAMEPLAY_CONFIG.STAR_SPEED_X * this.dir);
      if (body.blocked.down) {
        body.setVelocityY(GAMEPLAY_CONFIG.STAR_BOUNCE_VY);
      }
    }
  }
}
