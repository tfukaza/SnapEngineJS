import { BaseObject, ElementObject } from "@snap-engine/core";
import { ItemContainer, ClickAction } from "./container";
import { AnimationObject } from "@snap-engine/core/animation";
import type {
  dragStartProp,
  dragProp,
  dragEndProp,
} from "@snap-engine/core";
import { mouseButtonBitmap } from "@snap-engine/core";

const BUFFER = 20;

export class ItemObject extends ElementObject {
  #containerObject: ItemContainer | null;
  #indexInList: number = 0;
  #mouseOffsetX: number = 0;
  #mouseOffsetY: number = 0;
  #dropIndex: number | null = 0;
  #rowDropIndex: number = 0;
  #rowIndex: number = 0;
  #currentRow: number = 0;
  #onClickAction: ClickAction | null = null;
  #metadata: Record<string, unknown> = {};

  #prevContainer: ItemContainer | null = null;
  #pendingDrop: boolean = false;
  #pendingDropEntries: ReturnType<typeof this.queueUpdate>[] = [];

  constructor(engine: any, parent: BaseObject | null) {
    super(engine, parent);
    this.event.input.dragStart = this.cursorDown;
    this.event.input.drag = this.cursorMove;
    this.event.input.dragEnd = this.cursorUp;
    this.transformMode = "none";
    this.#containerObject = null;
    this.#prevContainer = null;
    this.#metadata = {};
  }

  get metadata(): Record<string, unknown> {
    return this.#metadata;
  }

  set metadata(value: Record<string, unknown>) {
    this.#metadata = value;
  }

  get onClickAction() {
    return this.#onClickAction;
  }

  set onClickAction(value: ClickAction | null) {
    this.#onClickAction = value;
  }

  get container(): ItemContainer {
    if (!this.#containerObject) {
      throw new Error("ItemObject has no container set.");
    }
    return this.#containerObject;
  }

  setContainer(value: ItemContainer) {
    this.#containerObject = value;
  }

  set container(value: ItemContainer) {
    this.#containerObject = value;
  }

  get orderedItemList() {
    return this.container.itemList ?? [];
  }

  get rowIndex() {
    return this.#rowIndex;
  }

  set rowIndex(value: number) {
    this.#rowIndex = value;
  }

  get dropIndex() {
    return this.#dropIndex;
  }

  set dropIndex(value: number | null) {
    this.#dropIndex = value;
  }

  get rowDropIndex() {
    return this.#rowDropIndex;
  }

  set rowDropIndex(value: number) {
    this.#rowDropIndex = value;
  }

  get indexInList() {
    return this.#indexInList;
  }

  set indexInList(value: number) {
    this.#indexInList = value;
  }

  debug_all_items() {
    for (const item of this.container.itemList ?? []) {
      const prop1 = item.getDomProperty("READ_1");
      const cx = prop1.x + prop1.width / 2;
      const cy = prop1.y + prop1.height / 2;
      item.addDebugCircle(cx, cy, 4, "rgba(255, 165, 0, 0.6)", true, `center-read1-${item.gid}`);
    }
  }

  get isColumn() {
    return this.container.direction === "column";
  }

