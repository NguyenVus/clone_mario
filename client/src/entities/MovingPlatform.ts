import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, TILE_SIZE } from '../config';

export class MovingPlatform extends Phaser.Physics.Arcade.Image {
  public readonly axis: 'horizontal' | 'vertical';
  public deltaX = 0;
  public deltaY = 0;

  private readonly startX: number;
  private readonly startY: number;
  private elapsedMs = 0;
  private readonly visuals: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, col: number, row: number, axis: 'horizontal' | 'vertical') {
    const x = (col + 1.5) * TILE_SIZE;
    const y = row * TILE_SIZE + 3;
    super(scene, x, y, 'platform', 0);
    this.axis = axis;
    this.startX = x;
    this.startY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Hide base single-tile sprite; render 3 tiles wide cleanly
    this.setVisible(false);
    for (let i = -1; i <= 1; i++) {
      const tile = scene.add.image(x + i * TILE_SIZE, y + 5, 'platform', 0).setDepth(6);
      this.visuals.push(tile);
    }

    const body = this.getArcadeBody();
    body.setSize(TILE_SIZE * 3, 6);
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public updatePlatform(dtMs: number): void {
    const prevX = this.x;
    const prevY = this.y;
    this.elapsedMs += dtMs;

    const phase = (this.elapsedMs / GAMEPLAY_CONFIG.PLATFORM_PERIOD_MS) * Math.PI * 2;
    const offset = ((1 - Math.cos(phase)) * 0.5) * GAMEPLAY_CONFIG.PLATFORM_RANGE_PX;

    if (this.axis === 'horizontal') {
      this.x = this.startX + offset;
    } else {
      this.y = this.startY - offset;
    }

    this.deltaX = this.x - prevX;
    this.deltaY = this.y - prevY;

    const body = this.getArcadeBody();
    body.position.x += this.deltaX;
    body.position.y += this.deltaY;

    for (let i = 0; i < this.visuals.length; i++) {
      const v = this.visuals[i]!;
      v.setPosition(this.x + (i - 1) * TILE_SIZE, this.y + 5);
    }
  }
}
