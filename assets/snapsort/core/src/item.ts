import { BaseObject, ElementObject, cloneDomProperty } from "@snap-engine/core";
import type { AnimationConfig, ItemContainer } from "./container";
import type {
  dragStartProp,
  dragProp,
  dragEndProp,
  DomProperty,
} from "@snap-engine/core";
import { determineDropTarget, resetDropSnapshotDebugDump } from "./drop_target";
import { AnimationObject } from "@snap-engine/core/animation";

const MIN_FLIP_DISTANCE = 0.5;
const DEBUG_LOGS = false;

function debugLog(...args: unknown[]) {
  if (DEBUG_LOGS) {
    console.debug(...args);
  }
}

interface FlipSnapshot {
  item: ItemObject;
  first: DOMRect | null;
  last: DOMRect | null;
}

export class ItemObject extends ElementObject {
  #rootContainer: ItemContainer | null = null;
  #metadata: Record<string, unknown> = {};
  #locked: boolean = false; // Locked items cannot be dragged
  noDrop: boolean = false; // Containers marked as noDrop cannot be a drop target

  #dragOffsetX: number = 0;
  #dragOffsetY: number = 0;
  #dragSnapshot: DomProperty | null = null;
  #dragSnapshotOrderedList: ItemObject[] = [];
  #dragPositionContextSnapshot: Map<HTMLElement, string> = new Map();

  #itemOrderedList: ItemObject[] = []; // Wrapper around children to maintain their order in the DOM

  #isGhost: boolean = false;
  #depth: number = 0;
  ghostItem: ItemObject | null = null; // The ghost item instance, so we can remove it later

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
    this.transformMode = "none";

