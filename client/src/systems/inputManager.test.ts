import { describe, expect, it } from 'vitest';
import { InputEdgeTracker, TouchPointerTracker, type RawDigitalInput } from './inputLogic';

function combineRaw(tracker: TouchPointerTracker): RawDigitalInput {
  const snap = tracker.getSnapshot();
  return {
    left: snap.left,
    right: snap.right,
    down: snap.down,
    jump: snap.jump,
    run: snap.run,
    fire: snap.fire,
    pause: snap.pause,
    mute: false,
  };
}

describe('TouchPointerTracker + InputEdgeTracker multi-touch state', () => {
  it('maintains jumpHeld until pointerup/cancel of same pointerId and ignores pointerout', () => {
    const touch = new TouchPointerTracker();
    const edges = new InputEdgeTracker();

    // Frame 1: pointer id=1 presses Jump
    touch.handlePointerDown(1, ['jump']);
    const s1 = edges.step(combineRaw(touch));
    expect(s1.jumpPressed).toBe(true);
    expect(s1.jumpHeld).toBe(true);
    expect(s1.jumpReleased).toBe(false);

    // Frame 2: pointer id=2 presses Right while finger slides slightly triggering pointerout on id=1
    touch.handlePointerDown(2, ['right']);
    touch.handlePointerOut(1);
    const s2 = edges.step(combineRaw(touch));
    expect(s2.right).toBe(true);
    expect(s2.jumpHeld).toBe(true);
    expect(s2.jumpPressed).toBe(false);
    expect(s2.jumpReleased).toBe(false);

    // Frame 3: pointer id=1 releases Jump, pointer id=2 still holds Right
    touch.handlePointerUpOrCancel(1);
    const s3 = edges.step(combineRaw(touch));
    expect(s3.jumpHeld).toBe(false);
    expect(s3.jumpReleased).toBe(true);
    expect(s3.right).toBe(true);

    // Frame 4: steady state after release
    const s4 = edges.step(combineRaw(touch));
    expect(s4.jumpReleased).toBe(false);
    expect(s4.jumpHeld).toBe(false);
    expect(s4.right).toBe(true);
  });

  it('tracks simultaneous 3-finger input (left + run + jump) and slide across Run+Jump', () => {
    const touch = new TouchPointerTracker();
    const edges = new InputEdgeTracker();

    touch.handlePointerDown(10, ['left']);
    touch.handlePointerDown(11, ['run']);
    touch.handlePointerDown(12, ['jump']);

    const s1 = edges.step(combineRaw(touch));
    expect(s1.left).toBe(true);
    expect(s1.runHeld).toBe(true);
    expect(s1.runPressed).toBe(true);
    expect(s1.jumpHeld).toBe(true);
    expect(s1.jumpPressed).toBe(true);

    // Slide pointer 11 across bridge holding both run + fire + jump simultaneously
    touch.handlePointerUpOrCancel(12);
    touch.handlePointerMove(11, ['run', 'fire', 'jump']);
    const s2 = edges.step(combineRaw(touch));
    expect(s2.left).toBe(true);
    expect(s2.runHeld).toBe(true);
    expect(s2.firePressed).toBe(true);
    expect(s2.fireHeld).toBe(true);
    expect(s2.jumpHeld).toBe(true);
    expect(s2.jumpReleased).toBe(false);
  });
});
