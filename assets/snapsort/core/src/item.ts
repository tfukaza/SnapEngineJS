import { BaseObject, ElementObject, cloneDomProperty } from "@snap-engine/core";
import type {
  AnimationConfig,
  ContainerBase,
  GhostCreateEvent,
  GhostRect,
  GhostUpdateEvent,
} from "./container";
import type {
  dragStartProp,
  dragProp,
  dragEndProp,
  DomProperty,
} from "@snap-engine/core";
import {
  determineDropTarget,
  determineInsertionDropTarget,
  determineProgressiveDropTarget,
  resetDropSnapshotDebugDump,
  type DropCandidate,
} from "./algorithm";
import { AnimationObject } from "@snap-engine/core/animation";

const MIN_FLIP_DISTANCE = 0.5;

interface FlipSnapshot {
  item: ItemBase;
  key: string;
  first: DOMRect | null;
  last: DOMRect | null;
  targetElement: HTMLElement | null;
}

export type ItemId = string;
export interface ItemMetadata extends Record<string, unknown> {
  itemId?: ItemId;
  insertionMarkerInsetLeft?: number;
  insertionMarkerInsetRight?: number;
}
export type ItemBaseConstructor = new (
  engine: any,
  parent: BaseObject | null,
  isGhost?: boolean,
) => ItemBase;

type GhostTarget = {
  ghostItem: ItemBase;
  container: ContainerBase;
  index: number;
  ghostRect?: GhostRect | null;
};

function insertionMarkerInsetsFromMetadata(metadata: ItemMetadata): {
  left: number;
  right: number;
} {
  return {
    left:
      typeof metadata.insertionMarkerInsetLeft === "number"
        ? metadata.insertionMarkerInsetLeft
        : 0,
    right:
      typeof metadata.insertionMarkerInsetRight === "number"
        ? metadata.insertionMarkerInsetRight
        : 0,
  };
}

export class ItemBase extends ElementObject {
  #rootContainer: ContainerBase | null = null;
  #metadata: ItemMetadata = {};
  #locked: boolean = false;
  noDrop: boolean = false;

  #dragOffsetX: number = 0;
  #dragOffsetY: number = 0;
  #dragPointerX: number = 0;
  #dragPointerY: number = 0;
  #dragSnapshot: DomProperty | null = null;
  #dragSnapshotMetadata: ItemMetadata | null = null;
  #dragSnapshotOrderedList: ItemBase[] = [];
  #dragPositionContextSnapshot: Map<HTMLElement, string> = new Map();

  #itemOrderedList: ItemBase[] = [];

  #isGhost: boolean = false;
  #frameworkManagedGhostElement: boolean = false;
  #depth: number = 0;
  ghostItem: ItemBase | null = null;
  #pendingGhostTarget: GhostTarget | null = null;

  constructor(
    engine: any,
    parent: BaseObject | null,
    isGhost: boolean = false,
  ) {
    super(engine, parent);
    this.#isGhost = isGhost;
    this.event.input.dragStart = this.dragStart;
    this.event.input.drag = this.drag;
    this.event.input.dragEnd = this.dragEnd;
    this.event.dom.onAssignDom = () => {
      this.writeDom();
    };
    this.transformMode = "none";

    this.ghostItem = null;
  }

  protected get dragDropEnabled(): boolean {
    return false;
  }

  protected get ghostItemConstructor(): ItemBaseConstructor | null {
    return null;
  }

  protected get usesInsertionDropMarker(): boolean {
    return false;
  }

  protected createGhostItem(event: GhostUpdateEvent): ItemBase | null {
    const itemConstructor = this.ghostItemConstructor;
    if (!itemConstructor) return null;

    const ghostItem = new itemConstructor(this.engine, null, true);
    ghostItem.metadata = { ...this.metadata };
    const createEvent: GhostCreateEvent = {
      container: event.container!,
      original: this,
      originalMetadata: this.metadata,
      ghostItem,
      ghostRect: event.ghostRect,
    };
    const ghostElement =
      event.container?.callbacks?.createItemGhost?.(createEvent);
    if (ghostElement instanceof HTMLElement) {
      ghostItem.element = ghostElement;
      ghostItem.#frameworkManagedGhostElement = false;
    } else {
      ghostItem.#frameworkManagedGhostElement = true;
    }
    return ghostItem;
  }

  protected resolveDropTarget(
    _item: ItemBase,
    _root: ItemBase,
  ): DropCandidate | null {
    return null;
  }

  addItem(item: ItemBase) {
    if (!this.children.includes(item)) {
      this.appendChild(item);
    }
    if (!this.#itemOrderedList.includes(item)) {
      this.#itemOrderedList.push(item);
    }
    this.#findRootContainer();
  }

