import type { ItemObjectV2 } from "./item_v2";

// Sub-tags for drop index calculation debug visuals
const TAG_LAYOUT = "drop-layout";         // virtual layout: height bars, layout start lines, ghost positions
const TAG_COLLISIONS = "drop-collisions"; // collision: hitboxes, collision lines, DOM boxes, center points
const TAG_CANDIDATES = "drop-candidates"; // candidates: result lines, best pick

function nestingDepth(node: ItemObjectV2): number {
  return node.depth;
}

/** Get layout direction for a container. ItemContainerV2 has a direction getter; default to "column". */
function getDirection(node: ItemObjectV2): "column" | "row" {
  return ('direction' in node && typeof (node as any).direction === 'string')
    ? (node as any).direction
    : "column";
}

/** Euclidean distance between two points. */
function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export interface VirtualDimensions {
  width: number;
  height: number;
}

export interface DropCandidate {
  container: ItemObjectV2;
  index: number;
  ghostCenterX: number;
  ghostCenterY: number;
  distance: number;
  priority: number; // Higher priority wins on ties. Normal candidates = 0, special cases = 999.
}

/**
 * Recursively compute the virtual dimensions (width and height) of a container
 * by simulating its flex layout, including wrapping for row containers.
 * Excludes the dragged item and ghost items.
 */
export function virtualDimensions(container: ItemObjectV2, draggedItem: ItemObjectV2): VirtualDimensions {
  const isColumn = getDirection(container) === "column";
  const containerProp = container.getDomProperty("READ_1");

  const items = container.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  if (isColumn) {
    // Column: stack vertically. Width = max child width, height = sum of child heights.
    let totalHeight = 0;
    let maxWidth = 0;
    for (const child of items) {
      let childW: number, childH: number;
      if (child.itemOrderedList.length > 0) {
        const dims = virtualDimensions(child, draggedItem);
        childW = dims.width;
        childH = dims.height;
      } else {
        const prop = child.getDomProperty("READ_1");
        childW = prop ? prop.width : 0;
        childH = prop ? prop.height : 0;
      }
      totalHeight += childH;
      maxWidth = Math.max(maxWidth, childW);
    }
    return { width: maxWidth, height: totalHeight };
  } else {
    // Row with wrapping: place items left-to-right, wrap when exceeding container width.
    const containerWidth = containerProp ? containerProp.width : Infinity;
    let rowCursorX = 0;
    let rowMaxHeight = 0;
    let totalHeight = 0;
    let maxRowWidth = 0;

    for (const child of items) {
      let childW: number, childH: number;
      if (child.itemOrderedList.length > 0) {
        const dims = virtualDimensions(child, draggedItem);
        childW = dims.width;
        childH = dims.height;
      } else {
        const prop = child.getDomProperty("READ_1");
        childW = prop ? prop.width : 0;
        childH = prop ? prop.height : 0;
      }

      // Wrap to next row if this item doesn't fit
      if (rowCursorX > 0 && rowCursorX + childW > containerWidth) {
        totalHeight += rowMaxHeight;
        maxRowWidth = Math.max(maxRowWidth, rowCursorX);
        rowCursorX = 0;
        rowMaxHeight = 0;
      }

      rowCursorX += childW;
      rowMaxHeight = Math.max(rowMaxHeight, childH);
    }
    // Final row
    totalHeight += rowMaxHeight;
    maxRowWidth = Math.max(maxRowWidth, rowCursorX);

    return { width: maxRowWidth, height: totalHeight };
  }
}

/**
 * Recursively simulate the layout of a container, including wrapping for row containers.
 * Only try ghost placement at slots adjacent to items in the colliding set.
 *
 * @param container   The container to lay out
 * @param startX      The X origin of this container's content area
 * @param startY      The Y origin of this container's content area
 * @param draggedItem The item being dragged (excluded from layout)
 * @param dragGhostW  Width of the ghost element (dragged item's width)
 * @param dragGhostH  Height of the ghost element (dragged item's height)
 * @param collidingSet Items currently colliding with the dragged item
 * @param dragCenterX Dragged item's center X
 * @param dragCenterY Dragged item's center Y
 */
