import Phaser from 'phaser';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getSession } from '../systems/GameSession';
import { PixelButton } from '../ui/Button';

export class SettingsScene extends Phaser.Scene {
  private sfxBtn!: PixelButton;
  private musicBtn!: PixelButton;
  private touchBtn!: PixelButton;
  private shakeBtn!: PixelButton;
  private fxBtn!: PixelButton;
  private confirmContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('SettingsScene');
  }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#16182c');

    const session = getSession();
    session.refreshSave();

    this.add.nineslice(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel-9', 0, 290, 224, 8, 8, 8, 8);

    this.add
      .bitmapText(GAME_WIDTH / 2, 22, 'pixel-font', 'SETTINGS', 12)
      .setOrigin(0.5)
      .setTint(0xffe030);

    const stepVolume = (val: number): number => {
      const next = val + 20;
      return next > 100 ? 0 : next;
    };

    this.sfxBtn = new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 48,
      width: 224,
      height: 20,
      label: `Âm lượng SFX: ${session.saveData.settings.sfx}%`,
      onClick: () => {
        session.saveData = session.saveManager.update((d) => ({
          ...d,
          settings: { ...d.settings, sfx: stepVolume(d.settings.sfx) },
        }));
        session.applyAudioSettings();
        synth.gem();
        this.sfxBtn.setLabel(`Âm lượng SFX: ${session.saveData.settings.sfx}%`);
      },
    });

    this.musicBtn = new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 74,
      width: 224,
      height: 20,
      label: `Âm lượng Nhạc: ${session.saveData.settings.music}%`,
      onClick: () => {
        session.saveData = session.saveManager.update((d) => ({
          ...d,
          settings: { ...d.settings, music: stepVolume(d.settings.music) },
        }));
        session.applyAudioSettings();
        music.play('grass', 1);
        this.musicBtn.setLabel(`Âm lượng Nhạc: ${session.saveData.settings.music}%`);
      },
    });

    this.touchBtn = new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 100,
      width: 224,
      height: 20,
      label: `Nút cảm ứng: ${session.saveData.settings.touch ? 'BẬT' : 'TẮT'}`,
      onClick: () => {
        session.saveData = session.saveManager.update((d) => ({
          ...d,
          settings: { ...d.settings, touch: !d.settings.touch },
        }));
        this.touchBtn.setLabel(`Nút cảm ứng: ${session.saveData.settings.touch ? 'BẬT' : 'TẮT'}`);
      },
    });

    this.shakeBtn = new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 126,
      width: 224,
      height: 20,
      label: `Rung màn hình: ${session.saveData.settings.shake ? 'BẬT' : 'TẮT'}`,
      onClick: () => {
        session.saveData = session.saveManager.update((d) => ({
          ...d,
          settings: { ...d.settings, shake: !d.settings.shake },
        }));
        this.shakeBtn.setLabel(`Rung màn hình: ${session.saveData.settings.shake ? 'BẬT' : 'TẮT'}`);
      },
    });

    this.fxBtn = new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 152,
      width: 224,
      height: 20,
      label: `Hiệu ứng ánh sáng: ${session.saveData.settings.highEffects ? 'CAO' : 'THẤP'}`,
      onClick: () => {
        session.saveData = session.saveManager.update((d) => ({
          ...d,
          settings: { ...d.settings, highEffects: !d.settings.highEffects },
        }));
        this.fxBtn.setLabel(
          `Hiệu ứng ánh sáng: ${session.saveData.settings.highEffects ? 'CAO' : 'THẤP'}`,
        );
      },
    });

    new PixelButton(this, {
      x: GAME_WIDTH / 2,
      y: 178,
      width: 224,
      height: 20,
      label: 'TOÀN MÀN HÌNH (FULLSCREEN)',
      onClick: () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      },
    });

    new PixelButton(this, {
      x: GAME_WIDTH / 2 - 58,
      y: GAME_HEIGHT - 26,
      width: 108,
      height: 20,
      label: 'XÓA DỮ LIỆU',
      bgColor: 0x681820,
      hoverColor: 0x982430,
      onClick: () => this.showResetConfirmation(),
    });

    new PixelButton(this, {
      x: GAME_WIDTH / 2 + 58,
      y: GAME_HEIGHT - 26,
      width: 108,
      height: 20,
      label: 'QUAY LẠI',
      onClick: () => {
        this.scene.start('MenuScene');
      },
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private showResetConfirmation(): void {
    if (this.confirmContainer) return;

    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.75,
    );
    overlay.setInteractive();
    const box = this.add.nineslice(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'ui-panel-9', 0, 260, 100, 8, 8, 8, 8);
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 22, 'Xóa toàn bộ tiến độ & điểm cao?', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        resolution: 2,
      })
      .setOrigin(0.5);

    const yesBtn = new PixelButton(this, {
      x: GAME_WIDTH / 2 - 52,
      y: GAME_HEIGHT / 2 + 18,
      width: 84,
      height: 22,
      label: 'ĐỒNG Ý',
      bgColor: 0x981820,
      hoverColor: 0xc82830,
      onClick: () => {
        const session = getSession();
        session.saveData = session.saveManager.clear();
        session.scoreManager.resetRun(0);
        session.applyAudioSettings();
        this.closeConfirm();
        this.scene.restart();
      },
    });

    const noBtn = new PixelButton(this, {
      x: GAME_WIDTH / 2 + 52,
      y: GAME_HEIGHT / 2 + 18,
      width: 84,
      height: 22,
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