  #itemID(item: ItemBase) {
    const id = item.metadata.itemId ?? item.id;
    return item.isGhost && item.usesInsertionDropMarker ? `ghost:${id}` : id;
  }

  // removeItem(id: ItemId) {
  //   const item =
  //     this.#itemOrderedList.find((item) => this.#itemID(item) === id) ??
  //     this.children.find(
  //       (item): item is ItemBase =>
  //         item instanceof ItemBase && this.#itemID(item) === id,
  //     );
  //   if (!item) return;

  //   this.removeItemFrom(this as unknown as ContainerBase, item);
  // }

  /**
   * Find a SnapSort item by its stable item metadata id within this subtree.
   *
   * This searches the engine-owned item tree first, which is the normal path
   * when SnapSort still has an up-to-date object hierarchy.
   *
   * @param id Stable item id from `metadata.itemId`.
   * @returns Matching item object, or null when the tree has no matching item.
   */
  #findItemByID(id: ItemId): ItemBase | null {
    const directItem =
      this.#itemOrderedList.find((item) => this.#itemID(item) === id) ??
      this.children.find(
        (item): item is ItemBase =>
          item instanceof ItemBase && this.#itemID(item) === id,
      );
    if (directItem) return directItem;

    for (const child of this.#itemOrderedList) {
      const found = child.#findItemByID(id);
      if (found) return found;
    }

    return null;
  }

  /**
   * Move an item identified by stable metadata id into a target container.
   *
   * This is the imperative API used by frameworks. It accepts
   * an id instead of an `ItemBase` so callers do not need to retain engine
   * object references.
   *
   * @param id Stable item id from `metadata.itemId`.
   * @param container Destination SnapSort container.
   * @param index Destination index in the target container.
   * @returns True when a matching item was found and a move was requested.
   */
  moveItem(id: ItemId, container: ContainerBase, index: number) {
    this.#findRootContainer();
    const root = this.#rootContainer as unknown as ItemBase;
    const item = root.#findItemByID(id);
    if (!item) return false;
    if (item.parent !== this && this.element?.contains(item.element)) {
      const staleParent = item.parent as ItemBase | null;
      staleParent?.removeChild(item);
      if (staleParent) {
        staleParent.#itemOrderedList = staleParent.#itemOrderedList.filter(
          (candidate) => candidate !== item,
        );
      }
      this.addItem(item);
    }

    this.moveItemToContainer(container, item, index);
    return true;
  }

  get locked(): boolean {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = value;
  }

  getIndexAndContainer(): { index: number; container: ContainerBase | null } {
    if (!this.parent) {
      return { index: -1, container: null };
    }
    const parentContainer = this.parent as unknown as ContainerBase;
    const idx = parentContainer.#itemOrderedList.indexOf(this);
    return { index: idx, container: parentContainer };
  }

  get metadata(): ItemMetadata {
    return this.#metadata;
  }

  set metadata(value: ItemMetadata) {
    this.#metadata = value;
  }

  get container(): ContainerBase {
    if (!this.parent) {
      console.warn("ItemBase has no container set.");
      return null as any;
    }
    return this.parent as unknown as ContainerBase;
  }

  get rootContainer(): ContainerBase | null {
    return this.#rootContainer;
  }

  get pendingGhostTarget(): GhostTarget | null {
    return this.#pendingGhostTarget;
  }

  set pendingGhostTarget(value: GhostTarget) {
    this.#pendingGhostTarget = value;
  }

  setRootContainer(root: ContainerBase | null) {
    this.#rootContainer = root;
  }

  get isGhost(): boolean {
    return this.#isGhost;
  }

  get depth(): number {
    return this.#depth;
  }

  get itemOrderedList(): ItemBase[] {
    return this.#itemOrderedList;
  }

  get dragSnapshot(): DomProperty | null {
    return this.#dragSnapshot;
  }

  get dragSnapshotMetadata(): ItemMetadata | null {
    return this.#dragSnapshotMetadata;
  }

  get dragSnapshotInsertionMarkerInsets(): { left: number; right: number } {
    return insertionMarkerInsetsFromMetadata(
      this.#dragSnapshotMetadata ?? this.#metadata,
    );
  }

  get dragPointerPosition(): { x: number; y: number } | null {
    if (!this.#dragSnapshot) return null;
    return { x: this.#dragPointerX, y: this.#dragPointerY };
  }

  get dragSnapshotOrderedList(): ItemBase[] {
    return this.#dragSnapshotOrderedList;
  }

  /**
   * Return this item's children sorted by their DOM order.
   *
   * @returns Child objects ordered by their current element order in the DOM.
   */
  childrenInDomOrder(): BaseObject[] {
    return this.children.slice().sort((a, b) => {
      const aEl = (a as ElementObject).element;
      const bEl = (b as ElementObject).element;
      if (!aEl || !bEl) return 0;
      const cmp = aEl.compareDocumentPosition(bEl);
      if (cmp & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (cmp & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }

  static #containerColors = new Map<string, string>();

  static #colorForContainer(id: string): string {
    let color = ItemBase.#containerColors.get(id);
    if (!color) {
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
      }
      const hue = ((hash % 360) + 360) % 360;
      color = `hsl(${hue}, 80%, 55%)`;
      ItemBase.#containerColors.set(id, color);
    }
    return color;
  }

  /**
   * Draw a debug circle at the center of every item in the hierarchy,
   * color-coded by parent container.
   */
  debugAllItems(
    node: ItemBase = (this.#rootContainer as unknown as ItemBase) ?? this,
  ) {
    const color = ItemBase.#colorForContainer(node.id);
    for (const child of node.children) {
      if (!(child instanceof ItemBase)) continue;
      const prop = child.dragSnapshot ?? child.currentDomProperty;
      if (prop) {
        const cx = prop.x + prop.width / 2;
        const cy = prop.y + prop.height / 2;
        child.addDebugCircle(
          cx,
          cy,
          4,
          color,
          true,
          `center-read1-${child.id}`,
          "item-positions",
        );
      }
      // Recurse into children that act as containers
      if (child.children.length > 0) {
        this.debugAllItems(child);
      }
    }
  }

  /**
   * Walk up to the root container and refresh the SnapSort tree state.
   *
   * The root queues the initial DOM read used by drag-start snapshot capture.
   *
   * @returns Nothing.
   */
  #findRootContainer() {
    if (this.parent == null) {
      this.#updateState(this as unknown as ContainerBase);
      this.#queueReadTree("READ_1", `snapsort-read-root-${this.id}`);
    } else {
      const parentContainer = this.parent as unknown as ItemBase;
      parentContainer.#findRootContainer();
    }
  }

  #queueReadTree(
    stage: "READ_1" | "READ_2" | "READ_3",
    queueId: string,
    config: { unapplyTransform?: boolean; saveWorldPosition?: boolean } = {},
  ) {
    this.schedule(
      async () => {
        this.#readDomTree(config);
      },
      { stage, queueId },
    );
  }

  #readDomTree(
    config: { unapplyTransform?: boolean; saveWorldPosition?: boolean } = {},
  ) {
    this.readDom({ unapplyTransform: config.unapplyTransform });
    if (config.saveWorldPosition ?? true) {
      const prop = this.currentDomProperty;
      this.worldTransform = { x: prop.x, y: prop.y };
    }
    for (const child of this.children) {
      if (child instanceof ItemBase) {
        child.#readDomTree(config);
      }
    }
  }

  /**
   * Refresh root/depth metadata and live child ordering for this subtree.
   *
   * @param root Root container that owns the active SnapSort tree.
   * @param depth Nesting depth of this item within the root tree.
   * @returns Nothing.
   */
  #updateState(root: ContainerBase | null, depth: number = 0) {
    // Set root container and depth
    this.#rootContainer = root;
    this.#depth = depth;
    // Get the list of children in DOM order
    this.#itemOrderedList = this.childrenInDomOrder() as ItemBase[];
    // Update all its children as well.
    for (const child of this.children) {
      if (child instanceof ItemBase) {
        child.#updateState(root, depth + 1);
      }
    }
  }

  /**
   * Capture frozen DOM geometry and child order for this subtree.
   *
   * The drop algorithm reads this snapshot for the full drag so live ghost DOM
   * movement cannot perturb candidate prediction.
   *
   * @returns Nothing.
   */
  #captureDragSnapshotTree() {
    this.#dragSnapshot = cloneDomProperty(this.currentDomProperty);
    this.#dragSnapshotMetadata = { ...this.#metadata };
    this.#dragSnapshotOrderedList = this.#itemOrderedList.slice();
    for (const child of this.#dragSnapshotOrderedList) {
      child.#captureDragSnapshotTree();
    }
  }

  /**
   * Clear frozen drag snapshots from this subtree after drag end.
   *
   * @param visited Items already cleared during this traversal.
   * @returns Nothing.
   */
  #clearDragSnapshotTree(visited: Set<ItemBase> = new Set()) {
    if (visited.has(this)) return;
    visited.add(this);

    const childrenToClear = new Set([
      ...this.#dragSnapshotOrderedList,
      ...this.#itemOrderedList,
    ]);
    this.#dragSnapshot = null;
    this.#dragSnapshotMetadata = null;
    this.#dragSnapshotOrderedList = [];

    for (const child of childrenToClear) {
      child.#clearDragSnapshotTree(visited);
    }
  }

  /**
   * Check whether every item in the frozen drag tree has a snapshot.
   *
   * A drag event can arrive before the drag-start READ phase has captured the
   * snapshot tree. Drop prediction should skip that frame instead of falling
   * back to live DOM geometry.
   *
   * @param visited Items already checked during this traversal.
   * @returns True when this item and all frozen descendants have snapshots.
   */
  #hasDragSnapshotTree(visited: Set<ItemBase> = new Set()): boolean {
    if (visited.has(this)) return true;
    visited.add(this);

    if (!this.#dragSnapshot) return false;

    return this.#dragSnapshotOrderedList.every((child) =>
      child.#hasDragSnapshotTree(visited),
    );
  }

  /**
   * Read the configured reorder animation for a container.
   *
   * @param container Container whose animation configuration should be used.
   * @returns Reorder animation config, or null when reorder animation is disabled.
   */
  #reorderAnimationConfig(
    container: ContainerBase | null,
  ): AnimationConfig | null {
    if (!container) return null;
    const config = container.configuration;
    if (config.animation === null) return null;
    if (config.disableFlip) return null;
    return config.animation?.reorder ?? null;
  }

  #dropAnimationConfig(
    container: ContainerBase | null,
  ): AnimationConfig | null {
    if (!container) return null;
    const config = container.configuration;
    if (config.animation === null) return null;
    if (config.disableFlip) return null;
    return config.animation?.drop ?? null;
  }

  /**
   * Wait for the caller's framework to flush DOM after SnapSort mutates data.
   *
   * Svelte updates keyed DOM in a microtask, so FLIP's final geometry read must
   * wait for the user-provided callback before SnapEngine advances to READ_3.
   *
   * @param container Container whose callback should run after mutation.
   * @returns A promise that resolves once the caller's DOM flush hook completes.
   */
  async #awaitMutation(container: ContainerBase | null) {
    await container?.callbacks?.awaitMutation?.();
  }

  /**
   * Collect all currently visible SnapSort items in this subtree.
   *
   * @param node Root of the subtree to collect.
   * @param exclude Item that should not be animated, usually the actively dragged item.
   * @param items Accumulator for collected items.
   * @returns Items that can participate in FLIP animation.
   */
  #collectFlipItems(
    node: ItemBase,
    exclude: ItemBase | null,
    items: ItemBase[] = [],
  ): ItemBase[] {
    for (const child of node.#itemOrderedList) {
      if (child !== exclude && child.element) {
        items.push(child);
      }
      this.#collectFlipItems(child, exclude, items);
    }
    return items;
  }

  /**
   * Capture the current visual position for all FLIP animation candidates.
   *
   * `getBoundingClientRect()` intentionally includes active transform
   * animations, so interrupted reorder animations restart from the element's
   * actual on-screen position instead of its previous layout destination.
   *
   * @param root Root of the SnapSort tree being mutated.
   * @param exclude Item that should not be animated.
   * @returns Items with current visual rectangles captured as first positions.
   */
  #captureFlipSnapshot(
    root: ItemBase,
    exclude: ItemBase | null,
  ): FlipSnapshot[] {
    return root.#collectFlipItems(root, exclude).map((item) => ({
      item,
      key: this.#itemID(item),
      first: item.element!.getBoundingClientRect(),
      last: null,
      targetElement: item.element,
    }));
  }

  /**
   * Capture the final visual positions after the DOM mutation.
   *
   * @param snapshot Items whose final positions should be measured.
   * @param root Root of the SnapSort tree after the DOM mutation.
   * @returns Nothing.
   */
  #captureFlipLast(snapshot: FlipSnapshot[], root: ItemBase) {
    const currentItems = new Map(
      root
        .#collectFlipItems(root, null)
        .map((item) => [this.#itemID(item), item]),
    );
    for (const entry of snapshot) {
      const currentItem = currentItems.get(entry.key) ?? null;
      if (currentItem) {
        entry.item = currentItem;
        entry.targetElement = currentItem.element;
      } else {
        entry.targetElement = entry.item.element?.isConnected
          ? entry.item.element
          : null;
      }
      entry.last = entry.targetElement?.getBoundingClientRect() ?? null;
    }
  }

  /**
   * Start FLIP animations from captured visual snapshots to the current layout.
   *
   * This method only writes transforms and starts SnapEngine animations. All
   * layout reads must have happened in earlier READ stages.
   *
   * @param snapshot Visual rectangles captured before and after the DOM mutation.
   * @param animationConfig Reorder animation configuration.
   * @param animationOwner Fallback object that owns animations for re-created DOM nodes.
   * @returns Nothing.
   */
  #playFlipAnimations(
    snapshot: FlipSnapshot[],
    animationConfig: AnimationConfig,
    animationOwner: ItemBase,
  ) {
    const movingAncestors = new Set<ItemBase>();
    const duration = animationConfig.duration ?? 160;
    const easing = animationConfig.timing_function ?? "ease-out";

    for (const { item, first, last, targetElement } of snapshot) {
      const hasMovingAncestor =
        movingAncestors.size > 0 &&
        (() => {
          let parent = item.parent;
          while (parent) {
            if (parent instanceof ItemBase && movingAncestors.has(parent)) {
              return true;
            }
            parent = parent.parent;
          }
          return false;
        })();
      if (hasMovingAncestor || !targetElement || !first || !last) continue;

      const dx = first.x - last.x;
      const dy = first.y - last.y;
      if (
        Math.abs(dx) < MIN_FLIP_DISTANCE &&
        Math.abs(dy) < MIN_FLIP_DISTANCE
      ) {
        continue;
      }

      movingAncestors.add(item);
      this.#playElementRectAnimation(
        item,
        first,
        last,
        targetElement,
        { duration, timing_function: easing },
        targetElement === item.element ? item : animationOwner,
      );
    }
  }

  #playElementRectAnimation(
    item: ItemBase,
    first: DOMRect | null,
    last: DOMRect | null,
    targetElement: HTMLElement | null,
    animationConfig: AnimationConfig | null,
    animationOwner: ItemBase,
  ) {
    if (!targetElement || !first || !last || !animationConfig) return;

    const dx = first.x - last.x;
    const dy = first.y - last.y;
    if (Math.abs(dx) < MIN_FLIP_DISTANCE && Math.abs(dy) < MIN_FLIP_DISTANCE) {
      return;
    }

    item.cancelAnimations();
    const duration = animationConfig.duration ?? 160;
    const easing = animationConfig.timing_function ?? "ease-out";
    const transformAt = (t: number) =>
      `translate3d(${dx * (1 - t)}px, ${dy * (1 - t)}px, 0px)`;
    const animation = new AnimationObject(
      null,
      {
        $t: [0, 1],
      },
      {
        duration,
        easing,
        tick: (vars) => {
          targetElement.style.transform = transformAt(vars.$t);
        },
        finish: () => {
          targetElement.style.transform = "";
        },
      },
    );

    targetElement.style.transform = transformAt(0);
    animationOwner.addAnimation(animation);
    animation.play();
  }

  #playDropAnimation(
    first: DOMRect | null,
    last: DOMRect | null,
    targetElement: HTMLElement | null,
    animationConfig: AnimationConfig | null,
    animationOwner: ItemBase,
  ) {
    this.#playElementRectAnimation(
      this,
      first,
      last,
      targetElement,
      animationConfig,
      targetElement === this.element ? this : animationOwner,
    );
  }

  /**
   * Run a DOM mutation with optional FLIP animation for affected items.
   *
   * @param container Container whose reorder animation config controls the mutation.
   * @param excludedItem Item that should not be animated, usually the active drag item.
   * @param mutate DOM mutation to perform between first and last measurements.
   * @returns Nothing.
   */
  withReorderAnimation(
    container: ContainerBase | null,
    excludedItem: ItemBase | null,
    mutate: () => void,
  ) {
    const animationConfig = this.#reorderAnimationConfig(container);
    const targetRoot = container
      ? ((container as unknown as ItemBase)
          .#rootContainer as unknown as ItemBase | null)
      : null;
    const root =
      targetRoot ?? (this.#rootContainer as unknown as ItemBase) ?? this;

    if (!animationConfig) {
      mutate();
      return;
    }

    let snapshot: FlipSnapshot[] = [];
    const queuePrefix = `snapsort-flip-${root.id}`;
    root.schedule(
      () => {
        snapshot = this.#captureFlipSnapshot(root, excludedItem);
      },
      { stage: "READ_2", queueId: `${queuePrefix}-read-first` },
    );

    root.schedule(
      async () => {
        for (const { item } of snapshot) {
          item.cancelAnimations();
          item.element!.style.transform = "";
        }
        mutate();
        await this.#awaitMutation(container);
      },
      { stage: "WRITE_2", queueId: `${queuePrefix}-mutate` },
    );

    root.schedule(
      () => {
        this.#captureFlipLast(snapshot, root);
      },
      { stage: "READ_3", queueId: `${queuePrefix}-read-last` },
    );

    root.schedule(
      () => {
        this.#playFlipAnimations(snapshot, animationConfig, root);
      },
      { stage: "WRITE_3", queueId: `${queuePrefix}-play` },
    );
  }

  /**
   * Apply a temporary inline `position` while remembering the previous value.
   *
   * @param element Element to update.
   * @param position Temporary CSS position value.
   * @returns Nothing.
   */
  #setTemporaryPosition(element: HTMLElement | null, position: string) {
    if (!element || this.#dragPositionContextSnapshot.has(element)) return;
    this.#dragPositionContextSnapshot.set(element, element.style.position);
    element.style.position = position;
  }

  /**
   * Prepare the root as a fallback absolute-positioning context.
   *
   * @returns Nothing.
   */
  #applyDragPositionContext() {
    const root = this.#rootContainer as unknown as ItemBase | null;
    if (!root?.element) return;

    this.#dragPositionContextSnapshot.clear();
    this.#setTemporaryPosition(root.element, "relative");
  }

  /**
   * Restore inline position values changed by `#applyDragPositionContext`.
   *
   * @returns Nothing.
   */
  #restoreDragPositionContext() {
    for (const [element, position] of this.#dragPositionContextSnapshot) {
      element.style.position = position;
    }
    this.#dragPositionContextSnapshot.clear();
  }

  /**
   * Move the active dragged DOM node under the current target container.
   *
   * @param container Container that currently owns the ghost/drop target.
   * @returns Nothing.
   */
  #moveDraggedElementToContainer(container: ContainerBase) {
    const containerItem = container as unknown as ItemBase;
    if (!this.element || !containerItem.element) return;

    this.#setTemporaryPosition(containerItem.element, "relative");
    this.transformMode = "relative";
    this.transformOrigin = null;
    this.style = {
      position: "absolute",
      zIndex: "1000",
      top: "0px",
      left: "0px",
    };
    this.writeDom();
    this.schedule(
      async () => {
        this.readDom({ unapplyTransform: true });
      },
      { stage: "READ_2", queueId: `dragged-read-${this.id}` },
    );
    this.schedule(
      () => {
        this.writeTransform();
      },
      { stage: "WRITE_2", queueId: `dragged-transform-${this.id}` },
    );
  }

  /**
   * Move an item to a different container and index, updating the DOM and internal state accordingly.
   *
   * @param container Destination container.
   * @param item Item to move.
   * @param index Destination index in the destination container.
   * @returns Nothing.
   */
  moveItemToContainer(container: ContainerBase, item: ItemBase, index: number) {
    const move = () => {
      // If the source and target container is the same, we must adjust the index
      // to account for the removal of the item from its original position.
      if (item.parent === container) {
        // If the source and target index is the same, no need to move.
        if (container.#itemOrderedList.indexOf(item) === index) {
          return;
        }
        const currentIndex = container.#itemOrderedList.indexOf(item);
        if (currentIndex !== -1 && currentIndex < index) {
          index -= 1;
        }
      }
      this.detachItemFromContainer(item.container, item);
      this.insertItemAt(container, item, index);
    };

    if (
      item.parent === container &&
      container.#itemOrderedList.indexOf(item) === index
    ) {
      return;
    }

    this.withReorderAnimation(container, null, move);
  }

  #attachItemToContainer(
    container: ContainerBase,
    item: ItemBase,
    index: number,
  ) {
    (container as unknown as ItemBase).appendChild(item);
    if (index >= container.#itemOrderedList.length) {
      container.#itemOrderedList.push(item);
    } else {
      container.#itemOrderedList.splice(index, 0, item);
    }
  }

  #insertItemElement(container: ContainerBase, item: ItemBase, index: number) {
    const itemAfterIndex =
      index >= container.#itemOrderedList.length - 1
        ? null
        : container.#itemOrderedList[index + 1].element;

    const onInsert = container.callbacks?.onItemInsert;
    if (!onInsert) {
      throw new Error("Container callback onItemInsert is not defined");
    }
    onInsert({
      item,
      itemMetadata: item.metadata,
      container,
      containerMetadata: container.metadata,
      index,
      beforeElement: itemAfterIndex,
    });
    return;
  }

  #insertGhostElement(
    original: ItemBase,
    container: ContainerBase,
    ghostItem: ItemBase,
    index: number,
  ) {
    const itemAfterIndex =
      index >= container.#itemOrderedList.length - 1
        ? null
        : container.#itemOrderedList[index + 1].element;

    const onInsert = container.callbacks?.onGhostInsert;
    if (!onInsert) {
      throw new Error("Container callback onGhostInsert is not defined");
    }
    onInsert({
      original,
      originalMetadata: original.metadata,
      ghostItem,
      ghostMetadata: ghostItem.metadata,
      container,
      containerMetadata: container.metadata,
      index,
      beforeElement: itemAfterIndex,
    });
  }

  /**
   * Insert an item at a specific index in the item list and DOM.
   * If the index is past the end, the item is appended.
   * Note that this assumes the #itemOrderedList is already in the correct order.
   *
   * @param container Container that receives the item.
   * @param item Item to insert.
   * @param index Index where the item should be inserted.
   * @returns Nothing.
   */
  insertItemAt(container: ContainerBase, item: ItemBase, index: number) {
    this.#attachItemToContainer(container, item, index);
    this.#insertItemElement(container, item, index);
  }

  insertGhostAt(
    original: ItemBase,
    container: ContainerBase,
    ghostItem: ItemBase,
    index: number,
  ) {
    this.#attachItemToContainer(container, ghostItem, index);
    this.#insertGhostElement(original, container, ghostItem, index);
  }

  detachItemFromContainer(container: ContainerBase, item: ItemBase) {
    container.removeChild(item);
    container.#itemOrderedList = container.#itemOrderedList.filter(
      (i) => i !== item,
    );
  }

  #removeItemElement(container: ContainerBase, item: ItemBase) {
    const onRemove = container.callbacks?.onItemRemove;
    if (!onRemove) {
      throw new Error("Container callback onItemRemove is not defined");
    }
    onRemove({
      item,
      itemMetadata: item.metadata,
      container,
      containerMetadata: container.metadata,
    });
    return;
  }

  #removeGhostElement(
    original: ItemBase,
    container: ContainerBase,
    ghostItem: ItemBase,
  ) {
    const onRemove = container.callbacks?.onGhostRemove;
    if (!onRemove) {
      throw new Error("Container callback onGhostRemove is not defined");
    }
    onRemove({
      original,
      originalMetadata: original.metadata,
      ghostItem,
      ghostMetadata: ghostItem.metadata,
      container,
      containerMetadata: container.metadata,
    });
  }

  /**
   * Remove an item from the item list and DOM.
   *
   * @param container Container that currently owns the item.
   * @param item The item to remove.
   * @returns Nothing.
   */
  removeItemFrom(container: ContainerBase, item: ItemBase) {
    this.detachItemFromContainer(container, item);
    this.#removeItemElement(container, item);
  }

  removeGhostFrom(
    original: ItemBase,
    container: ContainerBase,
    ghostItem: ItemBase,
  ) {
    this.detachItemFromContainer(container, ghostItem);
    this.#removeGhostElement(original, container, ghostItem);
  }

  /**
   * Translate a frozen snapshot insertion index into the current live list.
   *
   * The live list may contain a ghost and no longer contain the dragged item,
   * so this maps through the snapshot item that should appear after the target.
   *
   * @param container Container whose index is being translated.
   * @param snapshotIndex Candidate index from the frozen snapshot list.
   * @param draggedItem Item currently being dragged and omitted from live flow.
   * @returns Equivalent insertion index in the live item list.
   */
  #liveIndexFromSnapshotIndex(
    container: ItemBase,
    snapshotIndex: number,
    draggedItem: ItemBase,
  ): number {
    const snapshotItems = container.#dragSnapshotOrderedList.filter(
      (i) => i !== draggedItem && !i.isGhost,
    );
    const ghostItem = this.#rootContainer?.ghostItem ?? null;
    const liveItems = container.#itemOrderedList.filter(
      (i) => i !== draggedItem && i !== ghostItem,
    );
    const clampedIndex = Math.max(
      0,
      Math.min(snapshotIndex, snapshotItems.length),
    );
    const beforeItem = snapshotItems[clampedIndex] ?? null;
    if (!beforeItem) return liveItems.length;

    const liveIndex = liveItems.indexOf(beforeItem);
    return liveIndex === -1 ? liveItems.length : liveIndex;
  }

  /**
   * Read the ghost's current live container and index.
   *
   * @param ghostItem Current ghost item, or null if no ghost exists.
   * @returns Current ghost position, or null when the ghost is detached.
   */
  #ghostInsertionPosition(
    ghostItem: ItemBase | null,
  ): { index: number; container: ItemBase | null } | null {
    if (!ghostItem?.parent) return null;

    const container = ghostItem.parent as ItemBase;
    const index = container.#itemOrderedList.indexOf(ghostItem);
    if (index === -1) return null;

    return { container, index };
  }

  #updateInsertionGhostStyle(event: GhostUpdateEvent, ghostItem: ItemBase) {
    const { container, ghostRect } = event;
    const ghostElement = ghostItem.element;
    if (!container || !ghostRect || !ghostElement) return;

    const containerProp =
      (container as unknown as ItemBase).dragSnapshot ??
      container.currentDomProperty;
    const markerInsetLeft = ghostRect.insetLeft ?? 0;
    const markerInsetRight = ghostRect.insetRight ?? 0;
    const left = ghostRect.x - containerProp.x + markerInsetLeft;
    const top = ghostRect.y - containerProp.y;
    const width = Math.max(
      0,
      ghostRect.width - markerInsetLeft - markerInsetRight,
    );

    ghostElement.dataset.snapsortGhost = "insertion";
    ghostElement.style.position = "absolute";
    ghostElement.style.left = `${left}px`;
    ghostElement.style.top = `${top}px`;
    ghostElement.style.width = `${width}px`;
    ghostElement.style.height = "0px";
    ghostElement.style.margin = "0";
    ghostElement.style.borderRadius = "999px";
    ghostElement.style.borderTop = "3px solid currentColor";
    ghostElement.style.background = "currentColor";
    ghostElement.style.color = "rgb(37, 99, 235)";
    ghostElement.style.pointerEvents = "none";
    ghostElement.style.boxSizing = "border-box";
    ghostElement.style.zIndex = "999";
  }

  async #updateInsertionGhostElement(event: GhostUpdateEvent) {
    const { original, container, index, ghostRect } = event;
    const root = original.#rootContainer as unknown as ItemBase | null;
    if (!root) {
      throw new Error("Root container not found");
    }
    let ghostItem = root.ghostItem;

    if (container === null) {
      root.#pendingGhostTarget = null;
      if (ghostItem) {
        ghostItem.element?.remove();
        ghostItem.destroy();
        root.ghostItem = null;
      }
      return;
    }

    if (!ghostRect) return;

    const firstRect = ghostItem?.element?.isConnected
      ? ghostItem.element.getBoundingClientRect()
      : null;

    if (!ghostItem) {
      ghostItem = original.createGhostItem(event);
      if (!ghostItem) return;
    }
    root.ghostItem = ghostItem;
    root.#pendingGhostTarget = { ghostItem, container, index, ghostRect };

    const ghostElement = ghostItem.element;
    if (
      (!ghostElement && !ghostItem.#frameworkManagedGhostElement) ||
      !container.element
    ) {
      return;
    }
    if (!ghostElement) return;

    if (ghostElement.parentElement !== container.element) {
      container.element.appendChild(ghostElement);
    }

    original.#updateInsertionGhostStyle(event, ghostItem);
    const lastRect = ghostElement.getBoundingClientRect();
    original.#playElementRectAnimation(
      ghostItem,
      firstRect,
      lastRect,
      ghostElement,
      original.#reorderAnimationConfig(container),
      ghostItem,
    );
  }

  /**
   * Create or remove a ghost element at the specified container and index.
   * A null container means the ghost element should be removed.
   *
   * @param original The original item being dragged.
   * @param container The container to place the ghost element in, or null to remove it.
   * @param index The index at which to place the ghost element.
   * @returns Nothing.
   */
  async #updateGhostElement(event: GhostUpdateEvent) {
    const { original, container, index, ghostRect } = event;
    if (original.usesInsertionDropMarker) {
      await original.#updateInsertionGhostElement(event);
      return;
    }

    const root = original.#rootContainer as unknown as ItemBase | null;
    if (!root) {
      throw new Error("Root container not found");
    }
    let ghostItem = root.ghostItem;

    // Null container - remove ghost
    if (container === null) {
      root.#pendingGhostTarget = null;
      if (ghostItem) {
        const ghostContainer =
          ghostItem.parent as unknown as ContainerBase | null;
        if (ghostContainer) {
          original.removeGhostFrom(original, ghostContainer, ghostItem);
          await original.#awaitMutation(ghostContainer);
        }
        ghostItem.destroy();
        root.ghostItem = null;
      }
      return;
    }

    // If no ghost item exists, create one
    if (!ghostItem) {
      ghostItem = original.createGhostItem(event);
      if (!ghostItem) return;
    }
    root.ghostItem = ghostItem;
    root.#pendingGhostTarget = { ghostItem, container, index, ghostRect };

    const moveGhost = () => {
      const pendingTarget = root.#pendingGhostTarget;
      if (
        root.ghostItem !== ghostItem ||
        pendingTarget?.ghostItem !== ghostItem ||
        pendingTarget.container !== container ||
        pendingTarget.index !== index ||
        (!ghostItem.element && !ghostItem.#frameworkManagedGhostElement) ||
        !container.element
      ) {
        return;
      }

      if (ghostItem.parent) {
        container.detachItemFromContainer(ghostItem.container, ghostItem);
      }
      container.insertGhostAt(original, container, ghostItem, index);
    };

    if (ghostItem.parent) {
      container.withReorderAnimation(container, original, moveGhost);
    } else {
      moveGhost();
      await original.#awaitMutation(container);
    }
  }

  /**
   * Compute the current drop target and move the ghost when the target changes.
   *
   * @param item Item currently being dragged.
   * @returns Nothing.
   */
  async updateDropTarget(item: ItemBase) {
    const root = this.#rootContainer;
    // Defensive guard for a drag-start/drag race: the deeper fix should live in
    // the engine scheduler as built-in debounce/coalescing support for input
    // updates that depend on earlier READ/WRITE phases.
    if (!root || !root.#hasDragSnapshotTree() || !item.#dragSnapshot) {
      return;
    }

    const target = this.resolveDropTarget(item, root);
    if (!target) {
      return;
    }
    // Compare against the ghost's current position, not the dragged item's (which is removed from the list during drag)
    // In other words, check what the previous drop target was based on where the ghost is.
    const ghostItem = root.ghostItem;
    const ghostSource = item.usesInsertionDropMarker
      ? root.#pendingGhostTarget?.ghostItem === ghostItem
        ? {
            container: root.#pendingGhostTarget
              .container as unknown as ItemBase,
            index: root.#pendingGhostTarget.index,
          }
        : null
      : this.#ghostInsertionPosition(ghostItem ?? null);
    const targetIndex =
      target?.container != null
        ? item.usesInsertionDropMarker
          ? target.index
          : this.#liveIndexFromSnapshotIndex(
              target.container,
              target.index,
              item,
            )
        : -1;
    const targetContainer = target?.container as ContainerBase;
    if (targetContainer && ghostSource?.container) {
      const sameContainer = targetContainer === ghostSource.container;
      const sameIndex = targetIndex === ghostSource.index;
      if (!sameContainer || !sameIndex) {
        await item.#updateGhostElement({
          original: item,
          container: targetContainer as unknown as ContainerBase,
          index: targetIndex,
          ghostRect: target.ghostRect,
        });
      }
      if (!item.usesInsertionDropMarker) {
        this.#moveDraggedElementToContainer(
          targetContainer as unknown as ContainerBase,
        );
      }
    } else if (targetContainer) {
      await item.#updateGhostElement({
        original: item,
        container: targetContainer as unknown as ContainerBase,
        index: targetIndex,
        ghostRect: target.ghostRect,
      });
      if (!item.usesInsertionDropMarker) {
        this.#moveDraggedElementToContainer(
          targetContainer as unknown as ContainerBase,
        );
      }
    }
  }

  dragStart(prop: dragStartProp) {
    if (!this.dragDropEnabled || this.#locked) return;
    // Set the root container for all items, and queue READ to update the state of all containers and items.
    this.#findRootContainer();
    const root = (this.#rootContainer as unknown as ItemBase) ?? this;
    resetDropSnapshotDebugDump(this);
    // Get the current index of the item in its container.
    const { index: currentIndex, container: currentContainer } =
      this.getIndexAndContainer();
    // Compute the drag offset in READ_1, after DOM positions are read but before any WRITE_1
    // callbacks (including drag events).
    this.schedule(
      () => {
        this.#dragPointerX = prop.start.x;
        this.#dragPointerY = prop.start.y;
        this.#dragOffsetX = prop.start.x - this.worldTransform.x;
        this.#dragOffsetY = prop.start.y - this.worldTransform.y;
        root.#captureDragSnapshotTree();
      },
      { stage: "READ_1", queueId: `drag-start-offset-${this.id}` },
    );

    this.schedule(
      async () => {
        if (this.usesInsertionDropMarker) {
          if (this.element) {
            this.element.dataset.snapsortDragging = "true";
          }
          await this.updateDropTarget(this);
          return;
        }

        await this.#updateGhostElement({
          original: this,
          container: currentContainer as unknown as ContainerBase,
          index: currentIndex,
        });
        // Remove the dragged item from its container's orderedList and engine children.
        // The ghost now takes its place in the layout.
        this.detachItemFromContainer(
          currentContainer as unknown as ContainerBase,
          this,
        );

        const rootSnapshot = root.dragSnapshot;
        const hoistOffsetX = rootSnapshot
          ? -(rootSnapshot.border.left + rootSnapshot.padding.left)
          : 0;
        const hoistOffsetY = rootSnapshot
          ? -(rootSnapshot.border.top + rootSnapshot.padding.top)
          : 0;
        const dragSnapshot = this.dragSnapshot;
        this.style = {
          cursor: "grabbing",
          position: "absolute",
          zIndex: "1000",
          top: `${hoistOffsetY}px`,
          left: `${hoistOffsetX}px`,
          width: dragSnapshot ? `${dragSnapshot.width}px` : "",
          height: dragSnapshot ? `${dragSnapshot.height}px` : "",
        };
        this.#applyDragPositionContext();
        this.transformMode = "origin";
        this.worldTransform = {
          x: prop.start.x - this.#dragOffsetX,
          y: prop.start.y - this.#dragOffsetY,
        };
        this.#moveDraggedElementToContainer(
          currentContainer as unknown as ContainerBase,
        );
        this.debugAllItems();
      },
      { stage: "WRITE_1" },
    );
  }

  drag(prop: dragProp) {
    this.schedule(
      async () => {
        this.#dragPointerX = prop.position.x;
        this.#dragPointerY = prop.position.y;

        if (this.usesInsertionDropMarker) {
          await this.updateDropTarget(this);
          return;
        }

        // Move the item according to mouse position
        this.worldTransform = {
          x: prop.position.x - this.#dragOffsetX,
          y: prop.position.y - this.#dragOffsetY,
        };
        this.writeTransform();

        await this.updateDropTarget(this);
      },
      { stage: "WRITE_1", queueId: `drag-${this.id}` },
    );
    // Re-read positions of all items
    const root = this.#rootContainer as unknown as ItemBase | null;
    if (root) {
      root.#queueReadTree("READ_2", `drag-${this.id}`);
    }
  }

  #dragEndInsertion() {
    const root = (this.#rootContainer as unknown as ItemBase) ?? this;

    this.schedule(
      async () => {
        const ghostItem = this.#rootContainer?.ghostItem;
        const pendingGhostTarget =
          root.#pendingGhostTarget?.ghostItem === ghostItem
            ? root.#pendingGhostTarget
            : null;

        if (this.element) {
          delete this.element.dataset.snapsortDragging;
        }
        this.writeTransform();

        await this.#updateGhostElement({
          original: this,
          container: null,
          index: -1,
        });

        if (pendingGhostTarget?.container) {
          this.moveItemToContainer(
            pendingGhostTarget.container,
            this,
            pendingGhostTarget.index,
          );
          await this.#awaitMutation(pendingGhostTarget.container);
        }

        root.#clearDragSnapshotTree();
        resetDropSnapshotDebugDump(this);
      },
      { stage: "WRITE_1", queueId: `drag-end-insertion-${this.id}` },
    );
  }

  dragEnd(_: dragEndProp) {
    if (this.usesInsertionDropMarker) {
      this.#dragEndInsertion();
      return;
    }

    const root = (this.#rootContainer as unknown as ItemBase) ?? this;
    const dropKey = this.#itemID(this);
    let dropFirst: DOMRect | null = null;
    let dropLast: DOMRect | null = null;
    let dropTargetElement: HTMLElement | null = null;
    let dropAnimationConfig: AnimationConfig | null = null;

    this.schedule(
      () => {
        if (!this.element) return;
        const first = this.readDom({ unapplyTransform: false }, "READ_1");
        dropFirst = new DOMRect(
          first.screenX,
          first.screenY,
          first.width,
          first.height,
        );
      },
      { stage: "READ_1", queueId: `drag-end-read-first-${this.id}` },
    );

    this.schedule(
      async () => {
        // Get ghost's current position — this is where the item should land
        const ghostItem = this.#rootContainer?.ghostItem;
        const pendingGhostTarget =
          root.#pendingGhostTarget?.ghostItem === ghostItem
            ? root.#pendingGhostTarget
            : null;
        const liveGhostPos = ghostItem?.getIndexAndContainer();
        const usePendingGhostTarget =
          !!pendingGhostTarget &&
          (!liveGhostPos?.container ||
            liveGhostPos.container !== pendingGhostTarget.container);
        const ghostPos = usePendingGhostTarget
          ? {
              index: pendingGhostTarget.index,
              container: pendingGhostTarget.container as unknown as ItemBase,
            }
          : liveGhostPos;
        this.style = {
          cursor: "grab",
          position: "relative",
          zIndex: "",
          top: "",
          left: "",
          width: "",
          height: "",
        };
        this.transformMode = "none";
        this.transformOrigin = null;
        if (this.element) {
          this.writeDom();
          this.writeTransform();
        }

        // Remove the ghost first
        await this.#updateGhostElement({
          original: this,
          container: null,
          index: -1,
        });

        // Re-insert the dragged item at the ghost's former position
        if (ghostPos?.container) {
          const destinationContainer =
            ghostPos.container as unknown as ContainerBase;
          dropAnimationConfig = this.#dropAnimationConfig(destinationContainer);
          this.insertItemAt(destinationContainer, this, ghostPos.index);
          await this.#awaitMutation(destinationContainer);
        }

        this.#restoreDragPositionContext();
        root.#clearDragSnapshotTree();
        resetDropSnapshotDebugDump(this);
      },
      { stage: "WRITE_1", queueId: `drag-end-${this.id}` },
    );

    root.schedule(
      () => {
        const currentItem = root.#findItemByID(dropKey) ?? this;
        dropTargetElement = currentItem.element?.isConnected
          ? currentItem.element
          : null;
        if (!dropTargetElement) return;
        if (currentItem === this) {
          currentItem.readDom({ unapplyTransform: false }, "READ_2");
        }
        dropLast = dropTargetElement.getBoundingClientRect();
      },
      { stage: "READ_2", queueId: `drag-end-read-last-${this.id}` },
    );

    root.schedule(
      () => {
        this.#playDropAnimation(
          dropFirst,
          dropLast,
          dropTargetElement,
          dropAnimationConfig,
          root,
        );
      },
      { stage: "WRITE_2", queueId: `drag-end-play-${this.id}` },
    );
  }

  destroy() {
    if (this.parent) {
      this.detachItemFromContainer(
        this.parent as unknown as ContainerBase,
        this,
      );
    }
    super.destroy();
  }
}

export class ItemEuclidean extends ItemBase {
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

export class ItemProgressive extends ItemBase {
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

export class ItemInsertion extends ItemBase {
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
