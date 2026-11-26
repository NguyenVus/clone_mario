import Phaser from 'phaser';
import type { LevelId } from '@pixel-hero/shared';
import { music } from '../audio/Music';
import { synth } from '../audio/Synth';
import {
  CAMERA_CONFIG,
  GAME_HEIGHT,
  GAME_WIDTH,
  GAMEPLAY_CONFIG,
  PHYSICS_CONFIG,
  SCORE_VALUES,
  TILE_SIZE,
  isDebugEnabled,
} from '../config';
import { Blob } from '../entities/Blob';
import { InteractiveBlock } from '../entities/Block';
import { BossBullet } from '../entities/BossBullet';
import { Fireball } from '../entities/Fireball';
import { FlagPole } from '../entities/FlagPole';
import { Gem } from '../entities/Gem';
import { MagmaKing } from '../entities/MagmaKing';
import { MovingPlatform } from '../entities/MovingPlatform';
import { nextPowerState, Player, type PowerState } from '../entities/Player';
import { PowerUp, type PowerUpType } from '../entities/PowerUp';
import { Shellbug } from '../entities/Shellbug';
import { EXTRA_TILE_INDEX } from '../art/tileIndex';
import { parseLevel, type LevelData } from '../levels/parser';
import { EffectsSystem } from '../systems/Effects';
import { getLevelById, getLevelNumber, getNextLevelId, getSession } from '../systems/GameSession';
import { InputManager } from '../systems/InputManager';

export interface GameSceneInitData {
  levelId: LevelId | '1-2-bonus';
  fromBonus?: boolean;
  inheritedTime?: number;
}

interface FirebarNode {
  anchorX: number;
  anchorY: number;
  angleRad: number;
  speedRad: number;
  balls: Phaser.Physics.Arcade.Sprite[];
}

export class GameScene extends Phaser.Scene {
  private levelData!: LevelData;
  private inputManager!: InputManager;
  private effects!: EffectsSystem;
  private player!: Player;

  private tilemap!: Phaser.Tilemaps.Tilemap;
  private solidLayer!: Phaser.Tilemaps.TilemapLayer;
  private passThroughGroup!: Phaser.Physics.Arcade.StaticGroup;
  private lavaGroup!: Phaser.Physics.Arcade.StaticGroup;
  private blockGroup!: Phaser.Physics.Arcade.StaticGroup;
  private gemGroup!: Phaser.Physics.Arcade.StaticGroup;
  private powerUpGroup!: Phaser.Physics.Arcade.Group;
  private blobGroup!: Phaser.Physics.Arcade.Group;
  private shellbugGroup!: Phaser.Physics.Arcade.Group;
  private platformGroup!: Phaser.Physics.Arcade.Group;
  private fireballPool: Fireball[] = [];
  private bossBulletPool: BossBullet[] = [];
  private firebars: FirebarNode[] = [];

  private flagpole: FlagPole | null = null;
  private castleDoorZone: Phaser.GameObjects.Zone | null = null;
  private boss: MagmaKing | null = null;
  private bossArenaLocked = false;
  private bossDefeated = false;
  private arenaBarrier: Phaser.GameObjects.Rectangle | null = null;

  private parallaxLayers: Array<{ sprite: Phaser.GameObjects.TileSprite; factor: number; drift: number }> = [];
  private glowSprites: Array<{ sprite: Phaser.GameObjects.Image; baseAlpha: number; phase: number; follow?: Phaser.GameObjects.Sprite }> = [];
  private lightOverlayRt: Phaser.GameObjects.RenderTexture | null = null;
  private lightCutoutBrush: Phaser.GameObjects.Image | null = null;
  private staticLightSources: Array<{ x: number; y: number }> = [];
  private dustMotes: Array<{ obj: Phaser.GameObjects.Rectangle; speedX: number; speedY: number }> = [];
  private lavaGlowRect: Phaser.GameObjects.Rectangle | null = null;
  private heatShimmerStrips: Array<{ rect: Phaser.GameObjects.Rectangle; baseY: number; phase: number }> = [];
  private lavaBubbleTimerMs = 0;
  private starGlow: Phaser.GameObjects.Image | null = null;
  private bossGlow: Phaser.GameObjects.Image | null = null;
  private fireballGlows: Map<Fireball, Phaser.GameObjects.Image> = new Map();

  private timeRemaining = 300;
  private lowTimeWarned = false;
  private wasStarActive = false;
  private levelEnding = false;
  private transforming = false;
  private maxCameraX = 0;

