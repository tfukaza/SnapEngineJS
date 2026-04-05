import { BaseObject } from "@snap-engine/core";
import { ItemObjectV2 } from "./item_v2";

export interface AnimationConfigV2 {
  timing_function?: string;
  duration?: number;
}

export interface ContainerAnimationsV2 {
  reorder?: AnimationConfigV2 | null;
  drop?: AnimationConfigV2 | null;
  clickMove?: AnimationConfigV2 | null;
}

export interface ItemContainerV2Config {
  groupID?: string;
  direction?: "column" | "row";
  name?: string;
  animation?: ContainerAnimationsV2 | null;
}

export class ItemContainerV2 extends ItemObjectV2 {
  #itemList: ItemObjectV2[] = [];
  #config: ItemContainerV2Config;
  #depth: number = 0;

  constructor(
    engine: any,
    parent: BaseObject | null,
    config?: ItemContainerV2Config,
  ) {
    super(engine, parent);
    this.locked = true;
    this.#config = config || {};
    if (!this.#config.groupID) {
      this.#config.groupID = "default-group";
    }
    if (!this.#config.direction) {
      this.#config.direction = "column";
    }
    if (!this.#config.name) {
      if (!this.global.data["dragAndDropV2ContainerCounter"]) {
        this.global.data["dragAndDropV2ContainerCounter"] = 0;
      }
      this.#config.name = `container-v2-${this.global.data["dragAndDropV2ContainerCounter"]++}`;
    }

    this.style = {
      position: "relative",
    };

    if (!this.global.data["dragAndDropV2Containers"]) {
      this.global.data["dragAndDropV2Containers"] = [];
    }
    this.global.data["dragAndDropV2Containers"].push(this);
  }

  get groupID() {
    return this.#config.groupID;
  }

  get name() {
    return this.#config.name;
  }

  get direction() {
    return this.#config.direction || "column";
  }

  set direction(value: "column" | "row") {
    this.#config.direction = value;
  }

  get configuration() {
    return this.#config;
  }

  get itemList() {
    return this.#itemList;
  }

  get numberOfItems() {
    return this.#itemList.length;
  }

  get depth() {
    return this.#depth;
  }

  // addItem(item: ItemObjectV2) {
  //   this.#itemList.push(item);
  //   item.setContainer(this);
  // }

  removeItem(item: ItemObjectV2) {
    this.#itemList = this.#itemList.filter((i) => i !== item);
  }

  insertItemAt(item: ItemObjectV2, index: number) {
    if (index >= this.#itemList.length) {
      this.#itemList.push(item);
    } else {
      this.#itemList.splice(index, 0, item);
    }
    item.setContainer(this);
  }

  setAllDepth(depth: number, root: ItemContainerV2 | null = null) {
    this.#depth = depth;
    const effectiveRoot = depth === 0 ? this : root;
    this.setRootContainer(effectiveRoot);
    for (const item of this.#itemList) {
      if (item instanceof ItemContainerV2) {
        item.setAllDepth(depth + 1, effectiveRoot);
      } else {
        item.setRootContainer(effectiveRoot);
      }
    }
  }

  destroy() {
    if (this.global.data["dragAndDropV2Containers"]) {
      this.global.data["dragAndDropV2Containers"] = this.global.data[
        "dragAndDropV2Containers"
      ].filter((c: ItemContainerV2) => c !== this);
    }
    super.destroy();
  }
}
