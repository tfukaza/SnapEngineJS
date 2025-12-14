import { BaseObject, ElementObject } from "../../object";
import { ItemContainer } from "./container";
import {
  dragStartProp,
  dragProp,
  mouseButtonBitmap,
  dragEndProp,
} from "../../input";

const BUFFER = 20;

export class ItemObject extends ElementObject {
  #containerObject: ItemContainer | null;
  #indexInList: number = 0;
  #mouseOffsetX: number = 0;
  #mouseOffsetY: number = 0;
  #dropIndex: number = 0;
  #rowDropIndex: number = 0;
  #rowIndex: number = 0;
  #currentRow: number = 0;

  #prevContainer: ItemContainer | null = null;

  constructor(engine: any, parent: BaseObject | null) {
    super(engine, parent);
    this.event.input.dragStart = this.cursorDown;
    this.event.input.drag = this.cursorMove;
    this.event.input.dragEnd = this.cursorUp;
    this.transformMode = "none";
    this.#containerObject = null;
    this.#prevContainer = null;
  }

  animateZeroTransform() {
    return;
    // console.log(
    //   "animateZeroTransform",
    //   `${this.dom.prevProperty.x - this.dom.property.x}, ${this.dom.prevProperty.y - this.dom.property.y}`,
    // );

    // this.animate(
    //   {
    //     transform: [
    //       `translate3d(${this.dom.prevProperty.x - this.dom.property.x}px, ${this.dom.prevProperty.y - this.dom.property.y}px, 0px)`,
    //       `translate3d(${0}px, ${0}px, 0px)`,
    //     ],
    //   },
    //   {
    //     duration: 400,
    //     easing: "ease-out",
    //   },
    // );
    // this.animation.play();
    // this.animation.onfinish = () => {
    //   this.animation.cancel();
    // };
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

  set dropIndex(value: number) {
    this.#dropIndex = value;
  }

  set rowDropIndex(value: number) {
    this.#rowDropIndex = value;
  }

  set indexInList(value: number) {
    this.#indexInList = value;
  }

  debug_all_items() {
    for (const item of this.container.itemList ?? []) {
      const property = item.getDomProperty("READ_2");
      item.addDebugText(
        property.x,
        property.y,
        `Index: ${this.container.itemList.indexOf(item)}, GID: ${item.gid}, ${property.x}, ${property.y}`,
        "black",
      );
    }
  }

  get isColumn() {
    return this.container.direction === "column";
  }

  cursorDown(prop: dragStartProp) {
    this.container.readDom(false, "READ_2");
    this.container.saveDomPropertyToTransform("READ_2");
    for (const item of this.container.itemList ?? []) {
      item.readDom(false, "READ_2");
      item.saveDomPropertyToTransform("READ_2");
    }
    for (const container of this.global.data["dragAndDropGroups"][
      this.container.groupID!
    ] ?? []) {
      container.readDom(false, "READ_2");
      container.saveDomPropertyToTransform("READ_2");
    }
    this.container.setItemRows(this);
    let property = this.getDomProperty("READ_2");

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
    this.transformOrigin = this.container; // TODO: Take padding into account
    this.requestWrite(
      false,
      () => {
        this.writeDom();
        this.writeTransform();
      },
      "WRITE_1", // Must apply transform early since we need to read the position of the other items in READ_2
    );

    this.#indexInList = this.orderedItemList.indexOf(this) ?? 0;
    if (this.container) {
      this.container.dragItem = this;
      this.container.removeItem(this);
      this.container.updateItemIndexes();
    }
    this.#currentRow = this.#rowIndex;
    let { rowList, closestRow, rowBoundaries, overshoot } = this.getClosestRow(
      this.isColumn
        ? this.transform.x + property.width / 2
        : this.transform.y + property.height / 2,
    );
    if (rowList.length == 0) {
      this.#currentRow = 0;
      this.#dropIndex = 0;
      this.#rowDropIndex = 0;
    } else {
      if (overshoot == "ABOVE") {
        this.#dropIndex = 0;
        this.#rowDropIndex = 0;
      } else if (overshoot == "BELOW") {
        this.#dropIndex = this.container.numberOfItems;
        this.#rowDropIndex =
          this.#dropIndex -
          rowBoundaries[rowBoundaries.length - 1].cumulativeLength;
      } else {
        this.#dropIndex = this.#indexInList;
        this.#rowDropIndex =
          this.#dropIndex - rowBoundaries[closestRow.index].cumulativeLength;
      }
      this.container.addGhostBeforeItem(this, this.#dropIndex, false);
      this.#currentRow = closestRow.index;
    }

    this.debug_all_items();
  }

  /**
   * Get the closest row to the given screen Y position.
   * If the closest row is below the given position - some buffer, it will also return "ABOVE".
   * Likewise, if the closest row is above the given position + some buffer, it will return "BELOW".
   * @param thisScreenY The screen Y position to check against.
   * @return An object containing the row list, the closest row, and the row boundaries.
   * */
  getClosestRow(worldPos: number) {
    let rowList = this.container.itemRows ?? [];
    if (rowList.length == 0) {
      return {
        rowList,
        closestRow: { index: 0, cumulativeLength: 0 },
        rowBoundaries: [],
      };
    }
    const isColumn = this.isColumn;
    // Draw a horizontal line through each row
    const colors = ["orange", "yellow", "green", "purple", "gray", "black"];
    for (let i = 0; i < rowList.length; i++) {
      const item = rowList[i][0];
      const prop = item._domProperty[1];
      if (isColumn) {
        this.addDebugRect(
          item.transform.x + prop.width / 2,
          0,
          2,
          this._domProperty[1].height,
          i == this.#currentRow ? "#000000FF" : colors[i],
          true,
          `row-${i}`,
        );
      } else {
        this.addDebugRect(
          0,
          item.transform.y + prop.height / 2,
          this._domProperty[1].width,
          2,
          i == this.#currentRow ? "#000000FF" : colors[i],
          true,
          `row-${i}`,
        );
      }
    }
    // Use the first item in each row to find the top and bottom of the row
    let rowBoundaries = [];
    let cumulativeLength = 0;
    for (let i = 0; i < rowList.length; i++) {
      let row = rowList[i];
      let start, end;
      if (isColumn) {
        start = row[0].transform.x ?? 0;
        end =
          (row[row.length - 1].transform.x ?? 0) +
          row[row.length - 1]._domProperty[1].width;
      } else {
        start = row[0].transform.y ?? 0;
        end =
          (row[row.length - 1].transform.y ?? 0) +
          row[row.length - 1]._domProperty[1].height;
      }
      let length = row.length;
      rowBoundaries.push({ start, end, index: i, length, cumulativeLength });
      cumulativeLength += length;
    }
    // Draw a debug rectangle indicating the height of each row
    for (const row of rowBoundaries) {
      if (isColumn) {
        this.addDebugRect(
          row.start,
          10,
          row.end - row.start,
          10,
          "red",
          true,
          `row-boundary-${row.index}`,
        );
      } else {
        this.addDebugRect(
          10,
          row.start,
          10,
          row.end - row.start,
          "red",
          true,
          `row-boundary-${row.index}`,
        );
      }
    }
    // Draw a circle at thisScreenY
    if (isColumn) {
      this.addDebugRect(worldPos, 10, 10, 10, "#000000FF", true, `worldPos`);
    } else {
      this.addDebugRect(10, worldPos, 10, 10, "#000000FF", true, `worldPos`);
    }

    let closestRow = rowBoundaries.reduce((prev, curr) => {
      return Math.abs((curr.end + curr.start) / 2 - worldPos) <
        Math.abs((prev.end + prev.start) / 2 - worldPos)
        ? curr
        : prev;
    });
    // Draw a horizontal line for each item in the closest row
    for (const item of rowList[closestRow.index]) {
      const prop = item._domProperty[1];
      if (isColumn) {
        item.addDebugRect(
          item.transform.x + prop.width / 2,
          item.transform.y,
          2,
          prop.height,
          "green",
          true,
          `item-${item.gid}`,
        );
      } else {
        item.addDebugRect(
          item.transform.x,
          item.transform.y + prop.height / 2,
          prop.width,
          2,
          "green",
          true,
          `item-${item.gid}`,
        );
      }
    }
    let overshoot = "MIDDLE";
    if (worldPos < rowBoundaries[0].start - BUFFER) {
      overshoot = "ABOVE";
    } else if (
      worldPos >
      rowBoundaries[rowBoundaries.length - 1].end + BUFFER / (BUFFER + 1)
    ) {
      overshoot = "BELOW";
    }
    return {
      rowList,
      closestRow,
      rowBoundaries,
      overshoot,
    };
  }

  findClosestItems(rowItemList: ItemObject[], thisWorldPos: number) {
    if (!rowItemList || rowItemList.length == 0) {
      return {
        leftItem: undefined,
        rightItem: undefined,
        leftItemRight: undefined,
        rightItemLeft: undefined,
      };
    }
    const isColumn = this.isColumn;
    const sortedItemList = rowItemList.sort((a, b) => {
      if (isColumn) {
        return (
          a.transform.y +
          a._domProperty[1].height / 2 -
          (b.transform.y + b._domProperty[1].height / 2)
        );
      } else {
        return (
          a.transform.x +
          a._domProperty[1].width / 2 -
          (b.transform.x + b._domProperty[1].width / 2)
        );
      }
    });
    let leftItem = sortedItemList.findLast((item) => {
      if (isColumn) {
        return (
          item.transform.y + item._domProperty[1].height / 2 <= thisWorldPos
        );
      } else {
        return (
          item.transform.x + item._domProperty[1].width / 2 <= thisWorldPos
        );
      }
    });
    let rightItem = sortedItemList.find((item) => {
      if (isColumn) {
        return (
          item.transform.y + item._domProperty[1].height / 2 >= thisWorldPos
        );
      } else {
        return (
          item.transform.x + item._domProperty[1].width / 2 >= thisWorldPos
        );
      }
    });

    let leftItemRight, rightItemLeft;
    if (isColumn) {
      leftItemRight = leftItem
        ? leftItem.transform.y + leftItem._domProperty[1].height
        : undefined;
      rightItemLeft = rightItem?.transform.y;
    } else {
      leftItemRight = leftItem
        ? leftItem.transform.x + leftItem._domProperty[1].width
        : undefined;
      rightItemLeft = rightItem?.transform.x;
    }

    return {
      leftItem,
      rightItem,
      leftItemRight,
      rightItemLeft,
    };
  }

  handoffToContainer(newContainer: ItemContainer) {
    if (!this.#containerObject) {
      throw new Error("ItemObject has no container set.");
    }
    this.#containerObject.removeAllGhost();
    this.#containerObject.dragItem = null;
    this.#containerObject = newContainer;
    this.#containerObject.setItemRows(this);
    this.#containerObject.dragItem = this;
    this.transformOrigin = this.#containerObject;
    // TODO: Manipulate DOM in the write queue
    this.#containerObject.element?.appendChild(this.element!);
  }

  determineDropIndex() {
    const thisWorldX = this.transform.x + this._domProperty[1].width / 2;
    const thisWorldY = this.transform.y + this._domProperty[1].height / 2;

    const closestContainer = this.#containerObject!.getClosestContainer(
      thisWorldX,
      thisWorldY,
    );
    this.#prevContainer = this.#containerObject;
    if (closestContainer !== this.#containerObject) {
      this.handoffToContainer(closestContainer!);
    }

    let dropIndex = this.#dropIndex;
    let rowDropIndex = this.#rowDropIndex;

    for (const item of this.orderedItemList) {
      item.clearAllDebugMarkers();
    }

    this.debug_all_items();

    const isColumn = this.isColumn;
    const primaryPos = isColumn ? thisWorldX : thisWorldY;
    const secondaryPos = isColumn ? thisWorldY : thisWorldX;

    let {
      rowList,
      closestRow,
      rowBoundaries: _rowBoundaries,
      overshoot,
    } = this.getClosestRow(primaryPos);
    if (rowList.length == 0 || !closestRow) {
      return { dropIndex: 0, rowDropIndex: 0, closestRowIndex: 0 };
    }
    let closestRowIndex = closestRow.index;
    let cumulativeLength = closestRow.cumulativeLength;
    let { leftItem, rightItem, leftItemRight, rightItemLeft } =
      this.findClosestItems(rowList[closestRowIndex], secondaryPos);

    // Draw a tall vertical line to indicate the left border of the item
    if (leftItem) {
      const leftItemSize = isColumn
        ? leftItem._domProperty[1].height
        : leftItem._domProperty[1].width;
      const leftBuffer = leftItemSize * 0.25;
      if (isColumn) {
        leftItem.addDebugRect(
          leftItem.transform.x,
          leftItemRight ?? 0,
          leftItem._domProperty[1].width,
          2,
          "red",
          true,
          `leftItem-${leftItem.gid}`,
        );
        leftItem.addDebugRect(
          leftItem.transform.x,
          (leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer,
          leftItem._domProperty[1].width,
          2,
          "orange",
          true,
          `leftItem-buffer-${leftItem.gid}`,
        );
      } else {
        leftItem.addDebugRect(
          leftItemRight ?? 0,
          leftItem.transform.y,
          2,
          leftItem._domProperty[1].height,
          "red",
          true,
          `leftItem-${leftItem.gid}`,
        );
        leftItem.addDebugRect(
          (leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer,
          leftItem.transform.y,
          2,
          leftItem._domProperty[1].height,
          "orange",
          true,
          `leftItem-buffer-${leftItem.gid}`,
        );
      }
    }

    if (rightItem) {
      const rightItemSize = isColumn
        ? rightItem._domProperty[1].height
        : rightItem._domProperty[1].width;
      const rightBuffer = rightItemSize * 0.25;
      if (isColumn) {
        rightItem.addDebugRect(
          rightItem.transform.x,
          rightItemLeft ?? 0,
          rightItem._domProperty[1].width,
          2,
          "red",
          true,
          `rightItem-${rightItem.gid}`,
        );
        rightItem.addDebugRect(
          rightItem.transform.x,
          (rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer,
          rightItem._domProperty[1].width,
          2,
          "orange",
          true,
          `rightItem-buffer-${rightItem.gid}`,
        );
      } else {
        rightItem.addDebugRect(
          rightItemLeft ?? 0,
          rightItem.transform.y,
          2,
          rightItem._domProperty[1].height,
          "red",
          true,
          `rightItem-${rightItem.gid}`,
        );
        rightItem.addDebugRect(
          (rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer,
          rightItem.transform.y,
          2,
          rightItem._domProperty[1].height,
          "orange",
          true,
          `rightItem-buffer-${rightItem.gid}`,
        );
      }
    }

    if (isColumn) {
      this.addDebugRect(
        this.transform.x,
        thisWorldY,
        this._domProperty[1].width,
        2,
        "blue",
        true,
        `thisItem-${this.gid}`,
      );
    } else {
      this.addDebugRect(
        thisWorldX,
        this.transform.y,
        2,
        this._domProperty[1].height,
        "blue",
        true,
        `thisItem-${this.gid}`,
      );
    }

    if (overshoot == "ABOVE") {
      rowDropIndex = 0;
    } else if (overshoot == "BELOW") {
      rowDropIndex = rowList[closestRowIndex].length;
    } else if (overshoot == "MIDDLE") {
      const itemSize = isColumn
        ? this._domProperty[1].height
        : this._domProperty[1].width;
      const leftItemSizeCalc = isColumn
        ? leftItem?._domProperty[1].height ?? 0
        : leftItem?._domProperty[1].width ?? 0;
      const rightItemSizeCalc = isColumn
        ? rightItem?._domProperty[1].height ?? 0
        : rightItem?._domProperty[1].width ?? 0;
      const leftBufferCalc = leftItemSizeCalc * 0.25;
      const rightBufferCalc = rightItemSizeCalc * 0.25;

      if (
        leftItem &&
        leftItemRight &&
        leftItemRight - leftItemSizeCalc / 2 + leftBufferCalc > secondaryPos
      ) {
        rowDropIndex = rowList[closestRowIndex].indexOf(leftItem);
      } else if (
        rightItem &&
        rightItemLeft &&
        rightItemLeft + rightItemSizeCalc / 2 - rightBufferCalc < secondaryPos
      ) {
        rowDropIndex = rowList[closestRowIndex].indexOf(rightItem) + 1;
      } else if (
        rightItem &&
        leftItemRight &&
        rightItemLeft &&
        Math.abs(rightItemLeft - leftItemRight) < itemSize * 0.75
      ) {
        // "Squeeze in" between the two items when moving to a new row
        rowDropIndex = rowList[closestRowIndex].indexOf(rightItem);
      } else if (rightItemLeft == undefined) {
        rowDropIndex = rowList[closestRowIndex].length;
      } else if (leftItemRight == undefined) {
        rowDropIndex = 0;
      } else {
      }
    }

    if (rowDropIndex > rowList[closestRowIndex].length) {
      dropIndex = -1;
    } else {
      dropIndex = cumulativeLength + rowDropIndex;
    }

    return {
      dropIndex,
      rowDropIndex,
      closestRowIndex,
    };
  }

  cursorMove(prop: dragProp) {
    if (
      !(prop.button & mouseButtonBitmap.LEFT) ||
      !this.container ||
      this.container.dragItem !== this
    ) {
      return;
    }

    this.worldPosition = [
      prop.position.x - this.#mouseOffsetX,
      prop.position.y - this.#mouseOffsetY,
    ];
    this.container.requestRead(false, true, "READ_1");
    this.requestTransform();

    let { dropIndex, rowDropIndex, closestRowIndex } =
      this.determineDropIndex();

    if (dropIndex != this.container.spacerIndex) {
      const differentRow =
        this.#currentRow != closestRowIndex ||
        this.#containerObject !== this.#prevContainer;
      this.#currentRow = closestRowIndex;
      this.container.addGhostBeforeItem(this, dropIndex, differentRow);
      this.#dropIndex = dropIndex;
      this.#rowDropIndex = rowDropIndex;
    }
  }

  cursorUp(_prop: dragEndProp) {
    if (this.container.dragItem !== this) {
      return;
    }
    this.container.dragItem = null;

    this.transformMode = "none";
    this.style = {
      cursor: "grab",
      position: "relative",
      zIndex: "0",
    };

    this.container.addItemAfter(this, this.orderedItemList[this.#dropIndex]);
    this.container.removeAllGhost();

    this.requestWrite(
      true,
      () => {
        this.container.element?.insertBefore(
          this.element as HTMLElement,
          this.#dropIndex >= this.orderedItemList.length - 1 ||
            this.orderedItemList.length == 0 ||
            this.orderedItemList[this.#dropIndex] == null
            ? (null as unknown as HTMLElement)
            : this.orderedItemList[this.#dropIndex].element,
        );
        this.writeDom();
        this.writeTransform();
      },
      "WRITE_1",
    );
  }
}
