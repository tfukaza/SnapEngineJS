import { BaseObject } from "@snap-engine/core";
import {
  ItemBase,
  ItemEuclidean,
  ItemInsertion,
  ItemProgressive,
  type ItemBaseConstructor,
  type ItemMetadata,
} from "./item";
import {
  determineDropTarget,
  determineInsertionDropTarget,
  determineProgressiveDropTarget,
  type DropCandidate,
} from "./algorithm";
import type { LayoutMainAxisAlign } from "./layout";

export interface AnimationConfig {
  timing_function?: string;
  duration?: number;
}

export interface ContainerAnimations {
  reorder?: AnimationConfig | null;
  drop?: AnimationConfig | null;
  clickMove?: AnimationConfig | null;
}

export interface ItemRemoveEvent {
  item: ItemBase;
  itemMetadata: ItemMetadata;
  container: ContainerBase;
  containerMetadata: Record<string, unknown>;
}

export interface ItemInsertEvent {
  item: ItemBase;
  itemMetadata: ItemMetadata;
  container: ContainerBase;
  containerMetadata: Record<string, unknown>;
  index: number;
  beforeElement: HTMLElement | null;
}

export interface GhostInsertEvent {
  original: ItemBase;
  originalMetadata: ItemMetadata;
  ghostItem: ItemBase;
  ghostMetadata: ItemMetadata;
  container: ContainerBase;
  containerMetadata: Record<string, unknown>;
  index: number;
  beforeElement: HTMLElement | null;
}

export interface GhostRemoveEvent {
  original: ItemBase;
  originalMetadata: ItemMetadata;
  ghostItem: ItemBase;
  ghostMetadata: ItemMetadata;
  container: ContainerBase;
  containerMetadata: Record<string, unknown>;
}

export interface GhostRect {
  x: number;
  y: number;
  width: number;
  height: number;
  insetLeft?: number;
  insetRight?: number;
}

export interface GhostUpdateEvent {
  original: ItemBase;
  container: ContainerBase | null;
  index: number;
  ghostRect?: GhostRect | null;
}

export interface GhostCreateEvent {
  container: ContainerBase;
  original: ItemBase;
  originalMetadata: ItemMetadata;
  ghostItem: ItemBase;
  ghostRect?: GhostRect | null;
}

export interface ContainerCallbacks {
  onItemInsert?: (event: ItemInsertEvent) => void;
  onItemRemove?: (event: ItemRemoveEvent) => void;
  onGhostInsert?: (event: GhostInsertEvent) => void;
  onGhostRemove?: (event: GhostRemoveEvent) => void;
  createItemGhost?: (event: GhostCreateEvent) => HTMLElement | void | null;
  awaitMutation?: () => void | Promise<void>;
}

export interface ContainerConfig {
  groupID?: string;
  direction?: "column" | "row";
  mainAxisAlign?: LayoutMainAxisAlign;
  name?: string;
  animation?: ContainerAnimations | null;
  disableFlip?: boolean;
  noDrop?: boolean;
  dropArea?: boolean;
  callbacks?: ContainerCallbacks;
}

function insertItemAt(event: ItemInsertEvent) {
  event.container.element?.insertBefore(
    event.item.element!,
    event.beforeElement,
  );
}

function removeItem(event: ItemRemoveEvent): void {
  event.item.element?.remove();
}

function insertGhost(event: GhostInsertEvent) {
  event.container.element?.insertBefore(
    event.ghostItem.element!,
    event.beforeElement,
  );
}

function removeGhost(event: GhostRemoveEvent): void {
  event.ghostItem.element?.remove();
}

function createItemGhost(event: GhostCreateEvent): HTMLElement {
  const ghostElement = document.createElement("div");
  ghostElement.id = "spacer";

  // if (event.ghostRect) {
  //   ghostElement.dataset.snapsortGhost = "insertion";
  //   ghostElement.style.position = "absolute";
  //   ghostElement.style.width = event.ghostRect.width + "px";
  //   ghostElement.style.height = event.ghostRect.height + "px";
  //   ghostElement.style.borderRadius = "999px";
  //   ghostElement.style.background = "currentColor";
  //   ghostElement.style.color = "rgb(37, 99, 235)";
  //   ghostElement.style.pointerEvents = "none";
  //   ghostElement.style.boxSizing = "border-box";
  //   return ghostElement;
  // }

  const origProp =
    event.original.dragSnapshot ?? event.original.currentDomProperty;
  ghostElement.style.width = origProp.width + "px";
  ghostElement.style.height = origProp.height + "px";
  ghostElement.style.margin = `${origProp.margin.top}px ${origProp.margin.right}px ${origProp.margin.bottom}px ${origProp.margin.left}px`;
  ghostElement.style.boxSizing = "border-box";
  ghostElement.classList.add("ghost");

  return ghostElement;
}

