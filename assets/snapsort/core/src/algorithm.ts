import type { DomProperty } from "@snap-engine/core";
import { CollisionEngine, RectCollider } from "@snap-engine/core/collision";
import type { ItemBase } from "./item";
import {
  childRelativeOffset,
  contentBoxOrigin,
  contentBoxSize,
  flowAxesForDirection,
  flowLayoutPositions,
  inferFlowLayoutMetrics,
  layoutItems,
  pointFromAxes,
  virtualDimensions as layoutVirtualDimensions,
  type LayoutFilter,
  type LayoutMainAxisAlign,
  type LayoutNode,
  type VirtualInsertion,
} from "./layout";

const TAG_COLLISIONS = "drop-collisions";
const TAG_CANDIDATES = "drop-candidates";
const TAG_LAYOUT = "drop-layout";
const TAG_ZONES = "drop-zones";

const snapshotDumpedForDrag = new WeakSet<ItemBase>();
const SNAPSHOT_DUMP_TRACE = false;

type Rect = { x: number; y: number; width: number; height: number };
type WorldRect = Rect;

export interface VirtualGhost {
  container: ItemBase;
  index: number;
  width: number;
  height: number;
}

export interface VirtualDimensions {
  width: number;
  height: number;
}

export interface DropCandidate {
  container: ItemBase;
  index: number;
  ghostCenterX: number;
  ghostCenterY: number;
  distance: number;
  priority: number;
  lineIndex: number;
  dragLineIndex: number;
  lineDistance: number;
  prevPosition: { x: number; y: number } | null;
  nextPosition: { x: number; y: number } | null;
  placementRect: Rect;
  placementDistance: number;
  placementContainsDragCenter: boolean;
}

export function resetDropSnapshotDebugDump(item: ItemBase) {
  snapshotDumpedForDrag.delete(item);
}

function getDirection(node: ItemBase): "column" | "row" {
  return "direction" in node && typeof (node as any).direction === "string"
    ? (node as any).direction
    : "column";
}

function getMainAxisAlign(node: ItemBase): LayoutMainAxisAlign {
  return "mainAxisAlign" in node && (node as any).mainAxisAlign === "center"
    ? "center"
    : "start";
}

