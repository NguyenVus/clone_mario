import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, PHYSICS_CONFIG } from '../config';
import type { InputState } from '../systems/InputManager';
import {
  nextPowerState,
  type PowerEvent,
  type PowerState,
  type PowerTransitionResult,
} from './powerState';

export { nextPowerState, type PowerEvent, type PowerState, type PowerTransitionResult };

export class Player extends Phaser.Physics.Arcade.Sprite {
  public powerState: PowerState;
  public facing: 1 | -1 = 1;
  public isDead = false;
  public isCrouching = false;
  public isInvulnerable = false;
  public starTimerMs = 0;
  public prevBottom = 0;

  private coyoteTimerMs = 0;
  private jumpBufferTimerMs = 0;
  private invulnTimerMs = 0;
  private flashTimerMs = 0;
  private starCycleMs = 0;
  private starPaletteIndex = 0;
  private shootAnimMs = 0;
  private landPoseMs = 0;
  private blinkCountdownMs = 2800;
  private blinkActiveMs = 0;
  private fireCooldownMs = 0;
  private dustTimerMs = 0;
  private starTrailTimerMs = 0;
  private wasOnGround = false;
  private lastAirMaxVy = 0;
  private controlLocked = false;
  private debugGodMode = false;
  private victoryMode = false;

  // Secondary spring motion for Pip's antenna glow orb
  private antennaLagX = 0;
  private readonly antennaOrb: Phaser.GameObjects.Arc;

