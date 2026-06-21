import type { ItemObject } from "./item";
import type { DomProperty } from "@snap-engine/core";
import { CollisionEngine, RectCollider } from "@snap-engine/core/collision";
import {
  childRelativeOffset,
  contentBoxOrigin,
  contentBoxSize,
  flowAxesForDirection,
  flowLayoutPositions,
  layoutItems,
  pointFromAxes,
  virtualDimensions as layoutVirtualDimensions,
  type LayoutNode,
  type LayoutMainAxisAlign,
  type VirtualGhost as LayoutVirtualGhost,
} from "./layout_engine";

// Sub-tags for drop index calculation debug visuals
const TAG_LAYOUT = "drop-layout"; // virtual layout: height bars, layout start lines, ghost positions
const TAG_COLLISIONS = "drop-collisions"; // collision debug: DOM boxes
const TAG_CANDIDATES = "drop-candidates"; // candidates: result lines, best pick
const TAG_NEIGHBORS = "drop-neighbors"; // per-candidate prev/next reference points and links
const TAG_SNAPSHOT = "drop-snapshot"; // drag-start snapshot geometry and simulation deltas
const TAG_ZONES = "drop-zones"; // full-container hitboxes that can scope candidates

const snapshotDumpedForDrag = new WeakSet<ItemObject>();
const SNAPSHOT_DUMP_TRACE = false;

/**
 * Allow the snapshot debug tree to be logged again for a new drag operation.
 *
 * @param item Item that is about to start dragging.
 * @returns Nothing.
 */
export function resetDropSnapshotDebugDump(item: ItemObject) {
  snapshotDumpedForDrag.delete(item);
}

/**
 * Resolve the layout direction for a node that may or may not be an ItemContainer.
 *
 * @param node Item or container whose direction should be read.
 * @returns `"row"` for row containers, otherwise `"column"` as the default.
 */
function getDirection(node: ItemObject): "column" | "row" {
  return "direction" in node && typeof (node as any).direction === "string"
    ? (node as any).direction
    : "column";
}

function getMainAxisAlign(node: ItemObject): LayoutMainAxisAlign {
  return "mainAxisAlign" in node && (node as any).mainAxisAlign === "center"
    ? "center"
    : "start";
}

/**
 * Measure straight-line distance between two points.
 *
 * @param x1 First point x-coordinate.
 * @param y1 First point y-coordinate.
 * @param x2 Second point x-coordinate.
 * @param y2 Second point y-coordinate.
 * @returns Euclidean distance between the two points.
 */
function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export interface VirtualGhost {
  container: ItemObject;
  index: number;
  width: number;
  height: number;
}

/**
 * Check whether an item should be treated as a nested drop container.
 *
 * @param item Item to inspect.
 * @returns True when the item has child items in either the frozen snapshot or live list.
 */
function isSubContainer(item: ItemObject) {
  return item.dragSnapshot
    ? item.dragSnapshotOrderedList.length > 0
    : item.itemOrderedList.length > 0;
}

/**
 * Read an item's drag-start DOM snapshot or fail loudly if it is missing.
 *
 * All drop prediction must read from the drag-start snapshot. This guard keeps
 * a missing snapshot from silently falling back to live DOM data, which would
 * reintroduce frame-to-frame flicker while the ghost mutates the document.
 *
 * @param item Item whose frozen DOM geometry is required.
 * @returns Cloned DOM property captured at drag start.
 * @throws Error when drop prediction runs before snapshot capture.
 */
function requireDragSnapshot(item: ItemObject): DomProperty {
  const snapshot = item.dragSnapshot;
  if (!snapshot) {
    const message = `[drop-snapshot] Missing drag snapshot for item ${item.id}. Drop prediction must run after dragStart captures snapshots.`;
    console.error(message);
    throw new Error(message);
  }
  return snapshot;
}

function flowAxes(container: ItemObject) {
  return flowAxesForDirection(getDirection(container));
}

/**
 * Check whether an object is an ItemContainer rather than a plain item.
 *
 * This intentionally avoids treating every item as a possible nested drop
 * target. Empty-container candidates should only be generated for real
 * container objects.
 *
 * @param item Item object to inspect.
 * @returns True when the object exposes the ItemContainer API surface.
 */
