export interface Poolable {
  active: boolean;
  visible: boolean;
}

export class ObjectPool<T extends Poolable> {
  private readonly items: T[] = [];

  constructor(
    private readonly factory: () => T,
    initialSize = 0,
  ) {
    for (let i = 0; i < initialSize; i++) {
      const item = this.factory();
      item.active = false;
      item.visible = false;
      this.items.push(item);
    }
  }

  public acquire(): T {
    for (const item of this.items) {
      if (!item.active) {
        item.active = true;
        item.visible = true;
        return item;
      }
    }
    const created = this.factory();
    created.active = true;
    created.visible = true;
    this.items.push(created);
    return created;
  }

  public release(item: T): void {
    item.active = false;
    item.visible = false;
  }

  public getActive(): T[] {
    return this.items.filter((i) => i.active);
  }

  public countActive(): number {
    let count = 0;
    for (const item of this.items) {
      if (item.active) count++;
    }
    return count;
  }

  public releaseAll(): void {
    for (const item of this.items) {
      item.active = false;
      item.visible = false;
    }
  }
}