    this.ghostItem = null;
  }

  addItem(item: ItemObject) {
    this.appendChild(item);
  }

  #itemID(item: ItemObject) {
    const id = item.metadata.id ?? item.metadata.itemId;
    return typeof id === "string" || typeof id === "number"
      ? String(id)
      : item.gid;
  }

  removeItem(id: string) {
    const item = this.#itemOrderedList.find((item) => this.#itemID(item) === id);
    if (!item) return;

    this.removeItemFrom(this as unknown as ItemContainer, item);
  }

  get locked(): boolean {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = value;
  }

  getIndexAndContainer(): { index: number; container: ItemObject | null } {
    if (!this.parent) {
      DEBUG_LOGS &&
        debugLog(`[getIndexAndContainer] ${this.gid} has no parent → index=-1`);
      return { index: -1, container: null };
    }
    const parentContainer = this.parent as unknown as ItemObject;
    const idx = parentContainer.#itemOrderedList.indexOf(this);
    DEBUG_LOGS &&
      debugLog(
        `[getIndexAndContainer] ${this.gid} → container=${parentContainer.gid}, index=${idx}, orderedList=[${parentContainer.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
      );
    return { index: idx, container: parentContainer };
  }

  get metadata(): Record<string, unknown> {
    return this.#metadata;
  }

  set metadata(value: Record<string, unknown>) {
    this.#metadata = value;
  }

  get container(): ItemContainer {
    if (!this.parent) {
      console.warn("ItemObject has no container set.");
      return null as any;
    }
    return this.parent as unknown as ItemContainer;
  }

  setContainer(value: ItemContainer) {
    // this.#containerObject = value;
  }

  get rootContainer(): ItemContainer | null {
    return this.#rootContainer;
  }

  setRootContainer(root: ItemContainer | null) {
    this.#rootContainer = root;
  }

  get isGhost(): boolean {
    return this.#isGhost;
  }

  get depth(): number {
    return this.#depth;
  }

  get itemOrderedList(): ItemObject[] {
    return this.#itemOrderedList;
  }

  get dragSnapshot(): DomProperty | null {
    return this.#dragSnapshot;
  }

  get dragSnapshotOrderedList(): ItemObject[] {
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

  static #colorForContainer(gid: string): string {
    let color = ItemObject.#containerColors.get(gid);
    if (!color) {
      let hash = 0;
      for (let i = 0; i < gid.length; i++) {
        hash = ((hash << 5) - hash + gid.charCodeAt(i)) | 0;
      }
      const hue = ((hash % 360) + 360) % 360;
      color = `hsl(${hue}, 80%, 55%)`;
      ItemObject.#containerColors.set(gid, color);
    }
    return color;
  }

  /**
   * Draw a debug circle at the center of every item in the hierarchy,
   * color-coded by parent container.
   */
  debugAllItems(
    node: ItemObject = (this.#rootContainer as unknown as ItemObject) ?? this,
  ) {
    const color = ItemObject.#colorForContainer(node.gid);
    for (const child of node.children) {
      if (!(child instanceof ItemObject)) continue;
      const prop = child.getDomProperty("READ_1");
      if (prop) {
        const cx = prop.x + prop.width / 2;
        const cy = prop.y + prop.height / 2;
        child.addDebugCircle(
          cx,
          cy,
          4,
          color,
          true,
          `center-read1-${child.gid}`,
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
      this.#updateState(this as unknown as ItemContainer);
      this.requestRead(false, true, "READ_1", true);
    } else {
      const parentContainer = this.parent as unknown as ItemObject;
      parentContainer.#findRootContainer();
    }
  }

  /**
   * Refresh root/depth metadata and live child ordering for this subtree.
   *
   * @param root Root container that owns the active SnapSort tree.
   * @param depth Nesting depth of this item within the root tree.
   * @returns Nothing.
   */
  #updateState(root: ItemContainer | null, depth: number = 0) {
    // Set root container and depth
    this.#rootContainer = root;
    this.#depth = depth;
    // Get the list of children in DOM order
    this.#itemOrderedList = this.childrenInDomOrder() as ItemObject[];
    // Update all its children as well.
    for (const child of this.children) {
      if (child instanceof ItemObject) {
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
    this.#dragSnapshot = cloneDomProperty(this.getDomProperty("READ_1"));
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
  #clearDragSnapshotTree(visited: Set<ItemObject> = new Set()) {
    if (visited.has(this)) return;
    visited.add(this);

    const childrenToClear = new Set([
      ...this.#dragSnapshotOrderedList,
      ...this.#itemOrderedList,
    ]);
    this.#dragSnapshot = null;
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
  #hasDragSnapshotTree(visited: Set<ItemObject> = new Set()): boolean {
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
    container: ItemContainer | null,
  ): AnimationConfig | null {
    if (!container) return null;
    const config = container.configuration;
    if (config.animation === null) return null;
    return config.animation?.reorder ?? null;
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
    node: ItemObject,
    exclude: ItemObject,
    items: ItemObject[] = [],
  ): ItemObject[] {
    for (const child of node.#itemOrderedList) {
      if (child !== exclude && !child.isGhost && child.element) {
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
  #captureFlipSnapshot(root: ItemObject, exclude: ItemObject): FlipSnapshot[] {
    return root.#collectFlipItems(root, exclude).map((item) => ({
      item,
      first: item.element!.getBoundingClientRect(),
      last: null,
    }));
  }

  /**
   * Capture the final visual positions after the DOM mutation.
   *
   * @param snapshot Items whose final positions should be measured.
   * @returns Nothing.
   */
  #captureFlipLast(snapshot: FlipSnapshot[]) {
    for (const entry of snapshot) {
      entry.last = entry.item.element?.getBoundingClientRect() ?? null;
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
   * @returns Nothing.
   */
  #playFlipAnimations(
    snapshot: FlipSnapshot[],
    animationConfig: AnimationConfig,
  ) {
    const movingAncestors = new Set<ItemObject>();
    const duration = animationConfig.duration ?? 160;
    const easing = animationConfig.timing_function ?? "ease-out";

    for (const { item, first, last } of snapshot) {
      const hasMovingAncestor =
        movingAncestors.size > 0 &&
        (() => {
          let parent = item.parent;
          while (parent) {
            if (parent instanceof ItemObject && movingAncestors.has(parent)) {
              return true;
            }
            parent = parent.parent;
          }
          return false;
        })();
      if (hasMovingAncestor || !item.element || !first || !last) continue;

      const dx = first.x - last.x;
      const dy = first.y - last.y;
      if (
        Math.abs(dx) < MIN_FLIP_DISTANCE &&
        Math.abs(dy) < MIN_FLIP_DISTANCE
      ) {
        continue;
      }

      movingAncestors.add(item);
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
            item.element!.style.transform = transformAt(vars.$t);
          },
          finish: () => {
            item.element!.style.transform = "";
          },
        },
      );
      item.element.style.transform = transformAt(0);
      item.addAnimation(animation);
      animation.play();
    }
  }

  /**
   * Run a DOM mutation with optional FLIP animation for affected items.
   *
   * @param container Container whose reorder animation config controls the mutation.
   * @param original Actively dragged item, excluded from reorder animation.
   * @param mutate DOM mutation to perform between first and last measurements.
   * @returns Nothing.
   */
  #withReorderAnimation(
    container: ItemContainer | null,
    original: ItemObject,
    mutate: () => void,
  ) {
    const animationConfig = this.#reorderAnimationConfig(container);
    const root = (this.#rootContainer as unknown as ItemObject) ?? this;

    if (!animationConfig) {
      mutate();
      return;
    }

    let snapshot: FlipSnapshot[] = [];
    const queuePrefix = `snapsort-flip-${root.gid}`;

    root.queueUpdate(
      "READ_2",
      () => {
        snapshot = this.#captureFlipSnapshot(root, original);
      },
      `${queuePrefix}-read-first`,
    );

    root.queueUpdate(
      "WRITE_2",
      () => {
        for (const { item } of snapshot) {
          item.cancelAnimations();
          item.element!.style.transform = "";
        }
        mutate();
      },
      `${queuePrefix}-mutate`,
    );

    root.queueUpdate(
      "READ_3",
      () => {
        this.#captureFlipLast(snapshot);
      },
      `${queuePrefix}-read-last`,
    );

    root.queueUpdate(
      "WRITE_3",
      () => {
        this.#playFlipAnimations(snapshot, animationConfig);
      },
      `${queuePrefix}-play`,
    );
  }

  /**
   * Temporarily move the DOM element of an item to the root container during dragging,
   * so it can be positioned absolutely within the root container without affecting the
   * layout of its original container.
   *
   * @returns Nothing.
   */
  #hoistElementToRoot() {
    // Prototype: avoid moving framework-owned DOM during drag.
    // if (this.#rootContainer) {
    //   // Move the DOM element to be a child of the root container's DOM element,
    //   // so it can be positioned absolutely within it.
    //   const element = this.element;
    //   const rootElement = this.#rootContainer.element;
    //   if (element && rootElement) {
    //     rootElement.appendChild(element);
    //   }
    // }
  }

  /**
   * Move the DOM element of an item back to its original container.
   *
   * @param container Container that should receive the dragged element.
   * @returns Nothing.
   */
  #lowerElementToContainer(container: ItemContainer) {
    // Prototype: avoid moving framework-owned DOM during drag.
    // const element = this.element;
    // const containerElement = container.element;
    // if (element && containerElement) {
    //   containerElement.appendChild(element);
    // }
  }

  #collectPositionContextItems(
    node: ItemObject,
    items: ItemObject[] = [],
  ): ItemObject[] {
    items.push(node);
    for (const child of node.#itemOrderedList) {
      this.#collectPositionContextItems(child, items);
    }
    return items;
  }

  #setTemporaryPosition(element: HTMLElement | null, position: string) {
    if (!element || this.#dragPositionContextSnapshot.has(element)) return;
    this.#dragPositionContextSnapshot.set(element, element.style.position);
    element.style.position = position;
  }

  #applyDragPositionContext() {
    const root = this.#rootContainer as unknown as ItemObject | null;
    if (!root?.element) return;

    this.#dragPositionContextSnapshot.clear();
    for (const item of this.#collectPositionContextItems(root)) {
      this.#setTemporaryPosition(
        item.element,
        item === root ? "relative" : "static",
      );
    }
  }

  #restoreDragPositionContext() {
    for (const [element, position] of this.#dragPositionContextSnapshot) {
      element.style.position = position;
    }
    this.#dragPositionContextSnapshot.clear();
  }

  /**
   * Move an item to a different container and index, updating the DOM and internal state accordingly.
   *
   * @param container Destination container.
   * @param item Item to move.
   * @param index Destination index in the destination container.
   * @returns Nothing.
   */
  moveItemToContainer(container: ItemContainer, item: ItemObject, index: number) {
    const sourceContainer = item.parent as unknown as ItemObject | null;
    const sourceIndex = sourceContainer
      ? sourceContainer.#itemOrderedList.indexOf(item)
      : -1;
    DEBUG_LOGS &&
      debugLog(
        `[moveItemToContainer] item=${item.gid} from=${sourceContainer?.gid ?? "null"}[${sourceIndex}] to=${(container as unknown as ItemObject).gid}[${index}]`,
      );
    DEBUG_LOGS &&
      debugLog(
        `[moveItemToContainer]   source orderedList=[${sourceContainer ? sourceContainer.#itemOrderedList.map((i) => i.gid).join(", ") : "N/A"}]`,
      );
    DEBUG_LOGS &&
      debugLog(
        `[moveItemToContainer]   target orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
      );
    // If the source and target container is the same, we must adjust the index
    // to account for the removal of the item from its original position.
    if (item.parent === container) {
      // If the source and target index is the same, no need to move.
      if (container.#itemOrderedList.indexOf(item) === index) {
        DEBUG_LOGS &&
          debugLog(`[moveItemToContainer]   SKIP: same container, same index`);
        return;
      }
      const currentIndex = container.#itemOrderedList.indexOf(item);
      if (currentIndex !== -1 && currentIndex < index) {
        DEBUG_LOGS &&
          debugLog(
            `[moveItemToContainer]   adjusting index: ${index} → ${index - 1} (same container, current=${currentIndex} < target=${index})`,
          );
        index -= 1;
      }
    }
    this.#detachItemFromContainer(item.container, item);
    this.insertItemAt(container, item, index);
    DEBUG_LOGS &&
      debugLog(
        `[moveItemToContainer]   DONE. target orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
      );
  }

  #attachItemToContainer(
    container: ItemContainer,
    item: ItemObject,
    index: number,
  ) {
    (container as unknown as ItemObject).appendChild(item);
    if (index >= container.#itemOrderedList.length) {
      DEBUG_LOGS &&
        debugLog(
          `[insertItemAt]   index ${index} >= len ${container.#itemOrderedList.length}, appending`,
        );
      container.#itemOrderedList.push(item);
    } else {
      DEBUG_LOGS && debugLog(`[insertItemAt]   splicing at index ${index}`);
      container.#itemOrderedList.splice(index, 0, item);
    }
  }

  #insertItemElement(container: ItemContainer, item: ItemObject, index: number) {
    const itemAfterIndex =
      index >= container.#itemOrderedList.length - 1
        ? null
        : container.#itemOrderedList[index + 1].element;
    DEBUG_LOGS &&
      debugLog(
        `[insertItemAt]   DOM insertBefore: item.element=${item.element?.id ?? "null"}, before=${itemAfterIndex ? (itemAfterIndex as any).element?.id ?? itemAfterIndex.gid : "null (append)"}`,
      );

    const onDomInsert = item.isGhost ? null : container.callbacks?.onDomInsert;
    if (onDomInsert) {
      onDomInsert({
        item,
        itemMetadata: item.metadata,
        container,
        containerMetadata: container.metadata,
        index,
        beforeElement: itemAfterIndex,
      });
      return;
    }

    container.element?.insertBefore(item.element!, itemAfterIndex);
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
  insertItemAt(container: ItemContainer, item: ItemObject, index: number) {
    DEBUG_LOGS &&
      debugLog(
        `[insertItemAt] item=${item.gid} into container=${(container as unknown as ItemObject).gid} at index=${index}`,
      );
    DEBUG_LOGS &&
      debugLog(
        `[insertItemAt]   BEFORE orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}] (len=${container.#itemOrderedList.length})`,
      );
    this.#attachItemToContainer(container, item, index);
    DEBUG_LOGS &&
      debugLog(
        `[insertItemAt]   AFTER orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
      );
    this.#insertItemElement(container, item, index);
  }

  #detachItemFromContainer(container: ItemContainer, item: ItemObject) {
    container.removeChild(item);
    container.#itemOrderedList = container.#itemOrderedList.filter(
      (i) => i !== item,
    );
  }

  #removeItemElement(container: ItemContainer, item: ItemObject) {
    const onDomRemove = item.isGhost ? null : container.callbacks?.onDomRemove;
    if (onDomRemove) {
      onDomRemove({
        item,
        itemMetadata: item.metadata,
        container,
        containerMetadata: container.metadata,
      });
      return;
    }

    item.element?.remove();
  }

  /**
   * Remove an item from the item list and DOM.
   *
   * @param container Container that currently owns the item.
   * @param item The item to remove.
   * @returns Nothing.
   */
  removeItemFrom(container: ItemContainer, item: ItemObject) {
    DEBUG_LOGS &&
      debugLog(
        `[removeItemFrom] item=${item.gid} from container=${(container as unknown as ItemObject).gid}`,
      );
    DEBUG_LOGS &&
      debugLog(
        `[removeItemFrom]   BEFORE orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
      );
    this.#detachItemFromContainer(container, item);
    DEBUG_LOGS &&
      debugLog(
        `[removeItemFrom]   AFTER orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
      );
    this.#removeItemElement(container, item);
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
    container: ItemObject,
    snapshotIndex: number,
    draggedItem: ItemObject,
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
    ghostItem: ItemObject | null,
  ): { index: number; container: ItemObject | null } | null {
    if (!ghostItem?.parent) return null;

    const container = ghostItem.parent as ItemObject;
    const index = container.#itemOrderedList.indexOf(ghostItem);
    if (index === -1) return null;

    return { container, index };
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
  #updateGhostElement(
    original: ItemObject,
    container: ItemContainer | null,
    index: number,
  ) {
    let ghostItem = this.#rootContainer?.ghostItem;
    DEBUG_LOGS &&
      debugLog(
        `[updateGhostElement] original=${original.gid} container=${container ? (container as unknown as ItemObject).gid : "null"} index=${index} existingGhost=${ghostItem ? ghostItem.gid : "none"}`,
      );

    if (container === null) {
      if (ghostItem) {
        DEBUG_LOGS &&
          debugLog(
            `[updateGhostElement] removing ghost ${ghostItem.gid} from ${(ghostItem.container as unknown as ItemObject)?.gid}`,
          );
        // Remove the ghost item and element from the root container.
        this.removeItemFrom(ghostItem.container, ghostItem);
        ghostItem.destroy();
        this.#rootContainer!.ghostItem = null;
      }
      return;
    }
    // If ghost element already exists, use that instead of creating a new one.
    // Otherwise, create a new ghost element
    if (!ghostItem) {
      DEBUG_LOGS && debugLog(`[updateGhostElement] creating new ghost element`);

      const ghostElement = document.createElement("div");
      ghostElement.id = "spacer";

      const origProp =
        original.dragSnapshot ?? original.getDomProperty("READ_1");
      ghostElement.style.width = origProp.width + "px";
      ghostElement.style.height = origProp.height + "px";
      ghostElement.style.margin = `${origProp.margin.top}px ${origProp.margin.right}px ${origProp.margin.bottom}px ${origProp.margin.left}px`;
      // ghostElement.style.padding = "" + original.getDomProperty("READ_1").padding;
      ghostElement.style.boxSizing = "border-box";
      ghostElement.classList.add("ghost");

      ghostItem = new ItemObject(this.engine, null, true);
      ghostItem.element = ghostElement;
    }

    const moveGhost = () => {
      // Remove ghost from its current container before re-inserting at the new position
      if (ghostItem.parent) {
        DEBUG_LOGS &&
          debugLog(
            `[updateGhostElement] removing ghost from current container=${(ghostItem.container as unknown as ItemObject)?.gid}`,
          );
        this.#detachItemFromContainer(ghostItem.container, ghostItem);
      } else {
        DEBUG_LOGS &&
          debugLog(`[updateGhostElement] ghost has no parent, skipping remove`);
      }
      // Insert the ghost item at the new position in the DOM and item list.
      // This also sets the ghost item's container to the new container.
      DEBUG_LOGS &&
        debugLog(
          `[updateGhostElement] inserting ghost at container=${(container as unknown as ItemObject).gid} index=${index}`,
        );
      this.insertItemAt(container, ghostItem, index);
    };

    if (ghostItem.parent) {
      this.#withReorderAnimation(container, original, moveGhost);
    } else {
      moveGhost();
    }

    // Root is responsible for maintaining the ghost element and removing it when necessary
    this.#rootContainer!.ghostItem = ghostItem;

    // let item =
    //   itemIndex > this.#itemList.length - 1 ? null : this.#itemList[itemIndex];

    // if (!this.element) {
    //   return;
    // }
    // this.element.insertBefore(tmpDomElement, item ? item.element : null);
    // this.#ghostDomElement = tmpDomElement;
    // this.#spacerIndex = itemIndex;
    // this.reorderItemList();
  }

  /**
   * Compute the current drop target and move the ghost when the target changes.
   *
   * @param item Item currently being dragged.
   * @returns Nothing.
   */
  updateDropTarget(item: ItemObject) {
    const root = (this.#rootContainer as unknown as ItemObject) ?? this;
    // Defensive guard for a drag-start/drag race: the deeper fix should live in
    // the engine scheduler as built-in debounce/coalescing support for input
    // updates that depend on earlier READ/WRITE phases.
    if (!root.#hasDragSnapshotTree() || !item.#dragSnapshot) {
      DEBUG_LOGS &&
        debugLog(
          `[updateDropTarget] SKIP: waiting for drag snapshot root=${root.gid} item=${item.gid}`,
        );
      return;
    }

    const target = determineDropTarget(item, root);
    // Compare against the ghost's current position, not the dragged item's (which is removed from the list during drag)
    // In other words, check what the previous drop target was based on where the ghost is.
    const ghostItem = this.#rootContainer?.ghostItem;
    const ghostSource = this.#ghostInsertionPosition(ghostItem ?? null);
    const targetIndex =
      target?.container != null
        ? this.#liveIndexFromSnapshotIndex(target.container, target.index, item)
        : -1;
    DEBUG_LOGS &&
      debugLog(
        `[updateDropTarget] item=${item.gid} target=${target ? `${target.container.gid}[snapshot:${target.index} live:${targetIndex}]` : "null"} ghostPos=${ghostSource?.container ? `${(ghostSource.container as unknown as ItemObject).gid}[${ghostSource.index}]` : "null"}`,
      );
    if (target?.container && ghostSource?.container) {
      const sameContainer = target.container === ghostSource.container;
      const sameIndex = targetIndex === ghostSource.index;
      DEBUG_LOGS &&
        debugLog(
          `[updateDropTarget]   sameContainer=${sameContainer} sameIndex=${sameIndex} (${targetIndex}===${ghostSource.index})`,
        );
      if (!sameContainer || !sameIndex) {
        DEBUG_LOGS &&
          debugLog(
            `[updateDropTarget]   >>> MOVING ghost to ${target.container.gid}[${targetIndex}]`,
          );
        this.#updateGhostElement(
          item,
          target.container as unknown as ItemContainer,
          targetIndex,
        );
      } else {
        DEBUG_LOGS &&
          debugLog(`[updateDropTarget]   SKIP: ghost already at target`);
      }
    } else if (target?.container) {
      DEBUG_LOGS && debugLog(`[updateDropTarget]   >>> PLACING initial ghost`);
      this.#updateGhostElement(
        item,
        target.container as unknown as ItemContainer,
        targetIndex,
      );
    } else {
      DEBUG_LOGS && debugLog(`[updateDropTarget]   SKIP: no target`);
    }
  }

  dragStart(prop: dragStartProp) {
    if (this.#locked) return;
    DEBUG_LOGS && debugLog(`[dragStart] item=${this.gid}`);
    // Set the root container for all items, and queue READ to update the state of all containers and items.
    this.#findRootContainer();
    const root = (this.#rootContainer as unknown as ItemObject) ?? this;
    resetDropSnapshotDebugDump(this);
    // Get the current index of the item in its container.
    const { index: currentIndex, container: currentContainer } =
      this.getIndexAndContainer();
    DEBUG_LOGS &&
      debugLog(
        `[dragStart] currentIndex=${currentIndex} currentContainer=${currentContainer?.gid ?? "null"}`,
      );
    // Compute the drag offset in READ_1, after DOM positions are read but before any WRITE_1
    // callbacks (including drag events). This prevents race conditions where drag events
    // modify this.transform before the offset is calculated.
    this.queueUpdate(
      "READ_1",
      () => {
        this.#dragOffsetX = prop.start.x - this.transform.x;
        this.#dragOffsetY = prop.start.y - this.transform.y;
        DEBUG_LOGS &&
          debugLog(
            `[dragStart READ_1] offset=(${this.#dragOffsetX}, ${this.#dragOffsetY}) start=(${prop.start.x}, ${prop.start.y}) transform=(${this.transform.x}, ${this.transform.y})`,
          );
        root.#captureDragSnapshotTree();
      },
      `drag-start-offset-${this.gid}`,
    );

    this.queueUpdate("WRITE_1", () => {
      DEBUG_LOGS &&
        debugLog(
          `[dragStart WRITE_1 callback] placing ghost at container=${currentContainer?.gid ?? "null"} index=${currentIndex}`,
        );

      this.#updateGhostElement(
        this,
        currentContainer as unknown as ItemContainer,
        currentIndex,
      );
      // Remove the dragged item from its container's orderedList and engine children.
      // The ghost now takes its place in the layout. The DOM element is kept (hoisted to root below).
      this.#detachItemFromContainer(
        currentContainer as unknown as ItemContainer,
        this,
      );
      DEBUG_LOGS &&
        debugLog(
          `[dragStart] after removing dragged item, orderedList=[${(currentContainer as unknown as ItemObject).#itemOrderedList.map((i) => i.gid).join(", ")}]`,
        );

      const rootSnapshot = root.dragSnapshot;
      const hoistOffsetX = rootSnapshot
        ? -(rootSnapshot.border.left + rootSnapshot.padding.left)
        : 0;
      const hoistOffsetY = rootSnapshot
        ? -(rootSnapshot.border.top + rootSnapshot.padding.top)
        : 0;
      this.style = {
        cursor: "grabbing",
        position: "absolute",
        zIndex: "1000",
        top: `${hoistOffsetY}px`,
        left: `${hoistOffsetX}px`,
      };
      this.#applyDragPositionContext();
      // this.#hoistElementToRoot();
      this.transformMode = "origin";
      this.transformOrigin = this.#rootContainer;
      this.transform.x = prop.start.x - this.#dragOffsetX;
      this.transform.y = prop.start.y - this.#dragOffsetY;
      this.writeDom();
      this.writeTransform();
      this.debugAllItems();
    });
  }

  drag(prop: dragProp) {
    this.queueUpdate(
      "WRITE_1",
      () => {
        // Move the item according to mouse position
        this.transform.x = prop.position.x - this.#dragOffsetX;
        this.transform.y = prop.position.y - this.#dragOffsetY;
        this.writeTransform();

        this.updateDropTarget(this);
      },
      `drag-${this.gid}`,
    );
    // Re-read positions of all items
    this.#rootContainer?.requestRead(
      false,
      true,
      "READ_2",
      true,
      `drag-${this.gid}`,
    );
  }

  dragEnd(_: dragEndProp) {
    const root = (this.#rootContainer as unknown as ItemObject) ?? this;
    this.requestWrite(true, () => {
      // Get ghost's current position — this is where the item should land
      const ghostItem = this.#rootContainer?.ghostItem;
      const ghostPos = ghostItem?.getIndexAndContainer();
      DEBUG_LOGS &&
        debugLog(
          `[dragEnd] item=${this.gid} ghostPos=${ghostPos?.container ? `${(ghostPos.container as unknown as ItemObject).gid}[${ghostPos.index}]` : "null"}`,
        );

      // Remove the ghost first
      this.#updateGhostElement(this, null, -1);

      // Re-insert the dragged item at the ghost's former position
      if (ghostPos?.container) {
        const destinationContainer =
          ghostPos.container as unknown as ItemContainer;
        this.insertItemAt(destinationContainer, this, ghostPos.index);
        DEBUG_LOGS &&
          debugLog(
            `[dragEnd] re-inserted item at ${(ghostPos.container as unknown as ItemObject).gid}[${ghostPos.index}]`,
          );
      }

      this.style = {
        cursor: "grab",
        position: "relative",
        zIndex: "",
        top: "",
        left: "",
      };
      this.transformMode = "none";
      this.transformOrigin = null;
      this.writeDom();
      this.writeTransform();
      this.#restoreDragPositionContext();
      root.#clearDragSnapshotTree();
      resetDropSnapshotDebugDump(this);
    });
  }

  destroy() {
    if (this.parent) {
      this.#detachItemFromContainer(
        this.parent as unknown as ItemContainer,
        this,
      );
    }
    super.destroy();
  }
}