  private debugText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('GameScene');
  }

  create(initData?: GameSceneInitData): void {
    const session = getSession();
    session.refreshSave();

    const levelId = initData?.levelId ?? session.currentLevelId;
    const source = getLevelById(levelId);
    this.levelData = parseLevel(source);

    this.levelEnding = false;
    this.transforming = false;
    this.bossArenaLocked = false;
    this.bossDefeated = false;
    this.arenaBarrier = null;
    this.wasStarActive = false;
    this.lowTimeWarned = false;
    this.maxCameraX = 0;
    this.fireballPool = [];
    this.bossBulletPool = [];
    this.firebars = [];
    this.parallaxLayers = [];
    this.glowSprites = [];
    this.staticLightSources = [];
    this.dustMotes = [];
    this.heatShimmerStrips = [];
    this.lavaBubbleTimerMs = 0;
    this.lavaGlowRect = null;
    this.lightOverlayRt = null;
    this.lightCutoutBrush = null;
    this.starGlow = null;
    this.bossGlow = null;
    this.fireballGlows.clear();

    if (initData?.fromBonus && session.bonusReturnState) {
      this.timeRemaining = session.bonusReturnState.timeRemaining;
    } else if (initData?.inheritedTime !== undefined) {
      this.timeRemaining = initData.inheritedTime;
    } else {
      this.timeRemaining = this.levelData.timeLimit;
    }

    const worldWidthPx = this.levelData.widthTiles * TILE_SIZE;
    const worldHeightPx = this.levelData.heightTiles * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidthPx, worldHeightPx + 64);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.setupBackground(worldWidthPx);
    this.buildTilemap();

    this.inputManager = new InputManager(this);
    this.effects = new EffectsSystem(this);
    this.effects.setShakeEnabled(session.saveData.settings.shake);

    // Groups
    this.passThroughGroup = this.physics.add.staticGroup();
    this.lavaGroup = this.physics.add.staticGroup();
    this.blockGroup = this.physics.add.staticGroup();
    this.gemGroup = this.physics.add.staticGroup();
    this.powerUpGroup = this.physics.add.group();
    this.blobGroup = this.physics.add.group();
    this.shellbugGroup = this.physics.add.group();
    this.platformGroup = this.physics.add.group();

    this.populateEntities();

    // Determine player spawn position (bonus return > checkpoint > default spawn)
    let spawnX = this.levelData.spawn.col * TILE_SIZE + TILE_SIZE / 2;
    let spawnY = (this.levelData.spawn.row + 1) * TILE_SIZE;
    if (initData?.fromBonus && session.bonusReturnState) {
      spawnX = session.bonusReturnState.returnX;
      spawnY = session.bonusReturnState.returnY;
      session.bonusReturnState = null;
    } else if (!this.levelData.isBonus && session.checkpointPos) {
      spawnX = session.checkpointPos.x;
      spawnY = session.checkpointPos.y;
    }

    this.player = new Player(this, spawnX, spawnY, session.playerPower);
    this.player.setCallbacks({
      onEmitDust: (x, y) => this.effects.emitDust(x, y, 2),
      onEmitStarTrail: (x, y) => this.effects.emitStarTrail(x, y),
      onLandHard: (x, y) => this.effects.emitDust(x, y, 4),
      onJumpSound: (isBig) => (isBig ? synth.bigJump() : synth.jump()),
      onFireball: (x, y, dir) => this.spawnFireball(x, y, dir),
    });

    this.starGlow = this.add
      .image(spawnX, spawnY - 10, 'glow-star')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9)
      .setVisible(false);

    // Pools for fireballs and boss bullets
    for (let i = 0; i < 4; i++) {
      const fb = new Fireball(this);
      this.fireballPool.push(fb);
      const glow = this.add
        .image(-100, -100, 'glow-warm')
        .setScale(0.55)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(11)
        .setVisible(false);
      this.fireballGlows.set(fb, glow);
    }
    for (let i = 0; i < 12; i++) {
      this.bossBulletPool.push(new BossBullet(this));
    }

    this.setupCollisions();
    this.setupCamera(worldWidthPx, worldHeightPx);
    this.setupLightingOverlay(session.saveData.settings.highEffects);
    this.setupDebugKeys();

    // Launch UIScene in parallel
    this.scene.launch('UIScene', { levelId: this.levelData.id, inputManager: this.inputManager });

    // Start music
    synth.unlock();
    session.applyAudioSettings();
    music.play(this.levelData.music, this.timeRemaining <= GAMEPLAY_CONFIG.LOW_TIME_THRESHOLD ? 1.25 : 1);

    // Iris wipe open centered on Pip
    const cam = this.cameras.main;
    cam.centerOn(this.player.x, this.player.y);
    const sx = Phaser.Math.Clamp(this.player.x - cam.scrollX, 20, GAME_WIDTH - 20);
    const sy = Phaser.Math.Clamp(this.player.y - 12 - cam.scrollY, 20, GAME_HEIGHT - 20);
    this.effects.playIrisOpen(sx, sy, 420);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('UIScene');
      this.lightCutoutBrush?.destroy();
    });
  }

  private setupBackground(_worldWidthPx: number): void {
    const theme = this.levelData.theme;
    const bgHex = theme === 'grass' ? '#4488e8' : theme === 'cave' ? '#121226' : '#1a101a';
    this.cameras.main.setBackgroundColor(bgHex);

    if (theme === 'grass') {
      const sky = this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-grass-sky')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(0);
      const mountains = this.add
        .tileSprite(0, GAME_HEIGHT - 138, GAME_WIDTH, 120, 'bg-grass-mountains')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1);
      const hills = this.add
        .tileSprite(0, GAME_HEIGHT - 102, GAME_WIDTH, 80, 'bg-grass-hills')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2);
      const clouds = this.add
        .tileSprite(0, 12, GAME_WIDTH, 64, 'bg-grass-clouds')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2);
      this.parallaxLayers.push(
        { sprite: sky, factor: 0, drift: 0 },
        { sprite: mountains, factor: 0.1, drift: 0 },
        { sprite: hills, factor: 0.3, drift: 0 },
        { sprite: clouds, factor: 0.5, drift: 10 },
      );
    } else if (theme === 'cave') {
      const sky = this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-cave-sky')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(0);
      const rocks = this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-cave-rocks')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1);
      const crystals = this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-cave-crystals')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2);
      this.parallaxLayers.push(
        { sprite: sky, factor: 0, drift: 0 },
        { sprite: rocks, factor: 0.15, drift: 0 },
        { sprite: crystals, factor: 0.35, drift: 0 },
      );

      // Ambient drifting dust motes in cave
      for (let i = 0; i < 18; i++) {
        const mote = this.add
          .rectangle(
            Phaser.Math.Between(0, GAME_WIDTH),
            Phaser.Math.Between(24, GAME_HEIGHT - 24),
            1,
            1,
            0x98f0ff,
            0.5,
          )
          .setScrollFactor(0)
          .setDepth(3);
        this.dustMotes.push({
          obj: mote,
          speedX: Phaser.Math.FloatBetween(-6, 6),
          speedY: Phaser.Math.FloatBetween(-4, 4),
        });
      }
    } else {
      const sky = this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-castle-sky')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(0);
      const wall = this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-castle-wall')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1);
      const pillars = this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-castle-pillars')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2);
      this.parallaxLayers.push(
        { sprite: sky, factor: 0, drift: 0 },
        { sprite: wall, factor: 0.15, drift: 0 },
        { sprite: pillars, factor: 0.35, drift: 0 },
      );

      // Warm lava up-glow along bottom edge of castle screen
      this.lavaGlowRect = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 14, GAME_WIDTH, 28, 0xff5c18, 0.22)
        .setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2);
    }
  }

  private buildTilemap(): void {
    this.tilemap = this.make.tilemap({
      data: this.levelData.tileGrid,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = this.tilemap.addTilesetImage('tileset', 'tileset', TILE_SIZE, TILE_SIZE);
    if (!tileset) throw new Error('Failed to load tileset');
    const layer = this.tilemap.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('Failed to create tilemap layer');
    layer.setDepth(3);
    layer.setCollisionBetween(1, 155);
    this.solidLayer = layer;
  }

  private setupLightingOverlay(highEffects: boolean): void {
    if (!highEffects) return;
    if (this.levelData.theme === 'cave' || this.levelData.theme === 'castle') {
      this.lightOverlayRt = this.add
        .renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(18);
      this.lightCutoutBrush = this.make.image({ x: 0, y: 0, key: 'light-cutout', add: false });
    }
  }

  private populateEntities(): void {
    const highEffects = getSession().saveData.settings.highEffects;

    // Seeded level decorations (non-colliding)
    for (const dec of this.levelData.decorations) {
      const dx = dec.col * TILE_SIZE + TILE_SIZE / 2;
      const dy = (dec.row + 1) * TILE_SIZE;
      if (dec.kind === 'bush') {
        this.add.image(dec.col * TILE_SIZE, dec.row * TILE_SIZE, 'deco-bush', 0).setOrigin(0, 0).setDepth(3);
      } else if (dec.kind === 'flower') {
        this.add.sprite(dx, dy, 'deco-flower', 0).setOrigin(0.5, 1).setDepth(3).play('deco-flower-sway');
      } else if (dec.kind === 'tallgrass') {
        this.add.sprite(dx, dy, 'deco-tallgrass', 0).setOrigin(0.5, 1).setDepth(3).play('deco-tallgrass-sway');
      } else if (dec.kind === 'stalactite') {
        this.add.image(dec.col * TILE_SIZE, dec.row * TILE_SIZE, 'deco-stalactite', 0).setOrigin(0, 0).setDepth(3);
      } else if (dec.kind === 'mushroom') {
        this.add.sprite(dx, dy, 'deco-mushroom', 0).setOrigin(0.5, 1).setDepth(3).play('deco-mushroom-glow');
        if (highEffects) {
          const gl = this.add.image(dx, dy - 8, 'glow-cyan').setScale(0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
          this.glowSprites.push({ sprite: gl, baseAlpha: 0.45, phase: dec.col });
          this.staticLightSources.push({ x: dx, y: dy - 8 });
        }
      } else if (dec.kind === 'crystal') {
        this.add.sprite(dx, dy, 'deco-crystal', 0).setOrigin(0.5, 1).setDepth(3).play('deco-crystal-twinkle');
        if (highEffects) {
          const gl = this.add.image(dx, dy - 8, 'glow-cyan').setScale(0.75).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
          this.glowSprites.push({ sprite: gl, baseAlpha: 0.65, phase: dec.col * 1.3 });
          this.staticLightSources.push({ x: dx, y: dy - 8 });
        }
      } else if (dec.kind === 'banner') {
        this.add.image(dec.col * TILE_SIZE, dec.row * TILE_SIZE, 'deco-banner', 0).setOrigin(0, 0).setDepth(3);
      } else if (dec.kind === 'chain') {
        this.add.image(dec.col * TILE_SIZE, dec.row * TILE_SIZE, 'deco-chain', 0).setOrigin(0, 0).setDepth(3);
      } else if (dec.kind === 'torch') {
        this.add.sprite(dx, dy, 'deco-torch', 0).setOrigin(0.5, 1).setDepth(3).play('deco-torch-flicker');
        if (highEffects) {
          const gl = this.add.image(dx, dy - 12, 'glow-warm').setScale(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
          this.glowSprites.push({ sprite: gl, baseAlpha: 0.72, phase: dec.col * 0.7 });
          this.staticLightSources.push({ x: dx, y: dy - 12 });
        }
      }
    }

    // Pass-through bridges '='
    for (const pt of this.levelData.passThroughTiles) {
      const bridge = this.passThroughGroup.create(
        pt.col * TILE_SIZE + TILE_SIZE / 2,
        pt.row * TILE_SIZE + 3,
        'tileset',
        EXTRA_TILE_INDEX.BRIDGE,
      ) as Phaser.Physics.Arcade.Sprite;
      bridge.setOrigin(0.5, 0.2);
      bridge.setDepth(4);
      const body = bridge.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(TILE_SIZE, 5);
      body.setOffset(0, 0);
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      body.updateFromGameObject();
    }

    // Lava 'L'
    for (const lv of this.levelData.lavaTiles) {
      const lx = lv.col * TILE_SIZE + TILE_SIZE / 2;
      const ly = lv.row * TILE_SIZE + TILE_SIZE / 2;
      const lava = this.lavaGroup.create(lx, ly, 'lava-anim', 0) as Phaser.Physics.Arcade.Sprite;
      lava.setDepth(7);
      lava.play('lava-wave');
      const body = lava.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(TILE_SIZE, 12);
      body.setOffset(0, 4);
      body.updateFromGameObject();

      if (highEffects) {
        if (lv.col % 2 === 0) {
          const gl = this.add.image(lx, ly - 4, 'glow-warm').setScale(0.85).setBlendMode(Phaser.BlendModes.ADD).setDepth(8);
          this.glowSprites.push({ sprite: gl, baseAlpha: 0.55, phase: lv.col * 0.4 });
          this.staticLightSources.push({ x: lx, y: ly - 4 });
        }
        const shimmer = this.add
          .rectangle(lx, ly - 10, TILE_SIZE, 2, 0xff9430, 0.16)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(8);
        this.heatShimmerStrips.push({ rect: shimmer, baseY: ly - 10, phase: lv.col * 0.7 });
      }
    }

    // Interactive blocks
    for (const b of this.levelData.blocks) {
      const block = new InteractiveBlock(this, b.col, b.row, b.kind, this.levelData.theme);
      this.blockGroup.add(block);
    }

    // Floating gems
    for (const g of this.levelData.gems) {
      const gem = new Gem(this, g.col, g.row);
      this.gemGroup.add(gem);
    }

    // Enemies
    for (const e of this.levelData.enemies) {
      if (e.kind === 'blob') {
        const blob = new Blob(this, e.col, e.row, this.levelData.edgeAwareEnemies);
        this.blobGroup.add(blob);
      } else {
        const sb = new Shellbug(this, e.col, e.row);
        this.shellbugGroup.add(sb);
      }
    }

    // Moving platforms
    for (const p of this.levelData.platforms) {
      const plat = new MovingPlatform(this, p.col, p.row, p.axis);
      this.platformGroup.add(plat);
    }

    // Firebars (1-3)
    for (const fb of this.levelData.firebars) {
      const anchorX = fb.col * TILE_SIZE + TILE_SIZE / 2;
      const anchorY = fb.row * TILE_SIZE + TILE_SIZE / 2;
      const balls: Phaser.Physics.Arcade.Sprite[] = [];
      for (let i = 0; i < GAMEPLAY_CONFIG.FIREBAR_BALLS; i++) {
        const ball = this.physics.add.sprite(anchorX, anchorY, 'fireball', 0).setDepth(11);
        const body = ball.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setCircle(3, 1, 1);
        ball.play('fireball-spin');
        balls.push(ball);
      }
      const speedRad =
        Phaser.Math.DegToRad(GAMEPLAY_CONFIG.FIREBAR_DEG_PER_SEC) * (fb.clockwise ? 1 : -1);
      this.firebars.push({ anchorX, anchorY, angleRad: 0, speedRad, balls });
    }

    // Checkpoints
    for (const cp of this.levelData.checkpoints) {
      const cpZone = this.add.zone(
        cp.col * TILE_SIZE + TILE_SIZE / 2,
        cp.row * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE * 4,
      );
      this.physics.add.existing(cpZone, true);
      cpZone.setData('checkpointPos', {
        x: cp.col * TILE_SIZE + TILE_SIZE / 2,
        y: (cp.row + 1) * TILE_SIZE,
      });
      this.checkpointsZones.push(cpZone);
    }

    // Flagpole & Castle Door
    if (this.levelData.flagpole) {
      this.flagpole = new FlagPole(this, this.levelData.flagpole.col, this.levelData.flagpole.row);
    }
    if (this.levelData.door) {
      const doorX = this.levelData.door.col * TILE_SIZE + TILE_SIZE / 2;
      const doorY = (this.levelData.door.row + 1) * TILE_SIZE;
      this.add.image(doorX, doorY, 'castle-door', 0).setOrigin(0.5, 1).setDepth(3);
      this.castleDoorZone = this.add.zone(doorX, doorY - 16, 18, 32);
      this.physics.add.existing(this.castleDoorZone, true);
    }

    // Boss (Magma King)
    if (this.levelData.boss) {
      this.boss = new MagmaKing(this, this.levelData.boss.col, this.levelData.boss.row);
      this.boss.setArenaBounds(194 * TILE_SIZE, 219 * TILE_SIZE);
      this.boss.setCallbacks({
        onLandShake: (bx, by) => {
          this.effects.shake(200, 0.008);
          this.effects.emitRockDebris(bx, by);
        },
        onFireFan: (bx, by, tx, ty, count, speedMult) => this.spawnBossFan(bx, by, tx, ty, count, speedMult),
      });
      if (highEffects) {
        this.bossGlow = this.add
          .image(this.boss.x, this.boss.y - 24, 'glow-warm')
          .setScale(1.1)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.55)
          .setDepth(8);
      }
    }
  }

  private checkpointsZones: Phaser.GameObjects.Zone[] = [];

  private setupCollisions(): void {
    // Player vs static world tiles (with corner correction on upward bump)
    this.physics.add.collider(this.player, this.solidLayer);
    this.physics.add.collider(this.player, this.passThroughGroup);
    this.physics.add.collider(this.player, this.platformGroup, (_p, platObj) => {
      const plat = platObj as MovingPlatform;
      const pBody = this.player.getArcadeBody();
      if (pBody.blocked.down || pBody.touching.down) {
        this.player.x += plat.deltaX;
        this.player.y += plat.deltaY;
      }
    });

    // Player vs interactive blocks (custom processCallback for hidden blocks!)
    this.physics.add.collider(
      this.player,
      this.blockGroup,
      undefined,
      (_p, blockObj) => {
        const block = blockObj as InteractiveBlock;
        const pBody = this.player.getArcadeBody();
        return block.isSolidFor(pBody.velocity.y, pBody.bottom);
      },
    );

    // Gems
    this.physics.add.overlap(this.player, this.gemGroup, (_p, gemObj) => {
      const gem = gemObj as Gem;
      if (!gem.active) return;
      gem.destroy();
      this.collectGem(gem.x, gem.y, SCORE_VALUES.FLOATING_GEM);
    });

    // PowerUps
    this.physics.add.collider(this.powerUpGroup, this.solidLayer);
    this.physics.add.collider(this.powerUpGroup, this.blockGroup);
    this.physics.add.collider(this.powerUpGroup, this.passThroughGroup);
    this.physics.add.overlap(this.player, this.powerUpGroup, (_p, puObj) => {
      const pu = puObj as PowerUp;
      if (!pu.active || pu.emerging) return;
      this.collectPowerUp(pu);
    });

    // Blobs
    this.physics.add.collider(this.blobGroup, this.solidLayer);
    this.physics.add.collider(this.blobGroup, this.blockGroup);
    this.physics.add.collider(this.blobGroup, this.passThroughGroup);
    this.physics.add.collider(this.blobGroup, this.blobGroup, (a, b) => {
      (a as Blob).reverseDirection();
      (b as Blob).reverseDirection();
    });

    // Shellbugs
    this.physics.add.collider(this.shellbugGroup, this.solidLayer);
    this.physics.add.collider(this.shellbugGroup, this.blockGroup);
    this.physics.add.collider(this.shellbugGroup, this.passThroughGroup);

    // Blob vs Shellbug (sliding shell kills Blob; walking reverse)
    this.physics.add.overlap(this.blobGroup, this.shellbugGroup, (blobObj, sbObj) => {
      const blob = blobObj as Blob;
      const sb = sbObj as Shellbug;
      if (blob.dead || sb.isDead()) return;
      if (sb.state === 'shell-slide') {
        const dir: -1 | 1 = blob.x >= sb.x ? 1 : -1;
        blob.flipKill(dir);
        this.awardComboKill(blob.x, blob.y - 12);
        synth.kick();
      } else {
        blob.reverseDirection();
        sb.reverseDirection();
      }
    });

    // Shellbug vs Shellbug
    this.physics.add.overlap(this.shellbugGroup, this.shellbugGroup, (aObj, bObj) => {
      if (aObj === bObj) return;
      const a = aObj as Shellbug;
      const b = bObj as Shellbug;
      if (a.isDead() || b.isDead()) return;
      if (a.state === 'shell-slide' && b.state !== 'shell-slide') {
        b.flipKill(b.x >= a.x ? 1 : -1);
        this.awardComboKill(b.x, b.y - 12);
        synth.kick();
      } else if (b.state === 'shell-slide' && a.state !== 'shell-slide') {
        a.flipKill(a.x >= b.x ? 1 : -1);
        this.awardComboKill(a.x, a.y - 12);
        synth.kick();
      } else {
        a.reverseDirection();
        b.reverseDirection();
      }
    });

    // Player vs Blobs
    this.physics.add.overlap(this.player, this.blobGroup, (_p, blobObj) => {
      this.handlePlayerBlobOverlap(blobObj as Blob);
    });

    // Player vs Shellbugs
    this.physics.add.overlap(this.player, this.shellbugGroup, (_p, sbObj) => {
      this.handlePlayerShellbugOverlap(sbObj as Shellbug);
    });

    // Fireballs vs world / enemies / boss
    for (const fb of this.fireballPool) {
      this.physics.add.collider(fb, this.solidLayer);
      this.physics.add.collider(fb, this.blockGroup);
      this.physics.add.collider(fb, this.passThroughGroup);
      this.physics.add.overlap(fb, this.blobGroup, (_f, blobObj) => {
        const blob = blobObj as Blob;
        if (!fb.active || blob.dead) return;
        fb.deactivate();
        blob.flipKill(fb.x <= blob.x ? 1 : -1);
        this.killEnemySimple(blob.x, blob.y - 10, SCORE_VALUES.FIREBALL_KILL);
      });
      this.physics.add.overlap(fb, this.shellbugGroup, (_f, sbObj) => {
        const sb = sbObj as Shellbug;
        if (!fb.active || sb.isDead()) return;
        fb.deactivate();
        sb.flipKill(fb.x <= sb.x ? 1 : -1);
        this.killEnemySimple(sb.x, sb.y - 10, SCORE_VALUES.FIREBALL_KILL);
      });
      if (this.boss) {
        this.physics.add.overlap(fb, this.boss, () => {
          if (!fb.active || !this.boss || this.boss.phase === 'dead') return;
          fb.deactivate();
          this.damageBoss();
        });
      }
    }

    // Lava hazard
    this.physics.add.overlap(this.player, this.lavaGroup, () => {
      if (!this.player.isDead && !this.player.isGodMode()) {
        this.killPlayer();
      }
    });

    // Firebars
    for (const node of this.firebars) {
      for (const ball of node.balls) {
        this.physics.add.overlap(this.player, ball, () => {
          if (!this.player.isDead && !this.player.hasStar()) {
            this.hurtPlayer();
          }
        });
      }
    }

    // Boss vs world & player & bullets
    if (this.boss) {
      this.physics.add.collider(this.boss, this.solidLayer);
      this.physics.add.overlap(this.player, this.boss, () => {
        this.handlePlayerBossOverlap();
      });
      for (const bullet of this.bossBulletPool) {
        this.physics.add.overlap(this.player, bullet, () => {
          if (!bullet.active || this.player.isDead) return;
          bullet.deactivate();
          if (!this.player.hasStar()) {
            this.hurtPlayer();
          }
        });
      }
    }

    // Checkpoints
    for (const cpZone of this.checkpointsZones) {
      this.physics.add.overlap(this.player, cpZone, () => {
        const pos = cpZone.getData('checkpointPos') as { x: number; y: number } | undefined;
        if (pos) {
          getSession().checkpointPos = pos;
          cpZone.destroy();
        }
      });
    }

    // Flagpole
    if (this.flagpole) {
      this.physics.add.overlap(this.player, this.flagpole.triggerZone, () => {
        if (this.flagpole && !this.flagpole.triggered && !this.player.isDead && !this.levelEnding) {
          this.triggerFlagpoleFinish(this.flagpole);
        }
      });
    }

    // Castle door (1-3 after boss dies, or direct door if no flagpole)
    if (this.castleDoorZone) {
      this.physics.add.overlap(this.player, this.castleDoorZone, () => {
        if (this.levelEnding || this.player.isDead) return;
        if (this.boss && !this.bossDefeated) return;
        if (!this.flagpole) {
          this.finishLevelAtDoor();
        }
      });
    }
  }

  private setupCamera(worldWidthPx: number, worldHeightPx: number): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldWidthPx, worldHeightPx);
    cam.startFollow(this.player, true, CAMERA_CONFIG.LERP_X, CAMERA_CONFIG.LERP_Y);
    cam.setDeadzone(CAMERA_CONFIG.DEADZONE_W, CAMERA_CONFIG.DEADZONE_H);
  }

  private setupDebugKeys(): void {
    if (!isDebugEnabled()) return;
    this.debugText = this.add
      .text(6, 24, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#40e8f8',
        backgroundColor: '#000000aa',
        resolution: 2,
      })
      .setScrollFactor(0)
      .setDepth(120);

    const kb = this.input.keyboard;
    if (!kb) return;

    const jumpLevel = (id: LevelId): void => {
      const s = getSession();
      s.checkpointPos = null;
      s.bonusReturnState = null;
      this.scene.restart({ levelId: id });
    };
    kb.on('keydown-ONE', () => jumpLevel('1-1'));
    kb.on('keydown-TWO', () => jumpLevel('1-2'));
    kb.on('keydown-THREE', () => jumpLevel('1-3'));
    kb.on('keydown-G', () => this.player.setGodMode(!this.player.isGodMode()));
    kb.on('keydown-N', () => {
      if (!this.levelEnding) this.finishLevelAtDoor();
    });
    kb.on('keydown-L', () => {
      getSession().scoreManager.addLife(1);
      synth.oneUp();
    });
    kb.on('keydown-T', () => {
      this.timeRemaining = 10;
    });
    kb.on('keydown-P', () => this.player.applyPowerState('big'));
    kb.on('keydown-F', () => this.player.applyPowerState('fire'));
    kb.on('keydown-S', () => {
      this.player.activateStar();
      music.play('star', 1);
    });
  }

  private spawnFireball(x: number, y: number, dir: 1 | -1): boolean {
    const activeCount = this.fireballPool.filter((f) => f.active).length;
    if (activeCount >= GAMEPLAY_CONFIG.FIREBALL_MAX_ACTIVE) return false;
    const free = this.fireballPool.find((f) => !f.active);
    if (!free) return false;
    free.launch(x, y, dir);
    synth.fireball();
    return true;
  }

  private spawnBossFan(
    bx: number,
    by: number,
    tx: number,
    ty: number,
    count: number,
    speedMult: number,
  ): void {
    const baseAngle = Math.atan2(ty - by, tx - bx);
    const spread = Phaser.Math.DegToRad(16);
    const half = (count - 1) / 2;
    const speed = 135 * speedMult;

    for (let i = 0; i < count; i++) {
      const bullet = this.bossBulletPool.find((b) => !b.active);
      if (!bullet) break;
      const angle = baseAngle + (i - half) * spread;
      bullet.launch(bx, by, Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  private collectGem(x: number, y: number, points: number): void {
    const { gainedOneUp } = getSession().scoreManager.addGem(points);
    synth.gem();
    this.effects.emitGemSparkle(x, y);
    this.effects.spawnScoreText(x, y, String(points), 0xffe030);
    if (gainedOneUp) {
      synth.oneUp();
      this.effects.spawnScoreText(x, y - 14, '1UP', 0x48d848);
    }
  }

  private collectPowerUp(pu: PowerUp): void {
    const session = getSession();
    const puType = pu.powerUpType;
    const px = pu.x;
    const py = pu.y;
    pu.destroy();

    if (puType === 'one-up') {
      session.scoreManager.addLife(1);
      synth.oneUp();
      this.effects.spawnScoreText(px, py, '1UP', 0x48d848);
      return;
    }

    if (puType === 'nova-star') {
      this.player.activateStar();
      session.scoreManager.addScore(SCORE_VALUES.POWERUP);
      synth.powerup();
      music.play('star', 1);
      this.effects.spawnScoreText(px, py, String(SCORE_VALUES.POWERUP), 0xffe030);
      return;
    }

    const event = puType === 'power-cell' ? 'powerCell' : 'flameCore';
    const result = nextPowerState(this.player.powerState, event);
    session.scoreManager.addScore(result.points);
    session.playerPower = result.nextState;
    synth.powerup();
    this.effects.spawnScoreText(px, py, String(result.points), 0x40e8f8);

    if (result.changed) {
      this.effects.emitPowerRays(this.player.x, this.player.y - 12);
      this.runPowerTransition(this.player.powerState, result.nextState);
    }
  }

  private runPowerTransition(fromState: PowerState, toState: PowerState): void {
    this.transforming = true;
    this.physics.world.pause();
    let step = 0;
    const timer = this.time.addEvent({
      delay: 75,
      repeat: 7,
      callback: () => {
        step++;
        this.player.applyPowerState(step % 2 === 0 ? toState : fromState);
        if (step >= 8) {
          this.player.applyPowerState(toState);
          this.transforming = false;
          this.physics.world.resume();
        }
      },
    });
    void timer;
  }

  private handleHeadBonkAndCornerCorrection(prevVy: number): void {
    const pBody = this.player.getArcadeBody();
    if (!pBody.blocked.up) return;

    // 1. Find closest InteractiveBlock directly above Pip's horizontal center
    const headX = pBody.center.x;
    const headTop = pBody.top;
    let bestBlock: InteractiveBlock | null = null;
    let bestDist = Infinity;

    for (const obj of this.blockGroup.getChildren()) {
      const block = obj as InteractiveBlock;
      if (!block.active) continue;
      if (block.kind === 'hidden-1up' && !block.hiddenRevealed) {
        // Also check overlap for unrevealed hidden blocks if jumping upward
        if (
          Math.abs(block.x - headX) <= 12 &&
          headTop <= block.y + 10 &&
          headTop >= block.y - 6 &&
          prevVy < 0
        ) {
          const dist = Math.abs(block.x - headX);
          if (dist < bestDist) {
            bestDist = dist;
            bestBlock = block;
          }
        }
        continue;
      }

      const horizontalMatch = Math.abs(block.x - headX) <= 13;
      const verticalMatch = Math.abs(block.y + TILE_SIZE / 2 - headTop) <= 6;
      if (horizontalMatch && verticalMatch) {
        const dist = Math.abs(block.x - headX);
        if (dist < bestDist) {
          bestDist = dist;
          bestBlock = block;
        }
      }
    }

    if (bestBlock) {
      this.hitInteractiveBlock(bestBlock);
      return;
    }

    // 2. Corner correction (<= 4px) on solid tiles when jumping upward
    if (prevVy < -30) {
      const leftEdge = pBody.left;
      const rightEdge = pBody.right;
      const checkY = pBody.top - 2;
      const tileAtLeft = this.solidLayer.getTileAtWorldXY(leftEdge + 1, checkY);
      const tileAtRight = this.solidLayer.getTileAtWorldXY(rightEdge - 1, checkY);
      const corr = PHYSICS_CONFIG.CORNER_CORRECTION_PX;

      if (tileAtLeft && !tileAtRight) {
        const tileRightEdge = (tileAtLeft.x + 1) * TILE_SIZE;
        if (tileRightEdge - leftEdge <= corr) {
          this.player.x += tileRightEdge - leftEdge + 1;
          pBody.setVelocityY(prevVy);
        }
      } else if (tileAtRight && !tileAtLeft) {
        const tileLeftEdge = tileAtRight.x * TILE_SIZE;
        if (rightEdge - tileLeftEdge <= corr) {
          this.player.x -= rightEdge - tileLeftEdge + 1;
          pBody.setVelocityY(prevVy);
        }
      }
    }
  }

  private hitInteractiveBlock(block: InteractiveBlock): void {
    const isBigOrFire = this.player.powerState !== 'small';
    const outcome = block.hitFromBelow(isBigOrFire, this.time.now);
    if (outcome.type === 'none') return;

    // Kill any enemies standing directly on top of the bumped block
    const blockTop = block.y - TILE_SIZE / 2;
    for (const obj of this.blobGroup.getChildren()) {
      const blob = obj as Blob;
      if (!blob.active || blob.dead) continue;
      if (Math.abs(blob.x - block.x) <= 14 && Math.abs(blob.y - blockTop) <= 6) {
        blob.flipKill(blob.x >= block.x ? 1 : -1);
        this.killEnemySimple(blob.x, blob.y - 10, 200);
      }
    }
    for (const obj of this.shellbugGroup.getChildren()) {
      const sb = obj as Shellbug;
      if (!sb.active || sb.isDead()) continue;
      if (Math.abs(sb.x - block.x) <= 14 && Math.abs(sb.y - blockTop) <= 6) {
        sb.flipKill(sb.x >= block.x ? 1 : -1);
        this.killEnemySimple(sb.x, sb.y - 10, 200);
      }
    }

    if (outcome.type === 'bump') {
      synth.bump();
      return;
    }

    if (outcome.type === 'break') {
      synth.breakBrick();
      getSession().scoreManager.addScore(SCORE_VALUES.BRICK_BREAK);
      this.effects.emitBrickBreak(block.x, block.y);
      block.destroy();
      return;
    }

    if (outcome.type === 'gem') {
      this.effects.spawnPopupGem(block.x, block.y);
      this.collectGem(block.x, block.y - 16, SCORE_VALUES.GEM);
      return;
    }

    let spawnType: PowerUpType = 'power-cell';
    if (outcome.type === 'powerup') {
      spawnType = this.player.powerState === 'small' ? 'power-cell' : 'flame-core';
    } else if (outcome.type === 'star') {
      spawnType = 'nova-star';
    } else if (outcome.type === 'oneup') {
      spawnType = 'one-up';
    }

    synth.powerupAppear();
    const pu = new PowerUp(this, block.x, block.y, spawnType);
    this.powerUpGroup.add(pu);
  }

  private isStompHit(enemyBody: Phaser.Physics.Arcade.Body): boolean {
    const pBody = this.player.getArcadeBody();
    return pBody.velocity.y > 0 && this.player.prevBottom <= enemyBody.center.y + 3;
  }

  private awardComboKill(x: number, y: number): void {
    const res = getSession().scoreManager.registerComboKill();
    this.effects.spawnScoreText(x, y, res.label, res.oneUp ? 0x48d848 : 0xffffff);
    if (res.oneUp) synth.oneUp();
  }

  private killEnemySimple(x: number, y: number, points: number): void {
    const session = getSession();
    session.scoreManager.registerKill(true);
    session.scoreManager.addScore(points);
    this.effects.spawnScoreText(x, y, String(points), 0xffffff);
  }

  private applyHitStop(): void {
    this.physics.world.pause();
    this.time.delayedCall(60, () => {
      if (this.scene.isActive('GameScene') && !this.transforming) {
        this.physics.world.resume();
      }
    });
  }

  private bouncePlayerAfterStomp(): void {
    const pBody = this.player.getArcadeBody();
    const input = this.inputManager.poll();
    const vy = input.jump ? PHYSICS_CONFIG.STOMP_BOUNCE_HOLD : PHYSICS_CONFIG.STOMP_BOUNCE;
    pBody.setVelocityY(vy);
  }

  private handlePlayerBlobOverlap(blob: Blob): void {
    if (blob.dead || this.player.isDead) return;
    if (this.player.hasStar()) {
      blob.flipKill(blob.x >= this.player.x ? 1 : -1);
      this.awardComboKill(blob.x, blob.y - 10);
      synth.kick();
      return;
    }

    if (this.isStompHit(blob.getArcadeBody())) {
      blob.stompKill();
      synth.stomp();
      this.bouncePlayerAfterStomp();
      this.awardComboKill(blob.x, blob.y - 14);
      this.applyHitStop();
    } else {
      this.hurtPlayer();
    }
  }

  private handlePlayerShellbugOverlap(sb: Shellbug): void {
    if (sb.isDead() || this.player.isDead) return;
    if (this.player.hasStar()) {
      sb.flipKill(sb.x >= this.player.x ? 1 : -1);
      this.awardComboKill(sb.x, sb.y - 10);
      synth.kick();
      return;
    }

    const stomp = this.isStompHit(sb.getArcadeBody());

    if (sb.state === 'walk') {
      if (stomp) {
        sb.enterShellIdle();
        synth.stomp();
        this.bouncePlayerAfterStomp();
        this.awardComboKill(sb.x, sb.y - 16);
        this.applyHitStop();
      } else {
        this.hurtPlayer();
      }
      return;
    }

    if (sb.state === 'shell-idle') {
      const kickDir: -1 | 1 = this.player.x <= sb.x ? 1 : -1;
      sb.kickShell(kickDir);
      synth.kick();
      if (stomp) {
        this.bouncePlayerAfterStomp();
      }
      this.effects.spawnScoreText(sb.x, sb.y - 14, '400', 0xffe030);
      getSession().scoreManager.addScore(400);
      return;
    }

    if (sb.state === 'shell-slide') {
      if (stomp) {
        sb.enterShellIdle();
        synth.stomp();
        this.bouncePlayerAfterStomp();
        this.applyHitStop();
      } else if (sb.isDangerousSlide()) {
        this.hurtPlayer();
      }
    }
  }

  private handlePlayerBossOverlap(): void {
    if (!this.boss || this.boss.phase === 'dead' || this.player.isDead) return;
    if (this.player.hasStar()) {
      this.damageBoss();
      return;
    }
    if (this.isStompHit(this.boss.getArcadeBody())) {
      this.player.getArcadeBody().setVelocityY(PHYSICS_CONFIG.STOMP_BOUNCE_HOLD);
      this.damageBoss();
    } else {
      this.hurtPlayer();
    }
  }

  private damageBoss(): void {
    if (!this.boss) return;
    const killed = this.boss.takeDamage(1);
    this.events.emit('boss-hp', this.boss.hp, this.boss.maxHp);

    if (killed) {
      this.bossDefeated = true;
      music.stop();
      synth.bossDie();
      this.effects.shake(500, 0.01);
      this.effects.emitBurst(this.boss.x, this.boss.y - 24, 0xff5010, 24);
      this.bossGlow?.destroy();
      this.bossGlow = null;
      getSession().scoreManager.addScore(SCORE_VALUES.BOSS_KILL);
      getSession().scoreManager.registerKill(true);
      this.effects.spawnScoreText(this.boss.x, this.boss.y - 40, String(SCORE_VALUES.BOSS_KILL), 0xffe030);
      this.events.emit('boss-hide');
      this.time.delayedCall(900, () => {
        if (this.boss?.active) this.boss.destroy();
      });
    } else {
      synth.bossHit();
    }
  }

  private hurtPlayer(): void {
    if (this.player.isDead || this.player.isInvulnerable || this.player.isGodMode() || this.levelEnding) {
      return;
    }

    const res = nextPowerState(this.player.powerState, 'hurt');
    if (res.died) {
      this.killPlayer();
      return;
    }

    const prevState = this.player.powerState;
    getSession().playerPower = res.nextState;
    synth.hurt();
    this.player.startInvulnerability(PHYSICS_CONFIG.HURT_INVULN_MS);
    this.runPowerTransition(prevState, res.nextState);
  }

  private killPlayer(): void {
    if (this.player.isDead) return;
    this.player.isDead = true;
    this.levelEnding = true;
    this.inputManager.setLocked(true);

    const session = getSession();
    session.playerPower = 'small';
    music.stop();
    synth.die();

    this.physics.world.pause();
    this.player.anims.stop();
    this.player.setTexture('pip-small', 22);

    this.time.delayedCall(500, () => {
      if (!this.scene.isActive('GameScene')) return;
      this.physics.world.resume();
      const body = this.player.getArcadeBody();
      body.checkCollision.none = true;
      body.setVelocity(0, -340);
    });

    this.time.delayedCall(2100, () => {
      if (!this.scene.isActive('GameScene')) return;
      const cam = this.cameras.main;
      const sx = Phaser.Math.Clamp(this.player.x - cam.scrollX, 20, GAME_WIDTH - 20);
      const sy = Phaser.Math.Clamp(this.player.y - 10 - cam.scrollY, 20, GAME_HEIGHT - 20);
      this.effects.playIrisClose(sx, sy, 400, () => {
        const remainingLives = session.scoreManager.loseLife();
        if (remainingLives <= 0) {
          session.checkpointPos = null;
          this.scene.start('GameOverScene');
        } else {
          this.scene.start('LevelIntroScene', { levelId: session.currentLevelId });
        }
      });
    });
  }

  private triggerFlagpoleFinish(pole: FlagPole): void {
    pole.triggered = true;
    this.levelEnding = true;
    this.inputManager.setLocked(true);

    const session = getSession();
    const pBody = this.player.getArcadeBody();
    const poleScore = pole.computeScore(pBody.bottom);
    session.scoreManager.addScore(poleScore);
    this.effects.spawnScoreText(pole.poleX + 14, pBody.top, String(poleScore), 0xffe030);

    music.stop();
    synth.flagpole();
    pole.lowerFlag(800);

    pBody.setAllowGravity(false);
    pBody.setVelocity(0, 0);
    this.player.x = pole.poleX - 4;

    this.tweens.add({
      targets: this.player,
      y: pole.baseY,
      duration: 750,
      ease: 'Linear',
      onComplete: () => {
        pBody.setAllowGravity(true);
        const targetX = this.castleDoorZone ? this.castleDoorZone.x : pole.poleX + 80;
        this.walkIntoDoorAndAdvance(targetX);
      },
    });
  }

  private finishLevelAtDoor(): void {
    this.levelEnding = true;
    this.inputManager.setLocked(true);
    music.stop();
    this.walkIntoDoorAndAdvance(this.player.x + 8);
  }

  private walkIntoDoorAndAdvance(doorX: number): void {
    synth.levelClear();
    this.player.setVictoryPose(true);
    const pBody = this.player.getArcadeBody();
    pBody.setVelocityX(85);
    this.player.facing = 1;

    const checkWalk = this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        if (this.player.x >= doorX - 2) {
          checkWalk.remove();
          pBody.setVelocityX(0);
          this.player.setVisible(false);
          this.tallyRemainingTimeAndProceed();
        }
      },
    });
  }

  private tallyRemainingTimeAndProceed(): void {
    const session = getSession();
    let ticksLeft = Math.max(0, Math.ceil(this.timeRemaining));
    const finishNext = (): void => {
      session.checkpointPos = null;
      session.bonusReturnState = null;

      if (this.levelData.id !== '1-2-bonus') {
        session.highestClearedLevel = this.levelData.id;
        const nextId = getNextLevelId(this.levelData.id);
        if (nextId) {
          session.saveData = session.saveManager.unlockLevel(getLevelNumber(nextId));
          session.saveData = session.saveManager.recordHighScore(session.scoreManager.getSnapshot().score);
          session.currentLevelId = nextId;
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LevelIntroScene', { levelId: nextId });
          });
        } else {
          session.saveData = session.saveManager.recordHighScore(session.scoreManager.getSnapshot().score);
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('VictoryScene');
          });
        }
      }
    };

    if (ticksLeft === 0) {
      this.time.delayedCall(600, finishNext);
      return;
    }

    const stepPerTick = Math.max(1, Math.ceil(ticksLeft / 35));
    const timer = this.time.addEvent({
      delay: 32,
      loop: true,
      callback: () => {
        const take = Math.min(stepPerTick, ticksLeft);
        ticksLeft -= take;
        this.timeRemaining = ticksLeft;
        session.scoreManager.addScore(take * GAMEPLAY_CONFIG.TIME_SCORE_PER_SEC);
        this.events.emit('time-update', ticksLeft);
        synth.tick();
        if (ticksLeft <= 0) {
          timer.remove();
          this.time.delayedCall(500, finishNext);
        }
      },
    });
  }

  private checkWarpPipes(downPressed: boolean): void {
    if (this.levelEnding || this.levelData.warpPipes.length === 0) return;
    const pBody = this.player.getArcadeBody();
    if (!pBody.blocked.down || !downPressed) return;

    for (const wp of this.levelData.warpPipes) {
      const pipeCenterX = (wp.col + 1) * TILE_SIZE;
      const pipeTopY = wp.row * TILE_SIZE;
      if (Math.abs(this.player.x - pipeCenterX) <= 14 && Math.abs(pBody.bottom - pipeTopY) <= 4) {
        this.enterWarpPipe();
        return;
      }
    }
  }

  private enterWarpPipe(): void {
    this.levelEnding = true;
    this.inputManager.setLocked(true);
    synth.powerupAppear();
    const pBody = this.player.getArcadeBody();
    pBody.setVelocity(0, 0);
    pBody.setAllowGravity(false);
    pBody.checkCollision.none = true;
    this.player.setDepth(2);

    this.tweens.add({
      targets: this.player,
      y: this.player.y + 20,
      duration: 380,
      onComplete: () => {
        const session = getSession();
        if (this.levelData.id === '1-2') {
          session.bonusReturnState = {
            levelId: '1-2',
            returnX: 127 * TILE_SIZE,
            returnY: 10 * TILE_SIZE,
            timeRemaining: this.timeRemaining,
          };
          this.scene.restart({ levelId: '1-2-bonus', inheritedTime: this.timeRemaining });
        } else {
          this.scene.restart({ levelId: '1-2', fromBonus: true });
        }
      },
    });
  }

  private hasSolidTileAt(worldX: number, worldY: number): boolean {
    const tile = this.solidLayer.getTileAtWorldXY(worldX, worldY);
    if (tile && tile.index > 0) return true;
    for (const obj of this.blockGroup.getChildren()) {
      const b = obj as InteractiveBlock;
      if (!b.active) continue;
      if (b.kind === 'hidden-1up' && !b.hiddenRevealed) continue;
      if (Math.abs(worldX - b.x) <= 8 && Math.abs(worldY - b.y) <= 8) return true;
    }
    return false;
  }

  override update(_time: number, delta: number): void {
    const dtMs = Math.min(delta, 50);
    const session = getSession();

    const input = this.inputManager.poll();
    if (input.mutePressed) {
      synth.toggleMute();
    }
    if (input.pausePressed && !this.levelEnding && !this.transforming) {
      synth.pause();
      music.pause();
      this.scene.pause();
      this.scene.launch('PauseScene');
      return;
    }

    if (this.transforming) {
      return;
    }

    const cam = this.cameras.main;
    const camLeft = cam.scrollX;
    const camRight = cam.scrollX + GAME_WIDTH;
    const worldWidthPx = this.levelData.widthTiles * TILE_SIZE;
    const worldHeightPx = this.levelData.heightTiles * TILE_SIZE;

    // Update platforms first so deltaX/deltaY is fresh
    for (const obj of this.platformGroup.getChildren()) {
      (obj as MovingPlatform).updatePlatform(dtMs);
    }

    // Rotate firebars (1-3)
    for (const node of this.firebars) {
      node.angleRad += node.speedRad * (dtMs / 1000);
      for (let i = 0; i < node.balls.length; i++) {
        const dist = (i + 1) * 8;
        const bx = node.anchorX + Math.cos(node.angleRad) * dist;
        const by = node.anchorY + Math.sin(node.angleRad) * dist;
        node.balls[i]!.setPosition(bx, by);
      }
    }

    const prevVy = this.player.getArcadeBody().velocity.y;
    this.player.updatePlayer(dtMs, input, this.maxCameraX, worldWidthPx);

    if (!this.levelEnding) {
      this.handleHeadBonkAndCornerCorrection(prevVy);
      this.checkWarpPipes(input.down);

      // Reset stomp combo when landing on solid ground
      if (this.player.getArcadeBody().blocked.down) {
        session.scoreManager.resetCombo();
      }

      // Fall into pit
      if (this.player.y > worldHeightPx + 24) {
        this.killPlayer();
      }

      // Timer countdown
      this.timeRemaining = Math.max(0, this.timeRemaining - dtMs / 1000);
      session.runElapsedSec += dtMs / 1000;
      this.events.emit('time-update', this.timeRemaining);

      if (this.timeRemaining <= GAMEPLAY_CONFIG.LOW_TIME_THRESHOLD && !this.lowTimeWarned) {
        this.lowTimeWarned = true;
        synth.timeWarn();
        music.setTempoMultiplier(1.25);
      }
      if (this.timeRemaining <= 0) {
        this.killPlayer();
      }

      // Star music transition
      const starNow = this.player.hasStar();
      if (this.wasStarActive && !starNow) {
        music.play(
          this.levelData.music,
          this.timeRemaining <= GAMEPLAY_CONFIG.LOW_TIME_THRESHOLD ? 1.25 : 1,
        );
      }
      this.wasStarActive = starNow;

      // Boss Arena lock (1-3)
      if (this.boss && !this.bossArenaLocked && this.player.x >= 194 * TILE_SIZE) {
        this.bossArenaLocked = true;
        const arenaLeft = 194 * TILE_SIZE;
        const arenaWidth = 26 * TILE_SIZE;
        cam.stopFollow();
        cam.setBounds(arenaLeft, 0, arenaWidth, worldHeightPx);
        cam.scrollX = arenaLeft;
        this.maxCameraX = arenaLeft;

        // Close gate behind Pip
        this.arenaBarrier = this.add
          .rectangle(193.5 * TILE_SIZE, 120, TILE_SIZE, 240, 0x485060)
          .setDepth(5);
        this.physics.add.existing(this.arenaBarrier, true);
        this.physics.add.collider(this.player, this.arenaBarrier);

        this.boss.activate();
        this.events.emit('boss-hp', this.boss.hp, this.boss.maxHp);
      }
    }

    // Clamp left camera backtracking
    if (!this.bossArenaLocked && cam.scrollX > this.maxCameraX && PHYSICS_CONFIG.PREVENT_BACKTRACK) {
      this.maxCameraX = cam.scrollX;
    }

    // Update active powerups
    for (const obj of this.powerUpGroup.getChildren()) {
      (obj as PowerUp).updatePowerUp();
    }

    // Update enemies within camera activation zone
    const groundCheck = (wx: number, wy: number): boolean => this.hasSolidTileAt(wx, wy);
    for (const obj of this.blobGroup.getChildren()) {
      const blob = obj as Blob;
      blob.activateIfNear(camRight);
      blob.updateBlob(groundCheck, worldHeightPx);
    }
    for (const obj of this.shellbugGroup.getChildren()) {
      const sb = obj as Shellbug;
      sb.activateIfNear(camRight);
      sb.updateShellbug(dtMs, groundCheck, worldHeightPx);
    }

    // Update fireballs, fireball additive glows & boss bullets
    for (const fb of this.fireballPool) {
      const glow = this.fireballGlows.get(fb);
      if (fb.updateFireball(camLeft, camRight, worldHeightPx)) {
        this.effects.emitFireSparks(fb.x, fb.y);
        fb.deactivate();
      }
      if (glow) {
        glow.setVisible(fb.active);
        if (fb.active) glow.setPosition(Math.round(fb.x), Math.round(fb.y));
      }
    }
    for (const bullet of this.bossBulletPool) {
      bullet.updateBullet(camLeft, camRight, worldHeightPx);
    }

    if (this.boss && this.boss.active) {
      this.boss.updateBoss(dtMs, this.player.x, this.player.y);
      if (this.bossGlow) {
        this.bossGlow.setPosition(Math.round(this.boss.x), Math.round(this.boss.y - 24));
      }
    }

    // Parallax scrolling & continuous clouds / cave dust / glow flicker / lava shimmer
    const scrollX = Math.round(cam.scrollX);
    for (const layer of this.parallaxLayers) {
      layer.sprite.tilePositionX = scrollX * layer.factor + (this.time.now * 0.001 * layer.drift);
    }
    for (const mote of this.dustMotes) {
      mote.obj.x = (mote.obj.x + mote.speedX * (dtMs / 1000) + GAME_WIDTH) % GAME_WIDTH;
      mote.obj.y = (mote.obj.y + mote.speedY * (dtMs / 1000) + GAME_HEIGHT) % GAME_HEIGHT;
    }
    for (const g of this.glowSprites) {
      const flicker = Math.sin(this.time.now * 0.009 + g.phase) * 0.12 + Math.sin(this.time.now * 0.023 + g.phase) * 0.06;
      g.sprite.setAlpha(Phaser.Math.Clamp(g.baseAlpha + flicker, 0.2, 0.95));
    }
    for (const hs of this.heatShimmerStrips) {
      hs.rect.y = hs.baseY + Math.sin(this.time.now * 0.01 + hs.phase) * 1.5;
    }
    if (this.levelData.lavaTiles.length > 0) {
      this.lavaBubbleTimerMs += dtMs;
      if (this.lavaBubbleTimerMs >= 260) {
        this.lavaBubbleTimerMs = 0;
        const lv = this.levelData.lavaTiles[Phaser.Math.Between(0, this.levelData.lavaTiles.length - 1)]!;
        const bx = lv.col * TILE_SIZE + Phaser.Math.Between(2, 14);
        if (bx >= camLeft && bx <= camRight) {
          this.effects.emitLavaBubble(bx, lv.row * TILE_SIZE + 4);
        }
      }
    }
    if (this.lavaGlowRect) {
      this.lavaGlowRect.setAlpha(0.18 + Math.sin(this.time.now * 0.006) * 0.05);
    }

    // Star glow around Pip
    if (this.starGlow) {
      this.starGlow.setVisible(this.player.hasStar());
      if (this.player.hasStar()) {
        this.starGlow.setPosition(Math.round(this.player.x), Math.round(this.player.y - 12));
      }
    }

    // Cave / Castle darkness overlay with 80px soft cutout around Pip & lights
    if (this.lightOverlayRt && this.lightCutoutBrush) {
      this.lightOverlayRt.clear();
      this.lightOverlayRt.fill(0x060410, 0.35);
      const pipScreenX = Math.round(this.player.x - cam.scrollX);
      const pipScreenY = Math.round(this.player.y - 12 - cam.scrollY);
      this.lightCutoutBrush.setScale(1);
      this.lightOverlayRt.erase(this.lightCutoutBrush, pipScreenX, pipScreenY);
      for (const ls of this.staticLightSources) {
        if (ls.x >= camLeft - 80 && ls.x <= camRight + 80) {
          this.lightCutoutBrush.setScale(0.65);
          this.lightOverlayRt.erase(this.lightCutoutBrush, Math.round(ls.x - cam.scrollX), Math.round(ls.y));
        }
      }
    }

    this.effects.update(dtMs);
    this.player.recordPrevBottom();

    if (this.debugText) {
      const fps = Math.round(this.game.loop.actualFps);
      this.debugText.setText(
        `FPS:${fps} X:${Math.round(this.player.x)} Y:${Math.round(this.player.y)} ${this.player.powerState}${this.player.isGodMode() ? ' GOD' : ''}`,
      );
    }
  }
}
