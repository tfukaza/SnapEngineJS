import { BaseObject, ElementObject, cloneDomProperty } from "@snap-engine/core";
import type { ItemContainer } from "./container";
import { RectCollider, PointCollider } from "@snap-engine/core/collision";
import type {
  dragStartProp,
  dragProp,
  dragEndProp,
  DomProperty,
} from "@snap-engine/core";
import { determineDropTarget, resetDropSnapshotDebugDump } from "./drop_target";

/**
 * How much to enlarge an item's hitbox while it is being dragged. The hitbox
 * grows around the item's center, so a factor of 1 leaves it unchanged.
 */
const DRAG_HITBOX_SCALE = 4;

export class ItemObject extends ElementObject {
  // Container element is the parent element
  // #containerObject: ItemContainer | null = null;
  #rootContainer: ItemContainer | null = null;
  // #metadata: Record<string, unknown> = {};
  #locked: boolean = false; // Locked items cannot be dragged
  noDrop: boolean = false; // Containers marked as noDrop cannot be a drop target
  #hitbox: RectCollider;
  #centerPoint: PointCollider;

  #dragOffsetX: number = 0;
  #dragOffsetY: number = 0;
  #dragSnapshot: DomProperty | null = null;
  #dragSnapshotOrderedList: ItemObject[] = [];

  #itemOrderedList: ItemObject[] = []; // Wrapper around children to maintain their order in the DOM

  #isGhost: boolean = false;
  #isDragging: boolean = false;
  #depth: number = 0;
  ghostItem: ItemObject | null = null; // The ghost item instance, so we can remove it later
  // #groupId: Array<string> | string | null = null;

  //

