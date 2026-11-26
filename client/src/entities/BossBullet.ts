import Phaser from 'phaser';

export class BossBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'boss-bullet', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(12);
    const body = this.getArcadeBody();
    body.setCircle(4);
    body.setAllowGravity(false);
    this.deactivate();
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public launch(x: number, y: number, vx: number, vy: number): void {
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);
    const body = this.getArcadeBody();
    body.enable = true;
    body.reset(x, y);
    body.setVelocity(vx, vy);
    this.play('boss-bullet-spin');
  }

  public deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    const body = this.getArcadeBody();
    body.enable = false;
    body.setVelocity(0, 0);
  }

  public updateBullet(camLeft: number, camRight: number, worldHeightPx: number): void {
    if (!this.active) return;
    if (this.x < camLeft - 32 || this.x > camRight + 32 || this.y < -32 || this.y > worldHeightPx + 32) {
      this.deactivate();
    }
  }
}
