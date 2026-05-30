import type { ItemObject } from "./item";
import type { DomProperty } from "@snap-engine/core";

// Sub-tags for drop index calculation debug visuals
const TAG_LAYOUT = "drop-layout"; // virtual layout: height bars, layout start lines, ghost positions
const TAG_COLLISIONS = "drop-collisions"; // collision: hitboxes, collision lines, DOM boxes, center points
const TAG_CANDIDATES = "drop-candidates"; // candidates: result lines, best pick
const TAG_NEIGHBORS = "drop-neighbors"; // per-candidate prev/next reference points and links
const TAG_SNAPSHOT = "drop-snapshot"; // drag-start snapshot geometry and simulation deltas

const snapshotDumpedForDrag = new WeakSet<ItemObject>();

export function resetDropSnapshotDebugDump(item: ItemObject) {
  snapshotDumpedForDrag.delete(item);
}

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
  return item.dragSnapshot
    ? item.dragSnapshotOrderedList.length > 0
    : item.itemOrderedList.length > 0;
}

function requireDragSnapshot(item: ItemObject): DomProperty {
  const snapshot = item.dragSnapshot;
  if (!snapshot) {
    const message = `[drop-snapshot] Missing drag snapshot for item ${item.gid}. Drop prediction must run after dragStart captures snapshots.`;
    console.error(message);
    throw new Error(message);
  }
  return snapshot;
}

function contentBoxOrigin(prop: DomProperty): { x: number; y: number } {
  return {
    x: prop.x + prop.border.left + prop.padding.left,
    y: prop.y + prop.border.top + prop.padding.top,
  };
}

function contentBoxSize(prop: DomProperty): { width: number; height: number } {
  return {
    width: Math.max(
      0,
      prop.width -
        prop.border.left -
        prop.border.right -
        prop.padding.left -
        prop.padding.right,
    ),
    height: Math.max(
      0,
      prop.height -
        prop.border.top -
        prop.border.bottom -
        prop.padding.top -
        prop.padding.bottom,
    ),
  };
}

function childRelativeOffset(
  containerProp: DomProperty,
  childProp: DomProperty,
): { x: number; y: number } {
  const origin = contentBoxOrigin(containerProp);
  return {
    x: childProp.x - origin.x,
    y: childProp.y - origin.y,
  };
}

function snapshotItems(
  container: ItemObject,
  draggedItem: ItemObject,
): ItemObject[] {
  return container.dragSnapshotOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );
}

function isAfterDraggedInSameLine(
  container: ItemObject,
  item: ItemObject,
  draggedItem: ItemObject,
  isColumn: boolean,
): boolean {
  const ordered = container.dragSnapshotOrderedList.filter((i) => !i.isGhost);
  const itemIdx = ordered.indexOf(item);
  const draggedIdx = ordered.indexOf(draggedItem);
  if (itemIdx === -1 || draggedIdx === -1 || itemIdx <= draggedIdx) {
    return false;
  }
  if (isColumn) return true;

  const containerProp = requireDragSnapshot(container);
  const itemOffset = childRelativeOffset(containerProp, requireDragSnapshot(item));
  const draggedOffset = childRelativeOffset(
    containerProp,
    requireDragSnapshot(draggedItem),
  );
  return Math.abs(itemOffset.y - draggedOffset.y) <= 1;
}

function draggedGapSpan(
  container: ItemObject,
  draggedItem: ItemObject,
  isColumn: boolean,
): number {
  const ordered = container.dragSnapshotOrderedList.filter((i) => !i.isGhost);
  const draggedIdx = ordered.indexOf(draggedItem);
  if (draggedIdx === -1) return 0;

  const containerProp = requireDragSnapshot(container);
  const draggedProp = requireDragSnapshot(draggedItem);
  const draggedOffset = childRelativeOffset(containerProp, draggedProp);
  const next = ordered[draggedIdx + 1];

  if (next) {
    const nextOffset = childRelativeOffset(containerProp, requireDragSnapshot(next));
    const sameLine = isColumn || Math.abs(nextOffset.y - draggedOffset.y) <= 1;
    if (sameLine) {
      const current = isColumn ? draggedOffset.y : draggedOffset.x;
      const nextStart = isColumn ? nextOffset.y : nextOffset.x;
      const span = nextStart - current;
      if (span > 0) return span;
    }
  }

  return isColumn ? draggedProp.height : draggedProp.width;
}

