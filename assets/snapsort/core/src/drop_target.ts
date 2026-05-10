import type { ItemObject } from "./item";
import type { DomProperty } from "@snap-engine/core";

// Sub-tags for drop index calculation debug visuals
const TAG_LAYOUT = "drop-layout"; // virtual layout: height bars, layout start lines, ghost positions
const TAG_COLLISIONS = "drop-collisions"; // collision: hitboxes, collision lines, DOM boxes, center points
const TAG_CANDIDATES = "drop-candidates"; // candidates: result lines, best pick
const TAG_NEIGHBORS = "drop-neighbors"; // per-candidate prev/next reference points and links
const TAG_TIEBREAK = "drop-tiebreak"; // distance-tie conflict resolution lines (prev vs next)

/** Get layout direction for a container. ItemContainer has a direction getter; default to "column". */
function getDirection(node: ItemObject): "column" | "row" {
  return "direction" in node && typeof (node as any).direction === "string"
    ? (node as any).direction
    : "column";
}

/** Euclidean distance between two points. */
function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function isSubContainer(item: ItemObject) {
  return item.itemOrderedList.length > 0;
}

/** Toggle to silence the per-candidate ASCII layout trace in the console. */
const LAYOUT_TRACE = true;

/**
 * Log an ASCII snapshot of the virtual layout that produced one candidate.
 * Shows the container's items in order with their measured DOM bounds and a
 * `►` arrow at the ghost insertion slot, so it's clear which slot the
 * candidate's `index`, `ghostCenter`, and `distance` correspond to.
 */
function logCandidateSnapshot(args: {
  container: ItemObject;
  items: ItemObject[];
  insertIdx: number;
  isColumn: boolean;
  startX: number;
  startY: number;
  containerWidth: number;
  ghostCenterX: number;
  ghostCenterY: number;
  ghostW: number;
  ghostH: number;
  distance: number;
  priority: number;
  dragCenterX: number;
  dragCenterY: number;
}) {
  if (!LAYOUT_TRACE) return;
  const r = (n: number) => Math.round(n);
  const indent = "  ".repeat(args.container.depth);
  const dirTag = args.isColumn ? "col" : "row";
  const header =
    `${indent}▣ candidate  container=${args.container.gid}  idx=${args.insertIdx}` +
    `  ghost=(${r(args.ghostCenterX)},${r(args.ghostCenterY)})  dist=${r(args.distance)}  prio=${args.priority}`;

  // Use console.groupCollapsed so the per-candidate noise can be folded away.
  const grouper =
    typeof console.groupCollapsed === "function"
      ? console.groupCollapsed.bind(console)
      : console.log.bind(console);
  const ender =
    typeof console.groupEnd === "function"
      ? console.groupEnd.bind(console)
      : () => {};

  grouper(header);

  // const fmtCenter = (c: { x: number; y: number } | null) =>
  //   c ? `(${r(c.x)},${r(c.y)})` : "·";
  console.log(
    `${indent}  drag=(${r(args.dragCenterX)},${r(args.dragCenterY)})  ghostSize=${r(args.ghostW)}×${r(args.ghostH)}`,
  );
  // console.log(
  //   `${indent}  prev=${args.prevContainer?.gid ?? "·"}@${fmtCenter(args.prevCenter)}` +
  //     `   next=${args.nextContainer?.gid ?? "·"}@${fmtCenter(args.nextCenter)}`,
  // );
  console.log(
    `${indent}  layout ${args.container.gid} [${dirTag}] start=(${r(args.startX)},${r(args.startY)}) w=${r(args.containerWidth)}`,
  );

  // Render each item in the container's filtered list, with the ghost slot
  // inserted at insertIdx (the cursor walks DOM bounds, so sub-containers show
  // their actual rendered size — close to what virtualLayoutRecursive simulated).
  let cursorPrimary = args.isColumn ? args.startY : args.startX;
  const lines: string[] = [];
  for (let i = 0; i <= args.items.length; i++) {
    if (i === args.insertIdx) {
      lines.push(
        `${indent}   ► ghost slot  idx=${args.insertIdx}  ghost=(${r(args.ghostCenterX)},${r(args.ghostCenterY)})`,
      );
    }
    if (i >= args.items.length) break;
    const it = args.items[i];
    const prop = it.getDomProperty("READ_1");
    const dim = prop ? (args.isColumn ? prop.height : prop.width) : 0;
    const start = cursorPrimary;
    cursorPrimary += dim;
    const range = args.isColumn
      ? `y=[${r(start)}..${r(cursorPrimary)}] h=${r(dim)}`
      : `x=[${r(start)}..${r(cursorPrimary)}] w=${r(dim)}`;
    const tag = isSubContainer(it) ? "▭" : "▪";
    lines.push(`${indent}   [${i}] ${tag} ${it.gid}  ${range}`);
  }
  for (const ln of lines) console.log(ln);

  ender();
}

