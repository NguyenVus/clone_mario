import Phaser from 'phaser';
import { TILE_SIZE } from '../config';

export class Gem extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, col: number, row: number) {
    super(scene, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, 'gem', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(6);
    this.play('gem-spin');
  }
}