function isItemContainerObject(item: ItemObject) {
  return (
    "configuration" in item &&
    "direction" in item &&
    "name" in item &&
    "numberOfItems" in item
  );
}

function isDropAreaContainer(item: ItemObject) {
  return (
    isItemContainerObject(item) &&
    !item.noDrop &&
    "dropArea" in item &&
    (item as any).dropArea === true
  );
}

type WorldRect = { x: number; y: number; width: number; height: number };

const dropAreaCollisionEngine = new CollisionEngine();

function rectColliderForWorldRect(
  owner: ItemObject,
  rect: WorldRect,
): RectCollider | null {
  const scaleX = owner.worldTransform.scaleX;
  const scaleY = owner.worldTransform.scaleY;
  if (scaleX === 0 || scaleY === 0) return null;

  const collider = new RectCollider(
    owner.engine,
    owner,
    0,
    0,
    rect.width / Math.abs(scaleX),
    rect.height / Math.abs(scaleY),
  );
  collider.worldPosition = [
    scaleX < 0 ? rect.x + rect.width : rect.x,
    scaleY < 0 ? rect.y + rect.height : rect.y,
  ];
  return collider;
}

function filterCandidatesByDropArea(
  candidates: DropCandidate[],
  item: ItemObject,
  dragRect: WorldRect,
) {
  const dropAreaContainers = Array.from(
    new Set(candidates.map((candidate) => candidate.container)),
  ).filter(isDropAreaContainer);
  if (dropAreaContainers.length === 0) return candidates;

  const dragCollider = rectColliderForWorldRect(item, dragRect);
  if (!dragCollider) return candidates;

  const collidingContainers: ItemObject[] = [];
  try {
    for (const container of dropAreaContainers) {
      const prop = requireDragSnapshot(container);
      const containerCollider = rectColliderForWorldRect(container, prop);
      const isColliding =
        !!containerCollider &&
        dropAreaCollisionEngine.isIntersecting(dragCollider, containerCollider);
      containerCollider?.destroy();
      const markerId = `drop-area-hitbox-${container.id}`;
      const labelId = `drop-area-hitbox-label-${container.id}`;

      container.clearDebugMarker(markerId);
      container.clearDebugMarker(labelId);
      container.addDebugRect(
        prop.x,
        prop.y,
        prop.width,
        prop.height,
        isColliding ? "rgba(34, 197, 94, 0.35)" : "rgba(148, 163, 184, 0.18)",
        true,
        markerId,
        false,
        isColliding ? 3 : 1,
        TAG_ZONES,
      );
      container.addDebugText(
        prop.x + 6,
        prop.y + 16,
        isColliding ? "drop area hit" : "drop area",
        isColliding ? "rgba(22, 101, 52, 0.9)" : "rgba(100, 116, 139, 0.6)",
        true,
        labelId,
        TAG_ZONES,
      );

      if (isColliding) {
        collidingContainers.push(container);
      }
    }
  } finally {
    dragCollider.destroy();
  }

  if (collidingContainers.length === 0) return candidates;

  const deepestDepth = Math.max(
    ...collidingContainers.map((container) => container.depth),
  );
  const allowedContainers = new Set(
    collidingContainers.filter((container) => container.depth === deepestDepth),
  );
  return candidates.filter((candidate) =>
    allowedContainers.has(candidate.container),
  );
}

function createLayoutSnapshot(root: ItemObject): {
  root: LayoutNode<ItemObject>;
  byItem: Map<ItemObject, LayoutNode<ItemObject>>;
} {
  const byItem = new Map<ItemObject, LayoutNode<ItemObject>>();
  const visit = (item: ItemObject): LayoutNode<ItemObject> => {
    const node: LayoutNode<ItemObject> = {
      value: item,
      direction: getDirection(item),
      mainAxisAlign: getMainAxisAlign(item),
      locked: item.locked,
      isGhost: item.isGhost,
      box: requireDragSnapshot(item),
      children: [],
    };
    byItem.set(item, node);
    node.children = item.dragSnapshotOrderedList.map(visit);
    return node;
  };

  return { root: visit(root), byItem };
}

