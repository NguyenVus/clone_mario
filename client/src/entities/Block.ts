import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, TILE_SIZE } from '../config';
import type { LevelTheme } from '../levels/legend';
import type { BlockKind } from '../levels/parser';

export type BlockHitOutcome =
  | { type: 'none' }
  | { type: 'bump' }
  | { type: 'break' }
  | { type: 'gem' }
  | { type: 'powerup' }
  | { type: 'star' }
  | { type: 'oneup' };

function getBrickTexture(theme: LevelTheme): string {
  switch (theme) {
    case 'cave':
      return 'brick-cave';
    case 'castle':
      return 'brick-castle';
    case 'grass':
    default:
      return 'brick-grass';
  }
}

export class InteractiveBlock extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: BlockKind;
  public used = false;
  public hiddenRevealed = false;
  public isBouncing = false;

  private readonly baseY: number;
  private multiHitsRemaining: number = GAMEPLAY_CONFIG.MULTI_COIN_MAX_HITS;
  private multiWindowStartMs: number | null = null;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    kind: BlockKind,
    theme: LevelTheme,
  ) {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = row * TILE_SIZE + TILE_SIZE / 2;
    const tex =
      kind === 'brick' || kind === 'multi-gem'
        ? getBrickTexture(theme)
        : kind === 'hidden-1up'
          ? 'used-block'
          : 'question-block';

    super(scene, x, y, tex, 0);
    this.kind = kind;
    this.baseY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(5);

    if (kind === 'hidden-1up') {
      this.setVisible(false);
    } else if (kind === 'question-gem' || kind === 'question-powerup' || kind === 'question-star') {
      this.play('question-blink');
    }
  }

  public isSolidFor(pipVy: number, pipBottom: number): boolean {
    if (this.kind === 'hidden-1up' && !this.hiddenRevealed) {
      // Hidden block only blocks when Pip hits it moving upward from below
      return pipVy < 0 && pipBottom > this.y + 4;
    }
    return true;
  }

  public hitFromBelow(isBigOrFire: boolean, nowMs: number): BlockHitOutcome {
    if (this.isBouncing) return { type: 'none' };

    if (this.kind === 'hidden-1up') {
      if (this.used) return { type: 'bump' };
      this.hiddenRevealed = true;
      this.used = true;
      this.setVisible(true);
      this.setTexture('used-block');
      this.bounce();
      return { type: 'oneup' };
    }

    if (this.used) {
      return { type: 'bump' };
    }

    if (this.kind === 'brick') {
      if (isBigOrFire) {
        return { type: 'break' };
      }
      this.bounce();
      return { type: 'bump' };
    }

    if (this.kind === 'multi-gem') {
      if (this.multiWindowStartMs === null) {
        this.multiWindowStartMs = nowMs;
      }
      this.multiHitsRemaining -= 1;
      const expired = nowMs - this.multiWindowStartMs >= GAMEPLAY_CONFIG.MULTI_COIN_WINDOW_MS;
      if (this.multiHitsRemaining <= 0 || expired) {
        this.used = true;
        this.setTexture('used-block');
      }
      this.bounce();
      return { type: 'gem' };
    }

    // question-*
    this.used = true;
    this.anims.stop();
    this.setTexture('used-block');
    this.bounce();

    if (this.kind === 'question-gem') return { type: 'gem' };
    if (this.kind === 'question-powerup') return { type: 'powerup' };
    return { type: 'star' };
  }

  private bounce(): void {
    this.isBouncing = true;
    this.scene.tweens.add({
      targets: this,
      y: this.baseY - 6,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.y = this.baseY;
        this.isBouncing = false;
      },
    });
  }
}

export type { BlockKind };