export function virtualLayoutRecursive(
  container: ItemObjectV2,
  startX: number,
  startY: number,
  draggedItem: ItemObjectV2,
  dragGhostW: number,
  dragGhostH: number,
  collidingSet: Set<ItemObjectV2>,
  dragCenterX: number,
  dragCenterY: number,
): { results: DropCandidate[]; endX: number; endY: number } {
  const isColumn = getDirection(container) === "column";
  const containerProp = container.getDomProperty("READ_1");
  const containerWidth = containerProp ? containerProp.width : Infinity;

  const items = container.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  console.debug(`[virtual-layout] container=${container.gid} dir=${isColumn ? "col" : "row"} start=(${Math.round(startX)},${Math.round(startY)}) items=${items.length}`);

  let results: DropCandidate[] = [];

  // Clear stale ghost candidate rects
  for (let j = 0; j < items.length; j++) {
    container.clearDebugMarker(`vlayout-ghost-before-${container.gid}-${j}`);
    container.clearDebugMarker(`vlayout-ghost-after-${container.gid}-${j}`);
  }

  if (isColumn) {
    // Column layout: single cursor moving down
    let cursorY = startY;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const isColliding = collidingSet.has(item);

      if (isColliding) {
        const gcx = startX + containerWidth / 2;
        const gcy = cursorY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
        results.push({ container, index: j, ghostCenterX: gcx, ghostCenterY: gcy, distance: dist, priority: 0 });
        container.addDebugRect(
          startX, cursorY, containerWidth, dragGhostH,
          "rgba(250, 204, 21, 0.15)", true, `vlayout-ghost-before-${container.gid}-${j}`, true, 1, TAG_LAYOUT,
        );
      }

      // Get child dimensions and advance cursor
      const itemStartY = cursorY;
      let childH: number;
      if (item.itemOrderedList.length > 0) {
        const sub = virtualLayoutRecursive(item, startX, cursorY, draggedItem, dragGhostW, dragGhostH, collidingSet, dragCenterX, dragCenterY);
        results.push(...sub.results);
        childH = sub.endY - cursorY;
      } else {
        const prop = item.getDomProperty("READ_1");
        childH = prop ? prop.height : 0;
      }
      cursorY += childH;

      // Debug: vertical bar for this item's height
      const rootProp = container.rootContainer?.getDomProperty("READ_1");
      const barX = (rootProp ? rootProp.x : startX) - 6 + container.depth * 10;
      item.addDebugLine(barX, itemStartY, barX, cursorY, "rgba(180, 100, 255, 0.7)", true, `vlayout-height-${item.gid}`, 2, TAG_LAYOUT);
      item.addDebugText(barX - 30, itemStartY + childH / 2 + 4, `${Math.round(childH)}`, "rgba(180, 100, 255, 0.7)", true, `vlayout-height-label-${item.gid}`, TAG_LAYOUT);

      if (isColliding) {
        const gcx = startX + containerWidth / 2;
        const gcy = cursorY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
        results.push({ container, index: j + 1, ghostCenterX: gcx, ghostCenterY: gcy, distance: dist, priority: 0 });
        container.addDebugRect(
          startX, cursorY, containerWidth, dragGhostH,
          "rgba(250, 204, 21, 0.15)", true, `vlayout-ghost-after-${container.gid}-${j}`, true, 1, TAG_LAYOUT,
        );
      }
    }

    return { results, endX: startX + containerWidth, endY: cursorY };

  } else {
    // Row layout with wrapping
    let cursorX = startX;
    let cursorY = startY;
    let rowMaxH = 0;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const isColliding = collidingSet.has(item);

      // Get child dimensions
      let childW: number, childH: number;
      if (item.itemOrderedList.length > 0) {
        const dims = virtualDimensions(item, draggedItem);
        childW = dims.width;
        childH = dims.height;
      } else {
        const prop = item.getDomProperty("READ_1");
        childW = prop ? prop.width : 0;
        childH = prop ? prop.height : 0;
      }

      // Wrap check: if this item doesn't fit, move to next row
      if (cursorX > startX && cursorX + childW > startX + containerWidth) {
        cursorY += rowMaxH;
        cursorX = startX;
        rowMaxH = 0;
      }

      if (isColliding) {
        const gcx = cursorX + dragGhostW / 2;
        const gcy = cursorY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
        results.push({ container, index: j, ghostCenterX: gcx, ghostCenterY: gcy, distance: dist, priority: 0 });
        container.addDebugRect(
          cursorX, cursorY, dragGhostW, dragGhostH,
          "rgba(250, 204, 21, 0.15)", true, `vlayout-ghost-before-${container.gid}-${j}`, true, 1, TAG_LAYOUT,
        );
      }

      // Place item and advance
      const itemStartX = cursorX;
      if (item.itemOrderedList.length > 0) {
        const sub = virtualLayoutRecursive(item, cursorX, cursorY, draggedItem, dragGhostW, dragGhostH, collidingSet, dragCenterX, dragCenterY);
        results.push(...sub.results);
      }
      cursorX += childW;
      rowMaxH = Math.max(rowMaxH, childH);

      // Debug: horizontal bar for this item's width
      const rootProp = container.rootContainer?.getDomProperty("READ_1");
      const barY = (rootProp ? rootProp.y : startY) - 6 + container.depth * 10;
      item.addDebugLine(itemStartX, barY, cursorX, barY, "rgba(180, 100, 255, 0.7)", true, `vlayout-height-${item.gid}`, 2, TAG_LAYOUT);
      item.addDebugText(itemStartX + childW / 2 - 8, barY - 8, `${Math.round(childW)}`, "rgba(180, 100, 255, 0.7)", true, `vlayout-height-label-${item.gid}`, TAG_LAYOUT);

      if (isColliding) {
        const gcx = cursorX + dragGhostW / 2;
        const gcy = cursorY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
        results.push({ container, index: j + 1, ghostCenterX: gcx, ghostCenterY: gcy, distance: dist, priority: 0 });
        container.addDebugRect(
          cursorX, cursorY, dragGhostW, dragGhostH,
          "rgba(250, 204, 21, 0.15)", true, `vlayout-ghost-after-${container.gid}-${j}`, true, 1, TAG_LAYOUT,
        );
      }
    }

    // Final row height
    cursorY += rowMaxH;
    return { results, endX: cursorX, endY: cursorY };
  }
}

