import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT } from '../config';
import { computeLogicalSize, MAX_LOGICAL_WIDTH, MIN_LOGICAL_WIDTH } from './viewport';

describe('computeLogicalSize responsive viewport scaling', () => {
  it('keeps fixed logical height at 240 across aspect ratios', () => {
    expect(computeLogicalSize(854, 480).height).toBe(GAME_HEIGHT);
    expect(computeLogicalSize(844, 390).height).toBe(GAME_HEIGHT);
    expect(computeLogicalSize(1024, 768).height).toBe(GAME_HEIGHT);
    expect(computeLogicalSize(1050, 450).height).toBe(GAME_HEIGHT);
  });

  it('computes 16:9 as ~427x240 without black sidebars', () => {
    const size = computeLogicalSize(1280, 720);
    expect(size).toEqual({ width: 427, height: 240 });
  });

  it('computes 19.5:9 (iPhone 15 / Pixel 7 landscape) dynamically within bounds', () => {
    const iphone15 = computeLogicalSize(844, 390);
    const pixel7 = computeLogicalSize(915, 412);
    expect(iphone15).toEqual({ width: 519, height: 240 });
    expect(pixel7).toEqual({ width: 533, height: 240 });
    expect(iphone15.width).toBeGreaterThanOrEqual(MIN_LOGICAL_WIDTH);
    expect(pixel7.width).toBeLessThanOrEqual(MAX_LOGICAL_WIDTH);
  });

  it('clamps 4:3 (narrow/tablet) to MIN_LOGICAL_WIDTH (360) and ultra-wide 21:9+ to MAX_LOGICAL_WIDTH (560)', () => {
    expect(computeLogicalSize(800, 600).width).toBe(360);
    expect(computeLogicalSize(640, 520).width).toBe(MIN_LOGICAL_WIDTH);
    expect(computeLogicalSize(1050, 450).width).toBe(560);
    expect(computeLogicalSize(1600, 600).width).toBe(MAX_LOGICAL_WIDTH);
  });
});
