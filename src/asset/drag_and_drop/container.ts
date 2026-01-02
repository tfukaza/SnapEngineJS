import { BaseObject, ElementObject } from "../../object";
import { ItemObject } from "./item";
import { AnimationObject } from "../../animation";
import { getDomProperty } from "../../util";

const BUFFER = 20;

export interface ClickAction {
  action: "moveTo";
  target: string;
}

export interface AnimationConfig {
  timing_function?: string;
  duration?: number;
}

export interface ContainerAnimations {
  reorder?: AnimationConfig | null;
  drop?: AnimationConfig | null;
  clickMove?: AnimationConfig | null;
}

export interface ItemContainerConfig {
  groupID?: string; // Containers belonging to the same group can drag and drop items between them.
  direction?: "column" | "row"; // The direction of the container, either column or row.
  name?: string; // Unique name for the container to be targeted by actions
  onClickAction?: ClickAction | null; // Default click action for items in this container
  animation?: ContainerAnimations | null; // Animation configuration
}

export class ItemContainer extends ElementObject {
  #itemList: ItemObject[] = [];
  #itemRows: ItemObject[][] = [];
  #dragItem: ItemObject | null = null;
  #spacerDomElement: HTMLElement | null = null;
  #spacerIndex: number = 0;
  #config: ItemContainerConfig;
  #lastClosestRowIndex: number = -1;

