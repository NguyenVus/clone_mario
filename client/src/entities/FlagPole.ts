import Phaser from 'phaser';
import { SCORE_VALUES, TILE_SIZE } from '../config';

export class FlagPole {
  public readonly poleX: number;
  public readonly baseY: number;
  public readonly topY: number;
  public readonly triggerZone: Phaser.GameObjects.Zone;
  public readonly flagSprite: Phaser.GameObjects.Image;
  public triggered = false;

  constructor(scene: Phaser.Scene, col: number, baseRow: number) {
    this.poleX = col * TILE_SIZE + TILE_SIZE / 2;
    this.baseY = (baseRow + 1) * TILE_SIZE;
    const heightTiles = 9;
    this.topY = this.baseY - heightTiles * TILE_SIZE;

    for (let i = 0; i < heightTiles - 1; i++) {
      scene.add
        .image(this.poleX, this.baseY - i * TILE_SIZE - TILE_SIZE / 2, 'flagpole-shaft', 0)
        .setDepth(4);
    }
    scene.add
      .image(this.poleX, this.topY + TILE_SIZE / 2, 'flagpole-top', 0)
      .setDepth(4);

    this.flagSprite = scene.add
      .image(this.poleX + 7, this.topY + 14, 'flag', 0)
      .setOrigin(0, 0.5)
      .setDepth(5);

    this.triggerZone = scene.add.zone(this.poleX, this.baseY - (heightTiles * TILE_SIZE) / 2, 10, heightTiles * TILE_SIZE);
    scene.physics.add.existing(this.triggerZone, true);
  }

  public computeScore(pipBottomY: number): number {
    const heightPx = Math.max(0, this.baseY - pipBottomY);
    const heightTiles = heightPx / TILE_SIZE;
    for (const tier of SCORE_VALUES.FLAGPOLE_TIERS) {
      if (heightTiles >= tier.minTiles) return tier.score;
    }
    return 100;
  }

  public lowerFlag(durationMs = 800): void {
    this.flagSprite.scene.tweens.add({
      targets: this.flagSprite,
      y: this.baseY - 12,
      duration: durationMs,
      ease: 'Linear',
    });
  }
}
