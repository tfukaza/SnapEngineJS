import { BaseObject, ElementObject } from "snap-engine";
import { ItemContainer, ClickAction } from "./container";
import { AnimationObject } from "snap-engine/animation";
import type {
  dragStartProp,
  dragProp,
  dragEndProp,
} from "snap-engine";
import { mouseButtonBitmap } from "snap-engine";

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
      item.addDebugRect(
        prop1.x + prop1.width / 2 - 4,
        prop1.y + prop1.height / 2 - 4,
        8,
        8,
        "orange",
        true,
        `center-read1-${item.gid}`
      );
    }
  }

  get isColumn() {
    return this.container.direction === "column";
  }

  moveToContainer(targetContainer: ItemContainer) {
    const sourceContainer = this.container;
    // Clean up old container
    // TODO: Figure out why queueing ghost removal in WRITE_1 causes issues
    // Is it possible that position: relative is being set to soon?
    // sourceContainer.removeAllGhost();
    sourceContainer.removeGhostItem();
    sourceContainer.dragItem = null;

    // Reset styles
    this.style = {
      cursor: "grab",
      position: "relative",
      zIndex: "0",
      top: "",
      left: "",
      width: "",
      height: "",
    };
    this.transformMode = "none";


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

    this.queueUpdate("READ_1", () => {
      // Record the initial position of the container and its items
      this.container.captureState("READ_1");
      // Organize the items into rows
      this.container.setItemRows(this);
    });

    this.queueUpdate("WRITE_1", () => {
      let property = this.getDomProperty("READ_1");
      // Record the position of the mouse relative to the top-left of the item
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
      this.transformMode = "offset";
      this.transformOrigin = this.container as unknown as BaseObject; // TODO: Take padding into account

      this.writeDom();
      this.writeTransform();

      // Temporarily remove the item from the container's item list
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
        // If there is nothing in the current container, set drop index to 0
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
      this.debug_all_items();

    });

    // Add ghost at the initial drop index
    // This can be here because Js is single threaded and this will be queued after the above WRITE_1 callback.
    // console.debug("Initial ghost add at index:", this.#dropIndex);
    this.container.addGhostBeforeItem(this, false);
  }

  handoffToContainer(newContainer: ItemContainer, stage: "READ_1" | "READ_2" | "READ_3" = "READ_1") {
    if (!this.#containerObject) {
      throw new Error("ItemObject has no container set.");
    }
    this.#containerObject.removeAllGhost();
    this.#containerObject.dragItem = null;
    this.#containerObject = newContainer;

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
    // Re-enable camera control after drag ends
    this.global.data.allowCameraControl = true;

    if (this.container.dragItem !== this) {
      return;
    }

    // TODO: A better way would be to get the last cached position
    // and store it into READ_1
    this.element!.style.position = "relative";

    this.container.dragItem = null;
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

    const hasMoved =
      Math.abs(_prop.end.screenX - _prop.start.screenX) > 1 ||
      Math.abs(_prop.end.screenY - _prop.start.screenY) > 1;

    if (!hasMoved) {
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


    this.container.addItemAfter(this, this.orderedItemList[this.#dropIndex ?? 0]);
    this.container.removeAllGhost();

    const endX = this.worldPosition[0];
    const endY = this.worldPosition[1];
    this.requestRead(true, true, "READ_1");

    this.requestWrite(
      true,
      () => {
        this.container.element?.insertBefore(
          this.element as HTMLElement,
          (this.#dropIndex ?? 0) >= this.orderedItemList.length - 1 ||
            this.orderedItemList.length == 0 ||
            this.orderedItemList[this.#dropIndex ?? 0] == null
            ? (null as unknown as HTMLElement)
            : this.orderedItemList[this.#dropIndex ?? 0].element,
        );
        this.writeDom();
        this.writeTransform();
      },
      "WRITE_1",
    );

    this.container.queueUpdate("READ_2", () => {
      this.readDom(false, "READ_2");
      const animConfig = this.container.configuration.animation?.drop;
      if (animConfig) {
        const curr = this.getDomProperty("READ_2");
        // curr.x, curr.y is the new position in flow.

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
    });
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
