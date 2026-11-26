import type { TouchAction } from '../systems/inputLogic';
import type { InputManager } from '../systems/InputManager';
import type { CustomTouchLayout, GameSettings } from '../systems/SaveManager';
import { readCssSafeAreaInsets } from '../systems/viewport';

const SIZE_MULT = {
  small: 0.85,
  medium: 1.0,
  large: 1.18,
} as const;

export class HtmlTouchControls {
  private readonly root: HTMLElement;
  private inputManager: InputManager | null = null;
  private settings: GameSettings;
  private activeInGameplay = false;
  private editMode = false;

  private leftBtn: HTMLDivElement | null = null;
  private rightBtn: HTMLDivElement | null = null;
  private jumpBtn: HTMLDivElement | null = null;
  private runBtn: HTMLDivElement | null = null;
  private joyKnob: HTMLDivElement | null = null;
  private moveStartY = new Map<number, number>();

  constructor(settings: GameSettings) {
    this.settings = settings;
    const el = document.getElementById('touch-controls-overlay');
    if (!el) {
      throw new Error('Missing #touch-controls-overlay element');
    }
    this.root = el;
    this.rebuild();
  }

  public attachInputManager(im: InputManager | null): void {
    this.inputManager = im;
    this.syncVisuals();
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = settings;
    this.rebuild();
  }

  public setGameplayVisible(visible: boolean): void {
    this.activeInGameplay = visible;
    if (!visible && !this.editMode) {
      this.inputManager?.touchTracker.clearAll();
      this.syncVisuals();
    }
    this.updateVisibility();
  }

  public openLayoutEditor(
    onSaveLayout: (layout: CustomTouchLayout | undefined) => void,
    onClose: () => void,
  ): void {
    this.editMode = true;
    this.rebuild(onSaveLayout, onClose);
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const show = this.editMode || (this.activeInGameplay && this.settings.touch);
    this.root.classList.toggle('visible', show);
  }

