import Phaser from 'phaser';
import {
  InputEdgeTracker,
  TouchPointerTracker,
  type InputState,
  type TouchAction,
} from './inputLogic';

export type { InputState, TouchAction };

export class InputManager {
  private keys: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    k: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key;
    x: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
    p: Phaser.Input.Keyboard.Key;
    m: Phaser.Input.Keyboard.Key;
  } | null = null;

  public readonly touchTracker = new TouchPointerTracker();
  private readonly edgeTracker = new InputEdgeTracker();
  private lastState: InputState;

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = {
        left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        k: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
        j: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
        x: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
        esc: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
        p: kb.addKey(Phaser.Input.Keyboard.KeyCodes.P),
        m: kb.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      };
    }

    this.lastState = this.edgeTracker.step({
      left: false,
      right: false,
      down: false,
      jump: false,
      run: false,
      fire: false,
      pause: false,
      mute: false,
    });
  }

  public setLocked(locked: boolean): void {
    this.edgeTracker.setLocked(locked);
    if (locked) {
      this.touchTracker.clearAll();
    }
  }

  public triggerPausePulse(): void {
    this.edgeTracker.triggerPausePulse();
  }

  public getLastState(): InputState {
    return this.lastState;
  }

  /**
   * Must be called ONCE at the beginning of each fixed 60Hz logic step.
   */
  public poll(): InputState {
    const k = this.keys;
    const pad = this.scene.input.gamepad?.getPad(0);
    const touch = this.touchTracker.getSnapshot();

    const padLeft = Boolean(pad && (pad.left || (pad.leftStick?.x ?? 0) < -0.35));
    const padRight = Boolean(pad && (pad.right || (pad.leftStick?.x ?? 0) > 0.35));
    const padDown = Boolean(pad && (pad.down || (pad.leftStick?.y ?? 0) > 0.45));
    const padJump = Boolean(pad && pad.A);
    const padRunFire = Boolean(pad && pad.X);
    const padStart = Boolean(pad && pad.buttons[9]?.pressed);

    const left = Boolean(k?.left.isDown || k?.a.isDown || padLeft || touch.left);
    const right = Boolean(k?.right.isDown || k?.d.isDown || padRight || touch.right);
    const down = Boolean(k?.down.isDown || k?.s.isDown || padDown || touch.down);
    const jump = Boolean(
      k?.space.isDown || k?.w.isDown || k?.up.isDown || k?.z.isDown || padJump || touch.jump,
    );
    const run = Boolean(k?.shift.isDown || k?.k.isDown || padRunFire || touch.run);
    const fire = Boolean(k?.j.isDown || k?.x.isDown || run || touch.fire);
    const pause = Boolean(k?.esc.isDown || k?.p.isDown || padStart || touch.pause);
    const mute = Boolean(k?.m.isDown);

    this.lastState = this.edgeTracker.step({
      left,
      right,
      down,
      jump,
      run,
      fire,
      pause,
      mute,
    });
    return this.lastState;
  }
}