  constructor(
    engine: any,
    parent: BaseObject | null,
    // groupId: Array<string> | string | null = null,
    isGhost: boolean = false,
  ) {
    super(engine, parent);
    // this.#groupId = groupId;
    this.#isGhost = isGhost;
    this.event.input.dragStart = this.dragStart;
    this.event.input.drag = this.drag;
    this.event.input.dragEnd = this.dragEnd;
    this.transformMode = "none";
    this.#hitbox = new RectCollider(engine, this, 0, 0, 0, 0);
    this.addCollider(this.#hitbox);
    this.#centerPoint = new PointCollider(engine, this, 0, 0);
    this.addCollider(this.#centerPoint);

    this.ghostItem = null;

    this.event.dom.onAfterReadDom = (stage) => {
      const prop = this.getDomProperty(stage);
      const factor = this.#isDragging ? DRAG_HITBOX_SCALE : 1;
      this.#hitbox.local.width = prop.width * factor;
      this.#hitbox.local.height = prop.height * factor;
      this.#hitbox.local.x = (prop.width - this.#hitbox.local.width) / 2;
      this.#hitbox.local.y = (prop.height - this.#hitbox.local.height) / 2;
      this.#centerPoint.local.x = prop.width / 2;
      this.#centerPoint.local.y = prop.height / 2;
    };
  }

  addItem(item: ItemObject) {
    this.appendChild(item);
  }

  get locked(): boolean {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = value;
  }

  getIndexAndContainer(): { index: number; container: ItemObject | null } {
    if (!this.parent) {
      console.debug(
        `[getIndexAndContainer] ${this.gid} has no parent → index=-1`,
      );
      return { index: -1, container: null };
    }
    const parentContainer = this.parent as unknown as ItemObject;
    const idx = parentContainer.#itemOrderedList.indexOf(this);
    console.debug(
      `[getIndexAndContainer] ${this.gid} → container=${parentContainer.gid}, index=${idx}, orderedList=[${parentContainer.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
    );
    return { index: idx, container: parentContainer };
  }

  // get metadata(): Record<string, unknown> {
  //   return this.#metadata;
  // }

  // set metadata(value: Record<string, unknown>) {
  //   this.#metadata = value;
  // }

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

  get hitbox(): RectCollider {
    return this.#hitbox;
  }

  get centerPoint(): PointCollider {
    return this.#centerPoint;
  }

  /**
   * Return this item's children sorted by their DOM order.
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

  #findRootContainer() {
    if (this.parent == null) {
      this.#updateState(this as unknown as ItemContainer);
      this.requestRead(false, true, "READ_1", true);
    } else {
      const parentContainer = this.parent as unknown as ItemObject;
      parentContainer.#findRootContainer();
    }
  }

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

  #captureDragSnapshotTree() {
    this.#dragSnapshot = cloneDomProperty(this.getDomProperty("READ_1"));
    this.#dragSnapshotOrderedList = this.#itemOrderedList.slice();
    for (const child of this.#dragSnapshotOrderedList) {
      child.#captureDragSnapshotTree();
    }
  }

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
   * Temporarily move the DOM element of an item to the root container during dragging,
   * so it can be positioned absolutely within the root container without affecting the
   * layout of its original container.
   */
  #hoistElementToRoot() {
    if (this.#rootContainer) {
      // Move the DOM element to be a child of the root container's DOM element,
      // so it can be positioned absolutely within it.
      const element = this.element;
      const rootElement = this.#rootContainer.element;
      if (element && rootElement) {
        rootElement.appendChild(element);
      }
    }
  }

  /**
   * Move the DOM element of an item back to its original container.
   * @param container
   * @returns
   */
  #lowerElementToContainer(container: ItemContainer) {
    const element = this.element;
    const containerElement = container.element;
    if (element && containerElement) {
      containerElement.appendChild(element);
    }
  }

  /**
   * Move an item to a different container and index, updating the DOM and internal state accordingly.
   * @param container
   * @param item
   * @param index
   * @param updateDom Whether to update the DOM structure. This should be false if the DOM is already in the correct structure (e.g. during drag), to avoid unnecessary DOM operations.
   * @returns
   */
  moveItemToContainer(
    container: ItemContainer,
    item: ItemObject,
    index: number,
    updateDom: boolean = true,
  ) {
    const sourceContainer = item.parent as unknown as ItemObject | null;
    const sourceIndex = sourceContainer
      ? sourceContainer.#itemOrderedList.indexOf(item)
      : -1;
    console.debug(
      `[moveItemToContainer] item=${item.gid} from=${sourceContainer?.gid ?? "null"}[${sourceIndex}] to=${(container as unknown as ItemObject).gid}[${index}] updateDom=${updateDom}`,
    );
    console.debug(
      `[moveItemToContainer]   source orderedList=[${sourceContainer ? sourceContainer.#itemOrderedList.map((i) => i.gid).join(", ") : "N/A"}]`,
    );
    console.debug(
      `[moveItemToContainer]   target orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
    );
    // If the source and target container is the same, we must adjust the index
    // to account for the removal of the item from its original position.
    if (item.parent === container) {
      // If the source and target index is the same, no need to move.
      if (container.#itemOrderedList.indexOf(item) === index) {
        console.debug(
          `[moveItemToContainer]   SKIP: same container, same index`,
        );
        return;
      }
      const currentIndex = container.#itemOrderedList.indexOf(item);
      if (currentIndex !== -1 && currentIndex < index) {
        console.debug(
          `[moveItemToContainer]   adjusting index: ${index} → ${index - 1} (same container, current=${currentIndex} < target=${index})`,
        );
        index -= 1;
      }
    }
    // Remove the item from its current container.
    // deleteElement should be false because we will re-insert the same element into the new container,
    // so we don't want to remove it from the DOM.
    this.removeItemFrom(item.container, item, false);
    this.insertItemAt(container, item, index);
    console.debug(
      `[moveItemToContainer]   DONE. target orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
    );
  }

  /**
   * Insert an item at a specific index in the item list and DOM.
   * If the index is past the end, the item is appended.
   * Note that this assumes the #itemOrderedList is already in the correct order.
   */
  insertItemAt(container: ItemContainer, item: ItemObject, index: number) {
    console.debug(
      `[insertItemAt] item=${item.gid} into container=${(container as unknown as ItemObject).gid} at index=${index}`,
    );
    console.debug(
      `[insertItemAt]   BEFORE orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}] (len=${container.#itemOrderedList.length})`,
    );
    (container as unknown as ItemObject).appendChild(item);
    if (index >= container.#itemOrderedList.length) {
      console.debug(
        `[insertItemAt]   index ${index} >= len ${container.#itemOrderedList.length}, appending`,
      );
      container.#itemOrderedList.push(item);
    } else {
      console.debug(`[insertItemAt]   splicing at index ${index}`);
      container.#itemOrderedList.splice(index, 0, item);
    }
    const itemAfterIndex =
      index >= container.#itemOrderedList.length - 1
        ? null
        : container.#itemOrderedList[index + 1].element;
    console.debug(
      `[insertItemAt]   AFTER orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
    );
    console.debug(
      `[insertItemAt]   DOM insertBefore: item.element=${item.element?.id ?? "null"}, before=${itemAfterIndex ? (itemAfterIndex as any).element?.id ?? itemAfterIndex.gid : "null (append)"}`,
    );
    container.element?.insertBefore(item.element!, itemAfterIndex);
  }

  /**
   * Remove an item from the item list and DOM.
   * @param item The item to remove.
   * @param deleteElement Whether to delete the DOM element of the item.
   */
  removeItemFrom(
    container: ItemContainer,
    item: ItemObject,
    deleteElement: boolean = true,
  ) {
    console.debug(
      `[removeItemFrom] item=${item.gid} from container=${(container as unknown as ItemObject).gid} deleteElement=${deleteElement}`,
    );
    console.debug(
      `[removeItemFrom]   BEFORE orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
    );
    container.removeChild(item);
    container.#itemOrderedList = container.#itemOrderedList.filter(
      (i) => i !== item,
    );
    console.debug(
      `[removeItemFrom]   AFTER orderedList=[${container.#itemOrderedList.map((i) => i.gid).join(", ")}]`,
    );
    if (deleteElement) {
      item.element?.remove();
    }
  }

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
   * @param original The original item being dragged.
   * @param container The container to place the ghost element in, or null to remove it.
   * @param index The index at which to place the ghost element.
   */
  #updateGhostElement(
    original: ItemObject,
    container: ItemContainer | null,
    index: number,
  ) {
    let ghostItem = this.#rootContainer?.ghostItem;
    console.debug(
      `[updateGhostElement] original=${original.gid} container=${container ? (container as unknown as ItemObject).gid : "null"} index=${index} existingGhost=${ghostItem ? ghostItem.gid : "none"}`,
    );

    if (container === null) {
      if (ghostItem) {
        console.debug(
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
      console.debug(`[updateGhostElement] creating new ghost element`);

      const ghostElement = document.createElement("div");
      ghostElement.id = "spacer";

      const origProp = original.dragSnapshot ?? original.getDomProperty("READ_1");
      ghostElement.style.width = origProp.width + "px";
      ghostElement.style.height = origProp.height + "px";
      ghostElement.style.margin = `${origProp.margin.top}px ${origProp.margin.right}px ${origProp.margin.bottom}px ${origProp.margin.left}px`;
      // ghostElement.style.padding = "" + original.getDomProperty("READ_1").padding;
      ghostElement.style.boxSizing = "border-box";
      ghostElement.classList.add("ghost");

      ghostItem = new ItemObject(this.engine, null, true);
      ghostItem.element = ghostElement;

      // Set hitbox so the collision engine can detect overlaps with the ghost
      ghostItem.hitbox.local.width = origProp.width;
      ghostItem.hitbox.local.height = origProp.height;
      ghostItem.centerPoint.local.x = origProp.width / 2;
      ghostItem.centerPoint.local.y = origProp.height / 2;
    }

    // Remove ghost from its current container before re-inserting at the new position
    if (ghostItem.parent) {
      console.debug(
        `[updateGhostElement] removing ghost from current container=${(ghostItem.container as unknown as ItemObject)?.gid}`,
      );
      this.removeItemFrom(ghostItem.container, ghostItem, false);
    } else {
      console.debug(
        `[updateGhostElement] ghost has no parent, skipping remove`,
      );
    }
    // Insert the ghost item at the new position in the DOM and item list.
    // This also sets the ghost item's container to the new container.
    console.debug(
      `[updateGhostElement] inserting ghost at container=${(container as unknown as ItemObject).gid} index=${index}`,
    );
    this.insertItemAt(container, ghostItem, index);
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

  updateDropTarget(item: ItemObject) {
    const root = (this.#rootContainer as unknown as ItemObject) ?? this;
    const target = determineDropTarget(item, root);
    // Compare against the ghost's current position, not the dragged item's (which is removed from the list during drag)
    // In other words, check what the previous drop target was based on where the ghost is.
    const ghostItem = this.#rootContainer?.ghostItem;
    const ghostSource = this.#ghostInsertionPosition(ghostItem ?? null);
    const targetIndex =
      target?.container != null
        ? this.#liveIndexFromSnapshotIndex(
            target.container,
            target.index,
            item,
          )
        : -1;
    console.debug(
      `[updateDropTarget] item=${item.gid} target=${target ? `${target.container.gid}[snapshot:${target.index} live:${targetIndex}]` : "null"} ghostPos=${ghostSource?.container ? `${(ghostSource.container as unknown as ItemObject).gid}[${ghostSource.index}]` : "null"}`,
    );
    if (target?.container && ghostSource?.container) {
      const sameContainer = target.container === ghostSource.container;
      const sameIndex = targetIndex === ghostSource.index;
      console.debug(
        `[updateDropTarget]   sameContainer=${sameContainer} sameIndex=${sameIndex} (${targetIndex}===${ghostSource.index})`,
      );
      if (!sameContainer || !sameIndex) {
        console.debug(
          `[updateDropTarget]   >>> MOVING ghost to ${target.container.gid}[${targetIndex}]`,
        );
        this.#updateGhostElement(
          item,
          target.container as unknown as ItemContainer,
          targetIndex,
        );
      } else {
        console.debug(`[updateDropTarget]   SKIP: ghost already at target`);
      }
    } else if (target?.container) {
      console.debug(`[updateDropTarget]   >>> PLACING initial ghost`);
      this.#updateGhostElement(
        item,
        target.container as unknown as ItemContainer,
        targetIndex,
      );
    } else {
      console.debug(`[updateDropTarget]   SKIP: no target`);
    }
  }

  dragStart(prop: dragStartProp) {
    if (this.#locked) return;
    console.debug(`[dragStart] item=${this.gid}`);
    // Set the root container for all items, and queue READ to update the state of all containers and items.
    this.#findRootContainer();
    const root = (this.#rootContainer as unknown as ItemObject) ?? this;
    resetDropSnapshotDebugDump(this);
    // Get the current index of the item in its container.
    const { index: currentIndex, container: currentContainer } =
      this.getIndexAndContainer();
    console.debug(
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
        console.debug(
          `[dragStart READ_1] offset=(${this.#dragOffsetX}, ${this.#dragOffsetY}) start=(${prop.start.x}, ${prop.start.y}) transform=(${this.transform.x}, ${this.transform.y})`,
        );
        root.#captureDragSnapshotTree();
      },
      `drag-start-offset-${this.gid}`,
    );

    this.queueUpdate("WRITE_1", () => {
      console.debug(
        `[dragStart WRITE_1 callback] placing ghost at container=${currentContainer?.gid ?? "null"} index=${currentIndex}`,
      );

      this.#updateGhostElement(
        this,
        currentContainer as unknown as ItemContainer,
        currentIndex,
      );
      // Remove the dragged item from its container's orderedList and engine children.
      // The ghost now takes its place in the layout. The DOM element is kept (hoisted to root below).
      this.removeItemFrom(
        currentContainer as unknown as ItemContainer,
        this,
        false,
      );
      console.debug(
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
      this.#hoistElementToRoot();
      this.transformMode = "origin";
      this.transformOrigin = this.#rootContainer;
      this.transform.x = prop.start.x - this.#dragOffsetX;
      this.transform.y = prop.start.y - this.#dragOffsetY;
      // Scale hitbox around the item's center for the duration of the drag.
      this.#isDragging = true;
      const dragProp = this.getDomProperty("READ_1");
      this.#hitbox.local.width = dragProp.width * DRAG_HITBOX_SCALE;
      this.#hitbox.local.height = dragProp.height * DRAG_HITBOX_SCALE;
      this.#hitbox.local.x = (dragProp.width - this.#hitbox.local.width) / 2;
      this.#hitbox.local.y = (dragProp.height - this.#hitbox.local.height) / 2;
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
      console.debug(
        `[dragEnd] item=${this.gid} ghostPos=${ghostPos?.container ? `${(ghostPos.container as unknown as ItemObject).gid}[${ghostPos.index}]` : "null"}`,
      );

      // Remove the ghost first
      this.#updateGhostElement(this, null, -1);

      // Re-insert the dragged item at the ghost's former position
      if (ghostPos?.container) {
        this.insertItemAt(
          ghostPos.container as unknown as ItemContainer,
          this,
          ghostPos.index,
        );
        console.debug(
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
      // Restore hitbox to natural size now that the drag is over.
      this.#isDragging = false;
      const endProp = this.getDomProperty("READ_1");
      this.#hitbox.local.width = endProp.width;
      this.#hitbox.local.height = endProp.height;
      this.#hitbox.local.x = 0;
      this.#hitbox.local.y = 0;
      this.writeDom();
      this.writeTransform();
      root.#clearDragSnapshotTree();
      resetDropSnapshotDebugDump(this);
    });
  }

  destroy() {
    // if (this.#containerObject) {
    //   this.#containerObject.removeItem(this);
    // }
    super.destroy();
  }
}