/**
 * Walk the hierarchy looking for sub-containers and add high-priority candidates
 * for inserting at the start/end edges.
 */
function addSubContainerEdgeCandidates(
  node: ItemObjectV2,
  draggedItem: ItemObjectV2,
  dragCenterX: number,
  dragCenterY: number,
  ghostW: number,
  ghostH: number,
  collidingSet: Set<ItemObjectV2>,
  candidates: DropCandidate[],
) {
  const items = node.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  for (const child of items) {
    if (child.itemOrderedList.length === 0) continue;

    const subItems = child.itemOrderedList.filter(
      (i) => i !== draggedItem && !i.isGhost,
    );
    if (subItems.length === 0) continue;

    const containerProp = child.getDomProperty("READ_1");
    if (!containerProp) continue;

    const isColumn = getDirection(child) === "column";

    // Start edge
    const firstChild = subItems[0];
    const firstProp = firstChild.getDomProperty("READ_1");
    if (firstProp) {
      const firstCenterPrimary = isColumn
        ? firstProp.y + firstProp.height / 2
        : firstProp.x + firstProp.width / 2;
      const dragPrimary = isColumn ? dragCenterY : dragCenterX;
      const containerStart = isColumn ? containerProp.y : containerProp.x;

      if (dragPrimary >= containerStart && dragPrimary < firstCenterPrimary) {
        const gcx = isColumn ? containerProp.x + containerProp.width / 2 : containerProp.x + ghostW / 2;
        const gcy = isColumn ? containerProp.y + ghostH / 2 : containerProp.y + containerProp.height / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
        candidates.push({ container: child, index: 0, ghostCenterX: gcx, ghostCenterY: gcy, distance: dist, priority: 999 });
      }
    }

    // End edge
    const lastChild = subItems[subItems.length - 1];
    const lastProp = lastChild.getDomProperty("READ_1");
    if (lastProp) {
      const lastCenterPrimary = isColumn
        ? lastProp.y + lastProp.height / 2
        : lastProp.x + lastProp.width / 2;
      const dragPrimary = isColumn ? dragCenterY : dragCenterX;
      const containerEnd = isColumn ? containerProp.y + containerProp.height : containerProp.x + containerProp.width;

      if (dragPrimary > lastCenterPrimary && dragPrimary <= containerEnd) {
        const gcx = isColumn ? containerProp.x + containerProp.width / 2 : containerProp.x + containerProp.width - ghostW / 2;
        const gcy = isColumn ? containerProp.y + containerProp.height - ghostH / 2 : containerProp.y + containerProp.height / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
        candidates.push({ container: child, index: subItems.length, ghostCenterX: gcx, ghostCenterY: gcy, distance: dist, priority: 999 });
      }
    }

    addSubContainerEdgeCandidates(child, draggedItem, dragCenterX, dragCenterY, ghostW, ghostH, collidingSet, candidates);
  }
}

