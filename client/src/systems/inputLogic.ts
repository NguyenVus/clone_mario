export type TouchAction = 'left' | 'right' | 'down' | 'jump' | 'run' | 'fire' | 'pause';

export interface RawDigitalInput {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  run: boolean;
  fire: boolean;
  pause: boolean;
  mute: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  runHeld: boolean;
  runPressed: boolean;
  runReleased: boolean;
  fireHeld: boolean;
  firePressed: boolean;
  fireReleased: boolean;
  pauseHeld: boolean;
  pausePressed: boolean;
  pauseReleased: boolean;
  mutePressed: boolean;
}

/**
 * Tracks multi-touch pointer IDs per action so pointerout never falsely releases a held button.
 */
export class TouchPointerTracker {
  private readonly pointers = new Map<number, Set<TouchAction>>();

  public handlePointerDown(pointerId: number, actions: TouchAction[]): void {
    this.pointers.set(pointerId, new Set(actions));
  }

  public handlePointerMove(pointerId: number, actions: TouchAction[]): void {
    if (!this.pointers.has(pointerId)) return;
    this.pointers.set(pointerId, new Set(actions));
  }

  /**
   * Intentionally does NOT release on pointerout; only pointerup / pointercancel / pointerupoutside release.
   */
  public handlePointerOut(_pointerId: number): void {
    // No-op by design: fingers sliding slightly outside visual bounds keep holding until pointerup/cancel.
  }

  public handlePointerUpOrCancel(pointerId: number): void {
    this.pointers.delete(pointerId);
  }

  public clearAll(): void {
    this.pointers.clear();
  }

  public isHeld(action: TouchAction): boolean {
    for (const set of this.pointers.values()) {
      if (set.has(action)) return true;
    }
    return false;
  }

  public getSnapshot(): Record<TouchAction, boolean> {
    return {
      left: this.isHeld('left'),
      right: this.isHeld('right'),
      down: this.isHeld('down'),
      jump: this.isHeld('jump'),
      run: this.isHeld('run'),
      fire: this.isHeld('fire'),
      pause: this.isHeld('pause'),
    };
  }
}

/**
 * Pure edge-detection state machine polled exactly ONCE per fixed 60Hz logic step.
 */
export class InputEdgeTracker {
  private prevJump = false;
  private prevRun = false;
  private prevFire = false;
  private prevPause = false;
  private prevMute = false;
  private latchedPause = false;
  private locked = false;

  public setLocked(locked: boolean): void {
    this.locked = locked;
    if (locked) {
      this.reset();
    }
  }

  public triggerPausePulse(): void {
    this.latchedPause = true;
  }

  public reset(): void {
    this.prevJump = false;
    this.prevRun = false;
    this.prevFire = false;
    this.prevPause = false;
    this.prevMute = false;
    this.latchedPause = false;
  }

  public step(raw: RawDigitalInput): InputState {
    if (this.locked) {
      this.reset();
      return {
        left: false,
        right: false,
        down: false,
        jumpHeld: false,
        jumpPressed: false,
        jumpReleased: false,
        runHeld: false,
        runPressed: false,
        runReleased: false,
        fireHeld: false,
        firePressed: false,
        fireReleased: false,
        pauseHeld: false,
        pausePressed: false,
        pauseReleased: false,
        mutePressed: false,
      };
    }

    const pauseNow = raw.pause || this.latchedPause;
    this.latchedPause = false;

    const jumpPressed = raw.jump && !this.prevJump;
    const jumpReleased = !raw.jump && this.prevJump;
    const runPressed = raw.run && !this.prevRun;
    const runReleased = !raw.run && this.prevRun;
    const firePressed = raw.fire && !this.prevFire;
    const fireReleased = !raw.fire && this.prevFire;
    const pausePressed = pauseNow && !this.prevPause;
    const pauseReleased = !pauseNow && this.prevPause;
    const mutePressed = raw.mute && !this.prevMute;

    this.prevJump = raw.jump;
    this.prevRun = raw.run;
    this.prevFire = raw.fire;
    this.prevPause = pauseNow;
    this.prevMute = raw.mute;

    return {
      left: raw.left && !raw.right,
      right: raw.right && !raw.left,
      down: raw.down,
      jumpHeld: raw.jump,
      jumpPressed,
      jumpReleased,
      runHeld: raw.run,
      runPressed,
      runReleased,
      fireHeld: raw.fire,
      firePressed,
      fireReleased,
      pauseHeld: pauseNow,
      pausePressed,
      pauseReleased,
      mutePressed,
    };
  }
}
