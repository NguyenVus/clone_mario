import Phaser from 'phaser';
import { scoreSubmissionSchema } from '@pixel-hero/shared';
import { music } from '../audio/Music';
import { submitScore } from '../systems/Api';
import { getSession } from '../systems/GameSession';
import { MobileRuntime } from '../systems/MobileRuntime';
import { PixelButton } from '../ui/Button';

export class VictoryScene extends Phaser.Scene {
  private nameInputEl: HTMLInputElement | null = null;

  constructor() {
    super('VictoryScene');
  }

  create(): void {
    music.stop();
    MobileRuntime.get().getTouchControls()?.setGameplayVisible(false);
    this.cameras.main.setBackgroundColor('#121a2e');
    this.cameras.main.fadeIn(350, 0, 0, 0);

    const w = this.scale.width;
    const h = this.scale.height;
    const session = getSession();
    const snap = session.scoreManager.getSnapshot();
    session.saveData = session.saveManager.recordHighScore(snap.score);
    session.highestClearedLevel = '1-3';

    this.add
      .bitmapText(w / 2, 24, 'pixel-font', 'VICTORY!', 16)
      .setOrigin(0.5)
      .setTint(0xffe030);

    this.add.image(w / 2, 50, 'pip-fire', 0).setOrigin(0.5);

    const stats = [
      `ĐIỂM: ${snap.score}   |   GEM: ${snap.totalGemsCollected}`,
      `QUÁI DIỆT: ${snap.kills}   |   THỜI GIAN: ${Math.max(1, Math.round(session.runElapsedSec))}s`,
    ];
    this.add
      .text(w / 2, 80, stats.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
        resolution: 2,
      })
      .setOrigin(0.5);

    const statusMsg = this.add
      .text(w / 2, 138, 'Nhập tên để lưu thành tích:', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#40e8f8',
        resolution: 2,
      })
      .setOrigin(0.5);

    this.createNameInput(session.saveData.playerName ?? '');

    let submitted = false;
    new PixelButton(this, {
      x: w / 2,
      y: 168,
      width: 176,
      height: 24,
      label: 'GỬI ĐIỂM & XEM BXH',
      onClick: async () => {
        if (submitted) return;
        const rawName = (this.nameInputEl?.value ?? '').trim();
        const payload = {
          name: rawName,
          score: snap.score,
          level: '1-3' as const,
          durationSec: Math.max(1, Math.round(session.runElapsedSec)),
          gems: snap.totalGemsCollected,
          kills: snap.kills,
        };
        const parsed = scoreSubmissionSchema.safeParse(payload);
        if (!parsed.success) {
          statusMsg.setText(parsed.error.issues[0]?.message ?? 'Tên không hợp lệ');
          statusMsg.setColor('#ff7878');
          return;
        }
        submitted = true;
        session.saveManager.update((d) => ({ ...d, playerName: parsed.data.name }));
        statusMsg.setText('Đang gửi...');
        const res = await submitScore(parsed.data);
        if (!res.ok) {
          submitted = false;
          statusMsg.setText(res.error ?? 'Lỗi gửi điểm');
          statusMsg.setColor('#ff7878');
          return;
        }
        this.removeNameInput();
        this.scene.start('LeaderboardScene');
      },
    });

    new PixelButton(this, {
      x: w / 2,
      y: h - 26,
      width: 130,
      height: 24,
      label: 'VỀ MENU',
      onClick: () => {
        this.removeNameInput();
        this.scene.start('MenuScene');
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeNameInput());
  }

  private createNameInput(defaultName: string): void {
    this.removeNameInput();
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = 'Tên của bạn (1-16 ký tự)';
    input.value = defaultName;
    Object.assign(input.style, {
      position: 'fixed',
      left: '50%',
      top: '46%',
      transform: 'translate(-50%, -50%)',
      width: '220px',
      minHeight: '40px',
      padding: '8px 12px',
      fontFamily: 'monospace',
      fontSize: '16px',
      textAlign: 'center',
      background: '#1c2038',
      color: '#ffffff',
      border: '2px solid #40e8f8',
      borderRadius: '6px',
      outline: 'none',
      zIndex: '2000',
    });
    document.body.appendChild(input);
    this.nameInputEl = input;
  }

  private removeNameInput(): void {
    if (this.nameInputEl) {
      this.nameInputEl.remove();
      this.nameInputEl = null;
    }
  }
}