function layoutGhostFromItem(
  byItem: Map<ItemObject, LayoutNode<ItemObject>>,
  ghost?: VirtualGhost,
): LayoutVirtualGhost<ItemObject> | undefined {
  if (!ghost) return undefined;
  const container = byItem.get(ghost.container);
  if (!container) return undefined;
  return {
    container,
    index: ghost.index,
    width: ghost.width,
    height: ghost.height,
  };
}

/**
 * Build a content-box rectangle for a container snapshot.
 *
 * Candidate tie-breaks use the same content box that virtual layout uses; this
 * avoids favoring a parent merely because of padding or border area.
 *
 * @param container Container whose content rectangle should be read.
 * @returns Absolute content-box rectangle.
 */
function containerContentRect(container: ItemObject) {
  const prop = requireDragSnapshot(container);
  const origin = contentBoxOrigin(prop);
  const size = contentBoxSize(prop);
  return { ...origin, ...size };
}

/**
 * Check whether a point falls inside a rectangle.
 *
 * @param rect Rectangle to test.
 * @param x Point x-coordinate.
 * @param y Point y-coordinate.
 * @returns True when the point is inside or on the rectangle edge.
 */
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

/**
 * Measure how close a point is to a container content rectangle.
 *
 * Points inside the rectangle return distance to the nearest inner edge. Points
 * outside return distance to the nearest point on the rectangle.
 *
 * @param rect Content rectangle to compare against.
 * @param x Point x-coordinate.
 * @param y Point y-coordinate.
 * @returns Distance to the nearest content-box edge or clamped point.
 */
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

/**
 * Break close-distance ties between candidates from different containers.
 *
 * The candidate whose container content box contains the drag center wins. If
 * both or neither contain it, the candidate closer to a content-box edge wins.
 *
 * @param a First candidate.
 * @param b Second candidate.
 * @param dragCenterX Current dragged item center x-coordinate.
 * @param dragCenterY Current dragged item center y-coordinate.
 * @returns The preferred candidate.
 */
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

/**
 * Draw measured-vs-simulated snapshot geometry for one item.
 *
 * @param container Container whose virtual pass is drawing the item.
 * @param item Item being drawn.
 * @param measuredPosition Absolute position from the frozen DOM snapshot.
 * @param simulatedPosition Absolute position from the virtual layout replay.
 * @returns Nothing.
 */
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
    `drop-snapshot-box-${container.id}-${item.id}`,
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
    `drop-snapshot-delta-${container.id}-${item.id}`,
    2,
    TAG_SNAPSHOT,
  );
  item.addDebugText(
    measuredPosition.x + 2,
    measuredPosition.y + prop.height + 12,
    `delta ${Math.round(dx)},${Math.round(dy)}`,
    "rgba(244, 63, 94, 0.8)",
    true,
    `drop-snapshot-delta-label-${container.id}-${item.id}`,
    TAG_SNAPSHOT,
  );

  item.addDebugRect(
    simulatedPosition.x,
    simulatedPosition.y,
    prop.width,
    prop.height,
    "rgba(180, 100, 255, 0.55)",
    true,
    `drop-layout-box-${container.id}-${item.id}`,
    false,
    2,
    TAG_LAYOUT,
  );
  item.addDebugText(
    simulatedPosition.x + 2,
    simulatedPosition.y + 12,
    `sim box ${Math.round(prop.width)}x${Math.round(prop.height)} m ${Math.round(prop.margin.left)},${Math.round(prop.margin.right)}`,
    "rgba(180, 100, 255, 0.85)",
    true,
    `drop-layout-box-label-${container.id}-${item.id}`,
    TAG_LAYOUT,
  );
}

/**
 * Draw the simulated content box for a container.
 *
 * @param container Container whose content box should be drawn.
 * @param origin Absolute x/y content origin used by the virtual layout.
 * @returns Nothing.
 */
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
    `drop-snapshot-content-${container.id}`,
    false,
    2,
    TAG_SNAPSHOT,
  );
}

