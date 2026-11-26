import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, PHYSICS_CONFIG } from '../config';

export class Fireball extends Phaser.Physics.Arcade.Sprite {
  private dir: 1 | -1 = 1;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'fireball', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(12);
    const body = this.getArcadeBody();
    body.setCircle(4);
    body.setAllowGravity(true);
    body.setGravityY(PHYSICS_CONFIG.GRAVITY);
    this.deactivate();
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public launch(x: number, y: number, dir: 1 | -1): void {
    this.dir = dir;
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);
    const body = this.getArcadeBody();
    body.enable = true;
    body.reset(x, y);
    body.setVelocity(GAMEPLAY_CONFIG.FIREBALL_SPEED * dir, 0);
    this.play('fireball-spin');
  }

  public deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    const body = this.getArcadeBody();
    body.enable = false;
    body.setVelocity(0, 0);
  }

  public updateFireball(camLeft: number, camRight: number, worldHeightPx: number): boolean {
    if (!this.active) return false;
    const body = this.getArcadeBody();

    if (body.blocked.left || body.blocked.right) {
      return true; // hit wall -> explode
    }
    if (body.blocked.down) {
      body.setVelocityY(GAMEPLAY_CONFIG.FIREBALL_BOUNCE_VY);
    }
    body.setVelocityX(GAMEPLAY_CONFIG.FIREBALL_SPEED * this.dir);

    if (this.x < camLeft - 24 || this.x > camRight + 24 || this.y > worldHeightPx + 24) {
      this.deactivate();
    }
    return false;
  }
}
