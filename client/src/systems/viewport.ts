import { GAME_HEIGHT } from '../config';

export const MIN_LOGICAL_WIDTH = 360;
export const MAX_LOGICAL_WIDTH = 560;

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LogicalViewportSize {
  width: number;
  height: number;
}

export function computeLogicalSize(viewportWidth: number, viewportHeight: number): LogicalViewportSize {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
    return { width: 400, height: GAME_HEIGHT };
  }
  const raw = Math.round((GAME_HEIGHT * viewportWidth) / viewportHeight);
  const width = Math.max(MIN_LOGICAL_WIDTH, Math.min(MAX_LOGICAL_WIDTH, raw));
  return { width, height: GAME_HEIGHT };
}

export function readCssSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const style = window.getComputedStyle(document.documentElement);
  const parsePx = (prop: string): number => {
    const val = Number.parseFloat(style.getPropertyValue(prop));
    return Number.isFinite(val) ? Math.max(0, val) : 0;
  };
  return {
    top: parsePx('--sat'),
    right: parsePx('--sar'),
    bottom: parsePx('--sab'),
    left: parsePx('--sal'),
  };
}

export function cssInsetsToLogical(
  insets: SafeAreaInsets,
  cssWidth: number,
  cssHeight: number,
  logicalWidth: number,
  logicalHeight: number,
): SafeAreaInsets {
  if (cssWidth <= 0 || cssHeight <= 0) return { top: 0, right: 0, bottom: 0, left: 0 };
  const scaleX = logicalWidth / cssWidth;
  const scaleY = logicalHeight / cssHeight;
  return {
    top: Math.ceil(insets.top * scaleY),
    right: Math.ceil(insets.right * scaleX),
    bottom: Math.ceil(insets.bottom * scaleY),
    left: Math.ceil(insets.left * scaleX),
  };
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIphoneOrIpod = /iPhone|iPod/i.test(ua);
  const isWebKit = /WebKit/i.test(ua);
  const isNotCriOS = !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  return isIphoneOrIpod && isWebKit && isNotCriOS;
}

export function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || hasTouch;
}
