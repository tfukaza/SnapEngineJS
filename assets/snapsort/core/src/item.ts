import { BaseObject, ElementObject, cloneDomProperty } from "@snap-engine/core";
import type {
  AnimationConfig,
  ContainerBase,
  GhostCreateEvent,
  GhostRect,
  GhostUpdateEvent,
} from "./container";
import type { dragStartProp, dragProp, dragEndProp } from "@snap-engine/core";
import {
  determineDropTarget,
  determineInsertionDropTarget,
  determineProgressiveDropTarget,
  resetDropSnapshotDebugDump,
  type DropCandidate,
} from "./algorithm";
import { AnimationObject } from "@snap-engine/core/animation";
import type {
  ItemId,
  ItemSnapshot,
  ItemSnapshotMetadata,
  LayoutDirection,
  LayoutMainAxisAlign,
} from "./snapshot";

const MIN_FLIP_DISTANCE = 0.5;

interface FlipAnimationState {
  item: ItemBase;
  key: string;
  first: DOMRect | null;
  firstParent: DOMRect | null;
  firstParentItem: ItemBase | null;
  last: DOMRect | null;
  lastParent: DOMRect | null;
  lastParentItem: ItemBase | null;
  targetElement: HTMLElement | null;
}

interface TransformOffset {
  x: number;
  y: number;
}

interface DragLayoutPosition {
  x: number;
  y: number;
}

interface DragSourcePosition {
  container: ContainerBase;
  index: number;
}

interface ElementRectAnimationOptions {
  coordinateParent?: ItemBase | null;
  firstParent?: DOMRect | null;
  firstParentItem?: ItemBase | null;
  lastParent?: DOMRect | null;
  lastParentItem?: ItemBase | null;
  subtractAncestorOffset?: boolean;
  initialOffset?: TransformOffset;
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

export class ItemBase extends ElementObject {
  #rootContainer: ContainerBase | null = null;
  #metadata: ItemSnapshotMetadata = {};
  #locked: boolean = false;
  noDrop: boolean = false;

  #dragOffsetX: number = 0;
  #dragOffsetY: number = 0;
  #dragPointerX: number = 0;
  #dragPointerY: number = 0;
  #dragStartX: number = 0;
  #dragStartY: number = 0;

  #dragSnapshot: ItemSnapshot<ItemBase> | null = null;
  #dragTransformSyncAnimation: AnimationObject | null = null;
  // #dragPositionContextSnapshot: Map<HTMLElement, string> = new Map();

  #itemOrderedList: ItemBase[] = [];

  #isGhost: boolean = false;
  #frameworkManagedGhostElement: boolean = false;
  #depth: number = 0;
  ghostItem: ItemBase | null = null;
  #pendingGhostTarget: GhostTarget | null = null;
  #visualAnimationOffset: TransformOffset = { x: 0, y: 0 };
  #dragCoordinateParent: ItemBase | null = null;
  #dragLayoutPosition: DragLayoutPosition | null = null;
  #dragSourcePosition: DragSourcePosition | null = null;

  constructor(
    engine: any,
    parent: ContainerBase | null,
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

    // If there is no parent element, assume this is the root container
    this.rootContainer = parent
      ? parent.rootContainer
      : (this as unknown as ContainerBase);
    // if (parent) {
    //   parent.addItem(this);
    // }
  }

  // protected get dragDropEnabled(): boolean {
  //   return false;
  // }

  /**
   * Return the ItemBase class used to construct the ghost item.
   */
  protected get ghostItemConstructor(): ItemBaseConstructor | null {
    return null;
  }

  /**
   * Returns true if this container/item is configured to use
   * insertion mode for drag and drop.
   */
  protected get usesInsertionDropMarker(): boolean {
    return false;
  }

  /**
   * Create and return a new instance of the ghost item.
   * This will also invoke the createItemGhost callback,
   * which is responsible for creating the DOM element in vanilla JS mode,
   * or updating states if the items are managed by a frontend framework.
   * @param event The ghost update event containing container and metadata information.
   * @returns A new ghost item instance, or null if no constructor is defined.
   */
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

  /**
   * Returns a list of DropCandidate, i.e. a list of
   * possible locations the item can be dropped given
   * the current position of the dragged item and the current
   * state of the entire tree.
   * @param _item
   * @param _root
   * @returns
   */
  protected resolveDropTarget(
    _item: ItemBase,
    _root: ItemBase,
  ): DropCandidate | null {
    return null;
  }