function closeDraggedGapPosition(
  container: ItemObject,
  item: ItemObject,
  measuredPosition: { x: number; y: number },
  draggedItem: ItemObject,
  isColumn: boolean,
): { x: number; y: number } {
  if (item.locked) return measuredPosition;
  if (!isAfterDraggedInSameLine(container, item, draggedItem, isColumn)) {
    return measuredPosition;
  }

  const span = draggedGapSpan(container, draggedItem, isColumn);
  return isColumn
    ? { x: measuredPosition.x, y: measuredPosition.y - span }
    : { x: measuredPosition.x - span, y: measuredPosition.y };
}

function gapAfter(
  container: ItemObject,
  item: ItemObject,
  draggedItem: ItemObject,
  isColumn: boolean,
): number {
  const items = snapshotItems(container, draggedItem);
  const idx = items.indexOf(item);
  if (idx === -1 || idx >= items.length - 1) return 0;

  const containerProp = requireDragSnapshot(container);
  const itemProp = requireDragSnapshot(item);
  const nextProp = requireDragSnapshot(items[idx + 1]);
  const itemOffset = childRelativeOffset(containerProp, itemProp);
  const nextOffset = childRelativeOffset(containerProp, nextProp);

  if (!isColumn && Math.abs(itemOffset.y - nextOffset.y) > 1) return 0;

  const itemEnd = isColumn
    ? itemOffset.y + itemProp.height
    : itemOffset.x + itemProp.width;
  const nextStart = isColumn ? nextOffset.y : nextOffset.x;
  return Math.max(0, nextStart - itemEnd);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function sameSnapshotRow(
  containerProp: DomProperty,
  a: ItemObject,
  b: ItemObject,
): boolean {
  const aOffset = childRelativeOffset(containerProp, requireDragSnapshot(a));
  const bOffset = childRelativeOffset(containerProp, requireDragSnapshot(b));
  return Math.abs(aOffset.y - bOffset.y) <= 1;
}

function inferRowLayoutMetrics(container: ItemObject): {
  rowStartX: number;
  rowStartY: number;
  columnGap: number;
  rowGap: number;
} {
  const containerProp = requireDragSnapshot(container);
  const ordered = container.dragSnapshotOrderedList.filter((i) => !i.isGhost);
  if (ordered.length === 0) {
    return { rowStartX: 0, rowStartY: 0, columnGap: 0, rowGap: 0 };
  }

  const firstOffset = childRelativeOffset(
    containerProp,
    requireDragSnapshot(ordered[0]),
  );
  const columnGaps: number[] = [];
  const rows: Array<{ y: number; height: number }> = [];
  let currentRow: { y: number; height: number } | null = null;

  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    const prop = requireDragSnapshot(item);
    const offset = childRelativeOffset(containerProp, prop);
    if (!currentRow || Math.abs(offset.y - currentRow.y) > 1) {
      currentRow = { y: offset.y, height: prop.height };
      rows.push(currentRow);
    } else {
      currentRow.height = Math.max(currentRow.height, prop.height);
    }

    const next = ordered[i + 1];
    if (next && sameSnapshotRow(containerProp, item, next)) {
      const nextOffset = childRelativeOffset(
        containerProp,
        requireDragSnapshot(next),
      );
      const gap = nextOffset.x - (offset.x + prop.width);
      if (gap >= 0) columnGaps.push(gap);
    }
  }

  const rowGaps: number[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const gap = rows[i + 1].y - (rows[i].y + rows[i].height);
    if (gap >= 0) rowGaps.push(gap);
  }

  return {
    rowStartX: firstOffset.x,
    rowStartY: firstOffset.y,
    columnGap: median(columnGaps),
    rowGap: median(rowGaps),
  };
}