  public rebuild(
    onSaveLayout?: (layout: CustomTouchLayout | undefined) => void,
    onCloseEditor?: () => void,
  ): void {
    this.root.innerHTML = '';
    this.leftBtn = null;
    this.rightBtn = null;
    this.jumpBtn = null;
    this.runBtn = null;
    this.joyKnob = null;
    this.moveStartY.clear();

    const mult = SIZE_MULT[this.settings.touchSize];
    const moveSize = Math.max(48, Math.round(64 * mult));
    const jumpSize = Math.max(56, Math.round(80 * mult));
    const runSize = Math.max(48, Math.round(64 * mult));
    const alpha = Math.max(0.2, Math.min(0.8, this.settings.touchAlpha / 100));

    const insets = readCssSafeAreaInsets();
    const padX = 16;
    const padY = 16;
    const leftHanded = this.settings.touchLeftHanded;
    const custom = this.settings.customTouchLayout ?? {};

    // Movement cluster
    const moveCluster = document.createElement('div');
    moveCluster.className = 'tc-cluster';
    moveCluster.style.opacity = String(alpha);
    if (custom.leftPad) {
      moveCluster.style.left = `${custom.leftPad.x}px`;
      moveCluster.style.top = `${custom.leftPad.y}px`;
    } else {
      moveCluster.style.bottom = `${padY + insets.bottom}px`;
      if (leftHanded) {
        moveCluster.style.right = `${padX + insets.right}px`;
      } else {
        moveCluster.style.left = `${padX + insets.left}px`;
      }
    }

    if (this.settings.touchMoveMode === 'joystick') {
      const joySize = Math.round(moveSize * 2 + 12);
      const base = document.createElement('div');
      base.className = 'tc-joy-base';
      base.style.width = `${joySize}px`;
      base.style.height = `${joySize}px`;
      const knob = document.createElement('div');
      knob.className = 'tc-joy-knob';
      const knobSize = Math.round(moveSize * 0.72);
      knob.style.width = `${knobSize}px`;
      knob.style.height = `${knobSize}px`;
      base.appendChild(knob);
      moveCluster.appendChild(base);
      this.joyKnob = knob;
      if (!this.editMode) {
        this.bindJoystickEvents(base, joySize);
      }
    } else {
      const zone = document.createElement('div');
      zone.className = 'tc-dpad-zone';

      const leftBtn = document.createElement('div');
      leftBtn.className = 'tc-btn rect';
      leftBtn.dataset.action = 'left';
      leftBtn.textContent = '◀';
      leftBtn.style.width = `${moveSize}px`;
      leftBtn.style.height = `${moveSize}px`;

      const rightBtn = document.createElement('div');
      rightBtn.className = 'tc-btn rect';
      rightBtn.dataset.action = 'right';
      rightBtn.textContent = '▶';
      rightBtn.style.width = `${moveSize}px`;
      rightBtn.style.height = `${moveSize}px`;

      zone.append(leftBtn, rightBtn);
      moveCluster.appendChild(zone);
      this.leftBtn = leftBtn;
      this.rightBtn = rightBtn;
      if (!this.editMode) {
        this.bindDpadSlideEvents(zone, leftBtn, rightBtn);
      }
    }

    // Action cluster (Jump + Run/Fire along thumb arc)
    const actionCluster = document.createElement('div');
    actionCluster.className = 'tc-action-zone';
    actionCluster.style.opacity = String(alpha);
    const arcOffset = Math.round(jumpSize * 0.75 + 14);
    const zoneW = jumpSize + arcOffset + runSize * 0.4;
    const zoneH = jumpSize + Math.round(runSize * 0.55) + 12;
    actionCluster.style.width = `${zoneW}px`;
    actionCluster.style.height = `${zoneH}px`;

    if (custom.jumpBtn) {
      actionCluster.style.left = `${custom.jumpBtn.x}px`;
      actionCluster.style.top = `${custom.jumpBtn.y}px`;
    } else {
      actionCluster.style.bottom = `${padY + insets.bottom}px`;
      if (leftHanded) {
        actionCluster.style.left = `${padX + insets.left}px`;
      } else {
        actionCluster.style.right = `${padX + insets.right}px`;
      }
    }

    const jumpBtn = document.createElement('div');
    jumpBtn.className = 'tc-btn jump-btn';
    jumpBtn.dataset.action = 'jump';
    jumpBtn.textContent = 'NHẢY';
    jumpBtn.style.width = `${jumpSize}px`;
    jumpBtn.style.height = `${jumpSize}px`;
    jumpBtn.style.position = 'absolute';
    jumpBtn.style.bottom = '4px';
    if (leftHanded) jumpBtn.style.left = '4px';
    else jumpBtn.style.right = '4px';

    const runBtn = document.createElement('div');
    runBtn.className = 'tc-btn';
    runBtn.dataset.action = 'run';
    runBtn.textContent = this.settings.alwaysRun ? 'BẮN' : 'CHẠY';
    runBtn.style.width = `${runSize}px`;
    runBtn.style.height = `${runSize}px`;
    runBtn.style.position = 'absolute';
    runBtn.style.top = '4px';
    if (leftHanded) {
      runBtn.style.right = '4px';
    } else {
      runBtn.style.left = '4px';
    }
    if (this.settings.alwaysRun) {
      runBtn.dataset.action = 'fire';
    }

    actionCluster.append(runBtn, jumpBtn);
    this.jumpBtn = jumpBtn;
    this.runBtn = runBtn;

    if (!this.editMode) {
      this.bindActionArcEvents(actionCluster, jumpBtn, runBtn);
    }

    // Pause button (top-right, >=40px)
    const pauseCluster = document.createElement('div');
    pauseCluster.className = 'tc-cluster';
    pauseCluster.style.opacity = String(alpha);
    if (custom.pauseBtn) {
      pauseCluster.style.left = `${custom.pauseBtn.x}px`;
      pauseCluster.style.top = `${custom.pauseBtn.y}px`;
    } else {
      pauseCluster.style.top = `${10 + insets.top}px`;
      pauseCluster.style.right = `${12 + insets.right}px`;
    }
    const pauseBtn = document.createElement('div');
    pauseBtn.className = 'tc-btn tc-pause-btn';
    pauseBtn.textContent = '||';
    pauseCluster.appendChild(pauseBtn);

    if (!this.editMode) {
      pauseBtn.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        this.inputManager?.triggerPausePulse();
      });
    }

    this.root.append(moveCluster, actionCluster, pauseCluster);

    if (this.editMode && onSaveLayout && onCloseEditor) {
      const draft: CustomTouchLayout = { ...(this.settings.customTouchLayout ?? {}) };
      this.makeDraggable(moveCluster, (x, y) => {
        draft.leftPad = { x, y };
      });
      this.makeDraggable(actionCluster, (x, y) => {
        draft.jumpBtn = { x, y };
      });
      this.makeDraggable(pauseCluster, (x, y) => {
        draft.pauseBtn = { x, y };
      });

      const bar = document.createElement('div');
      bar.className = 'tc-layout-bar';
      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'MẶC ĐỊNH';
      resetBtn.onclick = () => {
        onSaveLayout(undefined);
        this.settings = { ...this.settings, customTouchLayout: undefined };
        this.editMode = false;
        this.rebuild();
        this.updateVisibility();
        onCloseEditor();
      };
      const doneBtn = document.createElement('button');
      doneBtn.textContent = 'LƯU BỐ CỤC';
      doneBtn.style.background = '#207c3c';
      doneBtn.onclick = () => {
        onSaveLayout(draft);
        this.settings = { ...this.settings, customTouchLayout: draft };
        this.editMode = false;
        this.rebuild();
        this.updateVisibility();
        onCloseEditor();
      };
      bar.append(resetBtn, doneBtn);
      this.root.appendChild(bar);
    }

    this.updateVisibility();
  }

  private makeDraggable(el: HTMLElement, onMoved: (x: number, y: number) => void): void {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      const rect = el.getBoundingClientRect();
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.left = `${Math.round(origLeft)}px`;
      el.style.top = `${Math.round(origTop)}px`;
    });

    el.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const nx = Math.max(0, Math.round(origLeft + (ev.clientX - startX)));
      const ny = Math.max(0, Math.round(origTop + (ev.clientY - startY)));
      el.style.left = `${nx}px`;
      el.style.top = `${ny}px`;
    });

    const end = (ev: PointerEvent): void => {
      if (!dragging) return;
      dragging = false;
      const rect = el.getBoundingClientRect();
      onMoved(Math.round(rect.left), Math.round(rect.top));
      if (el.hasPointerCapture(ev.pointerId)) {
        el.releasePointerCapture(ev.pointerId);
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  private bindDpadSlideEvents(
    zone: HTMLElement,
    leftBtn: HTMLElement,
    rightBtn: HTMLElement,
  ): void {
    const resolveActions = (ev: PointerEvent): TouchAction[] => {
      const lRect = leftBtn.getBoundingClientRect();
      const rRect = rightBtn.getBoundingClientRect();
      const midX = (lRect.right + rRect.left) / 2;
      const dir: TouchAction = ev.clientX <= midX ? 'left' : 'right';
      const startY = this.moveStartY.get(ev.pointerId) ?? ev.clientY;
      const isSwipeDown = ev.clientY - startY > 26;
      return isSwipeDown ? [dir, 'down'] : [dir];
    };

    zone.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      zone.setPointerCapture(ev.pointerId);
      this.moveStartY.set(ev.pointerId, ev.clientY);
      this.inputManager?.touchTracker.handlePointerDown(ev.pointerId, resolveActions(ev));
      this.syncVisuals();
    });

    zone.addEventListener('pointermove', (ev) => {
      if (!this.moveStartY.has(ev.pointerId)) return;
      this.inputManager?.touchTracker.handlePointerMove(ev.pointerId, resolveActions(ev));
      this.syncVisuals();
    });

    // Intentionally ignore pointerout; only release on pointerup / pointercancel
    const release = (ev: PointerEvent): void => {
      this.moveStartY.delete(ev.pointerId);
      this.inputManager?.touchTracker.handlePointerUpOrCancel(ev.pointerId);
      this.syncVisuals();
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  }

  private bindJoystickEvents(base: HTMLElement, joySize: number): void {
    let activeId: number | null = null;
    const maxR = joySize * 0.36;

    const updateStick = (ev: PointerEvent): TouchAction[] => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = ev.clientX - cx;
      let dy = ev.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR && dist > 0) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      if (this.joyKnob) {
        this.joyKnob.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
      }
      const actions: TouchAction[] = [];
      if (dx < -10) actions.push('left');
      else if (dx > 10) actions.push('right');
      if (dy > maxR * 0.6) actions.push('down');
      return actions;
    };

    base.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      base.setPointerCapture(ev.pointerId);
      activeId = ev.pointerId;
      this.inputManager?.touchTracker.handlePointerDown(ev.pointerId, updateStick(ev));
    });

    base.addEventListener('pointermove', (ev) => {
      if (activeId !== ev.pointerId) return;
      this.inputManager?.touchTracker.handlePointerMove(ev.pointerId, updateStick(ev));
    });

    const release = (ev: PointerEvent): void => {
      if (activeId === ev.pointerId) {
        activeId = null;
        if (this.joyKnob) this.joyKnob.style.transform = 'translate(0px, 0px)';
      }
      this.inputManager?.touchTracker.handlePointerUpOrCancel(ev.pointerId);
    };
    base.addEventListener('pointerup', release);
    base.addEventListener('pointercancel', release);
  }

  private bindActionArcEvents(
    zone: HTMLElement,
    jumpBtn: HTMLElement,
    runBtn: HTMLElement,
  ): void {
    const pointerModes = new Map<number, 'jump' | 'run' | 'both'>();

    const distToCenter = (el: HTMLElement, x: number, y: number): { d: number; r: number } => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return { d: Math.hypot(x - cx, y - cy), r: rect.width / 2 + 12 };
    };

    const resolveArcActions = (ev: PointerEvent, isInitial: boolean): TouchAction[] => {
      const j = distToCenter(jumpBtn, ev.clientX, ev.clientY);
      const r = distToCenter(runBtn, ev.clientX, ev.clientY);
      const runAction: TouchAction = this.settings.alwaysRun ? 'fire' : 'run';

      const prevMode = pointerModes.get(ev.pointerId);
      if (isInitial) {
        if (j.d <= j.r && r.d <= r.r) {
          pointerModes.set(ev.pointerId, 'both');
          return ['jump', runAction];
        }
        if (r.d < j.d && r.d <= r.r) {
          pointerModes.set(ev.pointerId, 'run');
          return [runAction];
        }
        pointerModes.set(ev.pointerId, 'jump');
        return ['jump'];
      }

      // Sliding between Jump and Run/Fire without lifting activates BOTH
      if (prevMode === 'jump' && r.d <= r.r) {
        pointerModes.set(ev.pointerId, 'both');
        return ['jump', runAction];
      }
      if (prevMode === 'run' && j.d <= j.r) {
        pointerModes.set(ev.pointerId, 'both');
        return ['jump', runAction];
      }
      if (prevMode === 'both') return ['jump', runAction];
      if (prevMode === 'run') return [runAction];
      return ['jump'];
    };

    zone.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      zone.setPointerCapture(ev.pointerId);
      this.inputManager?.touchTracker.handlePointerDown(ev.pointerId, resolveArcActions(ev, true));
      this.syncVisuals();
    });

    zone.addEventListener('pointermove', (ev) => {
      if (!pointerModes.has(ev.pointerId)) return;
      this.inputManager?.touchTracker.handlePointerMove(ev.pointerId, resolveArcActions(ev, false));
      this.syncVisuals();
    });

    const release = (ev: PointerEvent): void => {
      pointerModes.delete(ev.pointerId);
      this.inputManager?.touchTracker.handlePointerUpOrCancel(ev.pointerId);
      this.syncVisuals();
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  }

  private syncVisuals(): void {
    const tracker = this.inputManager?.touchTracker;
    this.leftBtn?.classList.toggle('active', Boolean(tracker?.isHeld('left')));
    this.rightBtn?.classList.toggle('active', Boolean(tracker?.isHeld('right')));
    this.jumpBtn?.classList.toggle('active', Boolean(tracker?.isHeld('jump')));
    const runActive = this.settings.alwaysRun
      ? Boolean(tracker?.isHeld('fire'))
      : Boolean(tracker?.isHeld('run') || tracker?.isHeld('fire'));
    this.runBtn?.classList.toggle('active', runActive);
  }
}
