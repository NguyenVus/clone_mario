import Phaser from 'phaser';

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  run: boolean;
  fire: boolean;
  firePressed: boolean;
  pausePressed: boolean;
  mutePressed: boolean;
}

export interface TouchInputState {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  runFire: boolean;
  pausePressed: boolean;
}

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

  private touchState: TouchInputState = {
    left: false,
    right: false,
    down: false,
    jump: false,
    runFire: false,
    pausePressed: false,
  };

  private prevJump = false;
  private prevFire = false;
  private prevPause = false;
  private prevMute = false;
  private locked = false;

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
  }

  public setLocked(locked: boolean): void {
    this.locked = locked;
  }

  public setTouchState(partial: Partial<TouchInputState>): void {
    Object.assign(this.touchState, partial);
  }

  public consumeTouchPause(): void {
    this.touchState.pausePressed = false;
  }

  public poll(): InputState {
    if (this.locked) {
      this.prevJump = false;
      this.prevFire = false;
      this.prevPause = false;
      this.prevMute = false;
      return {
        left: false,
        right: false,
        down: false,
        jump: false,
        jumpPressed: false,
        run: false,
        fire: false,
        firePressed: false,
        pausePressed: false,
        mutePressed: false,
      };
    }

    const k = this.keys;
    const pad = this.scene.input.gamepad?.getPad(0);

    const padLeft = Boolean(pad && (pad.left || (pad.leftStick?.x ?? 0) < -0.35));
    const padRight = Boolean(pad && (pad.right || (pad.leftStick?.x ?? 0) > 0.35));
    const padDown = Boolean(pad && (pad.down || (pad.leftStick?.y ?? 0) > 0.45));
    const padJump = Boolean(pad && pad.A);
    const padRunFire = Boolean(pad && pad.X);
    const padStart = Boolean(pad && pad.buttons[9]?.pressed);

    const left = Boolean(k?.left.isDown || k?.a.isDown || padLeft || this.touchState.left);
    const right = Boolean(k?.right.isDown || k?.d.isDown || padRight || this.touchState.right);
    const down = Boolean(k?.down.isDown || k?.s.isDown || padDown || this.touchState.down);
    const jump = Boolean(
      k?.space.isDown || k?.w.isDown || k?.up.isDown || k?.z.isDown || padJump || this.touchState.jump,
    );
    const run = Boolean(k?.shift.isDown || k?.k.isDown || padRunFire || this.touchState.runFire);
    const fire = Boolean(k?.j.isDown || k?.x.isDown || run);
    const pauseDown = Boolean(k?.esc.isDown || k?.p.isDown || padStart || this.touchState.pausePressed);
    const muteDown = Boolean(k?.m.isDown);

    const jumpPressed = jump && !this.prevJump;
    const firePressed = fire && !this.prevFire;
    const pausePressed = pauseDown && !this.prevPause;
    const mutePressed = muteDown && !this.prevMute;

    this.prevJump = jump;
    this.prevFire = fire;
    this.prevPause = pauseDown;
    this.prevMute = muteDown;
    this.touchState.pausePressed = false;

    return {
      left: left && !right,
      right: right && !left,
      down,
      jump,
      jumpPressed,
      run,
      fire,
      firePressed,
      pausePressed,
      mutePressed,
    };
  }
}
