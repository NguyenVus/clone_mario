import Phaser from 'phaser';
import { isDebugEnabled } from './config';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { LevelIntroScene } from './scenes/LevelIntroScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShotPreviewScene } from './scenes/ShotPreviewScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';
import { MobileRuntime } from './systems/MobileRuntime';
import { computeLogicalSize } from './systems/viewport';

const initialSize = computeLogicalSize(
  typeof window !== 'undefined' ? window.innerWidth : 400,
  typeof window !== 'undefined' ? window.innerHeight : 240,
);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: initialSize.width,
  height: initialSize.height,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#000000',
  render: {
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    max: {
      width: 560 * 2,
      height: 240 * 2,
    },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      fps: 60,
      fixedStep: true,
      debug: isDebugEnabled(),
    },
  },
  input: {
    gamepad: true,
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    LevelSelectScene,
    SettingsScene,
    LeaderboardScene,
    LevelIntroScene,
    GameScene,
    UIScene,
    PauseScene,
    GameOverScene,
    VictoryScene,
    ShotPreviewScene,
  ],
};

// Cap effective DPR at 2 for mobile performance
if (typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 2) {
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => 2,
    configurable: true,
  });
}

const game = new Phaser.Game(config);
MobileRuntime.get().init(game);