export interface VirtualDimensions {
  width: number;
  height: number;
}

interface VirtualNode {
  containerGID: string;
  item: ItemObject | null;
  prop: DomProperty | null;
  position: { x: number; y: number } | null;
  previous: VirtualNode | null;
  next: VirtualNode | null;
}

export interface DropCandidate {
  container: ItemObject;
  index: number;
  ghostCenterX: number;
  ghostCenterY: number;
  distance: number;
  priority: number; // Higher priority wins on ties. Normal candidates = 0, special cases = 999.
  virtualNode: VirtualNode;
  prevPosition: { x: number; y: number } | null;
  nextPosition: { x: number; y: number } | null;
}

/**
 * Recursively compute the virtual dimensions (width and height) of a container
 * by simulating its flex layout, including wrapping for row containers.
 * Excludes the dragged item and ghost items.
 */
export function virtualDimensions(
  container: ItemObject,
  draggedItem: ItemObject,
): VirtualDimensions {
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
 * Each visited item becomes a `VirtualNode` and is appended to a doubly-linked
 * list passed in via `node`. As we descend into sub-containers we keep walking
 * the same chain, so when a candidate is produced the linked list looks like:
 *
 *     ... ─ prev ─ current ─ next ─ ...
 *            ▲       ▲        ▲
 *            │       │        └─ unset until the next iteration appends it
 *            │       └─ the just-placed item (== `node` at candidate time)
 *            └─ node.previous, used to anchor the BEFORE/AFTER snap targets
 *
 * For every item in `collidingSet` we emit two candidates — one with the ghost
 * inserted just BEFORE that item (idx = j), and one just AFTER (idx = j+1) —
 * along with `prevPosition`/`nextPosition` snap anchors. See the inline ASCII
 * diagrams in the column branch below.
 *
 * @param container   The container to lay out
 * @param node        Tail of the virtual linked list to extend
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
  container: ItemObject,
  node: VirtualNode,
  startX: number,
  startY: number,
  draggedItem: ItemObject,
  dragGhostW: number,
  dragGhostH: number,
  collidingSet: Set<ItemObject>,
  dragCenterX: number,
  dragCenterY: number,
): { candidates: DropCandidate[]; endX: number; endY: number } {
  const isColumn = getDirection(container) === "column";
  const containerProp = container.getDomProperty("READ_1");
  const containerWidth = containerProp ? containerProp.width : Infinity;

  const items = container.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  // console.debug(`[virtual-layout] container=${container.gid} dir=${isColumn ? "col" : "row"} start=(${Math.round(startX)},${Math.round(startY)}) items=${items.length}`);

  const thisCandidates: DropCandidate[] = [];
  const childCandidates: DropCandidate[] = [];

  // TODO: take padding into account so distance can be used as tie breakers
  // in container conflicts.

  // Clear stale ghost candidate debug rects
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
      const prop = item.getDomProperty("READ_1");
      const isContainer = isSubContainer(item);

      const newNode = {
        containerGID: container.gid,
        item: item,
        prop: prop,
        position: {
          x: startX,
          y: cursorY,
        },
        previous: node,
        next: null,
      };
      // Skip nodes for containers, we only link leaf nodes
      if (!isContainer) {
        node.next = newNode;
        node = newNode;
      }

      // If this item is colliding with the drag item,
      // calculate a hypothetical layout where the ghost is added to the previous index.
      // Skip containers and items that are locked
      if (isColliding && !item.locked) {
        //
        // BEFORE-case: insert ghost at index j (above current item).
        //
        //   x = startX                  x = startX + containerWidth
        //   ├────────────────────────────┤
        //   │  item[j-1]  (node.previous)│  ← prevPosition = node.previous.position
        //   ├────────────────────────────┤  ← y = cursorY              ┐
        //   │  GHOST  (insert idx = j)   │     center = (gcx, gcy)     │ dragGhostH
        //   ├────────────────────────────┤  ← y = cursorY + dragGhostH ┘  (nextPosition.y)
        //   │  item[j]  (current/node)   │     ← nextPosition aligns to top of current item
        //   └────────────────────────────┘
        //
        // The ghost's center sits halfway down the inserted slot. prev/next
        // positions are the snap targets used later for the drop indicator.
        //
        const gcx = startX + dragGhostW / 2;
        const gcy = cursorY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);

        // let prevPosition = null;
        // if (node.previous && node.previous.prop) {
        //   prevPosition = {
        //     x: startX,
        //     y: cursorY, // - node.previous!.prop!.height / 2,
        //   };
        // }
        const nextPosition = {
          x: startX,
          y: cursorY + dragGhostH,
        };

        const prevNode = isContainer ? node : node.previous;

        thisCandidates.push({
          container,
          index: j,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          distance: dist,
          priority: 0,
          virtualNode: isContainer ? newNode : node,
          prevPosition:
            prevNode && prevNode.position ? prevNode.position : null,
          nextPosition: nextPosition,
        });
        logCandidateSnapshot({
          container,
          items,
          insertIdx: j,
          isColumn: true,
          startX,
          startY,
          containerWidth,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          ghostW: dragGhostW,
          ghostH: dragGhostH,
          distance: dist,
          priority: 0,
          // prevCenter,
          // nextCenter,
          // prevContainer,
          // nextContainer,
          dragCenterX,
          dragCenterY,
        });
        container.addDebugRect(
          startX,
          cursorY,
          containerWidth,
          dragGhostH,
          "rgba(250, 204, 21, 0.15)",
          true,
          `vlayout-ghost-before-${container.gid}-${j}`,
          true,
          1,
          TAG_LAYOUT,
        );
      }

      const itemStartY = cursorY;
      let childH: number;

      // If the item is a container, recursively build the virtual layout
      if (isContainer) {
        const sub = virtualLayoutRecursive(
          item,
          node,
          startX,
          cursorY,
          draggedItem,
          dragGhostW,
          dragGhostH,
          collidingSet,
          dragCenterX,
          dragCenterY,
        );
        childCandidates.push(...sub.candidates);
        childH = sub.endY - cursorY;

        while (node.next) {
          node = node.next;
        }
      } else {
        childH = prop ? prop.height : 0;
      }
      cursorY += childH;

      // Debug: vertical bar for this item's height
      const rootProp = container.rootContainer?.getDomProperty("READ_1");
      const barX = (rootProp ? rootProp.x : startX) - 6 + container.depth * 10;
      item.addDebugLine(
        barX,
        itemStartY,
        barX,
        cursorY,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-${item.gid}`,
        2,
        TAG_LAYOUT,
      );
      item.addDebugText(
        barX - 30,
        itemStartY + childH / 2 + 4,
        `${Math.round(childH)}`,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-label-${item.gid}`,
        TAG_LAYOUT,
      );

      // Calculate a hypothetical layout where the ghost is added to the next index
      if (isColliding && !item.locked) {
        //
        // AFTER-case: insert ghost at index j+1 (below current item).
        //
        // At this point cursorY has advanced past item[j], so it points at
        // the bottom edge of the current item (= top edge of the new ghost).
        //
        //   x = startX                  x = startX + containerWidth
        //   ├────────────────────────────┤
        //   │  item[j-1]  (node.previous)│
        //   ├────────────────────────────┤
        //   │  item[j]  (current/node)   │     ← prevPosition.y sits at this item's vertical
        //   │                            │       midline: cursorY − prev.height/2
        //   ├────────────────────────────┤  ← y = cursorY              ┐
        //   │  GHOST (insert idx = j+1)  │     center = (gcx, gcy)     │ dragGhostH
        //   ├────────────────────────────┤  ← y = cursorY + dragGhostH ┘  (nextPosition.y)
        //   │  item[j+1]  (would-be next)│     ← nextPosition aligns to top of next item
        //   └────────────────────────────┘
        //
        // NOTE: `node` was reassigned to the just-placed item earlier in the
        // loop, so `node.previous` here refers to the item ABOVE the current
        // one (item[j-1]) — see prevPosition calculation below.
        //
        const gcx = startX + dragGhostW / 2;
        const gcy = cursorY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);

        const prevPosition = {
          x: startX,
          y: itemStartY,
        };
        const nextPosition = {
          x: startX,
          y: cursorY + dragGhostH,
        };

        thisCandidates.push({
          container,
          index: j + 1,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          distance: dist,
          priority: 0,
          virtualNode: item.itemOrderedList.length == 0 ? node : newNode,
          prevPosition: prevPosition,
          nextPosition: nextPosition,
        });
        logCandidateSnapshot({
          container,
          items,
          insertIdx: j + 1,
          isColumn: true,
          startX,
          startY,
          containerWidth,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          ghostW: dragGhostW,
          ghostH: dragGhostH,
          distance: dist,
          priority: 0,
          dragCenterX,
          dragCenterY,
        });
        container.addDebugRect(
          startX,
          cursorY,
          containerWidth,
          dragGhostH,
          "rgba(250, 204, 21, 0.15)",
          true,
          `vlayout-ghost-after-${container.gid}-${j}`,
          true,
          1,
          TAG_LAYOUT,
        );
      }
    }

    let candidates: DropCandidate[] = [];
    if (container.noDrop) {
      candidates = childCandidates;
    } else {
      candidates = childCandidates.concat(thisCandidates);
    }

    return { candidates, endX: startX + containerWidth, endY: cursorY };
  } else {
    // Row layout with wrapping
    let cursorX = startX;
    let cursorY = startY;
    let rowMaxH = 0;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const isColliding = collidingSet.has(item);
      const prop = item.getDomProperty("READ_1");
      const isContainer = isSubContainer(item);

      // Get child dimensions FIRST so the wrap-check can run before placement.
      let childW: number, childH: number;
      if (item.itemOrderedList.length > 0) {
        const dims = virtualDimensions(item, draggedItem);
        childW = dims.width;
        childH = dims.height;
      } else {
        childW = prop ? prop.width : 0;
        childH = prop ? prop.height : 0;
      }

      // Wrap check: if this item doesn't fit on the current row, advance to
      // the next one. Done before newNode construction so position reflects
      // the true post-wrap origin.
      if (cursorX > startX && cursorX + childW > startX + containerWidth) {
        cursorY += rowMaxH;
        cursorX = startX;
        rowMaxH = 0;
      }

      // Build the virtual node. As in the column branch, only LEAVES are
      // linked into the chain — container nodes are constructed for use as
      // candidate `virtualNode` payloads but skipped from the prev/next walk.
      const newNode = {
        containerGID: container.gid,
        item: item,
        prop: prop,
        position: { x: cursorX, y: cursorY },
        previous: node,
        next: null,
      };
      if (!isContainer) {
        node.next = newNode;
        node = newNode;
      }

      // BEFORE-case: insert ghost to the LEFT of current item (idx = j).
      //
      //   ┌──── current row ─────────────────────────────────────┐
      //   │ item[j-1] │ GHOST(idx=j) │ item[j]   │ ...           │
      //   └───────────┴──────────────┴───────────┴───────────────┘
      //               ↑ (ghostX, ghostY)
      //
      // The ghost may itself wrap onto a fresh row if it doesn't fit in the
      // remaining horizontal space. prevPosition snaps to the previous leaf's
      // saved top-left; nextPosition snaps to the right edge of the ghost
      // (= where the would-be-next item would begin).
      if (isColliding) {
        let ghostX = cursorX;
        let ghostY = cursorY;
        if (ghostX > startX && ghostX + dragGhostW > startX + containerWidth) {
          ghostY += rowMaxH;
          ghostX = startX;
        }
        const gcx = ghostX + dragGhostW / 2;
        const gcy = ghostY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);

        const nextPosition = { x: ghostX + dragGhostW, y: ghostY };

        const prevNode = isContainer ? node : node.previous;

        thisCandidates.push({
          container,
          index: j,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          distance: dist,
          priority: 0,
          virtualNode: isContainer ? newNode : node,
          prevPosition:
            prevNode && prevNode.position ? prevNode.position : null,
          nextPosition: nextPosition,
        });
        logCandidateSnapshot({
          container,
          items,
          insertIdx: j,
          isColumn: false,
          startX,
          startY,
          containerWidth,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          ghostW: dragGhostW,
          ghostH: dragGhostH,
          distance: dist,
          priority: 0,
          dragCenterX,
          dragCenterY,
        });
        container.addDebugRect(
          ghostX,
          ghostY,
          dragGhostW,
          dragGhostH,
          "rgba(250, 204, 21, 0.15)",
          true,
          `vlayout-ghost-before-${container.gid}-${j}`,
          true,
          1,
          TAG_LAYOUT,
        );
      }

      // Place item and advance
      const itemStartX = cursorX;
      if (isContainer) {
        const sub = virtualLayoutRecursive(
          item,
          node,
          cursorX,
          cursorY,
          draggedItem,
          dragGhostW,
          dragGhostH,
          collidingSet,
          dragCenterX,
          dragCenterY,
        );
        childCandidates.push(...sub.candidates);
        // Walk past whatever leaves the recursion appended so the outer
        // cursor reflects the true tail of the chain (mirrors column).
        while (node.next) {
          node = node.next;
        }
      }
      cursorX += childW;
      rowMaxH = Math.max(rowMaxH, childH);

      // Debug: horizontal bar for this item's width
      const rootProp = container.rootContainer?.getDomProperty("READ_1");
      const barY = (rootProp ? rootProp.y : startY) - 6 + container.depth * 10;
      item.addDebugLine(
        itemStartX,
        barY,
        cursorX,
        barY,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-${item.gid}`,
        2,
        TAG_LAYOUT,
      );
      item.addDebugText(
        itemStartX + childW / 2 - 8,
        barY - 8,
        `${Math.round(childW)}`,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-label-${item.gid}`,
        TAG_LAYOUT,
      );

      // AFTER-case: insert ghost to the RIGHT of current item (idx = j+1).
      //
      //   ┌──── current row ─────────────────────────────────────┐
      //   │ ... │ item[j] │ GHOST(idx=j+1) │ item[j+1] │ ...     │
      //   └─────┴─────────┴────────────────┴───────────┴─────────┘
      //                   ↑ (ghostX, ghostY)
      //
      // prevPosition snaps to the just-placed item's top-left; nextPosition
      // snaps to the right edge of the ghost (where the next item would
      // begin if it slid over). Both honor the post-wrap ghost row.
      if (isColliding) {
        let ghostX = cursorX;
        let ghostY = cursorY;
        if (ghostX > startX && ghostX + dragGhostW > startX + containerWidth) {
          ghostY += rowMaxH;
          ghostX = startX;
        }
        const gcx = ghostX + dragGhostW / 2;
        const gcy = ghostY + dragGhostH / 2;
        const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);

        const prevPosition = { x: itemStartX, y: cursorY };
        const nextPosition = { x: ghostX + dragGhostW, y: ghostY };

        thisCandidates.push({
          container,
          index: j + 1,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          distance: dist,
          priority: 0,
          virtualNode: node,
          prevPosition: prevPosition,
          nextPosition: nextPosition,
        });
        logCandidateSnapshot({
          container,
          items,
          insertIdx: j + 1,
          isColumn: false,
          startX,
          startY,
          containerWidth,
          ghostCenterX: gcx,
          ghostCenterY: gcy,
          ghostW: dragGhostW,
          ghostH: dragGhostH,
          distance: dist,
          priority: 0,
          dragCenterX,
          dragCenterY,
        });
        container.addDebugRect(
          ghostX,
          ghostY,
          dragGhostW,
          dragGhostH,
          "rgba(250, 204, 21, 0.15)",
          true,
          `vlayout-ghost-after-${container.gid}-${j}`,
          true,
          1,
          TAG_LAYOUT,
        );
      }
    }

    // Final row height
    cursorY += rowMaxH;
    let candidates: DropCandidate[] = [];
    if (container.noDrop) {
      candidates = childCandidates;
    } else {
      candidates = childCandidates.concat(thisCandidates);
    }
    return { candidates, endX: cursorX, endY: cursorY };
  }
}