/**
 * Determine the container and index to drop the item into based on
 * the current mouse position. Draws debug visuals and returns the best candidate.
 */
export function determineDropTarget(item: ItemObjectV2, root: ItemObjectV2): DropCandidate | null {
  // Collect colliding items
  const collidingSet = new Set<ItemObjectV2>();
  for (const other of item.hitbox.currentCollisions) {
    const otherItem = other.parent;
    if (otherItem instanceof (item.constructor as any) && otherItem !== item) {
      collidingSet.add(otherItem as ItemObjectV2);
    }
  }

  let best: DropCandidate | null = null;

  const rootProp = root.getDomProperty("READ_1");
  const dragProp = item.getDomProperty("READ_1");
  const dragGhostW = dragProp.width;
  const dragGhostH = dragProp.height;
  const dragCenterX = item.transform.x + dragProp.width / 2;
  const dragCenterY = item.transform.y + dragProp.height / 2;
  const layoutX = rootProp ? rootProp.x : 0;
  const layoutY = rootProp ? rootProp.y : 0;

  // Run the virtual layout algorithm
  const { results: virtualCandidates } = virtualLayoutRecursive(
    root, layoutX, layoutY, item, dragGhostW, dragGhostH, collidingSet, dragCenterX, dragCenterY,
  );
  const candidates: DropCandidate[] = [];
  candidates.push(...virtualCandidates);

  // Special cases: sub-container edge insertion
  addSubContainerEdgeCandidates(root, item, dragCenterX, dragCenterY, dragGhostW, dragGhostH, collidingSet, candidates);

  // Pick the candidate with minimum distance; on ties (within 1px), prefer higher priority, then deeper nesting
  for (const c of candidates) {
    if (!best || c.distance < best.distance - 1 ||
        (Math.abs(c.distance - best.distance) <= 1 && (
          c.priority > best.priority ||
          (c.priority === best.priority && nestingDepth(c.container) > nestingDepth(best.container))
        ))) {
      best = c;
    }
  }

  // --- Debug: candidate markers ---
  for (let i = 0; i < 50; i++) {
    root.clearDebugMarker(`drop-candidate-marker-${i}`);
    root.clearDebugMarker(`drop-candidate-label-${i}`);
  }

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const isBest = best === c;
    const color = isBest ? "rgba(250, 204, 21, 0.8)" : "rgba(180, 180, 180, 0.5)";

    // Draw a small crosshair at the ghost center
    root.addDebugCircle(c.ghostCenterX, c.ghostCenterY, isBest ? 6 : 4, color, true, `drop-candidate-marker-${i}`, TAG_CANDIDATES);
    root.addDebugText(
      c.ghostCenterX + 8, c.ghostCenterY + 4,
      `${isBest ? ">> " : ""}[${c.container.gid}:${c.index}] d=${Math.round(c.distance)}`,
      color, true, `drop-candidate-label-${i}`, TAG_CANDIDATES,
    );
  }

  if (best) {
    item.addDebugText(
      item.transform.x, item.transform.y - 20,
      `DROP: container=${best.container.gid} idx=${best.index} dist=${Math.round(best.distance)}`,
      "rgba(250, 204, 21, 0.9)", true, `drop-result`, TAG_CANDIDATES,
    );
  } else {
    item.clearDebugMarker(`drop-result`);
  }

  // --- Debug: collision visuals ---
  debugDropTargetTree(root, item, collidingSet);

  const dragTx = item.transform.x;
  const dragTy = item.transform.y;
  const dragHb = item.hitbox;
  item.addDebugRect(
    dragTx + dragHb.local.x, dragTy + dragHb.local.y, dragHb.local.width, dragHb.local.height,
    "rgba(250, 204, 21, 0.6)", true, `drop-drag-hitbox`, false, 2, TAG_COLLISIONS,
  );
  item.addDebugText(
    dragTx + dragHb.local.x + 2, dragTy + dragHb.local.y - 4,
    `DRAGGING ${item.gid}`,
    "rgba(250, 204, 21, 0.9)", true, `drop-drag-label`, TAG_COLLISIONS,
  );

  const dragCpX = dragTx + item.centerPoint.local.x;
  const dragCpY = dragTy + item.centerPoint.local.y;

  for (const other of item.hitbox.currentCollisions) {
    const otherParent = other.parent as ItemObjectV2;
    if (!otherParent || otherParent === item) continue;
    if (!collidingSet.has(otherParent)) continue;

    const otherTx = otherParent.transform.x;
    const otherTy = otherParent.transform.y;
    const otherCpX = otherTx + otherParent.centerPoint.local.x;
    const otherCpY = otherTy + otherParent.centerPoint.local.y;

    item.addDebugLine(dragCpX, dragCpY, otherCpX, otherCpY, "rgba(251, 146, 60, 0.7)", true, `drop-collision-line-${otherParent.gid}`, 2, TAG_COLLISIONS);

    const otherHb = otherParent.hitbox;
    otherParent.addDebugRect(
      otherTx + otherHb.local.x, otherTy + otherHb.local.y, otherHb.local.width, otherHb.local.height,
      "rgba(251, 146, 60, 0.5)", true, `drop-colliding-${otherParent.gid}`, false, 2, TAG_COLLISIONS,
    );
    otherParent.addDebugText(
      otherTx + otherHb.local.x + 2, otherTy + otherHb.local.y + otherHb.local.height + 12,
      `COLLIDING ${otherParent.gid}`,
      "rgba(251, 146, 60, 0.9)", true, `drop-colliding-label-${otherParent.gid}`, TAG_COLLISIONS,
    );
  }

  return best;
}

