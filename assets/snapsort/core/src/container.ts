import { BaseObject, getDomProperty } from "@snap-engine/core";
import { ItemObject, ClickAction, forEachInContainer } from "./item";
export type { ClickAction } from "./item";
import { AnimationObject } from "@snap-engine/core/animation";

const BUFFER = 20;

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

export class ItemContainer extends ItemObject {
  #itemList: ItemObject[] = [];
  #itemRows: ItemObject[][] = [];
  #dragItem: ItemObject | null = null;
  #ghostDomElement: HTMLElement | null = null;
  #spacerIndex: number = -1;
  #config: ItemContainerConfig;
  #lastClosestRowIndex: number = -1;
  #depth: number = 0;

  constructor(
    engine: any,
    parent: BaseObject | null,
    config?: ItemContainerConfig,
  ) {
    super(engine, parent);
    this.locked = true;
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

    this.style = {
      position: "relative",
    };

    if (!this.global.data["dragAndDropContainers"]) {
      this.global.data["dragAndDropContainers"] = [];
    }
    this.global.data["dragAndDropContainers"].push(this);

    // Capture initial positions once the DOM element is assigned so that
    // cross-container drags work immediately after page load.
    this.event.dom.onAssignDom = function (this: ItemContainer) {
      this.queueUpdate("READ_1", () => {
        this.captureState("READ_1");
        this.setItemRows(null);
      });
    };
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

  get onClickAction(): ClickAction | null {
    return this.#config.onClickAction ?? null;
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

  get ghostDomElement() {
    return this.#ghostDomElement;
  }

  get itemList() {
    return this.#itemList;
  }

  get itemRows() {
    return this.#itemRows;
  }

  /**
   * Get metadata from all items currently in this container.
   * @returns Array of metadata objects from each item in order
   */
  getItemsMetadata<T = Record<string, unknown>>(): T[] {
    return this.#itemList.map((item) => item.metadata as T);
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
      return;
    }
    this.#itemList.push(item);
    item.setContainer(this);
  }

  removeItem(item: ItemObject) {
    // const initialLength = this.#itemList.length;
    this.#itemList = this.#itemList.filter((i) => i !== item);
  }

  /**
   * Get the container that is closest to the given world coordinates.
   * If there are multiple containers that is nested at the same level, 
   * the one with the closest edge will be returned.
   * If the world coordinate overlaps with a container that has more deeply nested 
   * than the others, it will take precedence.
   * @param worldX
   * @param worldY
   * @returns
   */
  getClosestContainer(item: ItemObject, worldX: number, worldY: number): ItemContainer | null {
    let closestContainer = this.rootContainer;
    let closestDistance = Infinity;
    let maxDepth = -1;

    for (let c of this.global.data["dragAndDropContainers"] || []) {
      const container: ItemContainer = c as ItemContainer;
      // Only look at containers in the same group
      if (container.groupID !== this.#config.groupID) {
        continue;
      }
      // Skip the item currently being dragged (it's an ItemContainer following the cursor)
      if (container === this.#dragItem) {
        continue;
      }

      const itemPoint = item.centerPointCollider;
      const containerBox = container.hitboxCollider;
      if (!itemPoint || !containerBox) {
        continue;
      }
      
      // Only consider containers that the item overlaps with.
      if (!itemPoint.isCollidingWith(containerBox)) {
        continue;
      }

      if (container.#depth > maxDepth) {
        closestContainer = container;
        maxDepth = container.#depth;
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

    // Draw all containers in the group
    for (let c of this.global.data["dragAndDropContainers"] || []) {
      const container: ItemContainer = c as ItemContainer;
      if (container.groupID !== this.#config.groupID) continue;
      if (container === this.#dragItem) continue;
      const cProp = container.getDomProperty("READ_1");
      const isClosest = container === closestContainer;
      this.addDebugRect(
        cProp.x, cProp.y, cProp.width, cProp.height,
        isClosest ? "rgba(0, 120, 255, 0.6)" : "rgba(150, 150, 150, 0.3)",
        true,
        `container-${container.gid}`,
        false,
        isClosest ? 3 : 1,
        "containers",
      );
      this.addDebugText(
        cProp.x + 4, cProp.y + 14,
        `${isClosest ? "target: " : ""}${container.name ?? "unnamed"}`,
        isClosest ? "rgba(0, 120, 255, 0.9)" : "rgba(150, 150, 150, 0.6)",
        true,
        `container-label-${container.gid}`,
        "containers",
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

  setAllDepth(depth: number, root: ItemContainer | null = null) {
    this.#depth = depth;
    // The root is this container itself when at depth 0, otherwise the root passed down from above.
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

  /**
   * Set the item rows based on the document position of the items.
   * It assumes the latest DOM positions of the container and all items has already been saved.
   */
  setItemRows(caller: ItemObject | null) {

    if (this.container) {
      this.container.setItemRows(this);
    } else {
      this.setAllDepth(0);
    }

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

  

  updateGhostItem(caller: ItemObject, itemIndex: number | null) {
    const root = (this.rootContainer ?? this) as ItemContainer;
    if (root.rootHasGhostItem()) {
      console.log("Removing existing ghost item before adding new one");
      root.rootRemoveGhostItem();
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
    this.#ghostDomElement = tmpDomElement;
    this.#spacerIndex = itemIndex;
    this.reorderItemList();
  }

  removeGhostItem() {
    if (this.#ghostDomElement) {
      this.#ghostDomElement.remove();
      this.#ghostDomElement = null;

      if (this.engine && this.engine.debugMarkerList) {
        delete this.engine.debugMarkerList[`${this.gid}-ghost-center`];
      }
    }
  }

  // Recursively removes ghost DOM elements from this container and all nested child containers.
  rootRemoveGhostItem() {
    this.removeGhostItem();
    for (const item of this.#itemList) {
      if (item instanceof ItemContainer) {
        item.rootRemoveGhostItem();
      }
    }
  }

  // Recursively reads and syncs DOM properties for all items in this container and nested child containers.
  readAllItemsDom(accountTransform: boolean, stage: "READ_1" | "READ_2" | "READ_3") {
    this.readDom(accountTransform, stage);
    this.syncFromDom(stage);
    for (const item of this.#itemList) {
      item.readDom(accountTransform, stage);
      item.syncFromDom(stage);
      if (item instanceof ItemContainer) {
        item.readAllItemsDom(accountTransform, stage);
      }
    }
    // this.captureState(stage);
    this.setItemRows(this);
  }

  // Recursively copies a DOM property from one stage to another for all items in this container and nested child containers.
  copyAllItemsDomProperty(from: "READ_1" | "READ_2" | "READ_3", to: "READ_1" | "READ_2" | "READ_3") {
    for (const item of this.#itemList) {
      item.copyDomProperty(from, to);
      if (item instanceof ItemContainer) {
        item.copyAllItemsDomProperty(from, to);
      }
    }
  }

  // Returns true if this container or any nested child container has an active ghost DOM element.
  rootHasGhostItem(): boolean {
    if (this.#ghostDomElement !== null) {
      return true;
    }
    for (const item of this.#itemList) {
      if (item instanceof ItemContainer && item.rootHasGhostItem()) {
        return true;
      }
    }
    return false;
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
      const read1 = item.getDomProperty("READ_1");
      const read2 = item.getDomProperty("READ_2");
      const read3 = item.getDomProperty("READ_3");
      // const prevX = item.animationStartX - item.container.animationStartX;
      // const prevY = item.animationStartY - item.container.animationStartY;
      // const currX = item.animationEndX - item.container.animationStartX;
      // const currY = item.animationEndY - item.container.animationStartY;
      // const dx = prevPos.screenX - currPos.screenX;
      // const dy = prevPos.screenY - currPos.screenY;

      // Calculate the offset between the previous and current position of the item
      const dx = read1.x - read3.x;
      const dy = read1.y - read3.y;
      let offsetX = 0;
      let offsetY = 0;

      // Account for the case where the item is moving to a different container, 
      // in which case read 1 and read 2 will contain the position relative to the old container, while read 3 is relative to the new container.
      if (item.container) {
        const containerRead1 = item.container.getDomProperty("READ_1");
        // const containerRead2 = item.container.getDomProperty("READ_2");
        const containerRead3 = item.container.getDomProperty("READ_3");
        const containerDx = containerRead1.x - containerRead3.x;
        const containerDy = containerRead1.y - containerRead3.y;
        // const offsetDX = read2.x - read1.x;
        // const offsetDY = read2.y - read1.y;
        offsetX = -containerDx;
        offsetY = -containerDy;
        // console.log(`Item ${item.gid} is moving to a different container, applying offset: offsetX=${offsetX}, offsetY=${offsetY}`);
      }

      console.log(`Item ${item.gid}: dx=${dx + offsetX}, dy=${dy + offsetY}`);

      // Only animate if there's significant movement
      if (Math.abs(dx + offsetX) >= 0.5 || Math.abs(dy + offsetY) >= 0.5) {
        // Debug: draw line from start to end of animation
        const startX = read1.x + read1.width / 2;
        const startY = read1.y + read1.height / 2;
        const endX = read3.x + read3.width / 2;
        const endY = read3.y + read3.height / 2;
        item.addDebugLine(startX, startY, endX, endY, "rgba(255, 180, 0, 0.6)", true, `anim-reorder-${item.gid}`, 1, "animations");
        item.addDebugCircle(startX, startY, 3, "rgba(255, 180, 0, 0.6)", true, `anim-start-${item.gid}`, "animations");
        item.addDebugCircle(endX, endY, 3, "rgba(0, 200, 100, 0.6)", true, `anim-end-${item.gid}`, "animations");

        const calculateDelta = (t: number) => {
          const currentDx = (dx + offsetX) * (1 - t);
          const currentDy = (dy + offsetY) * (1 - t);
          return `translate3d(${currentDx}px, ${currentDy}px, 0px)`;
        }

        const animation = new AnimationObject(
          null,
          {
            $t: [0, 1],
          },
          {
            duration: 1000,//animConfig.duration ?? 100,
            easing: animConfig.timing_function ?? "ease-out",
            tick: (vars) => {
              const t = vars.$t;
              item.element!.style.transform = calculateDelta(t);
            },
            start: () => {
              console.log(`Starting animation for item ${item.gid}`);
              item.element!.style.transform = calculateDelta(1);
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
      // if (item instanceof ItemContainer) {
      //   item.animateItems(fromStage, toStage);
      // }
    }
  }

  addGhostBeforeItem(
    caller: ItemObject,
    // _differentRow: boolean,
    differentContainer: boolean,
    prevContainer: ItemContainer,
  ) {
    const root = (this.rootContainer ?? this) as ItemContainer;
    // Read the DOM positions before updating the ghost
    this.queueUpdate("READ_1", () => {
      // accountTransform is true so we can get the position of the item 
      // regardless of the animations applied to it.
      root.readAllItemsDom(true, "READ_1");
      forEachInContainer(root, (item) => {
        const itemProp = item.getDomProperty("READ_1");
        const containerProp = item.container.getDomProperty("READ_1");
        // item.initialWorldX = itemProp.x;
        // item.initialWorldY = itemProp.y;
        item.animationStartX = itemProp.x;
        item.animationStartY = itemProp.y;
        // item.animationStartX = 0;
        // item.animationStartY = 0;
        item.animationEndX = 0;
        item.animationEndY = 0;
      });
    });

    // Remove the ghost item
    this.queueUpdate("WRITE_1", () => {
      // this.removeGhostItem();
      // root.rootRemoveGhostItem();
      // add ghost to the new position
      // caller.element!.style.transform = ""; // Reset any transform on the caller to get accurate measurements
      // caller.element!.style.transformOrigin = ""; // Reset any transition on the caller to avoid animation when moving the DOM element
      this.updateGhostItem(caller, caller.dropIndex ?? 0);
      // Item DOM stays in root container throughout the drag — no DOM move needed here.
    });
    // Save the DOM positions after the ghost item is removed
    this.queueUpdate("READ_2", () => {
      root.readAllItemsDom(true, "READ_2");
      // Copy the updated values to READ_1 so animation uses the correct positions. 
      // caller.copyDomProperty("READ_2", "READ_1");
      // root.copyAllItemsDomProperty("READ_2", "READ_1");
      this.reorderItemList();
      this.setItemRows(caller);
      this.updateItemIndexes();

      // const savedDropIndex = caller.dropIndex;
      // Determine where the caller should be dropped
      const currentContainer = caller.container.gid;
      let {
        dropIndex,
        rowDropIndex,
        closestRowIndex: _closestRowIndex,
        container: _dropContainer,
      } = this.determineDropIndex(caller, "READ_2");
      // console.log(`Container changed from ${caller.container.name} to ${_dropContainer.name}, dropIndex: ${dropIndex}, rowDropIndex: ${rowDropIndex}, closestRowIndex: ${_closestRowIndex}`);
      const differentContainer = currentContainer !== _dropContainer.gid;

      this.queueUpdate("WRITE_2", () => {
        _dropContainer.updateGhostItem(caller, dropIndex);
        // If the caller is moving to a different container, 
        // we need to move its DOM element immediately.
        if (differentContainer) {
          console.log(`Moving item ${caller.gid} from container ${caller.container.name} to container ${_dropContainer.name}`);
            _dropContainer!.element?.appendChild(caller.element!);
        }
        caller.dropIndex = dropIndex;
        caller.rowDropIndex = rowDropIndex;
      });
    });
    this.queueUpdate("READ_3", () => {
      root.readAllItemsDom(true, "READ_3");
      this.reorderItemList();
      this.setItemRows(caller);
      this.updateItemIndexes();

      forEachInContainer(root, (item) => {
        // If the caller is dropped into a different container, 
        // we need to recalculate the animation start positions 
        // relative to the new container's position after the ghost has been moved.
        // const itemProp = item.getDomProperty("READ_2");
        // const containerProp = item.container.getDomProperty("READ_2");
        // item.animationStartX = item.initialWorldX - containerProp.x;
        // item.animationStartY = item.initialWorldY - containerProp.y;
        const finalItemProp = item.getDomProperty("READ_3");
        const finalContainerProp = item.container.getDomProperty("READ_3");
        item.animationEndX = finalItemProp.x;
        item.animationEndY = finalItemProp.y;  

      });

      // If a container that lost or received an item needs to be animated, 
      // we must read from READ_2 which has the correct size and position 
      // after the ghost has been moved. 
      // prevContainer.copyDomProperty("READ_2", "READ_1");
      // Animate items from READ_1 to READ_3 positions
      // Only animate items in this hierarchy to avoid "nested" animations.
      // prevContainer.animateItems("READ_1", "READ_3");
      
      this.queueUpdate("WRITE_3", () => {
        root.animateItems("READ_1", "READ_3");
        // prevContainer.animateItems("READ_1", "READ_3");
        forEachInContainer(root, (item) => {
          if (item instanceof ItemContainer) {
            item.animateItems("READ_1", "READ_3");
          }
        });
        root.copyAllItemsDomProperty("READ_3", "READ_1");
        // If the caller is dropped into a different container, 
        // update the transform of the item once again with the updated offsets.
        caller.writeTransform();
      });
    });

  }

  removeAllGhost(animate: boolean = false) {
    const root = (this.rootContainer ?? this) as ItemContainer;
    // Capture positions before ghost removal for animation
    if (animate) {
      this.queueUpdate("READ_1", () => {
        for (const item of this.#itemList) {
          item.readDom(true, "READ_1");
        }
      });
    }

    this.queueUpdate("WRITE_1", () => {
      this.removeGhostItem();
    });
    this.queueUpdate("READ_2", () => {
      root.readAllItemsDom(false, "READ_2");
      this.setItemRows(null);
      this.reorderItemList();

      // Animate items filling the gap left by the removed ghost
      if (animate) {
        const reorderConfig = this.configuration.animation?.reorder;
        if (reorderConfig) {
          for (const item of this.#itemList) {
            const prev = item.getDomProperty("READ_1");
            const curr = item.getDomProperty("READ_2");
            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;

            if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
              item.addDebugLine(prev.x + prev.width / 2, prev.y + prev.height / 2, curr.x + curr.width / 2, curr.y + curr.height / 2, "rgba(255, 180, 0, 0.6)", true, `anim-ghost-${item.gid}`, 1, "animations");
              item.addDebugCircle(prev.x + prev.width / 2, prev.y + prev.height / 2, 3, "rgba(255, 180, 0, 0.6)", true, `anim-ghost-start-${item.gid}`, "animations");
              item.addDebugCircle(curr.x + curr.width / 2, curr.y + curr.height / 2, 3, "rgba(0, 200, 100, 0.6)", true, `anim-ghost-end-${item.gid}`, "animations");

              const anim = new AnimationObject(
                item.element,
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
              item.addAnimation(anim);
              anim.play();
            }
          }
        }
      }
    });
    this.#spacerIndex = -1;
  }

  pickUpItem(item: ItemObject) {
    this.#dragItem = item;
    this.removeItem(item);
  }

  addItemAfter(item: ItemObject, afterItem: ItemObject) {
    const index = this.#itemList.indexOf(afterItem);
    if (index === -1) {
      // afterItem not found (e.g. dropIndex was past the end) — append
      this.#itemList.push(item);
    } else {
      this.#itemList.splice(index + 1, 0, item);
    }
    item.setContainer(this);
    this.#dragItem = null;
  }

  /**
   * Insert an item at a specific index in the item list.
   * If the index is past the end, the item is appended.
   */
  insertItemAt(item: ItemObject, index: number) {
    if (index >= this.#itemList.length) {
      this.#itemList.push(item);
    } else {
      this.#itemList.splice(index, 0, item);
    }
    item.setContainer(this);
    this.#dragItem = null;
  }

  updateItemIndexes() {
    this.#itemList.forEach((item, index) => {
      item.indexInList = index;
    });
  }


  receiveItem(item: ItemObject) {
    const root = (this.rootContainer ?? this) as ItemContainer;
    // Capture start positions of existing items in this container
    for (const i of this.#itemList) {
      i.readDom(true, "READ_1");
    }

    // Capture start position of the incoming item.
    // accountTransform=true because the item may still have a stale style.transform
    // from cursorDown's writeTransform() (offset mode) that hasn't been cleared yet.
    item.requestRead(true, true, "READ_1");

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
          item.addDebugLine(prev.x + prev.width / 2, prev.y + prev.height / 2, curr.x + curr.width / 2, curr.y + curr.height / 2, "rgba(255, 180, 0, 0.6)", true, `anim-click-${item.gid}`, 1, "animations");
          item.addDebugCircle(prev.x + prev.width / 2, prev.y + prev.height / 2, 3, "rgba(255, 180, 0, 0.6)", true, `anim-click-start-${item.gid}`, "animations");
          item.addDebugCircle(curr.x + curr.width / 2, curr.y + curr.height / 2, 3, "rgba(0, 200, 100, 0.6)", true, `anim-click-end-${item.gid}`, "animations");

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
    });
    item.queueUpdate("WRITE_2", () => {
      item.writeDom();
    });

    // After the animation completes and DOM is settled, re-read positions
    // into READ_1 so the next click-move starts from the correct position.
    // Use accountTransform=true in case any inline style.transform is still applied.
    this.queueUpdate("READ_3", () => {
      root.readAllItemsDom(true, "READ_3");
      root.copyAllItemsDomProperty("READ_3", "READ_1");
    });
  }

  sendItem(item: ItemObject) {
    const root = (this.rootContainer ?? this) as ItemContainer;
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
            i.addDebugLine(prev.x + prev.width / 2, prev.y + prev.height / 2, curr.x + curr.width / 2, curr.y + curr.height / 2, "rgba(255, 180, 0, 0.6)", true, `anim-send-${i.gid}`, 1, "animations");
            i.addDebugCircle(prev.x + prev.width / 2, prev.y + prev.height / 2, 3, "rgba(255, 180, 0, 0.6)", true, `anim-send-start-${i.gid}`, "animations");
            i.addDebugCircle(curr.x + curr.width / 2, curr.y + curr.height / 2, 3, "rgba(0, 200, 100, 0.6)", true, `anim-send-end-${i.gid}`, "animations");

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

      root.copyAllItemsDomProperty("READ_2", "READ_1");
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

    if (this.#ghostDomElement) {
      const ghostRect = getDomProperty(this.engine, this.#ghostDomElement);
      const spacerStart = isColumn ? ghostRect.x : ghostRect.y;
      const spacerEnd = isColumn
        ? ghostRect.x + ghostRect.width
        : ghostRect.y + ghostRect.height;

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

    // Draw a debug indicator for each row boundary
    for (const row of rowBoundaries) {
      const isActive = row.index === closestRow.index;
      const color = isActive ? "rgba(0, 200, 0, 0.7)" : "rgba(200, 0, 0, 0.3)";
      if (isColumn) {
        this.addDebugRect(
          row.start,
          4,
          row.end - row.start,
          8,
          color,
          true,
          `row-boundary-${row.index}`,
          true,
          1,
          "rows",
        );
        this.addDebugText(
          row.start + 2,
          24,
          `row ${row.index}`,
          color,
          true,
          `row-label-${row.index}`,
          "rows",
        );
      } else {
        this.addDebugRect(
          4,
          row.start,
          8,
          row.end - row.start,
          color,
          true,
          `row-boundary-${row.index}`,
          true,
          1,
          "rows",
        );
        this.addDebugText(
          16,
          row.start + 14,
          `row ${row.index}`,
          color,
          true,
          `row-label-${row.index}`,
          "rows",
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
        const itemTop = item.transform.y ?? 0;
        const itemBottom = itemTop + prop.height;
        if (itemTop < minCross) minCross = itemTop;
        if (itemBottom > maxCross) maxCross = itemBottom;
      } else {
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
          "rgba(0, 200, 0, 0.4)",
          true,
          "closest-row-rect",
          false,
          3,
          "rows",
        );
      } else {
        this.addDebugRect(
          minCross,
          closestRow.start,
          maxCross - minCross,
          closestRow.end - closestRow.start,
          "rgba(0, 200, 0, 0.4)",
          true,
          "closest-row-rect",
          false,
          3,
          "rows",
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

  determineDropIndex(item: ItemObject, stage: "READ_1" | "READ_2" | "READ_3" = "READ_1"): { dropIndex: number, rowDropIndex: number, closestRowIndex: number, container: ItemContainer } {
    const readProp = item.getDomProperty(stage);
    const thisWorldX = item.transform.x + readProp.width / 2;
    const thisWorldY = item.transform.y + readProp.height / 2;

    this.addDebugCircle(thisWorldX, thisWorldY, 6, "rgba(160, 0, 255, 0.8)", true, "item-center", "drop-index");
    this.addDebugText(thisWorldX + 10, thisWorldY - 4, "drag center", "rgba(160, 0, 255, 0.8)", true, "item-center-label", "drop-index");

    if (this.#ghostDomElement) {
      const ghostProp = getDomProperty(this.engine, this.#ghostDomElement);
      this.addDebugRect(
        ghostProp.x,
        ghostProp.y,
        ghostProp.width,
        ghostProp.height,
        "rgba(0, 210, 210, 0.4)",
        true,
        "ghost-rect",
        false,
        2,
        "drop-index",
      );
      this.addDebugText(ghostProp.x + 4, ghostProp.y + 14, "ghost", "rgba(0, 180, 180, 0.9)", true, "ghost-label", "drop-index");
    }

    const closestContainer = this.getClosestContainer(
      item,
      thisWorldX,
      thisWorldY,
    );

    if (closestContainer && closestContainer !== this) {
      this.addDebugText(4, 88, `handoff → ${closestContainer.name ?? "?"}`, "rgba(255, 200, 0, 0.9)", true, "handoff-label", "containers");
      item.handoffToContainer(closestContainer, stage);
      return closestContainer.determineDropIndex(item, stage);
    }

    // Get the current drop indices
    let dropIndex = item.dropIndex;
    let rowDropIndex = item.rowDropIndex;

    // Clear debug markers for items in this container (but not other containers,
    // so handoff debug info stays visible on the source container).
    for (const i of this.itemList) {
      i.clearAllDebugMarkers();
    }
    item.debug_all_items();

    const isColumn = this.direction === "column";
    const primaryPos = isColumn ? thisWorldX : thisWorldY;
    const secondaryPos = isColumn ? thisWorldY : thisWorldX;

    // Draw a line showing the secondaryPos used for insert/slide decisions
    const containerProp = this.getDomProperty(stage);
    if (isColumn) {
      this.addDebugLine(containerProp.x, secondaryPos, containerProp.x + containerProp.width, secondaryPos, "rgba(255, 255, 0, 0.5)", true, "secondary-pos-line", 1, "drop-index");
    } else {
      this.addDebugLine(secondaryPos, containerProp.y, secondaryPos, containerProp.y + containerProp.height, "rgba(255, 255, 0, 0.5)", true, "secondary-pos-line", 1, "drop-index");
    }

    let {
      rowList,
      closestRow,
      rowBoundaries: _rowBoundaries,
      overshoot: _overshoot,
    } = this.getClosestRow(primaryPos);
    if (rowList.length == 0 && !(closestRow as any).isSpacer) {
      return { dropIndex: 0, rowDropIndex: 0, closestRowIndex: 0, container: this };
    }
    if ((closestRow as any).isSpacer) {
      return {
        dropIndex: this.#spacerIndex,
        rowDropIndex: 0,
        closestRowIndex: -1,
        container: this,
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

    this.addDebugText(4, 40, `${isNewRow ? "mode: INSERT" : "mode: SLIDE"}  stage: ${stage}  secPos: ${Math.round(secondaryPos)}`, "rgba(255, 255, 255, 0.8)", true, "drop-mode", "drop-index");

    if (isNewRow && this.#itemList.length > 0) {
      // Gap Insertion Logic — used when entering a new row or container
      const rowItems = rowList[closestRowIndex];
      let insertIndex = 0;
      for (let i = 0; i < rowItems.length; i++) {
        const rowItem = rowItems[i];
        const prop = rowItem.getDomProperty(stage);
        const center = isColumn
        ? (rowItem.transform.y ?? 0) + prop.height / 2
        : (rowItem.transform.x ?? 0) + prop.width / 2;

        // Visualize each item's center and the comparison against secondaryPos
        const passed = secondaryPos >= center;
        const markerColor = passed ? "rgba(0, 200, 0, 0.6)" : "rgba(200, 0, 0, 0.6)";
        if (isColumn) {
          rowItem.addDebugLine(rowItem.transform.x, center, rowItem.transform.x + prop.width, center, markerColor, true, `insert-center-${i}`, 2, "drop-index");
          rowItem.addDebugText(rowItem.transform.x + prop.width + 4, center + 4, `[${i}] c=${Math.round(center)} ${passed ? "PASS" : "STOP"}`, markerColor, true, `insert-label-${i}`, "drop-index");
        } else {
          rowItem.addDebugLine(center, rowItem.transform.y, center, rowItem.transform.y + prop.height, markerColor, true, `insert-center-${i}`, 2, "drop-index");
          rowItem.addDebugText(center + 4, rowItem.transform.y - 4, `[${i}] c=${Math.round(center)} ${passed ? "PASS" : "STOP"}`, markerColor, true, `insert-label-${i}`, "drop-index");
        }

        if (secondaryPos < center) {
          break;
        }
        insertIndex++;
      }

      // Show the resulting insert index
      this.addDebugText(4, 56, `insertIdx: ${insertIndex} / ${rowItems.length}  items: ${this.#itemList.length}`, "rgba(255, 255, 255, 0.8)", true, "insert-index", "drop-index");

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

    // Visualize the neighboring items and their drop thresholds
    if (leftItem) {
      const leftProp = leftItem.getDomProperty(stage);
      const leftItemSize = isColumn ? leftProp.height : leftProp.width;
      const leftBuffer = leftItemSize * 0.25;
      if (isColumn) {
        leftItem.addDebugRect(leftItem.transform.x, leftItemRight ?? 0, leftProp.width, 2, "rgba(255, 80, 80, 0.7)", true, `leftItem-${leftItem.gid}`, true, 1, "drop-index");
        leftItem.addDebugRect(leftItem.transform.x, (leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer, leftProp.width, 2, "rgba(255, 165, 0, 0.7)", true, `leftItem-buffer-${leftItem.gid}`, true, 1, "drop-index");
        leftItem.addDebugText(leftItem.transform.x + 4, (leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer - 4, "threshold", "rgba(255, 165, 0, 0.7)", true, `leftItem-label-${leftItem.gid}`, "drop-index");
      } else {
        leftItem.addDebugRect(leftItemRight ?? 0, leftItem.transform.y, 2, leftProp.height, "rgba(255, 80, 80, 0.7)", true, `leftItem-${leftItem.gid}`, true, 1, "drop-index");
        leftItem.addDebugRect((leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer, leftItem.transform.y, 2, leftProp.height, "rgba(255, 165, 0, 0.7)", true, `leftItem-buffer-${leftItem.gid}`, true, 1, "drop-index");
        leftItem.addDebugText((leftItemRight ?? 0) - leftItemSize / 2 + leftBuffer + 4, leftItem.transform.y + 14, "threshold", "rgba(255, 165, 0, 0.7)", true, `leftItem-label-${leftItem.gid}`, "drop-index");
      }
    }
    if (rightItem) {
      const rightProp = rightItem.getDomProperty(stage);
      const rightItemSize = isColumn ? rightProp.height : rightProp.width;
      const rightBuffer = rightItemSize * 0.25;
      if (isColumn) {
        rightItem.addDebugRect(rightItem.transform.x, rightItemLeft ?? 0, rightProp.width, 2, "rgba(255, 80, 80, 0.7)", true, `rightItem-${rightItem.gid}`, true, 1, "drop-index");
        rightItem.addDebugRect(rightItem.transform.x, (rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer, rightProp.width, 2, "rgba(255, 165, 0, 0.7)", true, `rightItem-buffer-${rightItem.gid}`, true, 1, "drop-index");
        rightItem.addDebugText(rightItem.transform.x + 4, (rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer - 4, "threshold", "rgba(255, 165, 0, 0.7)", true, `rightItem-label-${rightItem.gid}`, "drop-index");
      } else {
        rightItem.addDebugRect(rightItemLeft ?? 0, rightItem.transform.y, 2, rightProp.height, "rgba(255, 80, 80, 0.7)", true, `rightItem-${rightItem.gid}`, true, 1, "drop-index");
        rightItem.addDebugRect((rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer, rightItem.transform.y, 2, rightProp.height, "rgba(255, 165, 0, 0.7)", true, `rightItem-buffer-${rightItem.gid}`, true, 1, "drop-index");
        rightItem.addDebugText((rightItemLeft ?? 0) + rightItemSize / 2 - rightBuffer + 4, rightItem.transform.y + 14, "threshold", "rgba(255, 165, 0, 0.7)", true, `rightItem-label-${rightItem.gid}`, "drop-index");
      }
    }

    // Crosshair line showing the dragged item's secondary axis position
    if (isColumn) {
      this.addDebugRect(item.transform.x, thisWorldY, item.getDomProperty(stage).width, 1, "rgba(0, 120, 255, 0.5)", true, `thisItem-${item.gid}`, true, 1, "item-positions");
    } else {
      this.addDebugRect(thisWorldX, item.transform.y, 1, item.getDomProperty(stage).height, "rgba(0, 120, 255, 0.5)", true, `thisItem-${item.gid}`, true, 1, "item-positions");
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

    this.addDebugText(4, 72, `drop: ${dropIndex}  rowDrop: ${rowDropIndex}  row: ${closestRowIndex}`, "rgba(255, 255, 255, 0.8)", true, "drop-result", "drop-index");

    return {
      dropIndex,
      rowDropIndex,
      closestRowIndex,
      container: this,
    };
  }

  getDepth() {
    return this.#depth;
  }

  // calculateDepth() {
  //   if (!this.container) {
  //     this.#depth = 0;
  //   } else {
  //     this.#depth = this.container.calculateDepth() + 1;
  //   }
  //   return this.#depth;
  // }

  /**
   * Saves the current DOM properties to the transform for all items in the container.
   * This does not queue a read, so the caller should call this in a read stage callback or
   * be aware of possible performance implications.
   * @param stage
   */
  captureState(stage: "READ_1" | "READ_2" | "READ_3" = "READ_1") {
    if (this.container) {
      this.container.captureState(stage);
      // this.#depth = this.container.getDepth() + 1;
    } else {
      // this.#depth = 0;
    }
    this.readDom(true, stage);
    this.syncFromDom(stage);
    for (const item of this.#itemList) {
      item.readDom(true, stage);
      item.syncFromDom(stage);
    }
  }

  set lastClosestRowIndex(value: number) {
    this.#lastClosestRowIndex = value;
  }
}