/**
 * Determine the container and index to drop the item into based on
 * the current mouse position. Draws debug visuals and returns the best candidate.
 */
export function determineDropTarget(
  item: ItemObject,
  root: ItemObject,
): DropCandidate | null {
  // Collect colliding items
  const collidingSet = new Set<ItemObject>();
  for (const other of item.hitbox.currentCollisions) {
    const otherItem = other.parent;
    if (otherItem instanceof (item.constructor as any) && otherItem !== item) {
      collidingSet.add(otherItem as ItemObject);
    }
  }

  console.debug(
    `Colliding with: ${Array.from(collidingSet.values().map((i) => i.gid)).join(",")}`,
  );

  let best: DropCandidate | null = null;

  const rootProp = root.getDomProperty("READ_1");
  const dragProp = item.getDomProperty("READ_1");
  const dragGhostW = dragProp.width;
  const dragGhostH = dragProp.height;
  const dragCenterX = item.transform.x + dragProp.width / 2;
  const dragCenterY = item.transform.y + dragProp.height / 2;
  const layoutX = rootProp ? rootProp.x : 0;
  const layoutY = rootProp ? rootProp.y : 0;

  // Build a global flat-leaf index so each candidate can carry references
  // to the items immediately before/after its insertion point in DOM order
  // across all containers (not just within the local sub-container).
  // const flat = buildFlatLeafIndex(root, item);
  // const leafCenter = makeLeafCenter(flat);

  if (LAYOUT_TRACE) {
    const r = (n: number) => Math.round(n);
    console.log(
      `\n══════ determineDropTarget  drag=${item.gid}@(${r(dragCenterX)},${r(dragCenterY)})  ` +
        `ghost=${r(dragGhostW)}×${r(dragGhostH)}  root=${root.gid}`,
    );
  }

  const head: VirtualNode = {
    containerGID: "",
    item: null,
    prop: null,
    position: null,
    previous: null,
    next: null,
  };

  // Run the virtual layout algorithm
  const { candidates: virtualCandidates } = virtualLayoutRecursive(
    root,
    head,
    layoutX,
    layoutY,
    item,
    dragGhostW,
    dragGhostH,
    collidingSet,
    dragCenterX,
    dragCenterY,
  );
  const candidates: DropCandidate[] = [];
  candidates.push(...virtualCandidates);

  console.log(head);
  console.log(candidates);

  // Clear any tie-break overlays from the previous frame so they don't ghost.
  // We allocate a generous slot range — in practice ties are rare, but multiple
  // can occur in one pass when several candidates share a near-identical distance.
  const TIEBREAK_MARKER_SLOTS = 12;
  for (let i = 0; i < TIEBREAK_MARKER_SLOTS; i++) {
    root.clearDebugMarker(`drop-tiebreak-prev-line-${i}`);
    root.clearDebugMarker(`drop-tiebreak-prev-dot-${i}`);
    root.clearDebugMarker(`drop-tiebreak-prev-label-${i}`);
    root.clearDebugMarker(`drop-tiebreak-next-line-${i}`);
    root.clearDebugMarker(`drop-tiebreak-next-dot-${i}`);
    root.clearDebugMarker(`drop-tiebreak-next-label-${i}`);
  }
  let tieBreakIdx = 0;

  // const ties: DropCandidate[] = [];
  // Pick best candidate: higher priority wins first, then shorter distance
  for (const c of candidates) {
    if (!best) {
      best = c;
      continue;
    }
    // If there is a tie, it is likely a "conflicting container" case
    if (
      Math.abs(c.distance - best.distance) <= 1 &&
      c.container.gid != best.container.gid
    ) {
      console.log("conflict");
      // let nodeBest = best.virtualNode;
      const candidateGID: string = c.container.gid;
      // const bestGID = best.container.gid;
      // let nodeCandidate = c.virtualNode;
      // If there is no prevElement, place a prior stub element the same size as the ghost
      const dropCandidateOfPrev: DropCandidate =
        c.virtualNode.previous!.containerGID == candidateGID ? c : best;
      const dropCandidateOfNext: DropCandidate =
        c.virtualNode.next && c.virtualNode.next.containerGID == candidateGID
          ? c
          : best;
      //   best.nextPosition &&
      //   best.container.gid == best.virtualNode.next.item.gid
      //     ? c
      //     : best;
      console.log(
        dropCandidateOfNext.container.gid,
        dropCandidateOfPrev.container.gid,
      );
      // TODO: handle row layout
      //
      // Tie-break geometry — two "arms" reach out from the drag center to the
      // midpoints of the prev and next neighbors. The shorter arm wins.
      //
      //                ◐  prev midpoint
      //                    (c.prevPosition.x,
      //                     c.prevPosition.y + prev.height/2)
      //               ╱
      //              ╱
      //   arm_prev  ╱   ← length = distanceToPrev
      //            ╱
      //           ╱
      //          ●  drag center (dragCenterX, dragCenterY)
      //           ╲
      //            ╲
      //   arm_next  ╲   ← length = distanceToNext
      //              ╲
      //               ╲
      //                ◑  next midpoint
      //                    (c.nextPosition.x,
      //                     c.nextPosition.y + next.height/2)
      //
      // Whichever arm is shorter wins; the corresponding candidate becomes
      // `best`. The debug overlay drawn below renders these two arms in
      // magenta (prev) and cyan (next), with the winning arm bolded.
      //
      let distanceToPrev = dragGhostH;
      let distanceToNext = dragGhostH;
      // Midpoints of the prev/next neighbors used for the tie-break comparison.
      // Captured here so the debug overlay below can render the exact points
      // the algorithm compared against (rather than re-deriving them).
      let prevMidX: number | null = null;
      let prevMidY: number | null = null;
      let nextMidX: number | null = null;
      let nextMidY: number | null = null;
      if (
        c.prevPosition &&
        c.virtualNode.previous &&
        c.virtualNode.previous.prop
      ) {
        prevMidX = c.prevPosition.x;
        prevMidY = c.prevPosition.y + c.virtualNode.previous.prop.height / 2;
        distanceToPrev = euclidean(
          prevMidX,
          prevMidY,
          dragCenterX,
          dragCenterY,
        );
      }
      if (c.nextPosition && c.virtualNode.next && c.virtualNode.next.prop) {
        nextMidX = c.nextPosition.x;
        nextMidY = c.nextPosition.y + c.virtualNode.next.prop.height / 2;
        distanceToNext = euclidean(
          nextMidX,
          nextMidY,
          dragCenterX,
          dragCenterY,
        );
      }
      console.log(distanceToPrev, distanceToNext);
      const prevWins = distanceToPrev < distanceToNext;
      best = prevWins ? dropCandidateOfPrev : dropCandidateOfNext;
      // best = c;

      // --- Debug: tie-break visualization ---
      // Draw a line from the drag center to each compared midpoint. The
      // winning side (shorter segment) is rendered bold/saturated; the
      // losing side is faded so the ranking is obvious at a glance.
      const slot = tieBreakIdx++ % TIEBREAK_MARKER_SLOTS;
      const r = (n: number) => Math.round(n);
      // Magenta = prev side, cyan = next side. Winner full alpha, loser dim.
      const prevColor = prevWins
        ? "rgba(236, 72, 153, 0.95)"
        : "rgba(236, 72, 153, 0.3)";
      const nextColor = !prevWins
        ? "rgba(34, 211, 238, 0.95)"
        : "rgba(34, 211, 238, 0.3)";

      if (prevMidX !== null && prevMidY !== null) {
        root.addDebugLine(
          dragCenterX,
          dragCenterY,
          prevMidX,
          prevMidY,
          prevColor,
          true,
          `drop-tiebreak-prev-line-${slot}`,
          prevWins ? 3 : 1,
          TAG_TIEBREAK,
        );
        root.addDebugCircle(
          prevMidX,
          prevMidY,
          prevWins ? 7 : 4,
          prevColor,
          true,
          `drop-tiebreak-prev-dot-${slot}`,
          TAG_TIEBREAK,
        );
        root.addDebugText(
          (dragCenterX + prevMidX) / 2 + 6,
          (dragCenterY + prevMidY) / 2,
          `${prevWins ? "✔ " : ""}prev d=${r(distanceToPrev)}`,
          prevColor,
          true,
          `drop-tiebreak-prev-label-${slot}`,
          TAG_TIEBREAK,
        );
      }

      if (nextMidX !== null && nextMidY !== null) {
        root.addDebugLine(
          dragCenterX,
          dragCenterY,
          nextMidX,
          nextMidY,
          nextColor,
          true,
          `drop-tiebreak-next-line-${slot}`,
          !prevWins ? 3 : 1,
          TAG_TIEBREAK,
        );
        root.addDebugCircle(
          nextMidX,
          nextMidY,
          !prevWins ? 7 : 4,
          nextColor,
          true,
          `drop-tiebreak-next-dot-${slot}`,
          TAG_TIEBREAK,
        );
        root.addDebugText(
          (dragCenterX + nextMidX) / 2 + 6,
          (dragCenterY + nextMidY) / 2 + 12,
          `${!prevWins ? "✔ " : ""}next d=${r(distanceToNext)}`,
          nextColor,
          true,
          `drop-tiebreak-next-label-${slot}`,
          TAG_TIEBREAK,
        );
      }
    } else if (c.distance < best.distance) {
      best = c;
    }
  }

  // If there are ties in the distance, they are likely same candidate coordinate in different containers.
  // Use the container of the closest item as the tie-breaker.

  if (LAYOUT_TRACE) {
    const r = (n: number) => Math.round(n);
    if (best) {
      console.log(
        `══════ ✔ chosen  container=${best.container.gid}  idx=${best.index}` +
          `  ghost=(${r(best.ghostCenterX)},${r(best.ghostCenterY)})  dist=${r(best.distance)}  prio=${best.priority}\n`,
      );
    } else {
      console.log(`══════ ✘ no candidate chosen (no collisions)\n`);
    }
  }

  // --- Debug: candidate markers ---
  for (let i = 0; i < 50; i++) {
    root.clearDebugMarker(`drop-candidate-marker-${i}`);
    root.clearDebugMarker(`drop-candidate-label-${i}`);
    root.clearDebugMarker(`drop-neighbor-prev-${i}`);
    root.clearDebugMarker(`drop-neighbor-prev-label-${i}`);
    root.clearDebugMarker(`drop-neighbor-prev-line-${i}`);
    root.clearDebugMarker(`drop-neighbor-next-${i}`);
    root.clearDebugMarker(`drop-neighbor-next-label-${i}`);
    root.clearDebugMarker(`drop-neighbor-next-line-${i}`);
  }

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const isBest = best === c;
    const color = isBest
      ? "rgba(250, 204, 21, 0.8)"
      : "rgba(180, 180, 180, 0.5)";

    // Draw a small crosshair at the ghost center
    root.addDebugCircle(
      c.ghostCenterX,
      c.ghostCenterY,
      isBest ? 6 : 4,
      color,
      true,
      `drop-candidate-marker-${i}`,
      TAG_CANDIDATES,
    );
    root.addDebugText(
      c.ghostCenterX + 8,
      c.ghostCenterY + 4,
      `${isBest ? ">> " : ""}[${c.container.gid}:${c.index}] d=${Math.round(c.distance)}`,
      color,
      true,
      `drop-candidate-label-${i}`,
      TAG_CANDIDATES,
    );

    // --- Debug: per-candidate prev/next reference points ---
    // Show where the algorithm thinks this candidate's previous and next
    // items live, plus a faint link from the ghost slot to each one.
    // Best candidate gets full opacity; others fade so the picture stays readable.
    const prevColor = isBest
      ? "rgba(96, 165, 250, 0.9)" // blue
      : "rgba(96, 165, 250, 0.35)";
    const nextColor = isBest
      ? "rgba(74, 222, 128, 0.9)" // green
      : "rgba(74, 222, 128, 0.35)";

    if (c.prevPosition) {
      root.addDebugLine(
        c.ghostCenterX,
        c.ghostCenterY,
        c.prevPosition.x,
        c.prevPosition.y,
        prevColor,
        true,
        `drop-neighbor-prev-line-${i}`,
        isBest ? 2 : 1,
        TAG_NEIGHBORS,
      );
      root.addDebugCircle(
        c.prevPosition.x,
        c.prevPosition.y,
        isBest ? 6 : 4,
        prevColor,
        true,
        `drop-neighbor-prev-${i}`,
        TAG_NEIGHBORS,
      );
      const prevGid = c.virtualNode?.previous?.item?.gid ?? "·";
      root.addDebugText(
        c.prevPosition.x + 8,
        c.prevPosition.y - 4,
        `${isBest ? "▲ " : ""}prev[${i}]=${prevGid}`,
        prevColor,
        true,
        `drop-neighbor-prev-label-${i}`,
        TAG_NEIGHBORS,
      );
    }

    if (c.nextPosition) {
      root.addDebugLine(
        c.ghostCenterX,
        c.ghostCenterY,
        c.nextPosition.x,
        c.nextPosition.y,
        nextColor,
        true,
        `drop-neighbor-next-line-${i}`,
        isBest ? 2 : 1,
        TAG_NEIGHBORS,
      );
      root.addDebugCircle(
        c.nextPosition.x,
        c.nextPosition.y,
        isBest ? 6 : 4,
        nextColor,
        true,
        `drop-neighbor-next-${i}`,
        TAG_NEIGHBORS,
      );
      const nextGid = c.virtualNode?.next?.item?.gid ?? "·";
      root.addDebugText(
        c.nextPosition.x + 8,
        c.nextPosition.y + 12,
        `${isBest ? "▼ " : ""}next[${i}]=${nextGid}`,
        nextColor,
        true,
        `drop-neighbor-next-label-${i}`,
        TAG_NEIGHBORS,
      );
    }
  }

  if (best) {
    item.addDebugText(
      item.transform.x,
      item.transform.y - 20,
      `DROP: container=${best.container.gid} idx=${best.index} dist=${Math.round(best.distance)}`,
      "rgba(250, 204, 21, 0.9)",
      true,
      `drop-result`,
      TAG_CANDIDATES,
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
    dragTx + dragHb.local.x,
    dragTy + dragHb.local.y,
    dragHb.local.width,
    dragHb.local.height,
    "rgba(250, 204, 21, 0.6)",
    true,
    `drop-drag-hitbox`,
    false,
    2,
    TAG_COLLISIONS,
  );
  item.addDebugText(
    dragTx + dragHb.local.x + 2,
    dragTy + dragHb.local.y - 4,
    `DRAGGING ${item.gid}`,
    "rgba(250, 204, 21, 0.9)",
    true,
    `drop-drag-label`,
    TAG_COLLISIONS,
  );

  const dragCpX = dragTx + item.centerPoint.local.x;
  const dragCpY = dragTy + item.centerPoint.local.y;

  for (const other of item.hitbox.currentCollisions) {
    const otherParent = other.parent as ItemObject;
    if (!otherParent || otherParent === item) continue;
    if (!collidingSet.has(otherParent)) continue;

    const otherTx = otherParent.transform.x;
    const otherTy = otherParent.transform.y;
    const otherCpX = otherTx + otherParent.centerPoint.local.x;
    const otherCpY = otherTy + otherParent.centerPoint.local.y;

    item.addDebugLine(
      dragCpX,
      dragCpY,
      otherCpX,
      otherCpY,
      "rgba(251, 146, 60, 0.7)",
      true,
      `drop-collision-line-${otherParent.gid}`,
      2,
      TAG_COLLISIONS,
    );

    const otherHb = otherParent.hitbox;
    otherParent.addDebugRect(
      otherTx + otherHb.local.x,
      otherTy + otherHb.local.y,
      otherHb.local.width,
      otherHb.local.height,
      "rgba(251, 146, 60, 0.5)",
      true,
      `drop-colliding-${otherParent.gid}`,
      false,
      2,
      TAG_COLLISIONS,
    );
    otherParent.addDebugText(
      otherTx + otherHb.local.x + 2,
      otherTy + otherHb.local.y + otherHb.local.height + 12,
      `COLLIDING ${otherParent.gid}`,
      "rgba(251, 146, 60, 0.9)",
      true,
      `drop-colliding-label-${otherParent.gid}`,
      TAG_COLLISIONS,
    );
  }

  return best;
}