  // ---------------------------------------------------------------------------
  // Shared helpers for drag lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Reset an item to its idle (non-dragging) visual state.
   */
  #applyIdleStyle() {
    this.element!.style.position = "relative";
    this.transformMode = "none";
    this.style = {
      cursor: "grab",
      position: "relative",
      zIndex: "0",
      top: "",
      left: "",
      width: "",
      height: "",
    };
  }

  /**
   * Initialize drag state for this item. Must be called inside a WRITE_1
   * callback after captureState has run in READ_1.
   */
  #beginDrag(prop: dragStartProp) {
    let property = this.getDomProperty("READ_1");
    this.#mouseOffsetX = prop.start.screenX - (property.screenX ?? 0);
    this.#mouseOffsetY = prop.start.screenY - (property.screenY ?? 0);
    this.worldPosition = [
      prop.start.x - this.#mouseOffsetX,
      prop.start.y - this.#mouseOffsetY,
    ];
    this.style = {
      cursor: "grabbing",
      position: "absolute",
      zIndex: "1000",
      top: "0px",
      left: "0px",
    };
    this.transformMode = "origin";
    this.transformOrigin = this.container as unknown as BaseObject; // TODO: Take padding into account

    this.writeDom();
    this.writeTransform();

    // Remove the item from the container's item list
    this.#indexInList = this.orderedItemList.indexOf(this) ?? 0;
    if (this.container) {
      this.container.dragItem = this;
      this.container.removeItem(this);
      this.container.updateItemIndexes();
    }

    // Determine the initial drop index
    this.#currentRow = this.#rowIndex;
    let { rowList, closestRow, rowBoundaries, overshoot } = this.container.getClosestRow(
      this.isColumn
        ? this.transform.x + property.width / 2
        : this.transform.y + property.height / 2,
    );
    if (rowList.length == 0) {
      this.#currentRow = 0;
      this.#dropIndex = 0;
      this.#rowDropIndex = 0;
    } else {
      this.#dropIndex = this.#indexInList;
      this.#rowDropIndex =
        this.#dropIndex - rowBoundaries[closestRow.index].cumulativeLength;
      this.#currentRow = closestRow.index;
    }
    this.container.lastClosestRowIndex = this.#currentRow;
  }

  /**
   * Place an item back into the container at the given drop index.
   * Resets its style, re-inserts it into the item list and DOM, and removes
   * the ghost element. Must be called inside a WRITE callback.
   */
  #dropItemAtIndex(item: ItemObject, dropIndex: number | null) {
    item.#applyIdleStyle();
    this.container.addItemAfter(item, this.orderedItemList[dropIndex ?? 0]);
    this.container.removeGhostItem();
    this.container.element?.insertBefore(
      item.element as HTMLElement,
      (dropIndex ?? 0) >= this.orderedItemList.length - 1 ||
        this.orderedItemList.length == 0 ||
        this.orderedItemList[dropIndex ?? 0] == null
        ? (null as unknown as HTMLElement)
        : this.orderedItemList[dropIndex ?? 0].element,
    );
    item.writeDom();
    item.writeTransform();
  }

  /**
   * Cancel another item's (or this item's) pending drop queue entries.
   */
  #cancelPendingDrop(item: ItemObject = this) {
    item.#pendingDrop = false;
    for (const entry of item.#pendingDropEntries) {
      entry.cancel();
    }
    item.#pendingDropEntries = [];
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  moveToContainer(targetContainer: ItemContainer) {
    const sourceContainer = this.container;
    // Clean up old container
    // TODO: Figure out why queueing ghost removal in WRITE_1 causes issues
    // Is it possible that position: relative is being set to soon?
    // sourceContainer.removeAllGhost();
    sourceContainer.removeGhostItem();
    sourceContainer.dragItem = null;

    this.#applyIdleStyle();
    // Clear the residual CSS transform from the drag so it doesn't interfere
    // with the receiveItem animation or persist after it ends.
    this.element!.style.transform = "";

    sourceContainer.sendItem(this);
    targetContainer.receiveItem(this);
  }

  /**
   * Handle the start of a drag operation.
   * This method initializes the drag state, captures the initial positions of items,
   * and sets up the visual appearance of the dragged item.
   * @param prop The drag start event properties.
   */
  cursorDown(prop: dragStartProp) {
    // Disable camera control while dragging
    this.global.data.allowCameraControl = false;

    // Same-item pointer transfer: if a drop is pending on THIS item (cursorUp just ran
    // in the same frame), cancel the queued drop operations and continue dragging with
    // the new pointer. No teardown/setup needed — item is already in drag state.
    if (this.#pendingDrop) {
      this.#cancelPendingDrop();
      // Item is still in drag state (absolute position, removed from list, ghost placed).
      // Calculate the new mouse offset from the current world position so the item
      // stays exactly where it is. The next cursorMove will use this offset to track
      // the new pointer seamlessly.
      this.container.dragItem = this;
      this.#mouseOffsetX = prop.start.x - this.worldPosition[0];
      this.#mouseOffsetY = prop.start.y - this.worldPosition[1];
      return;
    }

    // Different-item pointer transfer: another item in the container has a pending drop.
    // Cancel its queued entries and queue a combined operation that handles both the
    // old item's cleanup and this item's setup in a single set of READ/WRITE stages,
    // avoiding interleaved queue operations.
    const oldDragItem = this.container.dragItem;
    if (oldDragItem && oldDragItem !== this && oldDragItem.#pendingDrop) {
      this.#cancelPendingDrop(oldDragItem);

      const oldDropIndex = oldDragItem.dropIndex;

      this.queueUpdate("READ_1", () => {
        this.container.captureState("READ_1");
        this.container.setItemRows(this);
      });

      this.queueUpdate("WRITE_1", () => {
        this.#dropItemAtIndex(oldDragItem, oldDropIndex);
        this.#beginDrag(prop);
      });

      this.container.addGhostBeforeItem(this, false);
      return;
    }

    // Normal drag start
    this.queueUpdate("READ_1", () => {
      // Record the initial position of the container and its items
      this.container.captureState("READ_1");
      // Organize the items into rows
      this.container.setItemRows(this);
    });

    this.queueUpdate("WRITE_1", () => {
      this.#beginDrag(prop);
      this.debug_all_items();
    });

    // Add ghost at the initial drop index
    // This can be here because Js is single threaded and this will be queued after the above WRITE_1 callback.
    this.container.addGhostBeforeItem(this, false);
  }

  handoffToContainer(newContainer: ItemContainer, stage: "READ_1" | "READ_2" | "READ_3" = "READ_1") {
    if (!this.#containerObject) {
      throw new Error("ItemObject has no container set.");
    }
    this.#containerObject.removeAllGhost(true);
    this.#containerObject.dragItem = null;
    this.#containerObject = newContainer;

    // Capture fresh positions for the target container's items so that
    // the drop index calculation uses accurate layout data.
    this.#containerObject.captureState(stage);
    this.#containerObject.setItemRows(this);
    this.#containerObject.dragItem = this;
    this.transformOrigin = this.#containerObject as unknown as BaseObject;
    this.#containerObject!.element?.appendChild(this.element!);
  }


  cursorMove(prop: dragProp) {
    if (
      !(prop.button & mouseButtonBitmap.LEFT) ||
      !this.container ||
      this.container.dragItem !== this
    ) {
      return;
    }

    // Move the item according to mouse position
    this.worldPosition = [
      prop.position.x - this.#mouseOffsetX,
      prop.position.y - this.#mouseOffsetY,
    ];
    this.requestTransform("WRITE_1");

    // We must NOT read the DOM properties while dragging, as it may read positions of items during animation
    // which can lead to incorrect drop index calculation.
    // this.container.captureState("READ_1");

    let { dropIndex, rowDropIndex, closestRowIndex } =
      this.container.determineDropIndex(this, "READ_1");

    if (dropIndex != this.container.spacerIndex) {
      this.#prevContainer = this.#containerObject;
      const differentRow =
        this.#currentRow != closestRowIndex ||
        this.#containerObject !== this.#prevContainer;
      this.#currentRow = closestRowIndex;
      this.#dropIndex = dropIndex;
      this.#rowDropIndex = rowDropIndex;
      this.container.addGhostBeforeItem(this, differentRow);
    } else {
    }
  }

  cursorUp(_prop: dragEndProp) {
    if (this.container.dragItem !== this) {
      return;
    }

    // Mark the drop as pending and store references to queued operations.
    // If cursorDown fires for any item in the same frame (e.g., pointer transfer
    // due to maxSimultaneousDrags), it will cancel these entries via queueEntry.cancel(),
    // avoiding interleaved queue operations.
    this.#pendingDrop = true;
    this.#pendingDropEntries = [];

    // Capture values needed by the deferred cleanup
    const dropProp = _prop;
    const dropIndex = this.#dropIndex;
    const endX = this.worldPosition[0];
    const endY = this.worldPosition[1];

    // Defer all cleanup so it can be cancelled by a pointer transfer.
    // In the normal case (no transfer), this runs in the same frame with no visual difference.
    this.#pendingDropEntries.push(this.queueUpdate("READ_1", () => {
      // Capture the visual world position (including CSS transform).
      // receiveItem uses READ_1 as the click-to-move animation start point.
      this.readDom(false, "READ_1");
    }));

    this.#pendingDropEntries.push(this.queueUpdate("WRITE_1", () => {
      this.#pendingDrop = false;
      this.global.data.allowCameraControl = true;
      this.container.dragItem = null;

      const hasMoved =
        Math.abs(dropProp.end.screenX - dropProp.start.screenX) > 1 ||
        Math.abs(dropProp.end.screenY - dropProp.start.screenY) > 1;

      if (!hasMoved) {
        // If clicked in place, move to a different container (if one is set)
        const action = this.onClickAction || this.container.onClickAction;
        if (action && action.action === "moveTo") {
          const targetContainer = this.global.data["dragAndDropContainers"]?.find(
            (c: ItemContainer) => c.name === action.target,
          );
          if (targetContainer) {
            this.moveToContainer(targetContainer);
            return;
          }
        }
      }

      this.#dropItemAtIndex(this, dropIndex);
    }));

    this.#pendingDropEntries.push(this.container.queueUpdate("READ_2", () => {
      this.readDom(false, "READ_2");
      const animConfig = this.container.configuration.animation?.drop;
      if (animConfig) {
        const curr = this.getDomProperty("READ_2");
        const dx = endX - curr.x;
        const dy = endY - curr.y;

        if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
          const anim = new AnimationObject(
            this.element,
            {
              transform: [
                `translate3d(${dx}px, ${dy}px, 0px)`,
                `translate3d(0px, 0px, 0px)`,
              ],
            },
            {
              duration: animConfig.duration ?? 100,
              easing: animConfig.timing_function ?? "ease-out",
            },
          );
          this.addAnimation(anim);
          anim.play();
        }
      }
    }));
  }

  destroy() {
    if (this.#containerObject) {
      if (this.#containerObject.dragItem === this) {
        this.#containerObject.dragItem = null;
      }
      this.#containerObject.removeItem(this);
    }
    super.destroy();
  }
}
