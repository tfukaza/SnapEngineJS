import { BaseObject } from "@snap-engine/core";
import { ItemObject } from "./item";

export interface AnimationConfig {
  timing_function?: string;
  duration?: number;
}

export interface ContainerAnimations {
  reorder?: AnimationConfig | null;
  drop?: AnimationConfig | null;
  clickMove?: AnimationConfig | null;
}

export interface SnapSortDomRemoveEvent {
  item: ItemObject;
  itemMetadata: Record<string, unknown>;
  container: ItemContainer;
  containerMetadata: Record<string, unknown>;
}

export interface SnapSortDomInsertEvent {
  item: ItemObject;
  itemMetadata: Record<string, unknown>;
  container: ItemContainer;
  containerMetadata: Record<string, unknown>;
  index: number;
  beforeElement: HTMLElement | null;
}

export interface ItemContainerCallbacks {
  onDomRemove?: (event: SnapSortDomRemoveEvent) => void;
  onDomInsert?: (event: SnapSortDomInsertEvent) => void;
}

export interface ItemContainerConfig {
  groupID?: string;
  direction?: "column" | "row";
  name?: string;
  animation?: ContainerAnimations | null;
  noDrop?: boolean;
  callbacks?: ItemContainerCallbacks;
}

export class ItemContainer extends ItemObject {
  #itemList: ItemObject[] = [];
  #config: ItemContainerConfig;
  #depth: number = 0;

  constructor(
    engine: any,
    parent: BaseObject | null,
    config?: ItemContainerConfig,
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
    if (this.#config.animation === undefined) {
      const defaultAnimation = { duration: 100, timing_function: "ease-out" };
      this.#config.animation = {
        reorder: defaultAnimation,
        drop: defaultAnimation,
        clickMove: defaultAnimation,
      };
    } else if (this.#config.animation) {
      const defaultAnimation = { duration: 100, timing_function: "ease-out" };
      this.#config.animation = {
        reorder: this.#config.animation.reorder ?? defaultAnimation,
        drop: this.#config.animation.drop ?? defaultAnimation,
        clickMove: this.#config.animation.clickMove ?? defaultAnimation,
      };
    }
    if (!this.#config.name) {
      if (!this.global.data["dragAndDropContainerCounter"]) {
        this.global.data["dragAndDropContainerCounter"] = 0;
      }
      this.#config.name = `container-${this.global.data["dragAndDropContainerCounter"]++}`;
    }
    if (!this.#config.noDrop) {
      this.noDrop = false;
    } else {
      this.noDrop = this.#config.noDrop;
    }

    this.style = {
      position: "relative",
    };

    if (!this.global.data["dragAndDropContainers"]) {
      this.global.data["dragAndDropContainers"] = [];
    }
    this.global.data["dragAndDropContainers"].push(this);
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

  get callbacks() {
    return this.#config.callbacks;
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

  // addItem(item: ItemObject) {
  //   this.#itemList.push(item);
  //   item.setContainer(this);
  // }

  // insertItemAt(item: ItemObject, index: number) {
  //   if (index >= this.#itemList.length) {
  //     this.#itemList.push(item);
  //   } else {
  //     this.#itemList.splice(index, 0, item);
  //   }
  //   item.setContainer(this);
  // }

  setAllDepth(depth: number, root: ItemContainer | null = null) {
    this.#depth = depth;
    const effectiveRoot = depth === 0 ? this : root;
    this.setRootContainer(effectiveRoot);
    for (const item of this.#itemList) {
      if (item instanceof ItemContainer) {
        item.setAllDepth(depth + 1, effectiveRoot);
      } else {
        item.setRootContainer(effectiveRoot);
      }
    }
  }

  destroy() {
    if (this.global.data["dragAndDropContainers"]) {
      this.global.data["dragAndDropContainers"] = this.global.data[
        "dragAndDropContainers"
      ].filter((c: ItemContainer) => c !== this);
    }
    super.destroy();
  }
}
