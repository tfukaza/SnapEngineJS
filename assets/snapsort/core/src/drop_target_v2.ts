import type { ItemObjectV2 } from "./item_v2";

// Sub-tags for drop index calculation debug visuals
const TAG_LAYOUT = "drop-layout";         // virtual layout: height bars, layout start lines, ghost positions
const TAG_COLLISIONS = "drop-collisions"; // collision: hitboxes, collision lines, DOM boxes, center points
const TAG_CANDIDATES = "drop-candidates"; // candidates: result lines, arrows, shift arrows, best pick

function nestingDepth(node: ItemObjectV2): number {
  return node.depth;
}

export interface DropCandidate {
  container: ItemObjectV2;
  index: number;
  ghostCenter: number;
  distance: number;
  priority: number; // Higher priority wins on ties. Normal candidates = 0, special cases = 999.
}

/**
 * Recursively compute the virtual height of a container by summing
 * the heights of its children (recursing into sub-containers).
 * Excludes the dragged item and ghost items.
 */
export function virtualHeight(container: ItemObjectV2, draggedItem: ItemObjectV2): number {
  let total = 0;
  for (const child of container.itemOrderedList) {
    if (child === draggedItem || child.isGhost) continue;
    if (child.itemOrderedList.length > 0) {
      total += virtualHeight(child, draggedItem);
    } else {
      const prop = child.getDomProperty("READ_1");
      if (prop) total += prop.height;
    }
  }
  return total;
}

/**
 * Recursively simulate the vertical layout of a container. During the walk,
 * only try ghost placement at slots adjacent to items in the colliding set:
 * before each colliding item, and after the last colliding item.
 */
export function virtualLayoutRecursive(
  container: ItemObjectV2,
  cursor: number,
  draggedItem: ItemObjectV2,
  ghostSize: number,
  collidingSet: Set<ItemObjectV2>,
  // results: DropCandidate[],
  dragCenter: number,
) {
  // Exclude both the dragged item and the real ghost — the virtual layout simulates
  // inserting a virtual ghost at each candidate position from scratch.
  const items = container.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  // let c = cursor;
  // let lastWasColliding = false;

  console.debug(`[virtual-layout] container=${container.gid} cursor=${Math.round(cursor)} items=${items.length}`);

  // Debug: draw a horizontal line and label where this container's virtual layout starts
  const containerProp = container.getDomProperty("READ_1");
  const layoutLineLeft = containerProp ? containerProp.x : 0;
  const layoutLineRight = containerProp ? containerProp.x + containerProp.width : 200;
  container.addDebugLine(
    layoutLineLeft, cursor, layoutLineRight, cursor,
    "rgba(0, 200, 180, 0.5)", true, `vlayout-start-${container.gid}`, 1, TAG_LAYOUT,
  );
  container.addDebugText(
    layoutLineLeft - 2, cursor - 4,
    `layout ${container.gid} y=${Math.round(cursor)}`,
    "rgba(0, 200, 180, 0.7)", true, `vlayout-start-label-${container.gid}`, TAG_LAYOUT,
  );

  let results: DropCandidate[] = [];
  let totalSize = cursor;

  // Clear stale ghost candidate rects from previous frame
  for (let j = 0; j < items.length; j++) {
    container.clearDebugMarker(`vlayout-ghost-before-${container.gid}-${j}`);
    container.clearDebugMarker(`vlayout-ghost-after-${container.gid}-${j}`);
  }

  // Walk through items in order, checking for collisions and recursing into sub-containers
  for (let j = 0; j < items.length; j++) {
    const item = items[j];
    const isColliding = collidingSet.has(item);

    if (isColliding) {
      // Try placing ghost BEFORE this colliding item/sub container
      const ghostCenter = totalSize + ghostSize / 2;
      const dist = Math.abs(ghostCenter - dragCenter);
      results.push({ container, index: j, ghostCenter, distance: dist, priority: 0 });
      // Debug: draw virtual ghost position (semi-transparent rect)
      container.addDebugRect(
        layoutLineLeft, totalSize, layoutLineRight - layoutLineLeft, ghostSize,
        "rgba(250, 204, 21, 0.15)", true, `vlayout-ghost-before-${container.gid}-${j}`, true, 1, TAG_LAYOUT,
      );
    }

    // Continue building the virtual layout
    const itemStartY = totalSize;
    if (item.itemOrderedList.length > 0) {
      // For sub container, recurse to get the total size, and also collect candidates from inside it.
      const { results: subResults, totalSize: subTotalSize } = virtualLayoutRecursive(
        item, totalSize, draggedItem, ghostSize, collidingSet, dragCenter);
      results.push(...subResults);
      // subTotalSize is totalSize before the recursion + the virtual height of the sub container.
      totalSize = subTotalSize;
    } else {
      const prop = item.getDomProperty("READ_1");
      totalSize += prop.height;
    }

    // Debug: vertical bar showing this item's height in the virtual layout
    // Use a fixed X anchor (left edge of root layout line) offset by depth
    const rootProp = container.rootContainer?.getDomProperty("READ_1");
    const barXBase = rootProp ? rootProp.x : (containerProp ? containerProp.x : 0);
    const itemHeight = totalSize - itemStartY;
    const barX = barXBase - 6 + container.depth * 10;
    item.addDebugLine(
      barX, itemStartY, barX, totalSize,
      "rgba(180, 100, 255, 0.7)", true, `vlayout-height-${item.gid}`, 2, TAG_LAYOUT,
    );
    item.addDebugText(
      barX - 30, itemStartY + itemHeight / 2 + 4,
      `${Math.round(itemHeight)}`,
      "rgba(180, 100, 255, 0.7)", true, `vlayout-height-label-${item.gid}`, TAG_LAYOUT,
    );

    if (isColliding) {
      // Try placing the ghost AFTER the last colliding item.
      // While this may result in duplicate candidates, it also ensures
      // we don't miss any valid drop targets, especially in cases where the colliding set
      // is in the middle of the container and not adjacent to the start or end.
      const ghostCenter = totalSize + ghostSize / 2;
      const dist = Math.abs(ghostCenter - dragCenter);
      results.push({ container, index: j + 1, ghostCenter, distance: dist, priority: 0 });
      // Debug: draw virtual ghost position (semi-transparent rect)
      container.addDebugRect(
        layoutLineLeft, totalSize, layoutLineRight - layoutLineLeft, ghostSize,
        "rgba(250, 204, 21, 0.15)", true, `vlayout-ghost-after-${container.gid}-${j}`, true, 1, TAG_LAYOUT,
      );
    }

    // lastWasColliding = isColliding;
  }

  // Try placing ghost AFTER the last item if it was colliding
  // if (lastWasColliding) {
  //   const ghostCenter = totalSize + ghostSize / 2;
  //   const dist = Math.abs(ghostCenter - dragCenter);
  //   results.push({ container, index: items.length, ghostCenter, distance: dist });
  // }

  return {
    results,
    totalSize
  };
}