/**
 * Draw debug visuals for every item in the hierarchy.
 */
export function debugDropTargetTree(
  node: ItemObject,
  draggedItem: ItemObject,
  collidingItems: Set<ItemObject>,
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

    item.addDebugRect(
      prop.x,
      prop.y,
      prop.width,
      prop.height,
      "rgba(60, 130, 246, 0.4)",
      true,
      `drop-dom-${item.gid}`,
      false,
      1,
      TAG_COLLISIONS,
    );
    item.addDebugText(
      prop.x + 2,
      prop.y - 4,
      `${item.gid}`,
      "rgba(60, 130, 246, 0.7)",
      true,
      `drop-dom-label-${item.gid}`,
      TAG_COLLISIONS,
    );

    const hb = item.hitbox;
    item.addDebugRect(
      tx + hb.local.x,
      ty + hb.local.y,
      hb.local.width,
      hb.local.height,
      "rgba(34, 197, 94, 0.4)",
      true,
      `drop-hitbox-${item.gid}`,
      false,
      1,
      TAG_COLLISIONS,
    );

    const cpX = tx + item.centerPoint.local.x;
    const cpY = ty + item.centerPoint.local.y;
    item.addDebugCircle(
      cpX,
      cpY,
      4,
      "rgba(239, 68, 68, 0.8)",
      true,
      `drop-center-${item.gid}`,
      TAG_COLLISIONS,
    );

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
