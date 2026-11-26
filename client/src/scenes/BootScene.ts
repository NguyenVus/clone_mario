import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const isTouch = this.sys.game.device.input.touch;
    this.registry.set('isTouchDevice', isTouch);

    if (isTouch && this.input.manager.pointersTotal < 4) {
      this.input.addPointer(3);
    }

    this.scene.start('PreloadScene');
  }
}