/**
 * Walk the hierarchy looking for sub-containers. For each sub-container, check if
 * the dragged item's center is in the "edge zone" (between the container's top/bottom
 * and the center of its first/last child). If so, add a high-priority candidate for
 * inserting at index 0 or at the end of that sub-container.
 */
function addSubContainerEdgeCandidates(
  node: ItemObjectV2,
  draggedItem: ItemObjectV2,
  dragCenter: number,
  ghostSize: number,
  collidingSet: Set<ItemObjectV2>,
  candidates: DropCandidate[],
) {
  const items = node.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  for (const child of items) {
    // Only consider sub-containers (nodes with children)
    if (child.itemOrderedList.length === 0) continue;

    const subItems = child.itemOrderedList.filter(
      (i) => i !== draggedItem && !i.isGhost,
    );
    if (subItems.length === 0) continue;

    const containerProp = child.getDomProperty("READ_1");
    if (!containerProp) continue;

    const containerTop = containerProp.y;
    const containerBottom = containerProp.y + containerProp.height;

    // Top edge: dragged center is below container top but above the center of the first child
    const firstChild = subItems[0];
    const firstProp = firstChild.getDomProperty("READ_1");
    if (firstProp) {
      const firstCenter = firstProp.y + firstProp.height / 2;
      if (dragCenter >= containerTop && dragCenter < firstCenter) {
        const ghostCenter = containerTop + ghostSize / 2;
        const dist = Math.abs(ghostCenter - dragCenter);
        candidates.push({ container: child, index: 0, ghostCenter, distance: dist, priority: 999 });
      }
    }

    // Bottom edge: dragged center is above container bottom but below the center of the last child
    const lastChild = subItems[subItems.length - 1];
    const lastProp = lastChild.getDomProperty("READ_1");
    if (lastProp) {
      const lastCenter = lastProp.y + lastProp.height / 2;
      if (dragCenter > lastCenter && dragCenter <= containerBottom) {
        const ghostCenter = containerBottom - ghostSize / 2;
        const dist = Math.abs(ghostCenter - dragCenter);
        candidates.push({ container: child, index: subItems.length, ghostCenter, distance: dist, priority: 999 });
      }
    }

    // Recurse into deeper sub-containers
    addSubContainerEdgeCandidates(child, draggedItem, dragCenter, ghostSize, collidingSet, candidates);
  }
}

