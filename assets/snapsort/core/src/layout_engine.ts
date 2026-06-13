import type { DomProperty } from "@snap-engine/core";

export type LayoutDirection = "column" | "row";
type AxisName = "x" | "y";
type SizeName = "width" | "height";

export interface FlowAxes {
  direction: LayoutDirection;
  main: AxisName;
  cross: AxisName;
  mainSize: SizeName;
  crossSize: SizeName;
}

interface FlowMetrics {
  mainStart: number;
  crossStart: number;
  mainGap: number;
  crossGap: number;
  lineCount: number;
}

export interface LayoutNode<T> {
  value: T;
  direction: LayoutDirection;
  locked: boolean;
  isGhost: boolean;
  box: DomProperty;
  children: LayoutNode<T>[];
}

export interface VirtualGhost<T> {
  container: LayoutNode<T>;
  index: number;
  width: number;
  height: number;
}

export interface VirtualDimensions {
  width: number;
  height: number;
}

export interface FlowPositionResult<T> {
  itemPositions: Map<LayoutNode<T>, { x: number; y: number }>;
  ghostPosition: { x: number; y: number } | null;
}

type FlowEntry<T> =
  | { kind: "item"; item: LayoutNode<T>; width: number; height: number }
  | { kind: "ghost"; width: number; height: number };

function trailingMainMargin<T>(
  entry: FlowEntry<T>,
  draggedItem: LayoutNode<T>,
  axes: FlowAxes,
): number {
  const box = entry.kind === "item" ? entry.item.box : draggedItem.box;
  return axes.main === "x" ? box.margin.right : box.margin.bottom;
}

export function flowAxesForDirection(direction: LayoutDirection): FlowAxes {
  if (direction === "row") {
    return {
      direction,
      main: "x",
      cross: "y",
      mainSize: "width",
      crossSize: "height",
    };
  }

  return {
    direction,
    main: "y",
    cross: "x",
    mainSize: "height",
    crossSize: "width",
  };
}

export function pointFromAxes(
  axes: FlowAxes,
  main: number,
  cross: number,
): { x: number; y: number } {
  return axes.main === "x" ? { x: main, y: cross } : { x: cross, y: main };
}

export function contentBoxOrigin(prop: DomProperty): { x: number; y: number } {
  return {
    x: prop.x + prop.border.left + prop.padding.left,
    y: prop.y + prop.border.top + prop.padding.top,
  };
}

