import Phaser from 'phaser';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import { getSession } from '../systems/GameSession';
import { MobileRuntime } from '../systems/MobileRuntime';
import { isIosSafari } from '../systems/viewport';
import { PixelButton } from '../ui/Button';

export class SettingsScene extends Phaser.Scene {
  private confirmContainer: Phaser.GameObjects.Container | null = null;
  private buttons: PixelButton[] = [];

  constructor() {
    super('SettingsScene');
  }

  create(): void {
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#16182c');
    this.buttons = [];
    MobileRuntime.get().getTouchControls()?.setGameplayVisible(false);

    const w = this.scale.width;
    const h = this.scale.height;
    const session = getSession();
    session.refreshSave();
    const s = session.saveData.settings;

    this.add.nineslice(w / 2, h / 2, 'ui-panel-9', 0, Math.min(w - 16, 390), h - 12, 8, 8, 8, 8);

    this.add
      .bitmapText(w / 2, 16, 'pixel-font', 'SETTINGS', 8)
      .setOrigin(0.5)
      .setTint(0xffe030);

    const stepVolume = (val: number): number => {
      const next = val + 20;
      return next > 100 ? 0 : next;
    };

    const colW = Math.min(176, Math.floor((w - 44) / 2));
    const leftX = w / 2 - colW / 2 - 6;
    const rightX = w / 2 + colW / 2 + 6;
    const rowY = [42, 68, 94, 120, 146, 172] as const;

    const addBtn = (x: number, y: number, label: string, onClick: (btn: PixelButton) => void): PixelButton => {
      const btn = new PixelButton(this, {
        x,
        y,
        width: colW,
        height: 22,
        label,
        onClick: () => onClick(btn),
      });
      this.buttons.push(btn);
      return btn;
    };

    // Left column: Audio & Display/Effects
    addBtn(leftX, rowY[0], `SFX: ${s.sfx}%`, (btn) => {
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, sfx: stepVolume(d.settings.sfx) },
      }));
      session.applyAudioSettings();
      synth.gem();
      btn.setLabel(`SFX: ${session.saveData.settings.sfx}%`);
    });

    addBtn(leftX, rowY[1], `Nhạc: ${s.music}%`, (btn) => {
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, music: stepVolume(d.settings.music) },
      }));
      session.applyAudioSettings();
      music.play('grass', 1);
      btn.setLabel(`Nhạc: ${session.saveData.settings.music}%`);
    });

    addBtn(leftX, rowY[2], `Rung máy: ${s.vibrate ? 'BẬT' : 'TẮT'}`, (btn) => {
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, vibrate: !d.settings.vibrate },
      }));
      btn.setLabel(`Rung máy: ${session.saveData.settings.vibrate ? 'BẬT' : 'TẮT'}`);
    });

    addBtn(leftX, rowY[3], `Rung camera: ${s.shake ? 'BẬT' : 'TẮT'}`, (btn) => {
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, shake: !d.settings.shake },
      }));
      btn.setLabel(`Rung camera: ${session.saveData.settings.shake ? 'BẬT' : 'TẮT'}`);
    });

    const qualityLabel = (q: typeof s.effectQuality): string =>
      q === 'auto' ? 'TỰ ĐỘNG' : q === 'high' ? 'CAO' : 'THẤP';

    addBtn(leftX, rowY[4], `Hiệu ứng: ${qualityLabel(s.effectQuality)}`, (btn) => {
      const order: Array<typeof s.effectQuality> = ['auto', 'high', 'low'];
      const next = order[(order.indexOf(session.saveData.settings.effectQuality) + 1) % order.length]!;
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, effectQuality: next, highEffects: next !== 'low' },
      }));
      btn.setLabel(`Hiệu ứng: ${qualityLabel(next)}`);
    });

    // Hide Fullscreen button on iPhone Safari (not supported)
    if (!isIosSafari()) {
      addBtn(leftX, rowY[5], 'TOÀN MÀN HÌNH', () => {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
          void el.requestFullscreen?.().then(() => {
            try {
              const ori = screen.orientation as unknown as { lock?: (m: string) => Promise<void> };
              void ori.lock?.('landscape')?.catch(() => {});
            } catch {
              // ignore orientation lock failure
            }
          }).catch(() => {});
        } else {
          void document.exitFullscreen?.().catch(() => {});
        }
      });
    } else {
      addBtn(leftX, rowY[5], 'MẸO iOS PWA', () => {
        const tip = document.getElementById('ios-pwa-tip');
        if (tip) tip.style.display = 'block';
      });
    }

    // Right column: Mobile Touch Controls
    addBtn(rightX, rowY[0], `Cảm ứng: ${s.touch ? 'BẬT' : 'TẮT'}`, (btn) => {
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, touch: !d.settings.touch },
      }));
      MobileRuntime.get().syncSettings();
      btn.setLabel(`Cảm ứng: ${session.saveData.settings.touch ? 'BẬT' : 'TẮT'}`);
    });

    const sizeLabel = (sz: typeof s.touchSize): string =>
      sz === 'small' ? 'NHỎ' : sz === 'medium' ? 'VỪA' : 'LỚN';

    addBtn(rightX, rowY[1], `Cỡ nút: ${sizeLabel(s.touchSize)}`, (btn) => {
      const order: Array<typeof s.touchSize> = ['small', 'medium', 'large'];
      const next = order[(order.indexOf(session.saveData.settings.touchSize) + 1) % order.length]!;
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, touchSize: next },
      }));
      MobileRuntime.get().syncSettings();
      btn.setLabel(`Cỡ nút: ${sizeLabel(next)}`);
    });

    addBtn(rightX, rowY[2], `Độ mờ nút: ${s.touchAlpha}%`, (btn) => {
      const next = s.touchAlpha >= 80 ? 20 : s.touchAlpha + 15;
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, touchAlpha: Math.min(80, next) },
      }));
      MobileRuntime.get().syncSettings();
      btn.setLabel(`Độ mờ nút: ${session.saveData.settings.touchAlpha}%`);
    });

    addBtn(rightX, rowY[3], `Đổi bên: ${s.touchLeftHanded ? 'TRÁI' : 'PHẢI'}`, (btn) => {
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, touchLeftHanded: !d.settings.touchLeftHanded },
      }));
      MobileRuntime.get().syncSettings();
      btn.setLabel(`Đổi bên: ${session.saveData.settings.touchLeftHanded ? 'TRÁI' : 'PHẢI'}`);
    });

    addBtn(rightX, rowY[4], `Kiểu nút: ${s.touchMoveMode === 'joystick' ? 'JOYSTICK' : '2 NÚT'}`, (btn) => {
      const next = session.saveData.settings.touchMoveMode === 'buttons' ? 'joystick' : 'buttons';
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, touchMoveMode: next },
      }));
      MobileRuntime.get().syncSettings();
      btn.setLabel(`Kiểu nút: ${next === 'joystick' ? 'JOYSTICK' : '2 NÚT'}`);
    });

    addBtn(rightX, rowY[5], `Luôn chạy: ${s.alwaysRun ? 'BẬT' : 'TẮT'}`, (btn) => {
      session.saveData = session.saveManager.update((d) => ({
        ...d,
        settings: { ...d.settings, alwaysRun: !d.settings.alwaysRun },
      }));
      MobileRuntime.get().syncSettings();
      btn.setLabel(`Luôn chạy: ${session.saveData.settings.alwaysRun ? 'BẬT' : 'TẮT'}`);
    });

    // Bottom bar: Edit Layout, Clear Save, Back
    new PixelButton(this, {
      x: w / 2 - 110,
      y: h - 24,
      width: 102,
      height: 24,
      label: 'CHỈNH BỐ CỤC',
      onClick: () => {
        MobileRuntime.get().getTouchControls()?.openLayoutEditor(
          (layout) => {
            session.saveData = session.saveManager.update((d) => ({
              ...d,
              settings: { ...d.settings, customTouchLayout: layout },
            }));
          },
          () => {
            // editor closed
          },
        );
      },
    });

    new PixelButton(this, {
      x: w / 2,
      y: h - 24,
      width: 96,
      height: 24,
      label: 'XÓA DỮ LIỆU',
      bgColor: 0x681820,
      hoverColor: 0x982430,
      onClick: () => this.showResetConfirmation(),
    });

    new PixelButton(this, {
      x: w / 2 + 106,
      y: h - 24,
      width: 96,
      height: 24,
      label: 'QUAY LẠI',
      onClick: () => this.scene.start('MenuScene'),
    });

    const onResize = (): void => {
      if (this.scene.isActive('SettingsScene')) {
        this.scene.restart();
      }
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private showResetConfirmation(): void {
    if (this.confirmContainer) return;
    const w = this.scale.width;
    const h = this.scale.height;

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);
    overlay.setInteractive();
    const box = this.add.nineslice(w / 2, h / 2, 'ui-panel-9', 0, 260, 100, 8, 8, 8, 8);
    const msg = this.add
      .text(w / 2, h / 2 - 22, 'Xóa toàn bộ tiến độ & điểm cao?', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        resolution: 2,
      })
      .setOrigin(0.5);

    const yesBtn = new PixelButton(this, {
      x: w / 2 - 52,
      y: h / 2 + 18,
      width: 88,
      height: 24,
      label: 'ĐỒNG Ý',
      bgColor: 0x981820,
      hoverColor: 0xc82830,
      onClick: () => {
        const session = getSession();
        session.saveData = session.saveManager.clear();
        session.scoreManager.resetRun(0);
        session.applyAudioSettings();
        MobileRuntime.get().syncSettings();
        this.closeConfirm();
        this.scene.restart();
      },
    });

    const noBtn = new PixelButton(this, {
      x: w / 2 + 52,
      y: h / 2 + 18,
      width: 88,
      height: 24,
      label: 'HỦY',
      onClick: () => this.closeConfirm(),
    });

    this.confirmContainer = this.add
      .container(0, 0, [overlay, box, msg, yesBtn, noBtn])
      .setDepth(50);
  }

  private closeConfirm(): void {
    if (this.confirmContainer) {
      this.confirmContainer.destroy(true);
      this.confirmContainer = null;
    }
  }
}