/**
 * Determine the container and index to drop the item into based on
 * the current mouse position. Draws debug visuals and returns the best candidate.
 * Collision engine runs between READ_1 and WRITE_1, so we can use the READ_1 properties for layout calculations.
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

  // Virtual layout: simulate entire root container hierarchy

  // Get the position and size of the root container
  const rootProp = root.getDomProperty("READ_1");
  // Get the position and size of the dragged item.
  const dragProp = item.getDomProperty("READ_1");
  // Set the dimensions of the virtual ghost
  const virtualGhostSize = dragProp.height;
  const dragCenter = item.transform.y + dragProp.height / 2;
  const layoutOrigin = rootProp ? rootProp.y : 0;

  // Run the virtual layout algorithm to get candidate drop targets and their distances to the dragged item's center
  const { results: virtualCandidates } = virtualLayoutRecursive(root, layoutOrigin, item, virtualGhostSize, collidingSet, dragCenter);
  const candidates: DropCandidate[] = [];
  candidates.push(...virtualCandidates);

  // Special cases: sub-container edge insertion
  // When dragging near the top/bottom edge of a sub-container, add high-priority
  // candidates for inserting at index 0 (top) or last index (bottom) of that sub-container.
  addSubContainerEdgeCandidates(root, item, dragCenter, virtualGhostSize, collidingSet, candidates);

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

  // Draw debug for every candidate — horizontal line at ghost center
  const rootPropForDebug = root.getDomProperty("READ_1");
  const debugLeft = rootPropForDebug ? rootPropForDebug.x : 0;
  const debugRight = rootPropForDebug ? rootPropForDebug.x + rootPropForDebug.width : 200;

  // Clear old candidate markers
  for (let i = 0; i < 50; i++) {
    root.clearDebugMarker(`drop-candidate-line-${i}`);
    root.clearDebugMarker(`drop-candidate-arrow-${i}`);
    root.clearDebugMarker(`drop-candidate-label-${i}`);
  }

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const isBest = best === c;
    const color = isBest ? "rgba(250, 204, 21, 0.8)" : "rgba(180, 180, 180, 0.5)";
    const lineWidth = isBest ? 2 : 1;
    const arrowLen = isBest ? 18 : 12;

    // Horizontal line at ghost center
    root.addDebugLine(
      debugLeft, c.ghostCenter, debugRight, c.ghostCenter,
      color, true, `drop-candidate-line-${i}`, lineWidth, TAG_CANDIDATES,
    );
    // Vertical arrow pointing down — items below shift downward when ghost is inserted here
    const arrowX = debugRight - 10;
    root.addDebugLine(
      arrowX, c.ghostCenter, arrowX, c.ghostCenter + arrowLen,
      color, true, `drop-candidate-arrow-${i}`, lineWidth, TAG_CANDIDATES,
      true, false, isBest ? 8 : 6,
    );
    root.addDebugText(
      debugRight + 4, c.ghostCenter + 4,
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

  // --- Debug visuals ---
  debugDropTargetTree(root, item, collidingSet, best);

  // Draw the dragged item's hitbox — yellow outline
  const dragTx = item.transform.x;
  const dragTy = item.transform.y;
  const dragHb = item.hitbox;
  const dragHbX = dragTx + dragHb.local.x;
  const dragHbY = dragTy + dragHb.local.y;
  item.addDebugRect(
    dragHbX, dragHbY, dragHb.local.width, dragHb.local.height,
    "rgba(250, 204, 21, 0.6)", true, `drop-drag-hitbox`, false, 2, TAG_COLLISIONS,
  );
  item.addDebugText(
    dragHbX + 2, dragHbY - 4,
    `DRAGGING ${item.gid}`,
    "rgba(250, 204, 21, 0.9)", true, `drop-drag-label`, TAG_COLLISIONS,
  );

  // Draw lines from dragged item's center to every colliding item's center
  const dragCp = item.centerPoint;
  const dragCpX = dragTx + dragCp.local.x;
  const dragCpY = dragTy + dragCp.local.y;

  for (const other of item.hitbox.currentCollisions) {
    const otherParent = other.parent as ItemObjectV2;
    if (!otherParent || otherParent === item) continue;
    if (!collidingSet.has(otherParent)) continue;

    const otherTx = otherParent.transform.x;
    const otherTy = otherParent.transform.y;
    const otherCp = otherParent.centerPoint;
    const otherCpX = otherTx + otherCp.local.x;
    const otherCpY = otherTy + otherCp.local.y;

    // Orange line from dragged center to colliding item center
    item.addDebugLine(
      dragCpX, dragCpY, otherCpX, otherCpY,
      "rgba(251, 146, 60, 0.7)", true, `drop-collision-line-${otherParent.gid}`, 2, TAG_COLLISIONS,
    );
    // Highlight colliding item's hitbox — orange outline
    const otherHb = otherParent.hitbox;
    const otherHbX = otherTx + otherHb.local.x;
    const otherHbY = otherTy + otherHb.local.y;
    otherParent.addDebugRect(
      otherHbX, otherHbY, otherHb.local.width, otherHb.local.height,
      "rgba(251, 146, 60, 0.5)", true, `drop-colliding-${otherParent.gid}`, false, 2, TAG_COLLISIONS,
    );
    otherParent.addDebugText(
      otherHbX + 2, otherHbY + otherHb.local.height + 12,
      `COLLIDING ${otherParent.gid}`,
      "rgba(251, 146, 60, 0.9)", true, `drop-colliding-label-${otherParent.gid}`, TAG_COLLISIONS,
    );
  }

  return best;
}

/**
 * Draw debug visuals (DOM box, hitbox, center point, shift arrows) for every item
 * in the hierarchy. Clears stale collision markers for items no longer colliding.
 */