/**
 * Log the frozen snapshot tree once per drag for debugging.
 *
 * @param item Item currently being dragged.
 * @param root Root container whose snapshot tree should be dumped.
 * @returns Nothing.
 */
function dumpSnapshotOnce(item: ItemObject, root: ItemObject) {
  if (!SNAPSHOT_DUMP_TRACE) return;
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
      `${indent}${node.id} contentOrigin=(${Math.round(origin.x)},${Math.round(origin.y)}) ` +
        `padding=${JSON.stringify(prop.padding)} border=${JSON.stringify(prop.border)}`,
    );
    for (const child of node.dragSnapshotOrderedList) {
      dumpNode(child, depth + 1);
    }
  };

  grouper(`[drop-snapshot] root=${root.id} drag=${item.id}`);
  dumpNode(root);
  ender();
}

/** Toggle to silence the per-candidate ASCII layout trace in the console. */
const LAYOUT_TRACE = false;

/**
 * Log an ASCII snapshot of the virtual layout that produced one candidate.
 * Shows the container's items in order with their measured DOM bounds and a
 * `►` arrow at the ghost insertion slot, so it's clear which slot the
 * candidate's `index`, `ghostCenter`, and `distance` correspond to.
 *
 * @param args Candidate trace payload with container, layout, ghost, and pointer data.
 * @returns Nothing.
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
    `${indent}▣ candidate  container=${args.container.id}  idx=${args.insertIdx}` +
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
  //   `${indent}  prev=${args.prevContainer?.id ?? "·"}@${fmtCenter(args.prevCenter)}` +
  //     `   next=${args.nextContainer?.id ?? "·"}@${fmtCenter(args.nextCenter)}`,
  // );
  console.log(
    `${indent}  layout ${args.container.id} [${dirTag}] start=(${r(args.startX)},${r(args.startY)}) w=${r(args.containerWidth)}`,
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
      const rel = childRelativeOffset(
        requireDragSnapshot(args.container),
        prop,
      );
      const dx = layout.simulatedPosition.x - layout.measuredPosition.x;
      const dy = layout.simulatedPosition.y - layout.measuredPosition.y;
      lines.push(
        `${indent}   [${i}] ${tag} ${it.id}  snapshotOffset=(${r(rel.x)},${r(rel.y)}) ` +
          `sim=(${r(layout.simulatedPosition.x)},${r(layout.simulatedPosition.y)}) ` +
          `delta=(${r(dx)},${r(dy)})`,
      );
    } else {
      lines.push(`${indent}   [${i}] ${tag} ${it.id}  ${range}`);
    }
  }
  for (const ln of lines) console.log(ln);

  ender();
}

export interface VirtualDimensions {
  width: number;
  height: number;
}

export interface DropCandidate {
  container: ItemObject;
  index: number;
  ghostCenterX: number;
  ghostCenterY: number;
  distance: number;
  priority: number; // Higher priority wins on ties. Normal candidates = 0, special cases = 999.
  prevPosition: { x: number; y: number } | null;
  nextPosition: { x: number; y: number } | null;
}

/**
 * Recursively compute the virtual dimensions (width and height) of a container
 * by simulating its flex layout, including wrapping on the main axis.
 * Excludes the dragged item and ghost items.
 *
 * @param container Container whose children should be simulated.
 * @param draggedItem Item currently being dragged and omitted from layout.
 * @param ghost Optional ghost insertion whose size should affect ancestor containers.
 * @returns Virtual width and height of the remaining children.
 */
export function virtualDimensions(
  container: ItemObject,
  draggedItem: ItemObject,
  ghost?: VirtualGhost,
): VirtualDimensions {
  const snapshot = createLayoutSnapshot(container);
  const draggedNode = snapshot.byItem.get(draggedItem) ?? {
    value: draggedItem,
    direction: getDirection(draggedItem),
    mainAxisAlign: getMainAxisAlign(draggedItem),
    locked: draggedItem.locked,
    isGhost: draggedItem.isGhost,
    box: requireDragSnapshot(draggedItem),
    children: [],
  };
  return layoutVirtualDimensions(
    snapshot.root,
    draggedNode,
    layoutGhostFromItem(snapshot.byItem, ghost),
  );
}