function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function containsPoint(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

function intersectsRect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

function distanceToRect(rect: Rect, x: number, y: number): number {
  if (containsPoint(rect, x, y)) return 0;

  const clampedX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const clampedY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return euclidean(x, y, clampedX, clampedY);
}

function distanceToNearestContentEdge(rect: Rect, x: number, y: number): number {
  if (containsPoint(rect, x, y)) {
    return Math.min(
      Math.abs(x - rect.x),
      Math.abs(rect.x + rect.width - x),
      Math.abs(y - rect.y),
      Math.abs(rect.y + rect.height - y),
    );
  }

  return distanceToRect(rect, x, y);
}

function requireDragSnapshot(item: ItemBase): DomProperty {
  const snapshot = item.dragSnapshot;
  if (!snapshot) {
    const message = `[drop-snapshot] Missing drag snapshot for item ${item.id}. Drop prediction must run after dragStart captures snapshots.`;
    console.error(message);
    throw new Error(message);
  }
  return snapshot;
}

function isContainerObject(item: ItemBase) {
  return (
    "configuration" in item &&
    "direction" in item &&
    "name" in item &&
    "numberOfItems" in item
  );
}

function isDropAreaContainer(item: ItemBase) {
  return (
    isContainerObject(item) &&
    !item.noDrop &&
    "dropArea" in item &&
    (item as any).dropArea === true
  );
}

const dropAreaCollisionEngine = new CollisionEngine();

function rectColliderForWorldRect(
  owner: ItemBase,
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
  item: ItemBase,
  dragRect: WorldRect,
) {
  const dropAreaContainers = Array.from(
    new Set(candidates.map((candidate) => candidate.container)),
  ).filter(isDropAreaContainer);
  if (dropAreaContainers.length === 0) return candidates;

  const dragCollider = rectColliderForWorldRect(item, dragRect);
  if (!dragCollider) return candidates;

  const collidingContainers: ItemBase[] = [];
  try {
    for (const container of dropAreaContainers) {
      const prop = requireDragSnapshot(container);
      const containerCollider = rectColliderForWorldRect(container, prop);
      const isColliding =
        !!containerCollider &&
        dropAreaCollisionEngine.isIntersecting(dragCollider, containerCollider);
      containerCollider?.destroy();

      container.addDebugRect(
        prop.x,
        prop.y,
        prop.width,
        prop.height,
        isColliding ? "rgba(34, 197, 94, 0.35)" : "rgba(148, 163, 184, 0.18)",
        true,
        `drop-area-hitbox-${container.id}`,
        false,
        isColliding ? 3 : 1,
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

function filterCandidatesByDeepestContentHit(
  candidates: DropCandidate[],
  dragRect: Rect,
  dragCenterX: number,
  dragCenterY: number,
) {
  const hitContainers = Array.from(
    new Set(candidates.map((candidate) => candidate.container)),
  ).filter((container) => {
    const rect = containerContentRect(container);
    return (
      containsPoint(rect, dragCenterX, dragCenterY) ||
      intersectsRect(rect, dragRect)
    );
  });
  if (hitContainers.length === 0) return candidates;

  const deepestDepth = Math.max(
    ...hitContainers.map((container) => container.depth),
  );
  const allowedContainers = new Set(
    hitContainers.filter((container) => container.depth === deepestDepth),
  );
  return candidates.filter((candidate) =>
    allowedContainers.has(candidate.container),
  );
}

function createLayoutSnapshot(root: ItemBase): {
  root: LayoutNode<ItemBase>;
  byItem: Map<ItemBase, LayoutNode<ItemBase>>;
} {
  const byItem = new Map<ItemBase, LayoutNode<ItemBase>>();
  const visit = (item: ItemBase): LayoutNode<ItemBase> => {
    const node: LayoutNode<ItemBase> = {
      value: item,
      direction: getDirection(item),
      mainAxisAlign: getMainAxisAlign(item),
      locked: item.locked,
      box: requireDragSnapshot(item),
      children: [],
    };
    byItem.set(item, node);
    node.children = item.dragSnapshotOrderedList.map(visit);
    return node;
  };

  return { root: visit(root), byItem };
}

function layoutInsertionFromGhost(
  byItem: Map<ItemBase, LayoutNode<ItemBase>>,
  ghost?: VirtualGhost,
): VirtualInsertion<ItemBase> | undefined {
  if (!ghost) return undefined;
  const container = byItem.get(ghost.container);
  if (!container) return undefined;
  return {
    container,
    index: ghost.index,
    entry: {
      width: ghost.width,
      height: ghost.height,
      margin: requireDragSnapshot(ghost.container).margin,
    },
  };
}

function containerContentRect(container: ItemBase): Rect {
  const prop = requireDragSnapshot(container);
  const origin = contentBoxOrigin(prop);
  const size = contentBoxSize(prop);
  return { ...origin, ...size };
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

function dumpSnapshotOnce(item: ItemBase, root: ItemBase) {
  if (!SNAPSHOT_DUMP_TRACE) return;
  if (snapshotDumpedForDrag.has(item)) return;
  snapshotDumpedForDrag.add(item);

  const dumpNode = (node: ItemBase, depth = 0) => {
    const prop = requireDragSnapshot(node);
    const origin = contentBoxOrigin(prop);
    const indent = "  ".repeat(depth);
    console.log(
      `${indent}${node.id} contentOrigin=(${Math.round(origin.x)},${Math.round(origin.y)})`,
    );
    for (const child of node.dragSnapshotOrderedList) {
      dumpNode(child, depth + 1);
    }
  };

  console.groupCollapsed?.(`[drop-snapshot] root=${root.id} drag=${item.id}`);
  dumpNode(root);
  console.groupEnd?.();
}

export function virtualDimensions(
  container: ItemBase,
  draggedItem: ItemBase,
  ghost?: VirtualGhost,
): VirtualDimensions {
  const snapshot = createLayoutSnapshot(container);
  const insertions = [layoutInsertionFromGhost(snapshot.byItem, ghost)].filter(
    (insertion): insertion is VirtualInsertion<ItemBase> => !!insertion,
  );
  return layoutVirtualDimensions(snapshot.root, {
    filter: { excludeValues: new Set([draggedItem]) },
    insertions,
  });
}

export function virtualLayoutRecursive(
  container: ItemBase,
  startX: number,
  startY: number,
  draggedItem: ItemBase,
  dragGhostW: number,
  dragGhostH: number,
  dragCenterX: number,
  dragCenterY: number,
): { candidates: DropCandidate[]; endX: number; endY: number } {
  const snapshot = createLayoutSnapshot(container);
  return virtualLayoutRecursiveFromNode(
    snapshot.root,
    startX,
    startY,
    { excludeValues: new Set([draggedItem]) },
    requireDragSnapshot(draggedItem),
    dragGhostW,
    dragGhostH,
    dragCenterX,
    dragCenterY,
  );
}

function virtualLayoutRecursiveFromNode(
  containerNode: LayoutNode<ItemBase>,
  startX: number,
  startY: number,
  filter: LayoutFilter<ItemBase>,
  draggedBox: DomProperty,
  dragGhostW: number,
  dragGhostH: number,
  dragCenterX: number,
  dragCenterY: number,
): { candidates: DropCandidate[]; endX: number; endY: number } {
  const container = containerNode.value;
  const axes = flowAxesForDirection(containerNode.direction);
  const isColumn = axes.direction === "column";
  const containerProp = containerNode.box;
  const contentSize = contentBoxSize(containerProp);
  const itemNodes = layoutItems(containerNode, filter);
  const metrics = inferFlowLayoutMetrics(containerNode, axes);
  const flowPositions = flowLayoutPositions(containerNode, startX, startY, {
    filter,
  }).itemPositions;
  const candidates: DropCandidate[] = [];
  const lineCrossStart =
    (axes.cross === "x" ? startX : startY) + metrics.crossStart;
  const fallbackLineCrossSize =
    dragGhostH > 0 && axes.crossSize === "height" ? dragGhostH : dragGhostW;
  const lineCrossStep = Math.max(
    1,
    (metrics.lineCrossSize || fallbackLineCrossSize || 1) + metrics.crossGap,
  );
  const dragCross = axes.cross === "x" ? dragCenterX : dragCenterY;
  const lineIndexForCross = (cross: number) =>
    Math.max(0, Math.floor((cross - lineCrossStart) / lineCrossStep + 0.001));
  const dragLineIndex = lineIndexForCross(dragCross);

  container.addDebugRect(
    startX,
    startY,
    contentSize.width,
    contentSize.height,
    "rgba(20, 184, 166, 0.25)",
    true,
    `drop-snapshot-content-${container.id}`,
    false,
    1,
    TAG_LAYOUT,
  );

  const makeCandidate = (
    index: number,
    fallbackPosition: { x: number; y: number },
  ): DropCandidate => {
    const insertion: VirtualInsertion<ItemBase> = {
      container: containerNode,
      index,
      entry: {
        width: dragGhostW,
        height: dragGhostH,
        margin: draggedBox.margin,
      },
    };
    const layout = flowLayoutPositions(containerNode, startX, startY, {
      filter,
      insertions: [insertion],
    });
    const rect = layout.virtualRects.get(insertion) ?? {
      ...fallbackPosition,
      width: dragGhostW,
      height: dragGhostH,
    };
    const placementRect = rect;
    const ghostCenterX = rect.x + rect.width / 2;
    const ghostCenterY = rect.y + rect.height / 2;
    const lineIndex = lineIndexForCross(rect[axes.cross]);
    const nextPosition = isColumn
      ? { x: rect.x, y: rect.y + rect.height }
      : { x: rect.x + rect.width, y: rect.y };

    return {
      container,
      index,
      ghostCenterX,
      ghostCenterY,
      distance: euclidean(ghostCenterX, ghostCenterY, dragCenterX, dragCenterY),
      priority: 0,
      lineIndex,
      dragLineIndex,
      lineDistance: Math.abs(lineIndex - dragLineIndex),
      prevPosition: null,
      nextPosition,
      placementRect,
      placementDistance: distanceToRect(
        placementRect,
        dragCenterX,
        dragCenterY,
      ),
      placementContainsDragCenter: containsPoint(
        placementRect,
        dragCenterX,
        dragCenterY,
      ),
    };
  };

  if (
    itemNodes.length === 0 &&
    isContainerObject(container) &&
    !container.noDrop
  ) {
    candidates.push(makeCandidate(0, { x: startX, y: startY }));
  }

  for (let index = 0; index < itemNodes.length; index++) {
    const itemNode = itemNodes[index];
    const item = itemNode.value;
    const prop = itemNode.box;
    const isContainer =
      itemNode.children.length > 0 || isContainerObject(item);
    const rel = childRelativeOffset(containerProp, prop);
    const measuredPosition = { x: startX + rel.x, y: startY + rel.y };
    const simulatedPosition = flowPositions.get(itemNode) ?? measuredPosition;

    if (!itemNode.locked) {
      candidates.push(makeCandidate(index, simulatedPosition));
    }

    if (isContainer) {
      const childOrigin = {
        x: simulatedPosition.x + prop.border.left + prop.padding.left,
        y: simulatedPosition.y + prop.border.top + prop.padding.top,
      };
      const childResult = virtualLayoutRecursiveFromNode(
        itemNode,
        childOrigin.x,
        childOrigin.y,
        filter,
        draggedBox,
        dragGhostW,
        dragGhostH,
        dragCenterX,
        dragCenterY,
      );
      candidates.push(...childResult.candidates);
    }

    if (!itemNode.locked) {
      const fallbackMain = simulatedPosition[axes.main] + prop[axes.mainSize];
      const fallbackCross = simulatedPosition[axes.cross];
      candidates.push(
        makeCandidate(
          index + 1,
          pointFromAxes(axes, fallbackMain, fallbackCross),
        ),
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

function collectDropCandidates(
  item: ItemBase,
  root: ItemBase,
): {
  candidates: DropCandidate[];
  dragCenterX: number;
  dragCenterY: number;
  dragGhostW: number;
  dragGhostH: number;
} {
  const rootProp = requireDragSnapshot(root);
  const dragProp = requireDragSnapshot(item);
  const dragGhostW = dragProp.width;
  const dragGhostH = dragProp.height;
  const dragCenterX = item.worldTransform.x + dragProp.width / 2;
  const dragCenterY = item.worldTransform.y + dragProp.height / 2;
  const layoutOrigin = contentBoxOrigin(rootProp);
  dumpSnapshotOnce(item, root);

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
  const dropAreaCandidates = filterCandidatesByDropArea(
    virtualCandidates,
    item,
    dragRect,
  );
  const candidates = filterCandidatesByDeepestContentHit(
    dropAreaCandidates,
    dragRect,
    dragCenterX,
    dragCenterY,
  );

  return { candidates, dragCenterX, dragCenterY, dragGhostW, dragGhostH };
}

function chooseEuclideanCandidate(
  candidates: DropCandidate[],
  dragCenterX: number,
  dragCenterY: number,
): DropCandidate | null {
  let best: DropCandidate | null = null;
  for (const candidate of candidates) {
    if (!best) {
      best = candidate;
      continue;
    }
    if (
      Math.abs(candidate.distance - best.distance) <= 1 &&
      candidate.container.id !== best.container.id
    ) {
      best = chooseByContentBox(best, candidate, dragCenterX, dragCenterY);
    } else if (candidate.distance < best.distance) {
      best = candidate;
    }
  }
  return best;
}

function chooseProgressiveCandidate(
  candidates: DropCandidate[],
  dragCenterX: number,
  dragCenterY: number,
): DropCandidate | null {
  let best: DropCandidate | null = null;
  for (const candidate of candidates) {
    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.lineDistance !== best.lineDistance) {
      best = candidate.lineDistance < best.lineDistance ? candidate : best;
      continue;
    }

    if (
      candidate.placementContainsDragCenter !==
      best.placementContainsDragCenter
    ) {
      best = candidate.placementContainsDragCenter ? candidate : best;
      continue;
    }

    const placementDistanceDelta: number =
      candidate.placementDistance - best.placementDistance;
    if (Math.abs(placementDistanceDelta) > 0.5) {
      best = placementDistanceDelta < 0 ? candidate : best;
      continue;
    }

    if (
      Math.abs(candidate.distance - best.distance) <= 1 &&
      candidate.container.id !== best.container.id
    ) {
      best = chooseByContentBox(best, candidate, dragCenterX, dragCenterY);
    } else if (candidate.distance < best.distance) {
      best = candidate;
    }
  }
  return best;
}

function drawCandidateDebug(
  root: ItemBase,
  item: ItemBase,
  candidates: DropCandidate[],
  best: DropCandidate | null,
) {
  for (let i = 0; i < 50; i++) {
    root.clearDebugMarker(`drop-candidate-marker-${i}`);
    root.clearDebugMarker(`drop-candidate-label-${i}`);
  }

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const isBest = best === candidate;
    const color = isBest
      ? "rgba(250, 204, 21, 0.8)"
      : "rgba(180, 180, 180, 0.35)";

    root.addDebugCircle(
      candidate.ghostCenterX,
      candidate.ghostCenterY,
      isBest ? 6 : 4,
      color,
      true,
      `drop-candidate-marker-${i}`,
      TAG_CANDIDATES,
    );
    root.addDebugText(
      candidate.ghostCenterX + 8,
      candidate.ghostCenterY + 4,
      `${isBest ? ">> " : ""}[${candidate.container.id}:${candidate.index}] d=${Math.round(candidate.distance)}`,
      color,
      true,
      `drop-candidate-label-${i}`,
      TAG_CANDIDATES,
    );
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
}

export function determineDropTarget(
  item: ItemBase,
  root: ItemBase,
): DropCandidate | null {
  const { candidates, dragCenterX, dragCenterY } = collectDropCandidates(
    item,
    root,
  );
  const best = chooseEuclideanCandidate(candidates, dragCenterX, dragCenterY);
  drawCandidateDebug(root, item, candidates, best);
  debugDropTargetTree(root, item);
  return best;
}

export function determineProgressiveDropTarget(
  item: ItemBase,
  root: ItemBase,
): DropCandidate | null {
  const { candidates, dragCenterX, dragCenterY } = collectDropCandidates(
    item,
    root,
  );
  const best = chooseProgressiveCandidate(candidates, dragCenterX, dragCenterY);
  drawCandidateDebug(root, item, candidates, best);
  debugDropTargetTree(root, item);
  return best;
}

export function debugDropTargetTree(node: ItemBase, draggedItem: ItemBase) {
  const items = node.itemOrderedList.filter(
    (item) => item !== draggedItem && !item.isGhost,
  );

  for (const item of items) {
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

    if (item.children.length > 0) {
      debugDropTargetTree(item, draggedItem);
    }
  }
}