export function debugDropTargetTree(
  node: ItemObjectV2,
  draggedItem: ItemObjectV2,
  collidingItems: Set<ItemObjectV2>,
  best: DropCandidate | null,
) {
  // Get the filtered item list for this container (same filtering as virtual layout)
  const items = node.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  for (let j = 0; j < items.length; j++) {
    const item = items[j];
    const prop = item.getDomProperty("READ_1");
    if (!prop) continue;

    const tx = item.transform.x;
    const ty = item.transform.y;

    // 1. DOM bounding box (from READ_1) — blue outline
    item.addDebugRect(
      prop.x, prop.y, prop.width, prop.height,
      "rgba(60, 130, 246, 0.4)", true, `drop-dom-${item.gid}`, false, 1, TAG_COLLISIONS,
    );
    item.addDebugText(
      prop.x + 2, prop.y - 4,
      `${item.gid}`,
      "rgba(60, 130, 246, 0.7)", true, `drop-dom-label-${item.gid}`, TAG_COLLISIONS,
    );

    // 2. Hitbox (rect collider) — green outline, offset from transform position
    const hb = item.hitbox;
    const hbX = tx + hb.local.x;
    const hbY = ty + hb.local.y;
    item.addDebugRect(
      hbX, hbY, hb.local.width, hb.local.height,
      "rgba(34, 197, 94, 0.4)", true, `drop-hitbox-${item.gid}`, false, 1, TAG_COLLISIONS,
    );

    // 3. Center point collider — red dot
    const cp = item.centerPoint;
    const cpX = tx + cp.local.x;
    const cpY = ty + cp.local.y;
    item.addDebugCircle(cpX, cpY, 4, "rgba(239, 68, 68, 0.8)", true, `drop-center-${item.gid}`, TAG_COLLISIONS);

    // 4. Shift direction arrow — shows which way this item moves if the ghost is dropped
    //    Items at or after the drop index shift DOWN, items before shift UP.
    if (best && best.container === node) {
      const arrowX = prop.x + prop.width + 6;
      const arrowMidY = prop.y + prop.height / 2;
      const arrowLen = 14;
      if (j >= best.index) {
        // This item is at or after the drop index — shifts DOWN
        item.addDebugLine(
          arrowX, arrowMidY - arrowLen / 2, arrowX, arrowMidY + arrowLen / 2,
          "rgba(250, 120, 50, 0.8)", true, `drop-shift-arrow-${item.gid}`, 2, TAG_CANDIDATES,
          true, false, 6,
        );
      } else {
        // This item is before the drop index — shifts UP
        item.addDebugLine(
          arrowX, arrowMidY + arrowLen / 2, arrowX, arrowMidY - arrowLen / 2,
          "rgba(100, 180, 255, 0.8)", true, `drop-shift-arrow-${item.gid}`, 2, TAG_CANDIDATES,
          true, false, 6,
        );
      }
    } else {
      // No drop target in this container — clear any stale arrow
      item.clearDebugMarker(`drop-shift-arrow-${item.gid}`);
    }

    // Clear collision markers if this item is no longer colliding
    if (!collidingItems.has(item)) {
      draggedItem.clearDebugMarker(`drop-collision-line-${item.gid}`);
      item.clearDebugMarker(`drop-colliding-${item.gid}`);
      item.clearDebugMarker(`drop-colliding-label-${item.gid}`);
    }

    // Recurse into children (nested containers)
    if (item.children.length > 0) {
      debugDropTargetTree(item, draggedItem, collidingItems, best);
    }
  }
}
