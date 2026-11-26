export type PowerState = 'small' | 'big' | 'fire';
export type PowerEvent = 'powerCell' | 'flameCore' | 'hurt';

export interface PowerTransitionResult {
  nextState: PowerState;
  died: boolean;
  points: number;
  changed: boolean;
}

/**
 * Pure state machine for Pip power-up / damage transitions.
 */
export function nextPowerState(current: PowerState, event: PowerEvent): PowerTransitionResult {
  if (event === 'powerCell') {
    if (current === 'small') {
      return { nextState: 'big', died: false, points: 1000, changed: true };
    }
    return { nextState: current, died: false, points: 1000, changed: false };
  }

  if (event === 'flameCore') {
    if (current === 'small') {
      return { nextState: 'big', died: false, points: 1000, changed: true };
    }
    if (current === 'big') {
      return { nextState: 'fire', died: false, points: 1000, changed: true };
    }
    return { nextState: 'fire', died: false, points: 1000, changed: false };
  }

  if (current === 'fire') {
    return { nextState: 'big', died: false, points: 0, changed: true };
  }
  if (current === 'big') {
    return { nextState: 'small', died: false, points: 0, changed: true };
  }
  return { nextState: 'small', died: true, points: 0, changed: false };
}