  constructor(
    engine: any,
    parent: BaseObject | null,
    config?: ItemContainerConfig,
  ) {
    super(engine, parent);
    this.#config = config || {};
    this.#itemList = [];
    if (!this.#config.groupID) {
      this.#config.groupID = "default-group"; // Default group ID
    }
    if (!this.#config.direction) {
      this.#config.direction = "column";
    }
    if (!this.#config.name) {
      if (!this.global.data["dragAndDropContainerCounter"]) {
        this.global.data["dragAndDropContainerCounter"] = 0;
      }
      this.#config.name = `container-${this.global.data["dragAndDropContainerCounter"]++}`;
    }
    if (this.#config.animation === undefined) {
      const defaultAnim = { duration: 100, timing_function: "ease-out" };
      this.#config.animation = {
        reorder: defaultAnim,
        drop: defaultAnim,
        clickMove: defaultAnim,
      };
    } else if (this.#config.animation) {
      const defaultAnim = { duration: 100, timing_function: "ease-out" };
      // Check if it's the old format (AnimationConfig) or new format (ContainerAnimations)
      // Since we changed the type definition, we assume it matches ContainerAnimations or is partial
      // But for safety/migration we can fill defaults
      this.#config.animation = {
        reorder: this.#config.animation.reorder ?? defaultAnim,
        drop: this.#config.animation.drop ?? defaultAnim,
        clickMove: this.#config.animation.clickMove ?? defaultAnim,
      };
    }

    this.#spacerIndex = 0;

    this.style = {
      position: "relative",
    };

    if (!this.global.data["dragAndDropContainers"]) {
      this.global.data["dragAndDropContainers"] = [];
    }
    this.global.data["dragAndDropContainers"].push(this);
  }

  destroy() {
    if (this.global.data["dragAndDropContainers"]) {
      this.global.data["dragAndDropContainers"] = this.global.data[
        "dragAndDropContainers"
      ].filter((c: ItemContainer) => c !== this);
    }
    super.destroy();
  }

  get groupID() {
    return this.#config.groupID;
  }

  get name() {
    return this.#config.name;
  }

  get onClickAction() {
    return this.#config.onClickAction;
  }

  // get animation(): ContainerAnimations | null | undefined {
  //   return this.#config.animation;
  // }
  get configuration() {
    return this.#config;
  }

  get direction() {
    return this.#config.direction || "column";
  }

  get numberOfItems() {
    return this.#itemList.length;
  }

  set direction(value: "column" | "row") {
    this.#config.direction = value;
  }

  get spacerIndex() {
    return this.#spacerIndex;
  }

  set spacerIndex(value: number) {
    this.#spacerIndex = value;
  }

  get spacerDomElement() {
    return this.#spacerDomElement;
  }

  get itemList() {
    return this.#itemList;
  }

  get itemRows() {
    return this.#itemRows;
  }

  set dragItem(item: ItemObject | null) {
    if (item !== this.#dragItem) {
      this.#lastClosestRowIndex = -1;
    }
    this.#dragItem = item;
  }

  get dragItem() {
    return this.#dragItem;
  }

  addItem(item: ItemObject) {
    if (this.#itemList.includes(item)) {
      console.warn("Item already in container:", item);
      return;
    }
    this.#itemList.push(item);
    item.setContainer(this);
  }

  removeItem(item: ItemObject) {
    const initialLength = this.#itemList.length;
    this.#itemList = this.#itemList.filter((i) => i !== item);
    if (this.#itemList.length === initialLength) {
      if (this.#dragItem !== item) {
        console.warn("Item not found in container during removal:", item);
      }
    }
  }

  /**
   * Get the closest container to the given world coordinates.
   * @param worldX
   * @param worldY
   * @returns
   */
  getClosestContainer(worldX: number, worldY: number): ItemContainer | null {
    let closestContainer = null;
    let closestDistance = Infinity;

    for (let c of this.global.data["dragAndDropContainers"] || []) {
      const container: ItemContainer = c as ItemContainer;
      if (container.groupID !== this.#config.groupID) {
        continue;
      }
      const property = container.getDomProperty("READ_1");
      const left = property.x;
      const right = property.x + property.width;
      const top = property.y;
      const bottom = property.y + property.height;

      const dx =
        worldX < left
          ? left - worldX
          : worldX > right
            ? worldX - right
            : 0;
      const dy =
        worldY < top
          ? top - worldY
          : worldY > bottom
            ? worldY - bottom
            : 0;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestContainer = container;
      }
    }

    if (closestContainer) {
      const prop = closestContainer.getDomProperty("READ_1");
      this.addDebugRect(
        prop.x,
        prop.y,
        prop.width,
        prop.height,
        "blue",
        true,
        "closest-container",
        false,
        4,
      );
    }

    return closestContainer;
  }

  /**
   * Reorder the item list based on the document position of the items.
   * This is used to determine the order of the items when they are dropped.
   */
  reorderItemList() {
    this.#itemList = this.#itemList.sort((a, b) => {
      if (!a.element || !b.element) return 0;
      const comparison = a.element.compareDocumentPosition(b.element);
      if (comparison & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1; // a follows b (b comes before a) -> b, a
      }
      if (comparison & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1; // a precedes b (a comes before b) -> a, b
      }
      return 0;
    });
  }

  /**
   * Set the item rows based on the document position of the items.
   * It assumes the latest DOM positions of the container and all items has already been saved.
   */
  setItemRows(caller: ItemObject | null) {
    let rowList: ItemObject[][] = [];
    let prevVal = undefined;
    const isColumn = this.direction === "column";
    for (const item of this.#itemList) {
      let val = Math.floor(
        isColumn ? item.transform.x ?? 0 : item.transform.y ?? 0,
      );
      if (item == caller) {
        continue;
      }
      if (val != prevVal) {
        rowList.push([]);
        prevVal = val;
      }
      item.rowIndex = rowList.length - 1;
      rowList[rowList.length - 1].push(item);
    }
    this.#itemRows = rowList;
  }

  addGhostItem(caller: ItemObject, itemIndex: number | null) {
    if (this.#spacerDomElement) {
      this.#spacerDomElement.remove();
      this.#spacerDomElement = null;
    }
    if (itemIndex === null || itemIndex === -1) {
      return;
    }
    let tmpDomElement = document.createElement("div");
    tmpDomElement.id = "spacer";

    const computedStyle = window.getComputedStyle(caller.element!);
    tmpDomElement.style.width = computedStyle.width;
    tmpDomElement.style.height = computedStyle.height;
    tmpDomElement.style.margin = computedStyle.margin;
    tmpDomElement.style.padding = computedStyle.padding;
    tmpDomElement.style.boxSizing = computedStyle.boxSizing;
    tmpDomElement.classList.add("ghost");

    let item =
      itemIndex > this.#itemList.length - 1 ? null : this.#itemList[itemIndex];

    if (!this.element) {
      return;
    }
    this.element.insertBefore(tmpDomElement, item ? item.element : null);
    this.#spacerDomElement = tmpDomElement;
    this.#spacerIndex = itemIndex;
    this.reorderItemList();
  }

  removeGhostItem() {
    if (this.#spacerDomElement) {
      this.#spacerDomElement.remove();
      this.#spacerDomElement = null;

      if (this.engine && this.engine.debugMarkerList) {
        delete this.engine.debugMarkerList[`${this.gid}-ghost-center`];
      }
    }
  }

  /**
   * Animate items from their previous position to their current position using FLIP technique
   */
  animateItems(fromStage: "READ_1" | "READ_2", toStage: "READ_2" | "READ_3") {
    if (!this.configuration.animation || !this.configuration.animation.reorder) {
      return;
    }
    const animConfig = this.configuration.animation.reorder;
    for (const item of this.#itemList) {
      const prevPos = item.getDomProperty(fromStage);
      const currPos = item.getDomProperty(toStage);
      const dx = prevPos.x - currPos.x;
      const dy = prevPos.y - currPos.y;
      
      // console.log(`Item ${item.gid}: dx=${dx}, dy=${dy}`);
      
      // Only animate if there's significant movement
      if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
        const animation = new AnimationObject(
          null,
          {
            $t: [0, 1],
          },
          {
            duration: animConfig.duration ?? 100,
            easing: animConfig.timing_function ?? "ease-out",
            tick: (vars) => {
              const t = vars.$t;
              const currentDx = dx * (1 - t);
              const currentDy = dy * (1 - t);
              item.element!.style.transform = `translate3d(${currentDx}px, ${currentDy}px, 0px)`;
            },
            finish: () => {
              item.element!.style.transform = "";
            },
          },
        );
        item.element!.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;
        item.addAnimation(animation);
        animation.play();
      }
    }
  }

  addGhostBeforeItem(
    caller: ItemObject,
    _differentRow: boolean,
  ) {
    // Read the DOM positions before updating the ghost
    this.queueUpdate("READ_1", () => {
      for (const item of this.#itemList) {
        item.readDom(true, "READ_1");
        item.saveDomPropertyToTransform("READ_1");
      }
    });
    
    // Remove the ghost item
    this.queueUpdate("WRITE_1", () => {
      console.log(`addGhostBeforeItem: itemIndex=${caller.indexInList}`);
      this.removeGhostItem();
      // add ghost to the new position
      this.addGhostItem(caller, caller.dropIndex ?? 0);
    });
    // Save the DOM positions after the ghost item is removed
    this.queueUpdate("READ_2", () => {
      for (const item of this.#itemList) {
        item.readDom(true, "READ_2");
        item.saveDomPropertyToTransform("READ_2");
      }
      caller.copyDomProperty("READ_1", "READ_2");
      this.reorderItemList();
      this.setItemRows(caller);
      this.updateItemIndexes();
      
      const savedDropIndex = caller.dropIndex;
      // Determine where the caller should be dropped
      let {
        dropIndex,
        rowDropIndex,
        closestRowIndex: _closestRowIndex,
      } = this.determineDropIndex(caller, "READ_2");

      if (dropIndex !== savedDropIndex) {
        console.debug(
          `Drop index changed in differentRow: ${savedDropIndex} -> ${dropIndex}`,
        );
      }

      this.queueUpdate("WRITE_2", () => {
        // console.debug("different row WRITE_2");
        this.addGhostItem(caller, dropIndex);
        caller.dropIndex = dropIndex;
        caller.rowDropIndex = rowDropIndex;
      });
    });
    this.queueUpdate("READ_3", () => {
      for (const item of this.#itemList) {
        item.readDom(true, "READ_3");
        item.saveDomPropertyToTransform("READ_3");
      }
      this.reorderItemList();
      this.setItemRows(caller);
      this.updateItemIndexes();
      // Animate items from READ_1 to READ_3 positions
      this.animateItems("READ_1", "READ_3");
      for (const item of this.#itemList) {
        item.copyDomProperty("READ_3", "READ_1");
      }
    });
  }

  removeAllGhost() {
    this.queueUpdate("WRITE_1", () => {
      this.removeGhostItem();
    });
    this.queueUpdate("READ_2", () => {
      for (const item of this.#itemList) {
        item.readDom(false, "READ_2");
        item.saveDomPropertyToTransform("READ_2");
        // item.calculateLocalFromTransform();
      }
      this.setItemRows(null);
      this.reorderItemList();
    });
    this.#spacerIndex = -1;
  }

  pickUpItem(item: ItemObject) {
    this.#dragItem = item;
    this.removeItem(item);
  }

  addItemAfter(item: ItemObject, afterItem: ItemObject) {
    const index = this.#itemList.indexOf(afterItem);
    this.#itemList.splice(index + 1, 0, item);
    item.setContainer(this);
    this.#dragItem = null;
  }

  updateItemIndexes() {
    this.#itemList.forEach((item, index) => {
      item.indexInList = index;
    });
  }


  receiveItem(item: ItemObject) {
    // Capture start positions of existing items in this container
    for (const i of this.#itemList) {
      i.readDom(true, "READ_1");
    }

    // Capture start position of the incoming item
    item.requestRead(false, true, "READ_1");

    // We need to append the element to the new container's element
    item.requestWrite(
      true,
      () => {
        // Move to new container
        this.addItem(item);
        this.element?.appendChild(item.element!);
        item.writeDom();
      },
      "WRITE_1",
    );

    // Update new container layout
    this.queueUpdate("READ_2", () => {
      this.updateItemIndexes();

      // Read new positions for all items
      for (const i of this.#itemList) {
        i.readDom(true, "READ_2");
      }

      const animConfig = this.configuration.animation?.clickMove;
      if (animConfig) {
        const prev = item.getDomProperty("READ_1");
        const curr = item.getDomProperty("READ_2");
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        
        if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
          const anim = new AnimationObject(
            item.element,
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
          item.addAnimation(anim);
          anim.play();
        }
      }

      // const reorderConfig = this.configuration.animation?.reorder;
      // if (reorderConfig) {
      //   for (const i of this.#itemList) {
      //     if (i === item) continue;

      //     const prev = i.getDomProperty("READ_1");
      //     const curr = i.getDomProperty("READ_2");
      //     const dx = prev.x - curr.x;
      //     const dy = prev.y - curr.y;

      //     if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
      //       const anim = new AnimationObject(
      //         i.element,
      //         {
      //           transform: [
      //             `translate3d(${dx}px, ${dy}px, 0px)`,
      //             `translate3d(0px, 0px, 0px)`,
      //           ],
      //         },
      //         {
      //           duration: reorderConfig.duration ?? 100,
      //           easing: reorderConfig.timing_function ?? "ease-out",
      //         },
      //       );
      //       i.addAnimation(anim);
      //       anim.play();
      //     }
      //   }
      // }
    });
    item.queueUpdate("WRITE_2", () => {
      item.writeDom();
    });
  }

  sendItem(item: ItemObject) {
    // Capture start positions of existing items (excluding the one leaving)
    this.queueUpdate("READ_1", () => {
      for (const i of this.#itemList) {
        i.readDom(true, "READ_1");
      }
    });

    // removeAllGhost() removes ghost in WRITE_1

    // We rely on the caller (or receiveItem) to perform the DOM change (moving the element out).
    // But we need to schedule the re-layout animation after that DOM change.
    
    this.queueUpdate("READ_2", () => {
      // Remove the item from the logical list
      this.removeItem(item);
      // Recalculate layout for remaining items
      this.updateItemIndexes();
      
      // Read new positions
      for (const i of this.#itemList) {
        i.readDom(true, "READ_2");
      }

      const reorderConfig = this.configuration.animation?.reorder;
      if (reorderConfig) {
        for (const i of this.#itemList) {
          const prev = i.getDomProperty("READ_1");
          const curr = i.getDomProperty("READ_2");
          const dx = prev.x - curr.x;
          const dy = prev.y - curr.y;

          if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
            const anim = new AnimationObject(
              i.element,
              {
                transform: [
                  `translate3d(${dx}px, ${dy}px, 0px)`,
                  `translate3d(0px, 0px, 0px)`,
                ],
              },
              {
                duration: reorderConfig.duration ?? 100,
                easing: reorderConfig.timing_function ?? "ease-out",
              },
            );
            i.addAnimation(anim);
            anim.play();
          }
        }
      }

      for (const i of this.#itemList) {
        i.copyDomProperty("READ_2", "READ_1");
      }
    });
  }

  /**
   * Get the closest row to the given screen position.
   * If the closest row is below the given position - some buffer, it will also return "ABOVE".
   * Likewise, if the closest row is above the given position + some buffer, it will return "BELOW".
   * @param worldPos The screen position to check against (Y for column, X for row).
   * @return An object containing the row list, the closest row, and the row boundaries.
   * */
  getClosestRow(worldPos: number) {
    let rowList = this.itemRows ?? [];
    if (rowList.length == 0) {
      return {
        rowList,
        closestRow: { index: 0, cumulativeLength: 0, start: 0, end: 0, length: 0 },
        rowBoundaries: [],
        overshoot: "MIDDLE"
      };
    }
    const isColumn = this.direction === "column";

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
          row[row.length - 1].getDomProperty("READ_1").width;
      } else {
        start = row[0].transform.y ?? 0;
        end =
          (row[row.length - 1].transform.y ?? 0) +
          row[row.length - 1].getDomProperty("READ_1").height;
      }
      let length = row.length;
      rowBoundaries.push({ start, end, index: i, length, cumulativeLength, isSpacer: false });
      cumulativeLength += length;
    }

    if (this.#spacerDomElement) {
      const spacerRect = getDomProperty(this.engine, this.#spacerDomElement);
      const spacerStart = isColumn ? spacerRect.x : spacerRect.y;
      const spacerEnd = isColumn
        ? spacerRect.x + spacerRect.width
        : spacerRect.y + spacerRect.height;

      let overlaps = false;
      for (const boundary of rowBoundaries) {
        if (spacerStart < boundary.end && spacerEnd > boundary.start) {
          overlaps = true;
          boundary.start = Math.min(boundary.start, spacerStart);
          boundary.end = Math.max(boundary.end, spacerEnd);
          break;
        }
      }

      if (!overlaps) {
        rowBoundaries.push({
          start: spacerStart,
          end: spacerEnd,
          index: -1,
          length: 0,
          cumulativeLength: 0,
          isSpacer: true,
        });
        rowBoundaries.sort((a, b) => a.start - b.start);
      }
    }

    let closestRow = rowBoundaries.reduce((prev, curr) => {
      return Math.abs((curr.end + curr.start) / 2 - worldPos) <
        Math.abs((prev.end + prev.start) / 2 - worldPos)
        ? curr
        : prev;
    });

    // Draw a debug rectangle indicating the height of each row
    for (const row of rowBoundaries) {
      const color = row.index === closestRow.index ? "green" : "red";
      if (isColumn) {
        this.addDebugRect(
          row.start,
          10,
          row.end - row.start,
          10,
          color,
          true,
          `row-boundary-${row.index}`,
        );
      } else {
        this.addDebugRect(
          10,
          row.start,
          10,
          row.end - row.start,
          color,
          true,
          `row-boundary-${row.index}`,
        );
      }
    }

    // Draw a bold green rectangle around the closest row
    let minCross = Infinity;
    let maxCross = -Infinity;
    const closestRowItems = closestRow.isSpacer ? [] : rowList[closestRow.index];

    for (const item of closestRowItems) {
      const prop = item.getDomProperty("READ_1");
      if (isColumn) {
        // Main axis is X (start/end are X)
        // Cross axis is Y
        const itemTop = item.transform.y ?? 0;
        const itemBottom = itemTop + prop.height;
        if (itemTop < minCross) minCross = itemTop;
        if (itemBottom > maxCross) maxCross = itemBottom;
      } else {
        // Main axis is Y (start/end are Y)
        // Cross axis is X
        const itemLeft = item.transform.x ?? 0;
        const itemRight = itemLeft + prop.width;
        if (itemLeft < minCross) minCross = itemLeft;
        if (itemRight > maxCross) maxCross = itemRight;
      }
    }

    if (minCross !== Infinity && maxCross !== -Infinity) {
      if (isColumn) {
        this.addDebugRect(
          closestRow.start,
          minCross,
          closestRow.end - closestRow.start,
          maxCross - minCross,
          "green",
          true,
          "closest-row-rect",
          false,
          4,
        );
      } else {
        this.addDebugRect(
          minCross,
          closestRow.start,
          maxCross - minCross,
          closestRow.end - closestRow.start,
          "green",
          true,
          "closest-row-rect",
          false,
          4,
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
    const isColumn = this.direction === "column";
    const sortedItemList = rowItemList.sort((a, b) => {
      if (isColumn) {
        return (
          a.transform.y +
          a.getDomProperty("READ_1").height / 2 -
          (b.transform.y + b.getDomProperty("READ_1").height / 2)
        );
      } else {
        return (
          a.transform.x +
          a.getDomProperty("READ_1").width / 2 -
          (b.transform.x + b.getDomProperty("READ_1").width / 2)
        );
      }
    });
    let leftItem = sortedItemList.findLast((item) => {
      if (isColumn) {
        return (
          item.transform.y + item.getDomProperty("READ_1").height / 2 <= thisWorldPos
        );
      } else {
        return (
          item.transform.x + item.getDomProperty("READ_1").width / 2 <= thisWorldPos
        );
      }
    });
    let rightItem = sortedItemList.find((item) => {
      if (isColumn) {
        return (
          item.transform.y + item.getDomProperty("READ_1").height / 2 >= thisWorldPos
        );
      } else {
        return (
          item.transform.x + item.getDomProperty("READ_1").width / 2 >= thisWorldPos
        );
      }
    });

    let leftItemRight, rightItemLeft;
    if (isColumn) {
      leftItemRight = leftItem
        ? leftItem.transform.y + leftItem.getDomProperty("READ_1").height
        : undefined;
      rightItemLeft = rightItem?.transform.y;
    } else {
      leftItemRight = leftItem
        ? leftItem.transform.x + leftItem.getDomProperty("READ_1").width
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

  determineDropIndex(item: ItemObject, stage: "READ_1" | "READ_2" | "READ_3" = "READ_1"): { dropIndex: number, rowDropIndex: number, closestRowIndex: number } {
    const readProp = item.getDomProperty(stage);
    const thisWorldX = item.transform.x + readProp.width / 2;
    const thisWorldY = item.transform.y + readProp.height / 2;
    
    this.addDebugRect(thisWorldX - 5, thisWorldY - 5, 10, 10, "purple", true, "item-center");

    if (this.#spacerDomElement) {
      const spacerProp = getDomProperty(this.engine, this.#spacerDomElement);
      this.addDebugRect(
        spacerProp.x + spacerProp.width / 2 - 5,
        spacerProp.y + spacerProp.height / 2 - 5,
        10,
        10,
        "cyan",
        true,
        "ghost-center"
      );
    }

    const closestContainer = this.getClosestContainer(
      thisWorldX,
      thisWorldY,
    );

    if (closestContainer && closestContainer !== this) {
      console.debug("Item is closest to another container:", closestContainer);
      item.handoffToContainer(closestContainer, stage);
      return closestContainer.determineDropIndex(item, stage);
    }

    // Get the current drop indices
    let dropIndex = item.dropIndex;
    let rowDropIndex = item.rowDropIndex;

    for (const i of this.itemList) {
      i.clearAllDebugMarkers();
    }
    item.debug_all_items();

    const isColumn = this.direction === "column";
    const primaryPos = isColumn ? thisWorldX : thisWorldY;
    const secondaryPos = isColumn ? thisWorldY : thisWorldX;

    let {
      rowList,
      closestRow,
      rowBoundaries: _rowBoundaries,
      overshoot: _overshoot,
    } = this.getClosestRow(primaryPos);
    if (rowList.length == 0 && !(closestRow as any).isSpacer) {
      return { dropIndex: 0, rowDropIndex: 0, closestRowIndex: 0 };
    }
    if ((closestRow as any).isSpacer) {
      return {
        dropIndex: this.#spacerIndex,
        rowDropIndex: 0,
        closestRowIndex: -1,
      };
    }
    let closestRowIndex = closestRow.index;
    let cumulativeLength = closestRow.cumulativeLength;

    const isNewRow =
      closestRowIndex !== this.#lastClosestRowIndex;
      
    this.#lastClosestRowIndex = closestRowIndex;

    let leftItem: ItemObject | undefined;
    let rightItem: ItemObject | undefined;
    let leftItemRight: number | undefined;
    let rightItemLeft: number | undefined;

    if (isNewRow && this.#itemList.length > 0) {
      // Gap Insertion Logic
      const rowItems = rowList[closestRowIndex];
      // print the bounds of each item in the row as a string to the console
      let insertIndex = 0;
      for (const rowItem of rowItems) {
        const prop = rowItem.getDomProperty(stage);
        const center = isColumn
        ? (rowItem.transform.y ?? 0) + prop.height / 2
        : (rowItem.transform.x ?? 0) + prop.width / 2;

        if (secondaryPos < center) {
          break;
        }
        insertIndex++;
      }

      rowDropIndex = insertIndex;

      leftItem = insertIndex > 0 ? rowItems[insertIndex - 1] : undefined;
      rightItem =
        insertIndex < rowItems.length ? rowItems[insertIndex] : undefined;

      if (isColumn) {
        leftItemRight = leftItem
          ? (leftItem.transform.y ?? 0) + leftItem.getDomProperty(stage).height
          : undefined;
        rightItemLeft = rightItem ? (rightItem.transform.y ?? 0) : undefined;
      } else {
        leftItemRight = leftItem
          ? (leftItem.transform.x ?? 0) + leftItem.getDomProperty(stage).width
          : undefined;
        rightItemLeft = rightItem ? (rightItem.transform.x ?? 0) : undefined;
      }
    } else {
      ({ leftItem, rightItem, leftItemRight, rightItemLeft } =
        this.findClosestItems(rowList[closestRowIndex], secondaryPos));
    }

    // Draw a tall vertical line to indicate the left border of the item
    if (leftItem) {
      const leftItemSize = isColumn
        ? leftItem.getDomProperty(stage).height
        : leftItem.getDomProperty(stage).width;
      const leftBuffer = leftItemSize * 0.25;
      if (isColumn) {
        leftItem.addDebugRect(
          leftItem.transform.x,
          leftItemRight ?? 0,
          leftItem.getDomProperty(stage).width,
          2,
          "red",
          true,
          `leftItem-${leftItem.gid}`,
        );
        leftItem.addDebugRect(
          leftItem.transform.x,
          (leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer,
          leftItem.getDomProperty(stage).width,
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
          leftItem.getDomProperty(stage).height,
          "red",
          true,
          `leftItem-${leftItem.gid}`,
        );
        leftItem.addDebugRect(
          (leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer,
          leftItem.transform.y,
          2,
          leftItem.getDomProperty(stage).height,
          "orange",
          true,
          `leftItem-buffer-${leftItem.gid}`,
        );
      }
    }

    if (rightItem) {
      const rightItemSize = isColumn
        ? rightItem.getDomProperty(stage).height
        : rightItem.getDomProperty(stage).width;
      const rightBuffer = rightItemSize * 0.25;
      if (isColumn) {
        rightItem.addDebugRect(
          rightItem.transform.x,
          rightItemLeft ?? 0,
          rightItem.getDomProperty(stage).width,
          2,
          "red",
          true,
          `rightItem-${rightItem.gid}`,
        );
        rightItem.addDebugRect(
          rightItem.transform.x,
          (rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer,
          rightItem.getDomProperty(stage).width,
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
          rightItem.getDomProperty(stage).height,
          "red",
          true,
          `rightItem-${rightItem.gid}`,
        );
        rightItem.addDebugRect(
          (rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer,
          rightItem.transform.y,
          2,
          rightItem.getDomProperty(stage).height,
          "orange",
          true,
          `rightItem-buffer-${rightItem.gid}`,
        );
      }
    }

    if (isColumn) {
      this.addDebugRect(
        item.transform.x,
        thisWorldY,
        item.getDomProperty(stage).width,
        2,
        "blue",
        true,
        `thisItem-${item.gid}`,
      );
    } else {
      this.addDebugRect(
        thisWorldX,
        item.transform.y,
        2,
        item.getDomProperty(stage).height,
        "blue",
        true,
        `thisItem-${item.gid}`,
      );
    }

    if (!isNewRow) {
      const itemSize = isColumn
        ? item.getDomProperty(stage).height
        : item.getDomProperty(stage).width;
      const leftItemSizeCalc = isColumn
        ? leftItem?.getDomProperty(stage).height ?? 0
        : leftItem?.getDomProperty(stage).width ?? 0;
      const rightItemSizeCalc = isColumn
        ? rightItem?.getDomProperty(stage).height ?? 0
        : rightItem?.getDomProperty(stage).width ?? 0;
      const leftBufferCalc = leftItemSizeCalc * 0.25;
      const rightBufferCalc = rightItemSizeCalc * 0.25;

      if (
        rightItem &&
        leftItem &&
        leftItemRight &&
        rightItemLeft &&
        Math.abs(rightItemLeft - leftItemRight) < itemSize * 0.75
      ) {
        // "Squeeze in" between the two items when moving to a new row
        // console.debug("Squeezing in between two items");
        rowDropIndex = rowList[closestRowIndex].indexOf(rightItem);
      } else if (
        leftItem &&
        leftItemRight &&
        leftItemRight - leftItemSizeCalc / 2 + leftBufferCalc > secondaryPos
      ) {
        // Center of this item is left of the threshold of the left item
        // console.debug("Center is left of the threshold of the left item");
        rowDropIndex = rowList[closestRowIndex].indexOf(leftItem);
      } else if (
        rightItem &&
        rightItemLeft &&
        rightItemLeft + rightItemSizeCalc / 2 - rightBufferCalc < secondaryPos
      ) {
        // console.debug("Center is right of the threshold of the right item");
        // Center of this item is right of the threshold of the right item
        rowDropIndex = rowList[closestRowIndex].indexOf(rightItem) + 1;
      } else if (rightItemLeft == undefined) {
        // console.debug("Right item left is undefined");
        rowDropIndex = rowList[closestRowIndex].length;
      } else if (leftItemRight == undefined) {
        // console.debug("Left item right is undefined");
        rowDropIndex = 0;
      } else {
        // console.debug("Defaulting rowDropIndex to end of row");
      }
    }

    if (rowDropIndex > rowList[closestRowIndex].length) {
      // console.debug("Row drop index is greater than the length of the closest row");
      dropIndex = -1;
    } else {
      dropIndex = cumulativeLength + rowDropIndex;
    }

    console.debug(`Current drop index: ${this.#spacerIndex}, Determined dropIndex: ${dropIndex}, rowDropIndex: ${rowDropIndex}, closestRowIndex: ${closestRowIndex}`);
    return {
      dropIndex,
      rowDropIndex,
      closestRowIndex,
    };
  }

  /**
   * Saves the current DOM properties to the transform for all items in the container.
   * This does not queue a read, so the caller should call this in a read stage callback or
   * be aware of possible performance implications.
   * @param stage 
   */
  captureState(stage: "READ_1" | "READ_2" | "READ_3" = "READ_1") {
    this.readDom(true, stage);
    this.saveDomPropertyToTransform(stage);
    for (const item of this.#itemList) {
      item.readDom(true, stage);
      item.saveDomPropertyToTransform(stage);
    }
  }

  set lastClosestRowIndex(value: number) {
    this.#lastClosestRowIndex = value;
  }
}
