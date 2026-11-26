import Phaser from 'phaser';
import { isCoarsePointerDevice } from '../systems/viewport';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const isTouch = this.sys.game.device.input.touch || isCoarsePointerDevice();
    this.registry.set('isTouchDevice', isTouch);

    if (isTouch && this.input.manager.pointersTotal < 5) {
      this.input.addPointer(4);
    }

    this.scene.start('PreloadScene');
  }
}