  /**
   * Add an item to a container.
   *
   * @note The DOM element of the item must be set before calling this method.
   * @param item
   */
  addItem(item: ItemBase) {
    console.debug("Adding item", item.#itemID(item));
    if (
      this.children.includes(item) &&
      this.#itemOrderedList.find((i) => i === item)
    ) {
      throw new Error("Item is already a child of this container");
    }
    item.rootContainer = this.rootContainer;
    this.appendChild(item);
    this.#itemOrderedList.push(item);
    this.takeRootSnapshot();
  }

  /**
   * Remove an item from a container
   * @param id Item ID of the item to remove
   * @returns True if the item was found and removed, false otherwise
   */
  removeItem(id: ItemId) {
    const item =
      this.#itemOrderedList.find(
        (item) => !item.isGhost && this.#itemID(item) === id,
      ) ??
      this.children.find(
        (item): item is ItemBase =>
          item instanceof ItemBase &&
          !item.isGhost &&
          this.#itemID(item) === id,
      );
    if (!item) return false;

    this.removeItemFrom(this as unknown as ContainerBase, item);
    return true;
  }

  /**
   * Returns the unique identifier for an item.
   * If a unique ID was not assigned to the item, it will fall back to
   * the item's engine's object ID.
   *
   * If the item is a ghost for insertion mode, the ID is prepended with
   * a `ghost:` to prevent conflation with the original object.
   * @param item
   * @returns
   */
  #itemID(item: ItemBase) {
    const id = item.metadata.itemId ?? item.id;
    return item.isGhost && item.usesInsertionDropMarker ? `ghost:${id}` : id;
  }

