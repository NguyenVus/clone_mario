import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { InputManager } from '../systems/InputManager';

interface TouchZoneRect {
  id: 'left' | 'right' | 'down' | 'jump' | 'runFire';
  x: number;
  y: number;
  w: number;
  h: number;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class TouchControls {
  private readonly container: Phaser.GameObjects.Container;
  private readonly zones: TouchZoneRect[] = [];
  private readonly pauseBg: Phaser.GameObjects.Rectangle;
  private readonly pauseLabel: Phaser.GameObjects.Text;
  private visible = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly inputManager: InputManager,
  ) {
    this.container = scene.add.container(0, 0).setDepth(100).setScrollFactor(0);

    // Minimum 40x40 logical px buttons in bottom corners
    const btnSize = 44;
    const pad = 8;
    const bottomY = GAME_HEIGHT - pad - btnSize / 2;

    this.addPadButton('left', pad + btnSize / 2, bottomY, btnSize, btnSize, '<');
    this.addPadButton('right', pad + btnSize * 1.5 + 4, bottomY, btnSize, btnSize, '>');
    this.addPadButton('down', pad + btnSize + 2, bottomY - btnSize - 4, 42, 40, 'v');

    this.addPadButton(
      'runFire',
      GAME_WIDTH - pad - btnSize * 1.65 - 6,
      bottomY,
      44,
      44,
      'RUN',
    );
    this.addPadButton('jump', GAME_WIDTH - pad - btnSize / 2, bottomY - 4, 48, 48, 'JMP');

    // Pause button top-right (40x40 min)
    const pauseX = GAME_WIDTH - 24;
    const pauseY = 26;
    this.pauseBg = scene.add
      .rectangle(pauseX, pauseY, 40, 40, 0x111122, 0.4)
      .setStrokeStyle(1, 0xffffff, 0.6)
      .setInteractive();
    this.pauseLabel = scene.add
      .text(pauseX, pauseY, '||', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        resolution: 2,
      })
      .setOrigin(0.5);

    this.pauseBg.on('pointerdown', () => {
      this.inputManager.setTouchState({ pausePressed: true });
    });

    this.container.add([this.pauseBg, this.pauseLabel]);
  }

  private addPadButton(
    id: TouchZoneRect['id'],
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
  ): void {
    const bg = this.scene.add
      .rectangle(x, y, w, h, 0x111122, 0.4)
      .setStrokeStyle(1, 0xffffff, 0.65);
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        resolution: 2,
      })
      .setOrigin(0.5);

    this.container.add([bg, label]);
    this.zones.push({ id, x, y, w, h, bg, label });
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.setVisible(visible);
    if (!visible) {
      this.inputManager.setTouchState({
        left: false,
        right: false,
        down: false,
        jump: false,
        runFire: false,
      });
    }
  }

  /**
   * Poll all active pointers every frame so fingers sliding between Left/Right work seamlessly.
   */
  public update(): void {
    if (!this.visible) return;

    const pressed = {
      left: false,
      right: false,
      down: false,
      jump: false,
      runFire: false,
    };

    const pointers = this.scene.input.manager.pointers;
    for (const p of pointers) {
      if (!p.isDown) continue;
      // Convert screen coordinates to game coordinates
      const gx = p.x;
      const gy = p.y;
      for (const z of this.zones) {
        if (
          gx >= z.x - z.w / 2 &&
          gx <= z.x + z.w / 2 &&
          gy >= z.y - z.h / 2 &&
          gy <= z.y + z.h / 2
        ) {
          pressed[z.id] = true;
        }
      }
    }

    for (const z of this.zones) {
      const isDown = pressed[z.id];
      z.bg.setFillStyle(isDown ? 0xff7818 : 0x111122, isDown ? 0.75 : 0.4);
    }

    this.inputManager.setTouchState(pressed);
  }
}
