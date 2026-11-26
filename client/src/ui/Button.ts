import Phaser from 'phaser';

export interface PixelButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  bgColor?: number;
  hoverColor?: number;
  textColor?: string;
  disabled?: boolean;
}

export class PixelButton extends Phaser.GameObjects.Container {
  private readonly shadow: Phaser.GameObjects.Rectangle;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly topHighlight: Phaser.GameObjects.Rectangle;
  private readonly labelText: Phaser.GameObjects.Text;
  private selected = false;
  private disabled: boolean;
  private readonly bgColor: number;
  private readonly hoverColor: number;
  private readonly onClick: () => void;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, opts: PixelButtonOptions) {
    super(scene, Math.round(opts.x), Math.round(opts.y));
    this.baseY = Math.round(opts.y);
    this.bgColor = opts.bgColor ?? 0x243058;
    this.hoverColor = opts.hoverColor ?? 0x3b4f8c;
    this.disabled = Boolean(opts.disabled);
    this.onClick = opts.onClick;

    this.shadow = scene.add
      .rectangle(0, 2, opts.width + 2, opts.height + 2, 0x120e22)
      .setOrigin(0.5);
    this.border = scene.add
      .rectangle(0, 0, opts.width + 2, opts.height + 2, 0xd8e4f8)
      .setOrigin(0.5);
    this.bg = scene.add
      .rectangle(0, 0, opts.width, opts.height, this.disabled ? 0x1c1c2c : this.bgColor)
      .setOrigin(0.5);
    this.topHighlight = scene.add
      .rectangle(0, -opts.height / 2 + 1, opts.width - 2, 1, 0x6c88c4, this.disabled ? 0.2 : 0.6)
      .setOrigin(0.5);
    this.labelText = scene.add
      .text(0, 0, opts.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: this.disabled ? '#777c94' : (opts.textColor ?? '#ffffff'),
        stroke: '#16142c',
        strokeThickness: 2,
        resolution: 2,
      })
      .setOrigin(0.5);

    this.add([this.shadow, this.border, this.bg, this.topHighlight, this.labelText]);
    this.setSize(opts.width, opts.height);

    if (!this.disabled) {
      this.setInteractive({ useHandCursor: true });
      this.on('pointerover', () => this.setSelected(true));
      this.on('pointerout', () => {
        this.y = this.baseY;
        this.setSelected(false);
      });
      this.on('pointerdown', () => {
        // 1px depressed state
        this.y = this.baseY + 1;
        this.shadow.y = 1;
      });
      this.on('pointerup', () => {
        this.y = this.baseY;
        this.shadow.y = 2;
        this.trigger();
      });
    }

    scene.add.existing(this);
  }

  public setSelected(selected: boolean): void {
    if (this.disabled) return;
    this.selected = selected;
    this.bg.setFillStyle(selected ? this.hoverColor : this.bgColor);
    this.border.setFillStyle(selected ? 0xffe030 : 0xd8e4f8);
  }

  public isSelected(): boolean {
    return this.selected;
  }

  public setLabel(text: string): void {
    this.labelText.setText(text);
  }

  public trigger(): void {
    if (!this.disabled) {
      this.onClick();
    }
  }
}