  private onEmitDust?: (x: number, y: number) => void;
  private onEmitStarTrail?: (x: number, y: number) => void;
  private onLandHard?: (x: number, y: number) => void;
  private onJumpSound?: (isBig: boolean) => void;
  private onFireball?: (x: number, y: number, dir: 1 | -1) => boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, initialState: PowerState = 'small') {
    super(
      scene,
      x,
      y,
      initialState === 'small' ? 'pip-small' : initialState === 'fire' ? 'pip-fire' : 'pip-big',
      0,
    );
    this.powerState = initialState;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(10);

    // Subtle antenna glowing LED orb with velocity spring lag
    this.antennaOrb = scene.add.circle(x, y - 16, 1.5, 0xa8ffb8, 0.9).setDepth(11);

    const body = this.getArcadeBody();
    body.setGravityY(PHYSICS_CONFIG.GRAVITY);
    body.setMaxVelocityY(PHYSICS_CONFIG.MAX_FALL_SPEED);
    this.applyHitbox(false);
    this.prevBottom = body.bottom;

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.antennaOrb.destroy();
    });
  }

  public getArcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  public setCallbacks(callbacks: {
    onEmitDust?: (x: number, y: number) => void;
    onEmitStarTrail?: (x: number, y: number) => void;
    onLandHard?: (x: number, y: number) => void;
    onJumpSound?: (isBig: boolean) => void;
    onFireball?: (x: number, y: number, dir: 1 | -1) => boolean;
  }): void {
    this.onEmitDust = callbacks.onEmitDust;
    this.onEmitStarTrail = callbacks.onEmitStarTrail;
    this.onLandHard = callbacks.onLandHard;
    this.onJumpSound = callbacks.onJumpSound;
    this.onFireball = callbacks.onFireball;
  }

  public setControlLocked(locked: boolean): void {
    this.controlLocked = locked;
  }

  public setVictoryPose(active: boolean): void {
    this.victoryMode = active;
    if (active) {
      const prefix =
        this.powerState === 'small' ? 'pip-small' : this.powerState === 'fire' ? 'pip-fire' : 'pip-big';
      this.play(`${prefix}-victory`, true);
    }
  }

  public setGodMode(enabled: boolean): void {
    this.debugGodMode = enabled;
  }

  public isGodMode(): boolean {
    return this.debugGodMode;
  }

  public hasStar(): boolean {
    return this.starTimerMs > 0;
  }

  public activateStar(): void {
    this.starTimerMs = PHYSICS_CONFIG.STAR_DURATION_MS;
    this.starCycleMs = 0;
  }

  public applyPowerState(next: PowerState): void {
    this.powerState = next;
    this.isCrouching = false;
    this.applyHitbox(false);
    this.updateTextureVisual(0, 0, true, false);
  }

  public startInvulnerability(durationMs = PHYSICS_CONFIG.HURT_INVULN_MS): void {
    this.isInvulnerable = true;
    this.invulnTimerMs = durationMs;
    this.flashTimerMs = 0;
  }

  public playSquash(scaleX: number, scaleY: number, durationMs = 80): void {
    this.setScale(scaleX, scaleY);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: durationMs,
      ease: 'Quad.easeOut',
    });
  }

  private applyHitbox(crouching: boolean): void {
    const body = this.getArcadeBody();
    const prevBottom = this.y;
    if (this.powerState === 'small' || crouching) {
      const texH = this.powerState === 'small' ? 16 : 32;
      body.setSize(12, 14);
      body.setOffset(2, texH - 14);
    } else {
      body.setSize(12, 28);
      body.setOffset(2, 4);
    }
    this.y = prevBottom;
  }

  public updatePlayer(
    dtMs: number,
    input: InputState,
    cameraLeftX: number,
    worldWidthPx: number,
  ): void {
    if (this.isDead) {
      this.antennaOrb.setVisible(false);
      return;
    }

    const body = this.getArcadeBody();
    const dt = dtMs / 1000;
    const onGround = body.blocked.down || body.touching.down;

    if (onGround && !this.wasOnGround) {
      if (this.lastAirMaxVy > 220) {
        this.landPoseMs = 75;
        this.onLandHard?.(this.x, body.bottom);
        this.playSquash(1.12, 0.9);
      }
      this.lastAirMaxVy = 0;
    } else if (!onGround) {
      this.lastAirMaxVy = Math.max(this.lastAirMaxVy, body.velocity.y);
    }

    if (this.landPoseMs > 0) this.landPoseMs = Math.max(0, this.landPoseMs - dtMs);

    // Random blink every 2..5s
    if (this.blinkActiveMs > 0) {
      this.blinkActiveMs = Math.max(0, this.blinkActiveMs - dtMs);
    } else {
      this.blinkCountdownMs -= dtMs;
      if (this.blinkCountdownMs <= 0) {
        this.blinkActiveMs = 140;
        this.blinkCountdownMs = Phaser.Math.Between(2200, 5000);
      }
    }

    if (this.isInvulnerable) {
      this.invulnTimerMs -= dtMs;
      this.flashTimerMs += dtMs;
      if (this.flashTimerMs >= 60) {
        this.flashTimerMs = 0;
        this.setAlpha(this.alpha < 0.8 ? 1 : 0.3);
      }
      if (this.invulnTimerMs <= 0) {
        this.isInvulnerable = false;
        this.setAlpha(1);
      }
    }

    if (this.starTimerMs > 0) {
      this.starTimerMs = Math.max(0, this.starTimerMs - dtMs);
      const cycleInterval = this.starTimerMs <= 2000 ? 120 : 55;
      this.starCycleMs += dtMs;
      if (this.starCycleMs >= cycleInterval) {
        this.starCycleMs = 0;
        this.starPaletteIndex = (this.starPaletteIndex + 1) % 4;
      }
      this.starTrailTimerMs += dtMs;
      if (this.starTrailTimerMs >= 50) {
        this.starTrailTimerMs = 0;
        this.onEmitStarTrail?.(this.x, body.center.y);
      }
    }

    if (this.fireCooldownMs > 0) this.fireCooldownMs = Math.max(0, this.fireCooldownMs - dtMs);
    if (this.shootAnimMs > 0) this.shootAnimMs = Math.max(0, this.shootAnimMs - dtMs);

    if (this.controlLocked) {
      this.updateAntennaOrb(dt, body.velocity.x);
      this.wasOnGround = onGround;
      return;
    }

    const wantsCrouch = this.powerState !== 'small' && onGround && input.down;
    if (wantsCrouch !== this.isCrouching) {
      this.isCrouching = wantsCrouch;
      this.applyHitbox(this.isCrouching);
    }

    const accelMult = onGround ? 1 : PHYSICS_CONFIG.AIR_ACCEL_MULT;
    const maxSpeed = input.run ? PHYSICS_CONFIG.RUN_MAX_SPEED : PHYSICS_CONFIG.WALK_MAX_SPEED;
    const targetDir = this.isCrouching ? 0 : input.left ? -1 : input.right ? 1 : 0;

    let vx = body.velocity.x;
    let isSkidding = false;

    if (targetDir !== 0) {
      this.facing = targetDir;
      const opposing = vx !== 0 && Math.sign(vx) !== targetDir;
      if (opposing) {
        isSkidding = onGround && Math.abs(vx) > 40;
        const decel =
          (isSkidding ? PHYSICS_CONFIG.SKID_DECEL : PHYSICS_CONFIG.GROUND_DECEL) * accelMult;
        vx += targetDir * decel * dt;
        if (Math.sign(vx) === targetDir && Math.abs(vx) < 15) {
          vx = targetDir * 15;
        }
      } else {
        const accel = (input.run ? PHYSICS_CONFIG.RUN_ACCEL : PHYSICS_CONFIG.GROUND_ACCEL) * accelMult;
        vx += targetDir * accel * dt;
        if (Math.abs(vx) > maxSpeed) {
          vx -= Math.sign(vx) * PHYSICS_CONFIG.GROUND_DECEL * dt;
          if (Math.abs(vx) < maxSpeed) vx = targetDir * maxSpeed;
        }
      }
    } else {
      const decel = PHYSICS_CONFIG.GROUND_DECEL * (onGround ? 1 : 0.35);
      if (Math.abs(vx) <= decel * dt) {
        vx = 0;
      } else {
        vx -= Math.sign(vx) * decel * dt;
      }
    }

    body.setVelocityX(vx);

    if (onGround) {
      this.coyoteTimerMs = PHYSICS_CONFIG.COYOTE_TIME_MS;
    } else {
      this.coyoteTimerMs = Math.max(0, this.coyoteTimerMs - dtMs);
    }

    if (input.jumpPressed) {
      this.jumpBufferTimerMs = PHYSICS_CONFIG.JUMP_BUFFER_MS;
    } else {
      this.jumpBufferTimerMs = Math.max(0, this.jumpBufferTimerMs - dtMs);
    }

    if (this.jumpBufferTimerMs > 0 && this.coyoteTimerMs > 0) {
      const isFast = Math.abs(vx) > PHYSICS_CONFIG.RUN_JUMP_SPEED_THRESHOLD;
      const jumpVel = isFast ? PHYSICS_CONFIG.RUN_JUMP_VELOCITY : PHYSICS_CONFIG.JUMP_VELOCITY;
      body.setVelocityY(jumpVel);
      this.coyoteTimerMs = 0;
      this.jumpBufferTimerMs = 0;
      this.playSquash(0.9, 1.1);
      this.onJumpSound?.(this.powerState !== 'small');
    }

    if (!input.jump && body.velocity.y < PHYSICS_CONFIG.JUMP_CUT_VY_THRESHOLD) {
      body.setVelocityY(body.velocity.y * PHYSICS_CONFIG.JUMP_CUT_MULT);
    }

    if (
      this.powerState === 'fire' &&
      !this.isCrouching &&
      input.firePressed &&
      this.fireCooldownMs <= 0 &&
      this.onFireball
    ) {
      const spawnX = this.x + this.facing * 8;
      const spawnY = body.center.y - 2;
      if (this.onFireball(spawnX, spawnY, this.facing)) {
        this.fireCooldownMs = GAMEPLAY_CONFIG.FIREBALL_COOLDOWN_MS;
        this.shootAnimMs = 130;
      }
    }

    if (PHYSICS_CONFIG.PREVENT_BACKTRACK) {
      const minX = cameraLeftX + body.halfWidth + 1;
      if (this.x < minX) {
        this.x = minX;
        if (body.velocity.x < 0) body.setVelocityX(0);
      }
    }
    const maxX = worldWidthPx - body.halfWidth - 1;
    if (this.x > maxX) {
      this.x = maxX;
      if (body.velocity.x > 0) body.setVelocityX(0);
    }

    if (onGround && (isSkidding || Math.abs(vx) > 85)) {
      this.dustTimerMs += dtMs;
      const interval = isSkidding ? 55 : 120;
      if (this.dustTimerMs >= interval) {
        this.dustTimerMs = 0;
        this.onEmitDust?.(this.x - this.facing * 4, body.bottom - 1);
      }
    } else {
      this.dustTimerMs = 0;
    }

    this.updateTextureVisual(vx, body.velocity.y, onGround, isSkidding);
    this.updateAntennaOrb(dt, vx);
    this.wasOnGround = onGround;
  }

  private updateAntennaOrb(dt: number, vx: number): void {
    const targetLag = Phaser.Math.Clamp(-vx * 0.015, -2.5, 2.5);
    this.antennaLagX = Phaser.Math.Linear(this.antennaLagX, targetLag, Math.min(1, dt * 14));
    const headHeight = this.powerState === 'small' || this.isCrouching ? 15 : 31;
    const pulse = 0.75 + Math.sin(this.scene.time.now * 0.01) * 0.25;
    this.antennaOrb
      .setVisible(this.visible)
      .setAlpha(pulse * this.alpha)
      .setPosition(Math.round(this.x + this.antennaLagX), Math.round(this.y - headHeight));
  }

  public recordPrevBottom(): void {
    this.prevBottom = this.getArcadeBody().bottom;
  }

  private updateTextureVisual(
    vx: number,
    vy: number,
    onGround: boolean,
    isSkidding: boolean,
  ): void {
    this.setFlipX(this.facing === -1);
    if (this.victoryMode) return;

    const prefix =
      this.powerState === 'small' ? 'pip-small' : this.powerState === 'fire' ? 'pip-fire' : 'pip-big';

    if (this.starTimerMs > 0) {
      const starTex =
        this.powerState === 'small'
          ? `pip-small-star${this.starPaletteIndex}`
          : `pip-big-star${this.starPaletteIndex}`;
      let frame = 0;
      if (!onGround) {
        frame = vy < -60 ? 15 : vy > 60 ? 17 : 16;
      } else if (this.isCrouching && this.powerState !== 'small') {
        frame = 20;
      } else if (isSkidding) {
        frame = 19;
      } else if (Math.abs(vx) > 125) {
        frame = 9 + (Math.floor(this.scene.time.now / 65) % 6);
      } else if (Math.abs(vx) > 8) {
        frame = 5 + (Math.floor(this.scene.time.now / 95) % 4);
      } else if (this.blinkActiveMs > 0) {
        frame = 4;
      } else {
        frame = Math.floor(this.scene.time.now / 170) % 4;
      }
      this.anims.stop();
      this.setTexture(starTex, frame);
      return;
    }

    if (this.shootAnimMs > 0 && this.powerState === 'fire') {
      this.play(`${prefix}-shoot`, true);
      return;
    }

    if (!onGround) {
      if (vy < -60) this.play(`${prefix}-jump-up`, true);
      else if (vy > 60) this.play(`${prefix}-fall`, true);
      else this.play(`${prefix}-jump-peak`, true);
    } else if (this.landPoseMs > 0) {
      this.play(`${prefix}-land`, true);
    } else if (this.isCrouching && this.powerState !== 'small') {
      this.play(`${prefix}-crouch`, true);
    } else if (isSkidding) {
      this.play(`${prefix}-skid`, true);
    } else if (Math.abs(vx) > 125) {
      this.play(`${prefix}-run`, true);
      this.anims.timeScale = 1;
    } else if (Math.abs(vx) > 8) {
      this.play(`${prefix}-walk`, true);
      this.anims.timeScale = 1;
    } else if (this.blinkActiveMs > 0) {
      this.play(`${prefix}-blink`, true);
    } else {
      this.play(`${prefix}-idle`, true);
    }
  }
}