function rowLayoutPositions(
  container: ItemObject,
  draggedItem: ItemObject,
  startX: number,
  startY: number,
  ghost?: { index: number; width: number; height: number },
): {
  itemPositions: Map<ItemObject, { x: number; y: number }>;
  ghostPosition: { x: number; y: number } | null;
} {
  const containerProp = requireDragSnapshot(container);
  const contentSize = contentBoxSize(containerProp);
  const ordered = container.dragSnapshotOrderedList.filter((i) => !i.isGhost);
  const items = ordered.filter((i) => i !== draggedItem);
  const metrics = inferRowLayoutMetrics(container);
  const entries: Array<
    | { kind: "item"; item: ItemObject; width: number; height: number }
    | { kind: "ghost"; width: number; height: number }
  > = items.map((item) => {
    const prop = requireDragSnapshot(item);
    return { kind: "item", item, width: prop.width, height: prop.height };
  });

  if (ghost) {
    entries.splice(Math.max(0, Math.min(ghost.index, entries.length)), 0, {
      kind: "ghost",
      width: ghost.width,
      height: ghost.height,
    });
  }

  const itemPositions = new Map<ItemObject, { x: number; y: number }>();
  let ghostPosition: { x: number; y: number } | null = null;
  const rowStartX = startX + metrics.rowStartX;
  const maxX = startX + contentSize.width;
  let cursorX = rowStartX;
  let cursorY = startY + metrics.rowStartY;
  let rowHeight = 0;

  for (const entry of entries) {
    if (
      cursorX > rowStartX + 0.5 &&
      cursorX + entry.width > maxX + 0.5
    ) {
      cursorX = rowStartX;
      cursorY += rowHeight + metrics.rowGap;
      rowHeight = 0;
    }

    let position = { x: cursorX, y: cursorY };
    if (entry.kind === "item" && entry.item.locked) {
      const prop = requireDragSnapshot(entry.item);
      const rel = childRelativeOffset(containerProp, prop);
      position = { x: startX + rel.x, y: startY + rel.y };
      cursorX = position.x;
      cursorY = position.y;
    }

    if (entry.kind === "ghost") {
      ghostPosition = position;
    } else {
      itemPositions.set(entry.item, position);
    }

    cursorX += entry.width + metrics.columnGap;
    rowHeight = Math.max(rowHeight, entry.height);
  }

  return { itemPositions, ghostPosition };
}

function containerContentRect(container: ItemObject) {
  const prop = requireDragSnapshot(container);
  const origin = contentBoxOrigin(prop);
  const size = contentBoxSize(prop);
  return { ...origin, ...size };
}