/**
 * Draw debug visuals for every item in the hierarchy.
 */
export function debugDropTargetTree(
  node: ItemObjectV2,
  draggedItem: ItemObjectV2,
  collidingItems: Set<ItemObjectV2>,
) {
  const items = node.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  for (let j = 0; j < items.length; j++) {
    const item = items[j];
    const prop = item.getDomProperty("READ_1");
    if (!prop) continue;

    const tx = item.transform.x;
    const ty = item.transform.y;

    item.addDebugRect(prop.x, prop.y, prop.width, prop.height, "rgba(60, 130, 246, 0.4)", true, `drop-dom-${item.gid}`, false, 1, TAG_COLLISIONS);
    item.addDebugText(prop.x + 2, prop.y - 4, `${item.gid}`, "rgba(60, 130, 246, 0.7)", true, `drop-dom-label-${item.gid}`, TAG_COLLISIONS);

    const hb = item.hitbox;
    item.addDebugRect(tx + hb.local.x, ty + hb.local.y, hb.local.width, hb.local.height, "rgba(34, 197, 94, 0.4)", true, `drop-hitbox-${item.gid}`, false, 1, TAG_COLLISIONS);

    const cpX = tx + item.centerPoint.local.x;
    const cpY = ty + item.centerPoint.local.y;
    item.addDebugCircle(cpX, cpY, 4, "rgba(239, 68, 68, 0.8)", true, `drop-center-${item.gid}`, TAG_COLLISIONS);

    if (!collidingItems.has(item)) {
      draggedItem.clearDebugMarker(`drop-collision-line-${item.gid}`);
      item.clearDebugMarker(`drop-colliding-${item.gid}`);
      item.clearDebugMarker(`drop-colliding-label-${item.gid}`);
    }

    if (item.children.length > 0) {
      debugDropTargetTree(item, draggedItem, collidingItems);
    }
  }
}
