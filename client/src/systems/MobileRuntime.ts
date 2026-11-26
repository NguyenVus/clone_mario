import Phaser from 'phaser';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import { HtmlTouchControls } from '../ui/HtmlTouchControls';
import { getSession } from './GameSession';
import { computeLogicalSize, isCoarsePointerDevice, isIosSafari } from './viewport';

export class MobileRuntime {
  private static instance: MobileRuntime | null = null;
  private game: Phaser.Game | null = null;
  private touchControls: HtmlTouchControls | null = null;
  private wasPausedByPortrait = false;
  private isPortrait = false;
  private lastTouchTime = 0;

  public static get(): MobileRuntime {
    if (!MobileRuntime.instance) {
      MobileRuntime.instance = new MobileRuntime();
    }
    return MobileRuntime.instance;
  }

  public init(game: Phaser.Game): void {
    this.game = game;
    const isTouch = isCoarsePointerDevice();
    const session = getSession(isTouch);
    this.touchControls = new HtmlTouchControls(session.saveData.settings);

    synth.bindMobileAudioLifecycle();
    this.bindBrowserGuards();
    this.bindViewportAndOrientation();
    this.bindAppLifecycle();
    this.showIosPwaTipIfNeeded();
  }

  public getTouchControls(): HtmlTouchControls | null {
    return this.touchControls;
  }

  public syncSettings(): void {
    const session = getSession();
    this.touchControls?.updateSettings(session.saveData.settings);
  }

  public getLogicalWidth(): number {
    return this.game?.scale.width ?? 400;
  }

  public getLogicalHeight(): number {
    return this.game?.scale.height ?? 240;
  }

  private isTextInputFocused(): boolean {
    const el = document.activeElement;
    return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'));
  }

  private bindBrowserGuards(): void {
    window.addEventListener('contextmenu', (ev) => ev.preventDefault());

    // Block double-tap zoom and pinch gestures outside active inputs
    document.addEventListener(
      'touchend',
      (ev) => {
        if (this.isTextInputFocused()) return;
        const now = Date.now();
        if (now - this.lastTouchTime <= 300) {
          ev.preventDefault();
        }
        this.lastTouchTime = now;
      },
      { passive: false },
    );
    document.addEventListener('gesturestart', (ev) => ev.preventDefault(), { passive: false });
  }

  private bindViewportAndOrientation(): void {
    const rotateOverlay = document.getElementById('rotate-overlay');
    const resumeOverlay = document.getElementById('resume-overlay');
    const resumeBtn = document.getElementById('resume-btn');

    const handleResize = (): void => {
      if (!this.game || this.isTextInputFocused()) return;
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const portrait = isCoarsePointerDevice() && vh > vw;

      if (portrait && !this.isPortrait) {
        this.isPortrait = true;
        if (rotateOverlay) rotateOverlay.style.display = 'flex';
        if (resumeOverlay) resumeOverlay.style.display = 'none';
        this.wasPausedByPortrait = this.pauseGameplayIfActive();
        this.touchControls?.setGameplayVisible(false);
      } else if (!portrait && this.isPortrait) {
        this.isPortrait = false;
        if (rotateOverlay) rotateOverlay.style.display = 'none';
        if (this.wasPausedByPortrait && resumeOverlay) {
          resumeOverlay.style.display = 'flex';
        }
      }

      if (!portrait) {
        const next = computeLogicalSize(vw, vh);
        if (this.game.scale.width !== next.width || this.game.scale.height !== next.height) {
          this.game.scale.resize(next.width, next.height);
        }
        this.touchControls?.rebuild();
      }
    };

    resumeBtn?.addEventListener('click', () => {
      if (resumeOverlay) resumeOverlay.style.display = 'none';
      this.wasPausedByPortrait = false;
      synth.unlock();
      if (this.game?.scene.isActive('GameScene')) {
        this.touchControls?.setGameplayVisible(true);
      }
    });

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    handleResize();
  }

  private bindAppLifecycle(): void {
    const onHide = (): void => {
      this.pauseGameplayIfActive();
      if (this.game) {
        this.game.loop.sleep();
      }
    };

    const onShow = (): void => {
      if (this.game) {
        this.game.loop.wake();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onHide();
      else onShow();
    });
    window.addEventListener('pagehide', onHide);
  }

  private pauseGameplayIfActive(): boolean {
    if (!this.game) return false;
    const gs = this.game.scene.getScene('GameScene');
    if (gs && this.game.scene.isActive('GameScene') && !this.game.scene.isPaused('GameScene')) {
      music.pause();
      this.game.scene.pause('GameScene');
      if (!this.game.scene.isActive('PauseScene')) {
        gs.scene.launch('PauseScene');
      }
      this.touchControls?.setGameplayVisible(false);
      return true;
    }
    return false;
  }

  private showIosPwaTipIfNeeded(): void {
    if (!isIosSafari()) return;
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia?.('(display-mode: standalone)').matches;
    if (isStandalone) return;
    try {
      if (window.localStorage.getItem('pixelhero.iosTipDismissed') === '1') return;
    } catch {
      // ignore
    }
    const tip = document.getElementById('ios-pwa-tip');
    const closeBtn = document.getElementById('ios-pwa-close');
    if (tip) tip.style.display = 'block';
    closeBtn?.addEventListener('click', () => {
      if (tip) tip.style.display = 'none';
      try {
        window.localStorage.setItem('pixelhero.iosTipDismissed', '1');
      } catch {
        // ignore
      }
    });
  }
}
