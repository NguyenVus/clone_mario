import Phaser from 'phaser';
import { fetchLeaderboard } from '../systems/Api';
import { MobileRuntime } from '../systems/MobileRuntime';
import { PixelButton } from '../ui/Button';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  create(): void {
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#16182c');
    MobileRuntime.get().getTouchControls()?.setGameplayVisible(false);

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.nineslice(w / 2, h / 2, 'ui-panel-9', 0, Math.min(w - 20, 366), 222, 8, 8, 8, 8);

    this.add
      .bitmapText(w / 2, 22, 'pixel-font', 'LEADERBOARD', 12)
      .setOrigin(0.5)
      .setTint(0xffe030);

    const statusText = this.add
      .text(w / 2, h / 2 - 10, 'Đang tải bảng xếp hạng...', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#c8d0dc',
        resolution: 2,
      })
      .setOrigin(0.5);

    new PixelButton(this, {
      x: w / 2,
      y: h - 26,
      width: 130,
      height: 24,
      label: 'VỀ MENU',
      onClick: () => this.scene.start('MenuScene'),
    });

    const onResize = (): void => {
      if (this.scene.isActive('LeaderboardScene')) this.scene.restart();
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });

    void this.loadEntries(statusText);
  }

  private async loadEntries(statusText: Phaser.GameObjects.Text): Promise<void> {
    const res = await fetchLeaderboard(10);
    if (!this.scene.isActive('LeaderboardScene')) return;

    if (!res.ok || !res.data) {
      statusText.setText(res.error ?? 'Không kết nối được bảng xếp hạng');
      statusText.setColor('#ff7878');
      return;
    }

    if (res.data.length === 0) {
      statusText.setText('Chưa có điểm nào. Hãy chơi để ghi danh!');
      return;
    }

    statusText.destroy();
    const startX = Math.max(24, this.scale.width / 2 - 165);
    this.add.text(startX, 38, '#   TÊN              MÀN   ĐIỂM     TG', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffe030',
      resolution: 2,
    });

    res.data.forEach((entry, idx) => {
      const y = 52 + idx * 14;
      const rank = String(entry.rank).padEnd(3, ' ');
      const name = entry.name.slice(0, 15).padEnd(16, ' ');
      const lvl = entry.level.padEnd(5, ' ');
      const score = String(entry.score).padStart(7, '0');
      const sec = `${entry.durationSec}s`.padStart(4, ' ');
      this.add.text(startX, y, `${rank} ${name} ${lvl} ${score} ${sec}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: idx === 0 ? '#40e8f8' : '#ffffff',
        resolution: 2,
      });
    });
  }
}