/**
 * Recursively simulate a container's layout, including wrapping on the main axis.
 *
 * For every unlocked item we emit two candidates — one with the ghost
 * inserted just BEFORE that item (idx = j), and one just AFTER (idx = j+1).
 * Each candidate is scored by where the virtual layout places the ghost.
 *
 * @param container   The container to lay out
 * @param startX      The X origin of this container's content area
 * @param startY      The Y origin of this container's content area
 * @param draggedItem The item being dragged (excluded from layout)
 * @param dragGhostW  Width of the ghost element (dragged item's width)
 * @param dragGhostH  Height of the ghost element (dragged item's height)
 * @param dragCenterX Dragged item's center X
 * @param dragCenterY Dragged item's center Y
 * @returns Drop candidates found in this subtree and the simulated container end point.
 */
export function virtualLayoutRecursive(
  container: ItemObject,
  startX: number,
  startY: number,
  draggedItem: ItemObject,
  dragGhostW: number,
  dragGhostH: number,
  dragCenterX: number,
  dragCenterY: number,
): { candidates: DropCandidate[]; endX: number; endY: number } {
  const snapshot = createLayoutSnapshot(container);
  const draggedNode = snapshot.byItem.get(draggedItem) ?? {
    value: draggedItem,
    direction: getDirection(draggedItem),
    mainAxisAlign: getMainAxisAlign(draggedItem),
    locked: draggedItem.locked,
    isGhost: draggedItem.isGhost,
    box: requireDragSnapshot(draggedItem),
    children: [],
  };
  return virtualLayoutRecursiveFromNode(
    snapshot.root,
    startX,
    startY,
    draggedNode,
    dragGhostW,
    dragGhostH,
    dragCenterX,
    dragCenterY,
  );
}

