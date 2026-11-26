import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, PHYSICS_CONFIG, TILE_SIZE } from '../config';

export class Blob extends Phaser.Physics.Arcade.Sprite {
  public activated = false;
  public dead = false;
  private dir: -1 | 1 = -1;
  private readonly edgeAware: boolean;

  constructor(scene: Phaser.Scene, col: number, row: number, edgeAware = false) {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = (row + 1) * TILE_SIZE;
    super(scene, x, y, 'blob', 0);
    this.edgeAware = edgeAware;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(8);
    const body = this.getArcadeBody();
    body.setSize(12, 12);
    body.setOffset(2, 4);
    body.setAllowGravity(false);
    body.setVelocity(0, 0);
    this.play('blob-walk');
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public activateIfNear(cameraRightX: number): void {
    if (this.activated || this.dead) return;
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
    if (this.dead || !this.activated) return;
    this.dir = this.dir === -1 ? 1 : -1;
    this.getArcadeBody().setVelocityX(GAMEPLAY_CONFIG.ENEMY_SPEED * this.dir);
  }

  public updateBlob(hasGroundAt: (worldX: number, worldY: number) => boolean, worldHeightPx: number): void {
    if (!this.active || this.dead || !this.activated) return;
    const body = this.getArcadeBody();

    if (body.blocked.left) this.dir = 1;
    else if (body.blocked.right) this.dir = -1;
    else if (this.edgeAware && body.blocked.down) {
      const aheadX = this.x + this.dir * 8;
      const footY = body.bottom + 4;
      if (!hasGroundAt(aheadX, footY)) {
        this.dir = this.dir === -1 ? 1 : -1;
      }
    }

    body.setVelocityX(GAMEPLAY_CONFIG.ENEMY_SPEED * this.dir);
    this.setFlipX(this.dir === 1);

    if (this.y > worldHeightPx + 48) {
      this.destroy();
    }
  }

  public stompKill(): void {
    if (this.dead) return;
    this.dead = true;
    const body = this.getArcadeBody();
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.checkCollision.none = true;
    this.anims.stop();
    this.setTexture('blob', 2);
    this.scene.time.delayedCall(500, () => {
      if (this.active) this.destroy();
    });
  }

  public flipKill(pushDir: -1 | 1 = 1): void {
    if (this.dead) return;
    this.dead = true;
    const body = this.getArcadeBody();
    body.setAllowGravity(true);
    body.setGravityY(PHYSICS_CONFIG.GRAVITY);
    body.checkCollision.none = true;
    body.setVelocity(pushDir * 55, -200);
    this.anims.stop();
    this.setFlipY(true);
  }
}