function containsPoint(
  rect: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

function distanceToNearestContentEdge(
  rect: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
): number {
  if (containsPoint(rect, x, y)) {
    return Math.min(
      Math.abs(x - rect.x),
      Math.abs(rect.x + rect.width - x),
      Math.abs(y - rect.y),
      Math.abs(rect.y + rect.height - y),
    );
  }
  const clampedX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const clampedY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return euclidean(x, y, clampedX, clampedY);
}

function chooseByContentBox(
  a: DropCandidate,
  b: DropCandidate,
  dragCenterX: number,
  dragCenterY: number,
): DropCandidate {
  const aRect = containerContentRect(a.container);
  const bRect = containerContentRect(b.container);
  const aContains = containsPoint(aRect, dragCenterX, dragCenterY);
  const bContains = containsPoint(bRect, dragCenterX, dragCenterY);
  if (aContains !== bContains) return aContains ? a : b;

  const aEdge = distanceToNearestContentEdge(aRect, dragCenterX, dragCenterY);
  const bEdge = distanceToNearestContentEdge(bRect, dragCenterX, dragCenterY);
  if (Math.abs(aEdge - bEdge) > 0.5) return aEdge < bEdge ? a : b;
  return a.distance <= b.distance ? a : b;
}

function drawSnapshotDebug(
  container: ItemObject,
  item: ItemObject,
  measuredPosition: { x: number; y: number },
  simulatedPosition: { x: number; y: number },
) {
  const prop = requireDragSnapshot(item);
  const dx = simulatedPosition.x - measuredPosition.x;
  const dy = simulatedPosition.y - measuredPosition.y;

  item.addDebugRect(
    measuredPosition.x,
    measuredPosition.y,
    prop.width,
    prop.height,
    "rgba(14, 165, 233, 0.45)",
    true,
    `drop-snapshot-box-${container.gid}-${item.gid}`,
    false,
    1,
    TAG_SNAPSHOT,
  );
  item.addDebugLine(
    simulatedPosition.x,
    simulatedPosition.y,
    measuredPosition.x,
    measuredPosition.y,
    "rgba(244, 63, 94, 0.75)",
    true,
    `drop-snapshot-delta-${container.gid}-${item.gid}`,
    2,
    TAG_SNAPSHOT,
  );
  item.addDebugText(
    measuredPosition.x + 2,
    measuredPosition.y + prop.height + 12,
    `delta ${Math.round(dx)},${Math.round(dy)}`,
    "rgba(244, 63, 94, 0.8)",
    true,
    `drop-snapshot-delta-label-${container.gid}-${item.gid}`,
    TAG_SNAPSHOT,
  );
}

function drawContainerContentBox(
  container: ItemObject,
  origin: { x: number; y: number },
) {
  const size = contentBoxSize(requireDragSnapshot(container));
  container.addDebugRect(
    origin.x,
    origin.y,
    size.width,
    size.height,
    "rgba(20, 184, 166, 0.45)",
    true,
    `drop-snapshot-content-${container.gid}`,
    false,
    2,
    TAG_SNAPSHOT,
  );
}

function dumpSnapshotOnce(item: ItemObject, root: ItemObject) {
  if (snapshotDumpedForDrag.has(item)) return;
  snapshotDumpedForDrag.add(item);

  const grouper =
    typeof console.groupCollapsed === "function"
      ? console.groupCollapsed.bind(console)
      : console.log.bind(console);
  const ender =
    typeof console.groupEnd === "function"
      ? console.groupEnd.bind(console)
      : () => {};

  const dumpNode = (node: ItemObject, depth = 0) => {
    const prop = requireDragSnapshot(node);
    const origin = contentBoxOrigin(prop);
    const indent = "  ".repeat(depth);
    console.log(
      `${indent}${node.gid} contentOrigin=(${Math.round(origin.x)},${Math.round(origin.y)}) ` +
        `padding=${JSON.stringify(prop.padding)} border=${JSON.stringify(prop.border)}`,
    );
    for (const child of node.dragSnapshotOrderedList) {
      dumpNode(child, depth + 1);
    }
  };

  grouper(`[drop-snapshot] root=${root.gid} drag=${item.gid}`);
  dumpNode(root);
  ender();
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
  layoutItems?: Array<{
    item: ItemObject;
    measuredPosition: { x: number; y: number };
    simulatedPosition: { x: number; y: number };
  }>;
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
  const layoutByItem = new Map(
    args.layoutItems?.map((entry) => [entry.item, entry]),
  );
  for (let i = 0; i <= args.items.length; i++) {
    if (i === args.insertIdx) {
      lines.push(
        `${indent}   ► ghost slot  idx=${args.insertIdx}  ghost=(${r(args.ghostCenterX)},${r(args.ghostCenterY)})`,
      );
    }
    if (i >= args.items.length) break;
    const it = args.items[i];
    const prop = requireDragSnapshot(it);
    const dim = prop ? (args.isColumn ? prop.height : prop.width) : 0;
    const start = cursorPrimary;
    cursorPrimary += dim;
    const range = args.isColumn
      ? `y=[${r(start)}..${r(cursorPrimary)}] h=${r(dim)}`
      : `x=[${r(start)}..${r(cursorPrimary)}] w=${r(dim)}`;
    const tag = isSubContainer(it) ? "▭" : "▪";
    const layout = layoutByItem.get(it);
    if (layout) {
      const rel = childRelativeOffset(requireDragSnapshot(args.container), prop);
      const dx = layout.simulatedPosition.x - layout.measuredPosition.x;
      const dy = layout.simulatedPosition.y - layout.measuredPosition.y;
      lines.push(
        `${indent}   [${i}] ${tag} ${it.gid}  snapshotOffset=(${r(rel.x)},${r(rel.y)}) ` +
          `sim=(${r(layout.simulatedPosition.x)},${r(layout.simulatedPosition.y)}) ` +
          `delta=(${r(dx)},${r(dy)})`,
      );
    } else {
      lines.push(`${indent}   [${i}] ${tag} ${it.gid}  ${range}`);
    }
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
  const containerProp = requireDragSnapshot(container);
  const items = snapshotItems(container, draggedItem);
  const rowPositions = isColumn
    ? null
    : rowLayoutPositions(container, draggedItem, 0, 0).itemPositions;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;

  for (const child of items) {
    const prop = requireDragSnapshot(child);
    const rel = childRelativeOffset(containerProp, prop);
    const measured = { x: rel.x, y: rel.y };
    const simulated =
      rowPositions?.get(child) ??
      closeDraggedGapPosition(
        container,
        child,
        measured,
        draggedItem,
        isColumn,
      );
    minX = Math.min(minX, simulated.x);
    minY = Math.min(minY, simulated.y);
    maxX = Math.max(maxX, simulated.x + prop.width);
    maxY = Math.max(maxY, simulated.y + prop.height);
  }

  if (minX === Infinity || minY === Infinity) return { width: 0, height: 0 };
  return { width: maxX - minX, height: maxY - minY };
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
  const containerProp = requireDragSnapshot(container);
  const contentSize = contentBoxSize(containerProp);
  const containerWidth = contentSize.width;
  const items = snapshotItems(container, draggedItem);
  const rowPositions = isColumn
    ? null
    : rowLayoutPositions(container, draggedItem, startX, startY).itemPositions;

  const thisCandidates: DropCandidate[] = [];
  const childCandidates: DropCandidate[] = [];
  const layoutItems: Array<{
    item: ItemObject;
    measuredPosition: { x: number; y: number };
    simulatedPosition: { x: number; y: number };
  }> = [];

  drawContainerContentBox(container, { x: startX, y: startY });

  // Clear stale ghost candidate debug rects
  for (let j = 0; j < items.length; j++) {
    container.clearDebugMarker(`vlayout-ghost-before-${container.gid}-${j}`);
    container.clearDebugMarker(`vlayout-ghost-after-${container.gid}-${j}`);
  }

  for (let j = 0; j < items.length; j++) {
    const item = items[j];
    const isColliding = collidingSet.has(item);
    const prop = requireDragSnapshot(item);
    const isContainer = isSubContainer(item);
    const rel = childRelativeOffset(containerProp, prop);
    const measuredPosition = { x: startX + rel.x, y: startY + rel.y };
    const simulatedPosition =
      rowPositions?.get(item) ??
      closeDraggedGapPosition(
        container,
        item,
        measuredPosition,
        draggedItem,
        isColumn,
      );
    layoutItems.push({ item, measuredPosition, simulatedPosition });
    drawSnapshotDebug(container, item, measuredPosition, simulatedPosition);

    const newNode: VirtualNode = {
      containerGID: container.gid,
      item,
      prop,
      position: simulatedPosition,
      previous: node,
      next: null,
    };
    const prevNode = isContainer ? node : node.previous;
    if (!isContainer) {
      node.next = newNode;
      node = newNode;
    }

    if (isColliding && !item.locked) {
      const rowGhostPosition = isColumn
        ? null
        : rowLayoutPositions(container, draggedItem, startX, startY, {
            index: j,
            width: dragGhostW,
            height: dragGhostH,
          }).ghostPosition;
      const ghostX = rowGhostPosition?.x ?? simulatedPosition.x;
      const ghostY = rowGhostPosition?.y ?? simulatedPosition.y;
      const gcx = ghostX + dragGhostW / 2;
      const gcy = ghostY + dragGhostH / 2;
      const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
      const nextPosition = isColumn
        ? { x: ghostX, y: ghostY + dragGhostH }
        : { x: ghostX + dragGhostW, y: ghostY };

      thisCandidates.push({
        container,
        index: j,
        ghostCenterX: gcx,
        ghostCenterY: gcy,
        distance: dist,
        priority: 0,
        virtualNode: isContainer ? newNode : node,
        prevPosition: prevNode && prevNode.position ? prevNode.position : null,
        nextPosition,
      });
      logCandidateSnapshot({
        container,
        items,
        insertIdx: j,
        isColumn,
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
        layoutItems,
      });
      container.addDebugRect(
        ghostX,
        ghostY,
        isColumn ? containerWidth : dragGhostW,
        isColumn ? dragGhostH : dragGhostH,
        "rgba(250, 204, 21, 0.15)",
        true,
        `vlayout-ghost-before-${container.gid}-${j}`,
        true,
        1,
        TAG_LAYOUT,
      );
    }

    if (isContainer) {
      const childOrigin = {
        x: simulatedPosition.x + prop.border.left + prop.padding.left,
        y: simulatedPosition.y + prop.border.top + prop.padding.top,
      };
      const sub = virtualLayoutRecursive(
        item,
        node,
        childOrigin.x,
        childOrigin.y,
        draggedItem,
        dragGhostW,
        dragGhostH,
        collidingSet,
        dragCenterX,
        dragCenterY,
      );
      childCandidates.push(...sub.candidates);
      while (node.next) {
        node = node.next;
      }
    }

    const barX = startX - 6 + container.depth * 10;
    const barY = startY - 6 + container.depth * 10;
    if (isColumn) {
      item.addDebugLine(
        barX,
        simulatedPosition.y,
        barX,
        simulatedPosition.y + prop.height,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-${item.gid}`,
        2,
        TAG_LAYOUT,
      );
      item.addDebugText(
        barX - 30,
        simulatedPosition.y + prop.height / 2 + 4,
        `${Math.round(prop.height)}`,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-label-${item.gid}`,
        TAG_LAYOUT,
      );
    } else {
      item.addDebugLine(
        simulatedPosition.x,
        barY,
        simulatedPosition.x + prop.width,
        barY,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-${item.gid}`,
        2,
        TAG_LAYOUT,
      );
      item.addDebugText(
        simulatedPosition.x + prop.width / 2 - 8,
        barY - 8,
        `${Math.round(prop.width)}`,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-label-${item.gid}`,
        TAG_LAYOUT,
      );
    }

    if (isColliding && !item.locked) {
      const gap = gapAfter(container, item, draggedItem, isColumn);
      const rowGhostPosition = isColumn
        ? null
        : rowLayoutPositions(container, draggedItem, startX, startY, {
            index: j + 1,
            width: dragGhostW,
            height: dragGhostH,
          }).ghostPosition;
      const ghostX =
        rowGhostPosition?.x ??
        (isColumn ? simulatedPosition.x : simulatedPosition.x + prop.width + gap);
      const ghostY =
        rowGhostPosition?.y ??
        (isColumn ? simulatedPosition.y + prop.height + gap : simulatedPosition.y);
      const gcx = ghostX + dragGhostW / 2;
      const gcy = ghostY + dragGhostH / 2;
      const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
      const nextPosition = isColumn
        ? { x: ghostX, y: ghostY + dragGhostH }
        : { x: ghostX + dragGhostW, y: ghostY };

      thisCandidates.push({
        container,
        index: j + 1,
        ghostCenterX: gcx,
        ghostCenterY: gcy,
        distance: dist,
        priority: 0,
        virtualNode: isContainer ? newNode : node,
        prevPosition: simulatedPosition,
        nextPosition,
      });
      logCandidateSnapshot({
        container,
        items,
        insertIdx: j + 1,
        isColumn,
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
        layoutItems,
      });
      container.addDebugRect(
        ghostX,
        ghostY,
        isColumn ? containerWidth : dragGhostW,
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

  const candidates = container.noDrop
    ? childCandidates
    : childCandidates.concat(thisCandidates);
  return {
    candidates,
    endX: startX + contentSize.width,
    endY: startY + contentSize.height,
  };
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

  const rootProp = requireDragSnapshot(root);
  const dragProp = requireDragSnapshot(item);
  const dragGhostW = dragProp.width;
  const dragGhostH = dragProp.height;
  const dragCenterX = item.transform.x + dragProp.width / 2;
  const dragCenterY = item.transform.y + dragProp.height / 2;
  const layoutOrigin = contentBoxOrigin(rootProp);
  dumpSnapshotOnce(item, root);

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
    layoutOrigin.x,
    layoutOrigin.y,
    item,
    dragGhostW,
    dragGhostH,
    collidingSet,
    dragCenterX,
    dragCenterY,
  );
  const candidates: DropCandidate[] = [];
  candidates.push(...virtualCandidates);

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
  // Pick best candidate: higher priority wins first, then shorter distance
  for (const c of candidates) {
    if (!best) {
      best = c;
      continue;
    }
    if (
      Math.abs(c.distance - best.distance) <= 1 &&
      c.container.gid != best.container.gid
    ) {
      best = chooseByContentBox(best, c, dragCenterX, dragCenterY);
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
