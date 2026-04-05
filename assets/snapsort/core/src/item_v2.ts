import { BaseObject, ElementObject } from "@snap-engine/core";
import type { ItemContainerV2 } from "./container_v2";
import { RectCollider, PointCollider } from "@snap-engine/core/collision";
import type {
  dragStartProp,
  dragProp,
  dragEndProp,
} from "@snap-engine/core";
import { ItemObject } from "./item";
import { determineDropTarget as _determineDropTarget } from "./drop_target_v2";

export class ItemObjectV2 extends ElementObject {
  // Container element is the parent element
  // #containerObject: ItemContainerV2 | null = null;
  #rootContainer: ItemContainerV2 | null = null;
  // #metadata: Record<string, unknown> = {};
  #locked: boolean = false;
  #hitbox: RectCollider;
  #centerPoint: PointCollider;

  #dragOffsetX: number = 0;
  #dragOffsetY: number = 0;

  #itemOrderedList: ItemObjectV2[] = []; // Wrapper around children to maintain their order in the DOM

  #isGhost: boolean = false;
  #depth: number = 0;
  ghostItem: ItemObjectV2 | null = null; // The ghost item instance, so we can remove it later
  #groupId: Array<string> | string | null = null;

  constructor(
    engine: any, 
    parent: BaseObject | null, 
    groupId: Array<string> | string | null = null, 
    isGhost: boolean = false) {
    
    super(engine, parent);
    this.#groupId = groupId;
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
      this.#hitbox.local.x = 0;
      this.#hitbox.local.y = 0;
      this.#hitbox.local.width = prop.width;
      this.#hitbox.local.height = prop.height;
      this.#centerPoint.local.x = prop.width / 2;
      this.#centerPoint.local.y = prop.height / 2;
    }
  }

  addItem(item: ItemObjectV2) {
    this.appendChild(item);
  }

  get locked(): boolean {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = value;
  }

  getIndexAndContainer(): { index: number; container: ItemObjectV2 | null } {
    if (!this.parent) {
      return { index: -1, container: null };
    }
    const parentContainer = this.parent as unknown as ItemObjectV2;
    return { index: parentContainer.#itemOrderedList.indexOf(this), container: parentContainer };
  }

  // get metadata(): Record<string, unknown> {
  //   return this.#metadata;
  // }

  // set metadata(value: Record<string, unknown>) {
  //   this.#metadata = value;
  // }

  get container(): ItemContainerV2 {
    if (!this.parent) {
      console.warn("ItemObjectV2 has no container set.");
      return null as any;
    }
    return this.parent as unknown as ItemContainerV2;
  }

  setContainer(value: ItemContainerV2) {
    // this.#containerObject = value;
  }

  get rootContainer(): ItemContainerV2 | null {
    return this.#rootContainer;
  }

  setRootContainer(root: ItemContainerV2 | null) {
    this.#rootContainer = root;
  }

  get isGhost(): boolean {
    return this.#isGhost;
  }

  get depth(): number {
    return this.#depth;
  }

  get itemOrderedList(): ItemObjectV2[] {
    return this.#itemOrderedList;
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
    let color = ItemObjectV2.#containerColors.get(gid);
    if (!color) {
      let hash = 0;
      for (let i = 0; i < gid.length; i++) {
        hash = ((hash << 5) - hash + gid.charCodeAt(i)) | 0;
      }
      const hue = ((hash % 360) + 360) % 360;
      color = `hsl(${hue}, 80%, 55%)`;
      ItemObjectV2.#containerColors.set(gid, color);
    }
    return color;
  }

  /**
   * Draw a debug circle at the center of every item in the hierarchy,
   * color-coded by parent container.
   */
  debugAllItems(node: ItemObjectV2 = this.#rootContainer as unknown as ItemObjectV2 ?? this) {
    const color = ItemObjectV2.#colorForContainer(node.gid);
    for (const child of node.children) {
      if (!(child instanceof ItemObjectV2)) continue;
      const prop = child.getDomProperty("READ_1");
      if (prop) {
        const cx = prop.x + prop.width / 2;
        const cy = prop.y + prop.height / 2;
        child.addDebugCircle(cx, cy, 4, color, true, `center-read1-${child.gid}`, "item-positions");
      }
      // Recurse into children that act as containers
      if (child.children.length > 0) {
        this.debugAllItems(child);
      }
    }
  }

  #findRootContainer() {
    if (this.parent == null) {
      this.#updateState(this as unknown as ItemContainerV2);
      this.requestRead(
        false, true, "READ_1", true
      );
    } else {
      const parentContainer = this.parent as unknown as ItemObjectV2;
      parentContainer.#findRootContainer();
    }
  }

  #updateState(root: ItemContainerV2 | null, depth: number = 0) {
    // Set root container and depth
    this.#rootContainer = root;
    this.#depth = depth;
    // Get the list of children in DOM order
    this.#itemOrderedList = this.childrenInDomOrder() as ItemObjectV2[];
    // Update all its children as well.
    for (const child of this.children) {
      if (child instanceof ItemObjectV2) {
        child.#updateState(root, depth + 1);
      }
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
  #lowerElementToContainer(container: ItemContainerV2) {
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
  moveItemToContainer(container: ItemContainerV2, item: ItemObjectV2, index: number, updateDom: boolean = true) {
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
    // Remove the item from its current container.
    // deleteElement should be false because we will re-insert the same element into the new container, 
    // so we don't want to remove it from the DOM.
    this.removeItemFrom(container, item, false);
    this.insertItemAt(container, item, index);
  }

  /**
   * Insert an item at a specific index in the item list and DOM.
   * If the index is past the end, the item is appended.
   * Note that this assumes the #itemOrderedList is already in the correct order.
   */
  insertItemAt(container: ItemContainerV2, item: ItemObjectV2, index: number) {
    this.appendChild(item);
    if (index >= container.#itemOrderedList.length) {
      container.#itemOrderedList.push(item);
    } else {
      container.#itemOrderedList.splice(index, 0, item);
    }
    const itemAfterIndex = index >= container.#itemOrderedList.length - 1 ? null : container.#itemOrderedList[index + 1];
    container.element?.insertBefore(item.element!, itemAfterIndex ? itemAfterIndex.element : null);
    // item.setContainer(this);
    // this.#dragItem = null;
  }

  /**
   * Remove an item from the item list and DOM.
   * @param item The item to remove.
   * @param deleteElement Whether to delete the DOM element of the item.
   */
  removeItemFrom(container: ItemContainerV2, item: ItemObjectV2, deleteElement: boolean = true) {
    container.removeChild(item);
    container.#itemOrderedList = container.#itemOrderedList.filter((i) => i !== item);
    if (deleteElement) {
      item.element?.remove();
    }
  }

  /**
   * Create or remove a ghost element at the specified container and index.
   * A null container means the ghost element should be removed.
   */
  #updateGhostElement(original: ItemObjectV2, container: ItemContainerV2 | null, index: number) {
    let ghostItem = this.#rootContainer?.ghostItem;

    if (container === null) {
      if (ghostItem) {
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
     
      let ghostElement = document.createElement("div");
      ghostElement.id = "spacer";

      ghostElement.style.width = "" + original.getDomProperty("READ_1").width;
      ghostElement.style.height = "" + original.getDomProperty("READ_1").height;
      // ghostElement.style.margin = "" + original.getDomProperty("READ_1").margin;
      // ghostElement.style.padding = "" + original.getDomProperty("READ_1").padding;
      // ghostElement.style.boxSizing = "" + original.getDomProperty("READ_1").boxSizing;
      ghostElement.classList.add("ghost");

      ghostItem = new ItemObjectV2(this.engine, null, null, true);
      ghostItem.element = ghostElement;

      // Set hitbox so the collision engine can detect overlaps with the ghost
      const origProp = original.getDomProperty("READ_1");
      ghostItem.hitbox.local.width = origProp.width;
      ghostItem.hitbox.local.height = origProp.height;
      ghostItem.centerPoint.local.x = origProp.width / 2;
      ghostItem.centerPoint.local.y = origProp.height / 2;
    }

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

  determineDropTarget(item: ItemObjectV2) {
    const root = this.#rootContainer as unknown as ItemObjectV2 ?? this;
    return _determineDropTarget(item, root);
  }

  dragStart(prop: dragStartProp) {
    if (this.#locked) return;
    // Set the root container for all items, and queue READ to update the state of all containers and items.
    this.#findRootContainer();
    // Get the current index of the item in its container.
    const { index: currentIndex, container: currentContainer } = this.getIndexAndContainer();
    this.queueUpdate("WRITE_1", () => {
      // const itemProperty = this.getDomProperty("READ_1");
      // Save the mouse offset from the top-left corner of the item, so we can maintain that offset during dragging.
      this.#dragOffsetX = prop.start.x - this.transform.x;
      this.#dragOffsetY = prop.start.y - this.transform.y;

      this.#updateGhostElement(this, currentContainer as unknown as ItemContainerV2, currentIndex);

      this.style = {
        cursor: "grabbing",
        position: "absolute",
        zIndex: "1000",
        top: "0px",
        left: "0px",
      };
      this.#hoistElementToRoot();
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
    // Move the item according to mouse position
    this.transform.x = prop.position.x - this.#dragOffsetX;
    this.transform.y = prop.position.y - this.#dragOffsetY;

    // Calculate where to drop the item 
    this.determineDropTarget(this);

    // console.debug(`Dragging item ${this.gid} with root container ${this.#rootContainer?.name}, new position: (${this.transform.x}, ${this.transform.y})`);
    this.requestTransform("WRITE_1");
  }

  dragEnd(prop: dragEndProp) {
    this.requestWrite(true, () => {
      this.#updateGhostElement(this, null, -1);
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
    });
  }

  destroy() {
    // if (this.#containerObject) {
    //   this.#containerObject.removeItem(this);
    // }
    super.destroy();
  }
}