function virtualLayoutRecursiveFromNode(
  containerNode: LayoutNode<ItemObject>,
  startX: number,
  startY: number,
  draggedNode: LayoutNode<ItemObject>,
  dragGhostW: number,
  dragGhostH: number,
  dragCenterX: number,
  dragCenterY: number,
): { candidates: DropCandidate[]; endX: number; endY: number } {
  const container = containerNode.value;
  const axes = flowAxes(container);
  const isColumn = axes.direction === "column";
  const containerProp = containerNode.box;
  const contentSize = contentBoxSize(containerProp);
  const containerWidth = contentSize.width;
  const itemNodes = layoutItems(containerNode, draggedNode);
  const items = itemNodes.map((item) => item.value);
  const flowPositions = flowLayoutPositions(
    containerNode,
    draggedNode,
    startX,
    startY,
  ).itemPositions;

  const candidates: DropCandidate[] = [];
  const layoutDebugItems: Array<{
    item: ItemObject;
    measuredPosition: { x: number; y: number };
    simulatedPosition: { x: number; y: number };
  }> = [];

  drawContainerContentBox(container, { x: startX, y: startY });

  // Clear stale ghost candidate debug rects
  for (let j = 0; j < items.length; j++) {
    container.clearDebugMarker(`vlayout-ghost-before-${container.id}-${j}`);
    container.clearDebugMarker(`vlayout-ghost-after-${container.id}-${j}`);
    container.clearDebugMarker(
      `vlayout-ghost-before-label-${container.id}-${j}`,
    );
    container.clearDebugMarker(
      `vlayout-ghost-after-label-${container.id}-${j}`,
    );
  }
  container.clearDebugMarker(`vlayout-ghost-empty-${container.id}`);
  container.clearDebugMarker(`vlayout-ghost-empty-label-${container.id}`);

  const makeCandidate = (
    index: number,
    fallbackPosition: { x: number; y: number },
  ): DropCandidate => {
    const ghostPosition = flowLayoutPositions(
      containerNode,
      draggedNode,
      startX,
      startY,
      {
        container: containerNode,
        index,
        width: dragGhostW,
        height: dragGhostH,
      },
    ).ghostPosition;
    const ghostX = ghostPosition?.x ?? fallbackPosition.x;
    const ghostY = ghostPosition?.y ?? fallbackPosition.y;
    const gcx = ghostX + dragGhostW / 2;
    const gcy = ghostY + dragGhostH / 2;
    const dist = euclidean(gcx, gcy, dragCenterX, dragCenterY);
    const nextPosition = isColumn
      ? { x: ghostX, y: ghostY + dragGhostH }
      : { x: ghostX + dragGhostW, y: ghostY };

    return {
      container,
      index,
      ghostCenterX: gcx,
      ghostCenterY: gcy,
      distance: dist,
      priority: 0,
      prevPosition: null,
      nextPosition,
    };
  };

  if (
    itemNodes.length === 0 &&
    isItemContainerObject(container) &&
    !container.noDrop
  ) {
    const emptyCandidate = makeCandidate(0, { x: startX, y: startY });
    candidates.push(emptyCandidate);
    if (LAYOUT_TRACE) {
      logCandidateSnapshot({
        container,
        items,
        insertIdx: 0,
        isColumn,
        startX,
        startY,
        containerWidth,
        ghostCenterX: emptyCandidate.ghostCenterX,
        ghostCenterY: emptyCandidate.ghostCenterY,
        ghostW: dragGhostW,
        ghostH: dragGhostH,
        distance: emptyCandidate.distance,
        priority: emptyCandidate.priority,
        dragCenterX,
        dragCenterY,
        layoutItems: layoutDebugItems,
      });
    }
    container.addDebugRect(
      emptyCandidate.ghostCenterX - dragGhostW / 2,
      emptyCandidate.ghostCenterY - dragGhostH / 2,
      isColumn ? containerWidth : dragGhostW,
      dragGhostH,
      "rgba(250, 204, 21, 0.15)",
      true,
      `vlayout-ghost-empty-${container.id}`,
      true,
      1,
      TAG_LAYOUT,
    );
    container.addDebugText(
      emptyCandidate.ghostCenterX - dragGhostW / 2 + 2,
      emptyCandidate.ghostCenterY - dragGhostH / 2 + 12,
      `ghost ${Math.round(dragGhostW)}x${Math.round(dragGhostH)}`,
      "rgba(161, 98, 7, 0.9)",
      true,
      `vlayout-ghost-empty-label-${container.id}`,
      TAG_LAYOUT,
    );
  }

  for (let j = 0; j < itemNodes.length; j++) {
    const itemNode = itemNodes[j];
    const item = itemNode.value;
    const canPlaceCandidate = !itemNode.locked;
    const prop = itemNode.box;
    const isContainer =
      itemNode.children.length > 0 || isItemContainerObject(item);
    const rel = childRelativeOffset(containerProp, prop);
    const measuredPosition = { x: startX + rel.x, y: startY + rel.y };
    const simulatedPosition = flowPositions.get(itemNode) ?? measuredPosition;
    layoutDebugItems.push({ item, measuredPosition, simulatedPosition });
    drawSnapshotDebug(container, item, measuredPosition, simulatedPosition);

    if (canPlaceCandidate) {
      const beforeCandidate = makeCandidate(j, simulatedPosition);
      candidates.push(beforeCandidate);
      if (LAYOUT_TRACE) {
        logCandidateSnapshot({
          container,
          items,
          insertIdx: j,
          isColumn,
          startX,
          startY,
          containerWidth,
          ghostCenterX: beforeCandidate.ghostCenterX,
          ghostCenterY: beforeCandidate.ghostCenterY,
          ghostW: dragGhostW,
          ghostH: dragGhostH,
          distance: beforeCandidate.distance,
          priority: beforeCandidate.priority,
          dragCenterX,
          dragCenterY,
          layoutItems: layoutDebugItems,
        });
      }
      container.addDebugRect(
        beforeCandidate.ghostCenterX - dragGhostW / 2,
        beforeCandidate.ghostCenterY - dragGhostH / 2,
        isColumn ? containerWidth : dragGhostW,
        dragGhostH,
        "rgba(250, 204, 21, 0.15)",
        true,
        `vlayout-ghost-before-${container.id}-${j}`,
        true,
        1,
        TAG_LAYOUT,
      );
      container.addDebugText(
        beforeCandidate.ghostCenterX - dragGhostW / 2 + 2,
        beforeCandidate.ghostCenterY - dragGhostH / 2 + 12,
        `ghost ${Math.round(dragGhostW)}x${Math.round(dragGhostH)}`,
        "rgba(161, 98, 7, 0.9)",
        true,
        `vlayout-ghost-before-label-${container.id}-${j}`,
        TAG_LAYOUT,
      );
    }

    if (isContainer) {
      const childOrigin = {
        x: simulatedPosition.x + prop.border.left + prop.padding.left,
        y: simulatedPosition.y + prop.border.top + prop.padding.top,
      };
      const sub = virtualLayoutRecursiveFromNode(
        itemNode,
        childOrigin.x,
        childOrigin.y,
        draggedNode,
        dragGhostW,
        dragGhostH,
        dragCenterX,
        dragCenterY,
      );
      candidates.push(...sub.candidates);
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
        `vlayout-height-${item.id}`,
        2,
        TAG_LAYOUT,
      );
      item.addDebugText(
        barX - 30,
        simulatedPosition.y + prop.height / 2 + 4,
        `${Math.round(prop.height)}`,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-label-${item.id}`,
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
        `vlayout-height-${item.id}`,
        2,
        TAG_LAYOUT,
      );
      item.addDebugText(
        simulatedPosition.x + prop.width / 2 - 8,
        barY - 8,
        `${Math.round(prop.width)}`,
        "rgba(180, 100, 255, 0.7)",
        true,
        `vlayout-height-label-${item.id}`,
        TAG_LAYOUT,
      );
    }

    if (canPlaceCandidate) {
      const fallbackMain = simulatedPosition[axes.main] + prop[axes.mainSize];
      const fallbackCross = simulatedPosition[axes.cross];
      const fallbackPosition = pointFromAxes(axes, fallbackMain, fallbackCross);
      const afterCandidate = makeCandidate(j + 1, fallbackPosition);
      candidates.push(afterCandidate);
      if (LAYOUT_TRACE) {
        logCandidateSnapshot({
          container,
          items,
          insertIdx: j + 1,
          isColumn,
          startX,
          startY,
          containerWidth,
          ghostCenterX: afterCandidate.ghostCenterX,
          ghostCenterY: afterCandidate.ghostCenterY,
          ghostW: dragGhostW,
          ghostH: dragGhostH,
          distance: afterCandidate.distance,
          priority: afterCandidate.priority,
          dragCenterX,
          dragCenterY,
          layoutItems: layoutDebugItems,
        });
      }
      container.addDebugRect(
        afterCandidate.ghostCenterX - dragGhostW / 2,
        afterCandidate.ghostCenterY - dragGhostH / 2,
        isColumn ? containerWidth : dragGhostW,
        dragGhostH,
        "rgba(250, 204, 21, 0.15)",
        true,
        `vlayout-ghost-after-${container.id}-${j}`,
        true,
        1,
        TAG_LAYOUT,
      );
      container.addDebugText(
        afterCandidate.ghostCenterX - dragGhostW / 2 + 2,
        afterCandidate.ghostCenterY - dragGhostH / 2 + 12,
        `ghost ${Math.round(dragGhostW)}x${Math.round(dragGhostH)}`,
        "rgba(161, 98, 7, 0.9)",
        true,
        `vlayout-ghost-after-label-${container.id}-${j}`,
        TAG_LAYOUT,
      );
    }
  }

  return {
    candidates: container.noDrop
      ? candidates.filter((candidate) => candidate.container !== container)
      : candidates,
    endX: startX + contentSize.width,
    endY: startY + contentSize.height,
  };
}

/**
 * Determine the container and index to drop the item into based on
 * the current mouse position. Draws debug visuals and returns the best candidate.
 *
 * @param item Item currently being dragged.
 * @param root Root container that owns the drag snapshot tree.
 * @returns Best drop candidate for the current frame, or null when there is no valid target.
 */
export function determineDropTarget(
  item: ItemObject,
  root: ItemObject,
): DropCandidate | null {
  let best: DropCandidate | null = null;

  const rootProp = requireDragSnapshot(root);
  const dragProp = requireDragSnapshot(item);
  const dragGhostW = dragProp.width;
  const dragGhostH = dragProp.height;
  const dragCenterX = item.worldTransform.x + dragProp.width / 2;
  const dragCenterY = item.worldTransform.y + dragProp.height / 2;
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
      `\n══════ determineDropTarget  drag=${item.id}@(${r(dragCenterX)},${r(dragCenterY)})  ` +
        `ghost=${r(dragGhostW)}×${r(dragGhostH)}  root=${root.id}`,
    );
  }

  // Run the virtual layout algorithm
  const { candidates: virtualCandidates } = virtualLayoutRecursive(
    root,
    layoutOrigin.x,
    layoutOrigin.y,
    item,
    dragGhostW,
    dragGhostH,
    dragCenterX,
    dragCenterY,
  );
  const dragRect = {
    x: item.worldTransform.x,
    y: item.worldTransform.y,
    width: dragGhostW,
    height: dragGhostH,
  };
  const candidates = filterCandidatesByDropArea(
    virtualCandidates,
    item,
    dragRect,
  );

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
      c.container.id != best.container.id
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
        `══════ ✔ chosen  container=${best.container.id}  idx=${best.index}` +
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
      `${isBest ? ">> " : ""}[${c.container.id}:${c.index}] d=${Math.round(c.distance)}`,
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
      root.addDebugText(
        c.prevPosition.x + 8,
        c.prevPosition.y - 4,
        `${isBest ? "▲ " : ""}prev[${i}]`,
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
      root.addDebugText(
        c.nextPosition.x + 8,
        c.nextPosition.y + 12,
        `${isBest ? "▼ " : ""}next[${i}]`,
        nextColor,
        true,
        `drop-neighbor-next-label-${i}`,
        TAG_NEIGHBORS,
      );
    }
  }

  if (best) {
    item.addDebugText(
      item.worldTransform.x,
      item.worldTransform.y - 20,
      `DROP: container=${best.container.id} idx=${best.index} dist=${Math.round(best.distance)}`,
      "rgba(250, 204, 21, 0.9)",
      true,
      `drop-result`,
      TAG_CANDIDATES,
    );
  } else {
    item.clearDebugMarker(`drop-result`);
  }

  // --- Debug: layout item visuals ---
  debugDropTargetTree(root, item);

  return best;
}

/**
 * Draw debug visuals for every item in the hierarchy.
 *
 * @param node Current node whose descendants should be drawn.
 * @param draggedItem Item currently being dragged.
 * @returns Nothing.
 */
export function debugDropTargetTree(node: ItemObject, draggedItem: ItemObject) {
  const items = node.itemOrderedList.filter(
    (i) => i !== draggedItem && !i.isGhost,
  );

  for (let j = 0; j < items.length; j++) {
    const item = items[j];
    const prop = item.dragSnapshot ?? item.currentDomProperty;
    if (!prop) continue;

    item.addDebugRect(
      prop.x,
      prop.y,
      prop.width,
      prop.height,
      "rgba(60, 130, 246, 0.4)",
      true,
      `drop-dom-${item.id}`,
      false,
      1,
      TAG_COLLISIONS,
    );
    item.addDebugText(
      prop.x + 2,
      prop.y - 4,
      `${item.id}`,
      "rgba(60, 130, 246, 0.7)",
      true,
      `drop-dom-label-${item.id}`,
      TAG_COLLISIONS,
    );

    draggedItem.clearDebugMarker(`drop-collision-line-${item.id}`);
    item.clearDebugMarker(`drop-colliding-${item.id}`);
    item.clearDebugMarker(`drop-colliding-label-${item.id}`);

    if (item.children.length > 0) {
      debugDropTargetTree(item, draggedItem);
    }
  }
}