export function contentBoxSize(prop: DomProperty): {
  width: number;
  height: number;
} {
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

export function childRelativeOffset(
  containerProp: DomProperty,
  childProp: DomProperty,
): { x: number; y: number } {
  const origin = contentBoxOrigin(containerProp);
  return {
    x: childProp.x - origin.x,
    y: childProp.y - origin.y,
  };
}

export function layoutItems<T>(
  container: LayoutNode<T>,
  draggedItem: LayoutNode<T>,
): LayoutNode<T>[] {
  return container.children.filter(
    (item) =>
      item !== draggedItem && item.value !== draggedItem.value && !item.isGhost,
  );
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function inferFlowLayoutMetrics<T>(
  container: LayoutNode<T>,
  axes: FlowAxes,
): FlowMetrics {
  const ordered = container.children.filter((item) => !item.isGhost);
  if (ordered.length === 0) {
    return {
      mainStart: 0,
      crossStart: 0,
      mainGap: 0,
      crossGap: 0,
      lineCount: 0,
    };
  }

  const firstOffset = childRelativeOffset(container.box, ordered[0].box);
  const mainGaps: number[] = [];
  const lines: Array<{ cross: number; crossSize: number }> = [];
  let currentLine: { cross: number; crossSize: number } | null = null;
  let previousOffset: { x: number; y: number } | null = null;

  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    const offset = childRelativeOffset(container.box, item.box);
    const startsNewLine =
      previousOffset != null &&
      offset[axes.main] < previousOffset[axes.main] - 1;
    if (!currentLine || startsNewLine) {
      currentLine = {
        cross: offset[axes.cross],
        crossSize: item.box[axes.crossSize],
      };
      lines.push(currentLine);
    } else {
      currentLine.crossSize = Math.max(
        currentLine.crossSize,
        item.box[axes.crossSize],
      );
    }

    const next = ordered[i + 1];
    if (next) {
      const nextOffset = childRelativeOffset(container.box, next.box);
      const nextStartsNewLine = nextOffset[axes.main] < offset[axes.main] - 1;
      if (!nextStartsNewLine) {
        const gap =
          nextOffset[axes.main] - (offset[axes.main] + item.box[axes.mainSize]);
        if (gap >= 0) mainGaps.push(gap);
      }
    }
    previousOffset = offset;
  }

  const crossGaps: number[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const gap = lines[i + 1].cross - (lines[i].cross + lines[i].crossSize);
    if (gap >= 0) crossGaps.push(gap);
  }

  return {
    mainStart: firstOffset[axes.main],
    crossStart: firstOffset[axes.cross],
    mainGap: median(mainGaps),
    crossGap: median(crossGaps),
    lineCount: lines.length,
  };
}

export function flowLayoutPositions<T>(
  container: LayoutNode<T>,
  draggedItem: LayoutNode<T>,
  startX: number,
  startY: number,
  ghost?: VirtualGhost<T>,
): FlowPositionResult<T> {
  const axes = flowAxesForDirection(container.direction);
  const contentSize = contentBoxSize(container.box);
  const items = layoutItems(container, draggedItem);
  const metrics = inferFlowLayoutMetrics(container, axes);
  const entries: FlowEntry<T>[] = items.map((item) => {
    const dimensions =
      item.children.length > 0
        ? virtualDimensions(item, draggedItem, ghost)
        : item.box;
    return {
      kind: "item",
      item,
      width: dimensions.width,
      height: dimensions.height,
    };
  });

  if (ghost?.container === container) {
    entries.splice(Math.max(0, Math.min(ghost.index, entries.length)), 0, {
      kind: "ghost",
      width: ghost.width,
      height: ghost.height,
    });
  }

  const itemPositions = new Map<LayoutNode<T>, { x: number; y: number }>();
  let ghostPosition: { x: number; y: number } | null = null;
  const origin = { x: startX, y: startY };
  const lineMainStart = origin[axes.main] + metrics.mainStart;
  const lineCrossStart = origin[axes.cross] + metrics.crossStart;
  const maxMain = origin[axes.main] + contentSize[axes.mainSize];
  const canWrap = axes.direction === "row" || metrics.lineCount > 1;
  let cursorMain = lineMainStart;
  let cursorCross = lineCrossStart;
  let lineCrossSize = 0;

  for (const entry of entries) {
    const entryMainSize = entry[axes.mainSize];
    const entryCrossSize = entry[axes.crossSize];
    const entryTrailingMainMargin = trailingMainMargin(
      entry,
      draggedItem,
      axes,
    );
    if (
      canWrap &&
      cursorMain > lineMainStart + 0.5 &&
      cursorMain + entryMainSize + entryTrailingMainMargin > maxMain + 0.5
    ) {
      cursorMain = lineMainStart;
      cursorCross += lineCrossSize + metrics.crossGap;
      lineCrossSize = 0;
    }

    let position = pointFromAxes(axes, cursorMain, cursorCross);
    if (entry.kind === "item" && entry.item.locked) {
      const rel = childRelativeOffset(container.box, entry.item.box);
      position = { x: startX + rel.x, y: startY + rel.y };
      cursorMain = position[axes.main];
      cursorCross = position[axes.cross];
    }

    if (entry.kind === "ghost") {
      ghostPosition = position;
    } else {
      itemPositions.set(entry.item, position);
    }

    cursorMain += entryMainSize + metrics.mainGap;
    lineCrossSize = Math.max(lineCrossSize, entryCrossSize);
  }

  return { itemPositions, ghostPosition };
}

export function virtualDimensions<T>(
  container: LayoutNode<T>,
  draggedItem: LayoutNode<T>,
  ghost?: VirtualGhost<T>,
): VirtualDimensions {
  const axes = flowAxesForDirection(container.direction);
  const items = layoutItems(container, draggedItem);
  const flowPositions = flowLayoutPositions(
    container,
    draggedItem,
    0,
    0,
    ghost,
  );
  let maxX = 0;
  let maxY = 0;

  for (const child of items) {
    const dimensions =
      child.children.length > 0
        ? virtualDimensions(child, draggedItem, ghost)
        : child.box;
    const rel = childRelativeOffset(container.box, child.box);
    const measured = { x: rel.x, y: rel.y };
    const simulated = flowPositions.itemPositions.get(child) ?? measured;
    maxX = Math.max(maxX, simulated.x + dimensions.width);
    maxY = Math.max(maxY, simulated.y + dimensions.height);
  }

  if (ghost?.container === container && flowPositions.ghostPosition) {
    maxX = Math.max(maxX, flowPositions.ghostPosition.x + ghost.width);
    maxY = Math.max(maxY, flowPositions.ghostPosition.y + ghost.height);
  }

  const snapshotSize = {
    width: container.box.width,
    height: container.box.height,
  };
  const virtualSize = {
    width:
      container.box.border.left +
      container.box.padding.left +
      maxX +
      container.box.padding.right +
      container.box.border.right,
    height:
      container.box.border.top +
      container.box.padding.top +
      maxY +
      container.box.padding.bottom +
      container.box.border.bottom,
  };

  if (items.length === 0 && ghost?.container !== container) {
    return snapshotSize;
  }

  if (axes.direction === "row") {
    return {
      width: snapshotSize.width,
      height: Math.max(snapshotSize.height, virtualSize.height),
    };
  }

  return {
    width: snapshotSize.width,
    height: virtualSize.height,
  };
}