function createInsertItemGhost(event: GhostCreateEvent): HTMLElement {
  const ghostElement = document.createElement("div");
  ghostElement.id = "spacer";
  const { ghostRect } = event;
  const insetLeft = ghostRect?.insetLeft ?? 0;
  const insetRight = ghostRect?.insetRight ?? 0;
  const width = ghostRect
    ? Math.max(0, ghostRect.width - insetLeft - insetRight)
    : 0;

  ghostElement.dataset.snapsortGhost = "insertion";
  ghostElement.style.position = "absolute";
  ghostElement.style.width = `${width}px`;
  ghostElement.style.height = "0px";
  ghostElement.style.borderRadius = "999px";
  ghostElement.style.borderTop = "3px solid currentColor";
  ghostElement.style.background = "currentColor";
  ghostElement.style.color = "rgb(37, 99, 235)";
  ghostElement.style.pointerEvents = "none";
  ghostElement.style.boxSizing = "border-box";

  return ghostElement;
}

const defaultConfig: ContainerConfig = {
  groupID: "default-group",
  direction: "column",
  animation: {
    reorder: { duration: 100, timing_function: "ease-out" },
    drop: { duration: 100, timing_function: "ease-out" },
    clickMove: { duration: 100, timing_function: "ease-out" },
  },
  noDrop: false,
  callbacks: {
    onItemInsert: insertItemAt,
    onItemRemove: removeItem,
    onGhostInsert: insertGhost,
    onGhostRemove: removeGhost,
    createItemGhost,
  },
};

// interface PendingMove {
//   item: ItemBase;
//   key: string;
//   first: DOMRect | null;
//   last: DOMRect | null;
// }

export class ContainerBase extends ItemBase {
  #itemList: ItemBase[] = [];
  #config: ContainerConfig;
  #depth: number = 0;

  // #pendingMove: Array<PendingMove> = [];

  constructor(
    engine: any,
    parent: BaseObject | null,
    config?: ContainerConfig,
  ) {
    super(engine, parent);
    this.locked = true;
    this.#config = {
      ...defaultConfig,
      ...(config || {}),
      callbacks: {
        ...defaultConfig.callbacks,
        ...(config?.callbacks || {}),
      },
    };

    if (!this.#config.name) {
      if (!this.global.data["dragAndDropContainerCounter"]) {
        this.global.data["dragAndDropContainerCounter"] = 0;
      }
      this.#config.name = `container-${this.global.data["dragAndDropContainerCounter"]++}`;
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

  get mainAxisAlign() {
    return this.#config.mainAxisAlign ?? "start";
  }

  set mainAxisAlign(value: LayoutMainAxisAlign) {
    this.#config.mainAxisAlign = value;
  }

  get dropArea() {
    return this.#config.dropArea ?? false;
  }

  set dropArea(value: boolean) {
    this.#config.dropArea = value;
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

  get config() {
    return this.#config;
  }

  setAllDepth(depth: number, root: ContainerBase | null = null) {
    this.#depth = depth;
    const effectiveRoot = depth === 0 ? this : root;
    this.setRootContainer(effectiveRoot);
    for (const item of this.#itemList) {
      if (item instanceof ContainerBase) {
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
      ].filter((c: ContainerBase) => c !== this);
    }
    super.destroy();
  }
}

export class ContainerEuclidean extends ContainerBase {
  protected get dragDropEnabled(): boolean {
    return true;
  }

  protected get ghostItemConstructor(): ItemBaseConstructor {
    return ItemEuclidean;
  }

  protected resolveDropTarget(
    item: ItemBase,
    root: ItemBase,
  ): DropCandidate | null {
    return determineDropTarget(item, root);
  }
}

export class ContainerProgressive extends ContainerBase {
  protected get dragDropEnabled(): boolean {
    return true;
  }

  protected get ghostItemConstructor(): ItemBaseConstructor {
    return ItemProgressive;
  }

  protected resolveDropTarget(
    item: ItemBase,
    root: ItemBase,
  ): DropCandidate | null {
    return determineProgressiveDropTarget(item, root);
  }
}

export class ContainerInsertion extends ContainerBase {
  constructor(
    engine: any,
    parent: BaseObject | null,
    config?: ContainerConfig,
  ) {
    super(engine, parent, config);
    if (!config?.callbacks?.createItemGhost) {
      this.config.callbacks!.createItemGhost = createInsertItemGhost;
    }
  }
  protected get dragDropEnabled(): boolean {
    return true;
  }

  protected get usesInsertionDropMarker(): boolean {
    return true;
  }

  protected get ghostItemConstructor(): ItemBaseConstructor {
    return ItemInsertion;
  }

  protected resolveDropTarget(
    item: ItemBase,
    root: ItemBase,
  ): DropCandidate | null {
    return determineInsertionDropTarget(item, root);
  }
}