  /**
   * Find an item by its item id within this container.
   *
   * @param id Stable item id from `metadata.itemId`.
   * @returns Matching item object, or null when the tree has no matching item.
   */
  #findItemByID(id: ItemId): ItemBase | null {
    // Ghosts can share the original's id. They must never be matched here —
    // otherwise callers like moveItem() can grab a ghost that is destroyed
    // before a deferred move() runs against it.
    const directItem =
      this.#itemOrderedList.find(
        (item) => !item.isGhost && this.#itemID(item) === id,
      ) ??
      this.children.find(
        (item): item is ItemBase =>
          item instanceof ItemBase &&
          !item.isGhost &&
          this.#itemID(item) === id,
      );
    if (directItem) return directItem;

    for (const child of this.#itemOrderedList) {
      const found = child.#findItemByID(id);
      if (found) return found;
    }

    return null;
  }

  /**
   * Move an item into a target container.
   *
   * This is the public API used by frameworks. It accepts
   * an id instead of an `ItemBase` so callers do not need to retain engine
   * object references.
   *
   * @param id Stable item id from `metadata.itemId`.
   * @param container Destination SnapSort container.
   * @param index Destination index in the target container.
   * @returns True when a matching item was found and a move was requested.
   */
  moveItem(id: ItemId, container: ContainerBase, index: number) {
    this.takeRootSnapshot();
    const root = this.#rootContainer as unknown as ItemBase;
    const item = root.#findItemByID(id);
    if (!item) return false;
    if (item.parent !== this && this.element?.contains(item.element)) {
      // TODO: This should not happen in the first place
      throw new Error(
        "Faulty state: Item is not logically a child of this container, but the DOM contains it",
      );
      // const staleParent = item.parent as ItemBase | null;
      // staleParent?.removeChild(item);
      // if (staleParent) {
      //   staleParent.#itemOrderedList = staleParent.#itemOrderedList.filter(
      //     (candidate) => candidate !== item,
      //   );
      // }
      // this.addItem(item);
    }

    this.#moveItemToContainer(container, item, index);
    return true;
  }

  /**
   * If true, it means this item or container cannot be moved.
   */
  get locked(): boolean {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = value;
  }

  /**
   * Returns the current container and the index within that container.
   * @returns
   */
  getIndexAndContainer(): { index: number; container: ContainerBase | null } {
    if (!this.parent) {
      return { index: -1, container: null };
    }
    const parentContainer = this.parent as unknown as ContainerBase;
    const idx = parentContainer.#itemOrderedList.indexOf(this);
    return { index: idx, container: parentContainer };
  }

  get metadata(): ItemSnapshotMetadata {
    return this.#metadata;
  }

  set metadata(value: ItemSnapshotMetadata) {
    this.#metadata = value;
  }

  get container(): ContainerBase {
    if (!this.parent) {
      console.warn("ItemBase has no container set.");
      return null as any;
    }
    return this.parent as unknown as ContainerBase;
  }

  get rootContainer(): ContainerBase {
    return this.#rootContainer ?? (this as unknown as ContainerBase);
  }

  set rootContainer(value: ContainerBase | null) {
    this.#rootContainer = value;
  }

  /**
   * Returns data for the current ghost item.
   */
  get pendingGhostTarget(): GhostTarget | null {
    return this.#pendingGhostTarget;
  }

  set pendingGhostTarget(value: GhostTarget) {
    this.#pendingGhostTarget = value;
  }

  // setRootContainer(root: ContainerBase | null) {
  //   this.#rootContainer = root;
  // }

  get isGhost(): boolean {
    return this.#isGhost;
  }

  get depth(): number {
    return this.#depth;
  }

  /**
   * Returns the list of child items ordered by DOM position.
   */
  get itemOrderedList(): ItemBase[] {
    return this.#itemOrderedList;
  }

  /**
   * Returns the frozen snapshot for this item,
   * containing information about bounding box geometry,
   * child items, etc.
   */
  get dragSnapshot(): ItemSnapshot<ItemBase> | null {
    return this.#dragSnapshot;
  }

  /**
   * Returns the inset values for the insertion drop marker.
   * TODO: generalize to use bounding rect.
   */
  get dragSnapshotInsertionMarkerInsets(): { left: number; right: number } {
    const metadata = this.#dragSnapshot?.metadata ?? this.#metadata;
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

  /**
   * Returns the current drag pointer position in world coordinates.
   */
  get dragPointerPosition(): { x: number; y: number } | null {
    if (!this.#dragSnapshot) return null;
    return { x: this.#dragPointerX, y: this.#dragPointerY };
  }

  /**
   * Returns the dragged item's top-left position in world coordinates.
   */
  get dragPositionX(): number {
    if (!this.#dragSnapshot) return this.worldTransform.x;
    return this.#dragSnapshot.box.x + this.#dragPointerX - this.#dragStartX;
  }

  /**
   * Returns the dragged item's top-left position in world coordinates.
   */
  get dragPositionY(): number {
    if (!this.#dragSnapshot) return this.worldTransform.y;
    return this.#dragSnapshot.box.y + this.#dragPointerY - this.#dragStartY;
  }

  cancelAnimations() {
    this.#visualAnimationOffset = { x: 0, y: 0 };
    super.cancelAnimations();
  }

  #parentItem(): ItemBase | null {
    return this.parent instanceof ItemBase ? this.parent : null;
  }

  /**
   * Calculate the aggregated visual offset of all parent containers
   * while they are being animated. In simple terms, this
   * function answers the question "How much has this item's container
   * drifted from its original position due to animations applied to it
   * or any of its ancestors?"
   *
   * @param parent The starting ancestor item.
   * @param overrides Optional map of visual offsets to override default values.
   * @returns
   */
  #ancestorVisualOffset(
    parent: ItemBase | null,
    // overrides: Map<ItemBase, TransformOffset> | null = null,
  ): TransformOffset {
    const offset = { x: 0, y: 0 };
    let current: BaseObject | null = parent;
    while (current) {
      if (current instanceof ItemBase) {
        const currentOffset = current.#visualAnimationOffset;
        offset.x += currentOffset.x;
        offset.y += currentOffset.y;
      }
      current = current.parent;
    }
    return offset;
  }

  #setVisualAnimationOffset(x: number, y: number) {
    this.#visualAnimationOffset = { x, y };
  }

  #clearVisualAnimationOffset() {
    this.#visualAnimationOffset = { x: 0, y: 0 };
  }

  // TODO: replace with writeTransform
  #translateTransform(x: number, y: number) {
    return `translate3d(${x}px, ${y}px, 0px)`;
  }

  /**
   * Return this item's children sorted by their DOM order.
   *
   * @returns Child objects ordered by their current element order in the DOM.
   */
  #childrenInDomOrder(): BaseObject[] {
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
      const prop = child.dragSnapshot?.box ?? child.currentDomProperty;
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
   * Trigger root container to take snapshot of the current state.
   * This initializes the SnapSort tree state and queues the initial DOM read
   * into **READ_1** stage.
   *
   * @note Frontend frameworks should invoke this once after the
   * entire tree has been added to the DOM.
   */
  takeRootSnapshot() {
    // if (this.parent == null) {
    //
    const root = this.#rootContainer;
    if (!root) {
      throw new Error("Root container not found");
    }
    root.#updateState();
    root.#queueReadTree("READ_1", `snapsort-read-root-${this.id}`);
    // } else {
    //   const parentContainer = this.parent as unknown as ItemBase;
    //   parentContainer.#takeRootSnapshot();
    // }
  }

  /**
   * Refresh root/depth metadata and live child ordering for this subtree.
   *
   * @param root Root container that owns the active SnapSort tree.
   * @param depth Nesting depth of this item within the root tree.
   * @returns Nothing.
   */
  #updateState(depth: number = 0) {
    // console.debug("Updating state for", this.#itemID(this), "depth:", depth);
    // Set root container and depth
    // this.#rootContainer = root;
    this.#depth = depth;
    // Get the list of children in DOM order
    this.#itemOrderedList = this.#childrenInDomOrder() as ItemBase[];
    // Update all its children as well.
    for (const child of this.children) {
      if (child instanceof ItemBase) {
        child.#updateState(depth + 1);
      }
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

  #snapshotDirection(): LayoutDirection {
    return "direction" in this && typeof (this as any).direction === "string"
      ? (this as any).direction
      : "column";
  }

  #snapshotMainAxisAlign(): LayoutMainAxisAlign {
    return "mainAxisAlign" in this && (this as any).mainAxisAlign === "center"
      ? "center"
      : "start";
  }

  #dragSnapshotItems(): ItemBase[] {
    return this.#dragSnapshot?.children.map((snapshot) => snapshot.value) ?? [];
  }

  /**
   * Capture frozen DOM geometry and child order for this subtree.
   *
   * The drop algorithm reads this snapshot for the full drag so live ghost DOM
   * movement cannot perturb candidate prediction.
   *
   * @returns Nothing.
   */
  #captureDragSnapshotTree(): ItemSnapshot<ItemBase> {
    const snapshotItems = this.#itemOrderedList.slice();
    const snapshot: ItemSnapshot<ItemBase> = {
      value: this,
      key: this.#itemID(this),
      metadata: { ...this.#metadata },
      direction: this.#snapshotDirection(),
      mainAxisAlign: this.#snapshotMainAxisAlign(),
      locked: this.#locked,
      box: cloneDomProperty(this.currentDomProperty),
      children: [],
    };
    this.#dragSnapshot = snapshot;
    snapshot.children = snapshotItems.map((child) =>
      child.#captureDragSnapshotTree(),
    );
    return snapshot;
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
      ...this.#dragSnapshotItems(),
      ...this.#itemOrderedList,
    ]);
    this.#dragSnapshot = null;

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

    return this.#dragSnapshotItems().every((child) =>
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
  ): FlipAnimationState[] {
    return root.#collectFlipItems(root, exclude).map((item) => {
      const parentItem = item.#parentItem();
      return {
        item,
        key: this.#itemID(item),
        first: item.element!.getBoundingClientRect(),
        firstParent: parentItem?.element?.getBoundingClientRect() ?? null,
        firstParentItem: parentItem,
        last: null,
        lastParent: null,
        lastParentItem: null,
        targetElement: item.element,
      };
    });
  }

  /**
   * Capture the final visual positions after the DOM mutation.
   *
   * @param snapshot Items whose final positions should be measured.
   * @param root Root of the SnapSort tree after the DOM mutation.
   * @returns Nothing.
   */
  #captureFlipLast(snapshot: FlipAnimationState[], root: ItemBase) {
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
      const parentItem = entry.item.#parentItem();
      entry.lastParentItem = parentItem;
      entry.lastParent = parentItem?.element?.getBoundingClientRect() ?? null;
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
    snapshot: FlipAnimationState[],
    animationConfig: AnimationConfig,
    animationOwner: ItemBase,
    draggedItem: ItemBase | null = null,
  ) {
    const duration = animationConfig.duration ?? 160;
    const easing = animationConfig.timing_function ?? "ease-out";
    const entriesByItem = new Map(snapshot.map((entry) => [entry.item, entry]));

    // Sort the animations we have to play by their depth.
    // This is needed because if a container and any of its child
    // are both being animated, then the start and end positions
    // for child elements must first be calibrated based on
    // its parents' positions.
    //
    // TODO: Can we sort using this.depth?
    const orderedSnapshot = snapshot.slice().sort((a, b) => {
      if (this.#isFlipAncestor(a, b, entriesByItem)) return -1;
      if (this.#isFlipAncestor(b, a, entriesByItem)) return 1;
      return (
        this.#flipAnimationDepth(a, entriesByItem) -
        this.#flipAnimationDepth(b, entriesByItem)
      );
    });
    const initialOffsets = this.#initialFlipOffsets(orderedSnapshot);

    // Start the animations
    for (const {
      item,
      first,
      firstParent,
      firstParentItem,
      last,
      lastParent,
      lastParentItem,
      targetElement,
    } of orderedSnapshot) {
      if (!targetElement || !first || !last) continue;

      this.#playElementRectAnimation(
        item,
        first,
        last,
        targetElement,
        { duration, timing_function: easing },
        targetElement === item.element ? item : animationOwner,
        {
          coordinateParent: lastParentItem,
          firstParent,
          firstParentItem,
          lastParent,
          lastParentItem,
          initialOffset: initialOffsets.get(item),
        },
      );
    }

    if (!draggedItem) {
      return;
    }

    // While the FLIP animations above move the dragged item's coordinate
    // parent, re-sync the dragged item's transform every frame so it stays
    // under the pointer.
    draggedItem.#dragTransformSyncAnimation?.cancel();

    const animation = new AnimationObject(
      null,
      {},
      {
        duration,
        easing,
        tick: () => {
          draggedItem.#scheduleWriteDrag();
        },
        finish: () => {
          if (draggedItem.#dragTransformSyncAnimation === animation) {
            draggedItem.#dragTransformSyncAnimation = null;
          }
          draggedItem.#scheduleWriteDrag();
        },
      },
    );

    draggedItem.#dragTransformSyncAnimation = animation;
    animationOwner.addAnimation(animation, { replaceExisting: false });
    animation.play();
  }

  #flipAnimationDepth(
    entry: FlipAnimationState,
    entriesByItem: Map<ItemBase, FlipAnimationState>,
  ) {
    let depth = 0;
    let parent = entry.lastParentItem;
    while (parent) {
      depth += 1;
      parent =
        entriesByItem.get(parent)?.lastParentItem ?? parent.#parentItem();
    }
    return depth;
  }

  #isFlipAncestor(
    possibleAncestor: FlipAnimationState,
    descendant: FlipAnimationState,
    entriesByItem: Map<ItemBase, FlipAnimationState>,
  ) {
    let parent = descendant.lastParentItem;
    while (parent) {
      if (parent === possibleAncestor.item) return true;
      parent =
        entriesByItem.get(parent)?.lastParentItem ?? parent.#parentItem();
    }
    return false;
  }

  #initialFlipOffsets(snapshot: FlipAnimationState[]) {
    const initialOffsets = new Map<ItemBase, TransformOffset>();
    const entriesByItem = new Map(snapshot.map((entry) => [entry.item, entry]));
    const ancestorOffsetFor = (parent: ItemBase | null): TransformOffset => {
      const offset = { x: 0, y: 0 };
      let current = parent;
      while (current) {
        const entry = entriesByItem.get(current);
        if (entry && !initialOffsets.has(current)) {
          compute(entry);
        }
        const currentOffset =
          initialOffsets.get(current) ?? current.#visualAnimationOffset;
        offset.x += currentOffset.x;
        offset.y += currentOffset.y;
        current = entry?.lastParentItem ?? current.#parentItem();
      }
      return offset;
    };
    const compute = ({
      item,
      first,
      firstParent,
      firstParentItem,
      last,
      lastParent,
      lastParentItem,
      targetElement,
    }: FlipAnimationState) => {
      if (initialOffsets.has(item)) return;
      if (!targetElement || !first || !last) return;

      const { dx, dy, useParentLocalDelta } = this.#rectAnimationDelta(
        first,
        last,
        { firstParent, firstParentItem, lastParent, lastParentItem },
      );
      if (
        Math.abs(dx) < MIN_FLIP_DISTANCE &&
        Math.abs(dy) < MIN_FLIP_DISTANCE
      ) {
        return;
      }

      let x = dx;
      let y = dy;
      if (!useParentLocalDelta) {
        const ancestorOffset = ancestorOffsetFor(lastParentItem);
        x -= ancestorOffset.x;
        y -= ancestorOffset.y;
      }
      initialOffsets.set(item, { x, y });
    };

    for (const entry of snapshot) {
      compute(entry);
    }
    return initialOffsets;
  }

  #playElementRectAnimation(
    item: ItemBase,
    first: DOMRect | null,
    last: DOMRect | null,
    targetElement: HTMLElement | null,
    animationConfig: AnimationConfig | null,
    animationOwner: ItemBase,
    options: ElementRectAnimationOptions = {},
  ) {
    if (!targetElement || !first || !last || !animationConfig) return;

    const { dx, dy, useParentLocalDelta } = this.#rectAnimationDelta(
      first,
      last,
      options,
    );
    if (Math.abs(dx) < MIN_FLIP_DISTANCE && Math.abs(dy) < MIN_FLIP_DISTANCE) {
      return;
    }

    item.cancelAnimations();
    const duration = animationConfig.duration ?? 160;
    const easing = animationConfig.timing_function ?? "ease-out";
    const coordinateParent =
      options.coordinateParent === undefined
        ? item.#parentItem()
        : options.coordinateParent;
    const subtractAncestorOffset =
      options.subtractAncestorOffset ?? !useParentLocalDelta;
    const writeTransformAt = (t: number) => {
      if (t === 0 && options.initialOffset) {
        item.#writeVisualAnimationTransform(
          targetElement,
          options.initialOffset.x,
          options.initialOffset.y,
        );
        return;
      }
      item.#writeRectAnimationTransform(
        targetElement,
        dx,
        dy,
        t,
        coordinateParent,
        subtractAncestorOffset,
      );
    };
    const animation = new AnimationObject(
      null,
      {
        $t: [0, 1],
      },
      {
        duration,
        easing,
        tick: (vars) => {
          writeTransformAt(vars.$t);
        },
        finish: () => {
          item.#clearVisualAnimationOffset();
          targetElement.style.transform = "";
        },
      },
    );

    animationOwner.addAnimation(animation);
    writeTransformAt(0);
    animation.play();
  }

  #rectAnimationDelta(
    first: DOMRect,
    last: DOMRect,
    options: ElementRectAnimationOptions,
  ) {
    const useParentLocalDelta =
      options.firstParent &&
      options.lastParent &&
      options.firstParentItem === options.lastParentItem;
    return {
      dx: useParentLocalDelta
        ? first.x - options.firstParent!.x - (last.x - options.lastParent!.x)
        : first.x - last.x,
      dy: useParentLocalDelta
        ? first.y - options.firstParent!.y - (last.y - options.lastParent!.y)
        : first.y - last.y,
      useParentLocalDelta,
    };
  }

  #writeRectAnimationTransform(
    targetElement: HTMLElement,
    dx: number,
    dy: number,
    t: number,
    coordinateParent: ItemBase | null,
    subtractAncestorOffset: boolean,
  ) {
    let x = dx * (1 - t);
    let y = dy * (1 - t);
    if (subtractAncestorOffset) {
      const ancestorOffset = this.#ancestorVisualOffset(coordinateParent);
      x -= ancestorOffset.x;
      y -= ancestorOffset.y;
    }
    this.#writeVisualAnimationTransform(targetElement, x, y);
  }

  #writeVisualAnimationTransform(
    targetElement: HTMLElement,
    x: number,
    y: number,
  ) {
    this.#setVisualAnimationOffset(x, y);
    targetElement.style.transform = this.#translateTransform(x, y);
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

    let snapshot: FlipAnimationState[] = [];
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
        this.#playFlipAnimations(snapshot, animationConfig, root, excludedItem);
      },
      { stage: "WRITE_3", queueId: `${queuePrefix}-play` },
    );
  }

  /**
   * Renders the dragged item.
   *
   * @note THis function is currently called in WRTIE_1.
   */
  #refreshDraggedItemPosition() {
    const parentItem = this.#dragCoordinateParent;
    if (!this.element || !parentItem?.element) return;

    // this.#setTemporaryPosition(parentItem.element, "relative");

    // TODO: Skip if already in drag state?
    this.transformMode = "direct";
    this.transformOrigin = null;
    this.style = {
      position: "absolute",
      zIndex: "1000",
      top: "0px",
      left: "0px",
    };
    this.writeDom();
    this.#scheduleWriteDrag();
  }

  #scheduleWriteDrag() {
    const parentItem = this.#dragCoordinateParent;
    // There are some scenarios where the parent container
    // is moving. To account for this, we need to check the
    // latest positions of the dragged item and its ancestor,
    // and apply necessary correction so the item remains
    // at the intended position.
    this.schedule(
      async () => {
        if (!this.element?.isConnected) return;
        if (!parentItem?.element?.isConnected) return;
        // Read the container's current visual position (FLIP transforms
        // included), then remove the animation offsets applied this frame.
        // What remains is the container's current layout position, which
        // stays correct even after WRITE-stage DOM mutations move the
        // container.
        const visual = parentItem.readDom();
        const ancestorOffset = this.#ancestorVisualOffset(parentItem);
        this.#dragLayoutPosition = {
          x: visual.x - ancestorOffset.x,
          y: visual.y - ancestorOffset.y,
        };
      },
      { stage: "READ_3", queueId: `dragged-read-${this.id}` },
    );
    this.schedule(
      () => {
        this.#writeDraggedTransform();
      },
      { stage: "WRITE_3", queueId: `dragged-transform-${this.id}` },
    );
  }

  /**
   * Render the final position of the dragged item.
   * @returns
   */
  #writeDraggedTransform() {
    if (!this.#dragLayoutPosition) {
      if (this.#dragCoordinateParent) return;
      this.writeTransform();
      return;
    }

    // The container's FLIP transform carries the dragged item's DOM along
    // with it, so add the offsets applied this frame back onto the layout
    // position to get where the container is actually painted. This runs
    // after the FLIP WRITE_3 task, so freshly started animations have
    // already written their initial offsets.
    const ancestorOffset = this.#ancestorVisualOffset(
      this.#dragCoordinateParent,
    );
    this.worldTransform.x =
      this.#dragPointerX -
      this.#dragLayoutPosition.x -
      ancestorOffset.x -
      this.#dragOffsetX;
    this.worldTransform.y =
      this.#dragPointerY -
      this.#dragLayoutPosition.y -
      ancestorOffset.y -
      this.#dragOffsetY;

    this.writeTransform();
  }

  /**
   * Move an item to a different container and index, updating the DOM and internal state accordingly.
   *
   * @param container Destination container.
   * @param item Item to move.
   * @param index Destination index in the destination container.
   * @returns Nothing.
   */
  #moveItemToContainer(
    container: ContainerBase,
    item: ItemBase,
    index: number,
  ) {
    const move = () => {
      // The move is deferred to a later render stage; the item may have been
      // detached in the meantime (e.g. it started a drag or was destroyed).
      if (!item.parent) return;
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
    ghostRect?: GhostRect | null,
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
      ghostRect,
    });
  }

  /**
   * Fire onGhostInsert for a marker-style ghost that is not tracked in the
   * container's item-ordered list (its logical position lives solely in
   * `#pendingGhostTarget`). Always appends (`beforeElement: null`); the
   * marker's visual position is expressed entirely via inline style/ghostRect.
   */
  #insertInsertionGhostElement(
    original: ItemBase,
    container: ContainerBase,
    ghostItem: ItemBase,
    index: number,
    ghostRect?: GhostRect | null,
  ) {
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
      beforeElement: null,
      ghostRect,
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
    ghostRect?: GhostRect | null,
  ) {
    this.#attachItemToContainer(container, ghostItem, index);
    this.#insertGhostElement(original, container, ghostItem, index, ghostRect);
  }

  /**
   * Remove an item from the current container.
   * @note Overlaps with removeItem and removeGhostFrom?
   * @param container
   * @param item
   */
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
   * TODO: Remove
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
    const snapshotItems = container
      .#dragSnapshotItems()
      .filter((i) => i !== draggedItem && !i.isGhost);
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
      (container as unknown as ItemBase).dragSnapshot?.box ??
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
    const previousTarget = root.#pendingGhostTarget;

    if (container === null) {
      root.#pendingGhostTarget = null;
      if (ghostItem) {
        if (previousTarget?.container) {
          original.#removeGhostElement(
            original,
            previousTarget.container,
            ghostItem,
          );
          await original.#awaitMutation(previousTarget.container);
        } else {
          // No known container to route onGhostRemove through (e.g. drag ended
          // before a target was ever resolved) — fall back to a direct removal.
          ghostItem.element?.remove();
        }
        ghostItem.destroy();
        root.ghostItem = null;
      }
      return;
    }

    if (!ghostRect || !container.element) return;

    const firstRect = ghostItem?.element?.isConnected
      ? ghostItem.element.getBoundingClientRect()
      : null;

    if (!ghostItem) {
      ghostItem = original.createGhostItem(event);
      if (!ghostItem) return;
    }
    root.ghostItem = ghostItem;
    root.#pendingGhostTarget = { ghostItem, container, index, ghostRect };

    if (!ghostItem.element && !ghostItem.#frameworkManagedGhostElement) {
      return;
    }

    original.#insertInsertionGhostElement(
      original,
      container,
      ghostItem,
      index,
      ghostRect,
    );
    await original.#awaitMutation(container);

    // Core-created markers own their DOM element and are positioned/animated
    // directly; framework-managed markers get geometry solely via `ghostRect`
    // on the onGhostInsert event above.
    const ghostElement = ghostItem.element;
    if (!ghostElement || ghostItem.#frameworkManagedGhostElement) return;

    original.#updateInsertionGhostStyle(event, ghostItem);
    const lastRect = ghostElement.getBoundingClientRect();
    original.#playElementRectAnimation(
      ghostItem,
      firstRect,
      lastRect,
      ghostElement,
      original.#reorderAnimationConfig(container),
      ghostItem,
      { coordinateParent: container as unknown as ItemBase },
    );
  }

  /**
   * Create or remove a ghost element at the specified container and index.
   * A null container means the ghost element should be removed.
   *
   * TODO: Since the code is so different, the insert classes should
   * just overwrite this function.
   *
   * @param event Ghost update event containing the target container and index.
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
      container.insertGhostAt(
        original,
        container,
        ghostItem,
        index,
        pendingTarget.ghostRect,
      );
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
        item.#refreshDraggedItemPosition();
      }
    } else if (targetContainer) {
      await item.#updateGhostElement({
        original: item,
        container: targetContainer as unknown as ContainerBase,
        index: targetIndex,
        ghostRect: target.ghostRect,
      });
      if (!item.usesInsertionDropMarker) {
        item.#refreshDraggedItemPosition();
      }
    }
  }

  /**
   * Called when a drag operation starts.
   * @param prop
   * @returns
   */
  dragStart(prop: dragStartProp) {
    if (this.#locked) return;

    this.#dragCoordinateParent = null;
    this.#dragLayoutPosition = null;
    this.#dragSourcePosition = null;

    // Take a snapshot of the current state.
    // Any DOM read for this is queued into READ_1 stage.
    this.takeRootSnapshot();
    const root = this.rootContainer;

    resetDropSnapshotDebugDump(this);

    // Record the initial container and index of the item
    const { index: currentIndex, container: currentContainer } =
      this.getIndexAndContainer();
    if (!currentContainer) {
      throw new Error("Item has no parent container");
    }
    this.#dragSourcePosition = {
      container: currentContainer as unknown as ContainerBase,
      index: currentIndex,
    };

    // Compute the drag offset in READ_1, after DOM positions are read but before any WRITE_1
    // callbacks (including drag events). The engine is guaranteed to
    // execute scheduled tasks in the order they were scheduled.
    this.schedule(
      () => {
        this.#dragPointerX = prop.start.x;
        this.#dragPointerY = prop.start.y;
        this.#dragStartX = prop.start.x;
        this.#dragStartY = prop.start.y;
        this.#dragOffsetX = prop.start.x - this.worldTransform.x;
        this.#dragOffsetY = prop.start.y - this.worldTransform.y;

        currentContainer.readDom({ unapplyTransform: true });
        // Capture key data like the DOM element size.
        root.#captureDragSnapshotTree();
      },
      { stage: "READ_1", queueId: `drag-start-offset-${this.id}` },
    );

    // Schedule WRITE_1
    this.schedule(
      async () => {
        if (this.usesInsertionDropMarker) {
          if (this.element) {
            this.element.dataset.snapsortDragging = "true";
          }
          await this.updateDropTarget(this);
          return;
        }

        if (this.element) {
          this.element.dataset.snapsortDragging = "true";
        }

        // Create a ghost element in the item's current location.
        await this.#updateGhostElement({
          original: this,
          container: currentContainer,
          index: currentIndex,
        });
        // _Logically_ remove the dragged item from its container,
        // meaning the DOM element is still in the current container
        // but the container code does not recognize it anymore.
        // The ghost now takes its place in the layout.
        this.detachItemFromContainer(currentContainer, this);

        const dragSnapshot = this.dragSnapshot;
        this.style = {
          cursor: "grabbing",
          position: "absolute",
          zIndex: "1000",
          top: "0px",
          left: "0px",
          width: dragSnapshot ? `${dragSnapshot.box.width}px` : "",
          height: dragSnapshot ? `${dragSnapshot.box.height}px` : "",
        };

        // The dragged item's DOM element stays under its original DOM parent
        // for the whole drag, so we maintain a logical reference to it.
        this.#dragCoordinateParent = currentContainer;

        this.#refreshDraggedItemPosition();
        this.debugAllItems();
      },
      { stage: "WRITE_1" },
    );
  }

  /**
   * Handle drag movement updates.
   * @param prop Drag position property containing mouse coordinates.
   */
  drag(prop: dragProp) {
    this.schedule(
      async () => {
        this.#dragPointerX = prop.position.x;
        this.#dragPointerY = prop.position.y;

        await this.updateDropTarget(this);

        if (this.usesInsertionDropMarker) {
          return;
        }

        this.#writeDraggedTransform();
      },
      { stage: "WRITE_1", queueId: `drag-${this.id}` },
    );
    // Schedule read tree for READ_2
    this.rootContainer.#queueReadTree("READ_2", `drag-${this.id}`);
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
          this.#moveItemToContainer(
            pendingGhostTarget.container,
            this,
            pendingGhostTarget.index,
          );
          await this.#awaitMutation(pendingGhostTarget.container);
        }

        root.#clearDragSnapshotTree();
        this.#dragSourcePosition = null;
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
            liveGhostPos.container !== pendingGhostTarget.container ||
            liveGhostPos.index !== pendingGhostTarget.index);
        let ghostPos = usePendingGhostTarget
          ? {
              index: pendingGhostTarget.index,
              container: pendingGhostTarget.container as unknown as ItemBase,
            }
          : liveGhostPos;
        if (!ghostPos) {
          const finalTarget =
            root.#hasDragSnapshotTree() && this.#dragSnapshot
              ? this.resolveDropTarget(this, root)
              : null;
          ghostPos = finalTarget
            ? {
                index: this.#liveIndexFromSnapshotIndex(
                  finalTarget.container,
                  finalTarget.index,
                  this,
                ),
                container: finalTarget.container as unknown as ItemBase,
              }
            : this.#dragSourcePosition
              ? {
                  index: this.#dragSourcePosition.index,
                  container: this.#dragSourcePosition
                    .container as unknown as ItemBase,
                }
              : undefined;
        }
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
          delete this.element.dataset.snapsortDragging;
          this.writeDom();
          this.writeTransform();
        }
        this.#dragCoordinateParent = null;
        this.#dragLayoutPosition = null;

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
          if (this.element && destinationContainer.element) {
            const expectedBefore =
              ghostPos.index >= destinationContainer.#itemOrderedList.length - 1
                ? null
                : destinationContainer.#itemOrderedList[ghostPos.index + 1]
                    .element;
            if (
              this.element.parentElement !== destinationContainer.element ||
              this.element.nextElementSibling !== expectedBefore
            ) {
              console.warn(
                "SnapSort: the adapter did not place the dropped element where onItemInsert specified. Check the adapter's onItemInsert/awaitMutation wiring.",
                {
                  item: this,
                  container: destinationContainer,
                  index: ghostPos.index,
                },
              );
            }
          }
        }

        // this.#restoreDragPositionContext();
        root.#clearDragSnapshotTree();
        this.#dragSourcePosition = null;
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
