import type { DomProperty } from "@snap-engine/core";

export type LayoutDirection = "column" | "row";
export type LayoutMainAxisAlign = "start" | "center";
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
  lineCrossSize: number;
  lineCount: number;
}

export interface LayoutNode<T> {
  value: T;
  direction: LayoutDirection;
  mainAxisAlign: LayoutMainAxisAlign;
  locked: boolean;
  box: DomProperty;
  children: LayoutNode<T>[];
}

export interface LayoutFilter<T> {
  excludeNodes?: Set<LayoutNode<T>>;
  excludeValues?: Set<T>;
}

export interface VirtualLayoutEntry {
  width: number;
  height: number;
  margin: DomProperty["margin"];
}

export interface VirtualInsertion<T> {
  container: LayoutNode<T>;
  index: number;
  entry: VirtualLayoutEntry;
}

export interface VirtualDimensions {
  width: number;
  height: number;
}

export interface FlowPositionResult<T> {
  itemPositions: Map<LayoutNode<T>, { x: number; y: number }>;
  virtualPositions: Map<VirtualInsertion<T>, { x: number; y: number }>;
  virtualRects: Map<
    VirtualInsertion<T>,
    { x: number; y: number; width: number; height: number }
  >;
}

type FlowEntry<T> =
  | { kind: "item"; item: LayoutNode<T>; width: number; height: number }
  | { kind: "virtual"; insertion: VirtualInsertion<T>; width: number; height: number };

interface FlowLine<T> {
  entries: FlowEntry<T>[];
  mainSize: number;
  crossSize: number;
}

function trailingMainMargin<T>(
  entry: FlowEntry<T>,
  axes: FlowAxes,
): number {
  const margin =
    entry.kind === "item" ? entry.item.box.margin : entry.insertion.entry.margin;
  return axes.main === "x" ? margin.right : margin.bottom;
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
  filter: LayoutFilter<T> = {},
): LayoutNode<T>[] {
  return container.children.filter(
    (item) =>
      !filter.excludeNodes?.has(item) && !filter.excludeValues?.has(item.value),
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
  const ordered = container.children;
  if (ordered.length === 0) {
    return {
      mainStart: 0,
      crossStart: 0,
      mainGap: 0,
      crossGap: 0,
      lineCrossSize: 0,
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
    lineCrossSize: median(lines.map((line) => line.crossSize)),
    lineCount: lines.length,
  };
}

export function flowLayoutPositions<T>(
  container: LayoutNode<T>,
  startX: number,
  startY: number,
  options: {
    filter?: LayoutFilter<T>;
    insertions?: VirtualInsertion<T>[];
  } = {},
): FlowPositionResult<T> {
  const axes = flowAxesForDirection(container.direction);
  const contentSize = contentBoxSize(container.box);
  const filter = options.filter ?? {};
  const items = layoutItems(container, filter);
  const metrics = inferFlowLayoutMetrics(container, axes);
  const entries: FlowEntry<T>[] = items.map((item) => {
    const dimensions =
      item.children.length > 0
        ? virtualDimensions(item, options)
        : item.box;
    return {
      kind: "item",
      item,
      width: dimensions.width,
      height: dimensions.height,
    };
  });

  const insertions = options.insertions ?? [];
  for (const insertion of insertions) {
    if (insertion.container === container) {
      entries.splice(Math.max(0, Math.min(insertion.index, entries.length)), 0, {
        kind: "virtual",
        insertion,
        width: insertion.entry.width,
        height: insertion.entry.height,
      });
    }
  }

  const itemPositions = new Map<LayoutNode<T>, { x: number; y: number }>();
  const virtualPositions = new Map<VirtualInsertion<T>, { x: number; y: number }>();
  const virtualRects = new Map<
    VirtualInsertion<T>,
    { x: number; y: number; width: number; height: number }
  >();
  const origin = { x: startX, y: startY };
  const lineCrossStart = origin[axes.cross] + metrics.crossStart;
  const canWrap = axes.direction === "row" || metrics.lineCount > 1;
  const lines: FlowLine<T>[] = [];
  let currentLine: FlowLine<T> = { entries: [], mainSize: 0, crossSize: 0 };

  const pushCurrentLine = () => {
    if (currentLine.entries.length > 0) {
      lines.push(currentLine);
      currentLine = { entries: [], mainSize: 0, crossSize: 0 };
    }
  };

  for (const entry of entries) {
    const entryMainSize = entry[axes.mainSize];
    const entryCrossSize = entry[axes.crossSize];
    const entryTrailingMainMargin = trailingMainMargin(entry, axes);
    if (
      canWrap &&
      currentLine.entries.length > 0 &&
      metrics.mainStart +
        currentLine.mainSize +
        metrics.mainGap +
        entryMainSize +
        entryTrailingMainMargin >
        contentSize[axes.mainSize] + 0.5
    ) {
      pushCurrentLine();
    }

    currentLine.mainSize +=
      currentLine.entries.length === 0
        ? entryMainSize
        : metrics.mainGap + entryMainSize;
    currentLine.crossSize = Math.max(currentLine.crossSize, entryCrossSize);
    currentLine.entries.push(entry);
  }
  pushCurrentLine();

  let cursorCross = lineCrossStart;
  for (const line of lines) {
    const lineMainStart =
      axes.direction === "row" && container.mainAxisAlign === "center"
        ? origin[axes.main] +
          Math.max(0, (contentSize[axes.mainSize] - line.mainSize) / 2)
        : origin[axes.main] + metrics.mainStart;
    let cursorMain = lineMainStart;

    for (const entry of line.entries) {
      const entryMainSize = entry[axes.mainSize];

      let position = pointFromAxes(axes, cursorMain, cursorCross);
      if (entry.kind === "item" && entry.item.locked) {
        const rel = childRelativeOffset(container.box, entry.item.box);
        position = { x: startX + rel.x, y: startY + rel.y };
        cursorMain = position[axes.main];
        cursorCross = position[axes.cross];
      }

      if (entry.kind === "virtual") {
        virtualPositions.set(entry.insertion, position);
        virtualRects.set(entry.insertion, {
          ...position,
          width: entry.width,
          height: entry.height,
        });
      } else {
        itemPositions.set(entry.item, position);
      }

      cursorMain += entryMainSize + metrics.mainGap;
    }

    cursorCross += line.crossSize + metrics.crossGap;
  }

  return { itemPositions, virtualPositions, virtualRects };
}

export function virtualDimensions<T>(
  container: LayoutNode<T>,
  options: {
    filter?: LayoutFilter<T>;
    insertions?: VirtualInsertion<T>[];
  } = {},
): VirtualDimensions {
  const axes = flowAxesForDirection(container.direction);
  const filter = options.filter ?? {};
  const items = layoutItems(container, filter);
  const flowPositions = flowLayoutPositions(
    container,
    0,
    0,
    options,
  );
  let maxX = 0;
  let maxY = 0;

  for (const child of items) {
    const dimensions =
      child.children.length > 0
        ? virtualDimensions(child, options)
        : child.box;
    const rel = childRelativeOffset(container.box, child.box);
    const measured = { x: rel.x, y: rel.y };
    const simulated = flowPositions.itemPositions.get(child) ?? measured;
    maxX = Math.max(maxX, simulated.x + dimensions.width);
    maxY = Math.max(maxY, simulated.y + dimensions.height);
  }

  for (const [insertion, rect] of flowPositions.virtualRects) {
    if (insertion.container === container) {
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }
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

  const hasLocalInsertion = (options.insertions ?? []).some(
    (insertion) => insertion.container === container,
  );
  if (items.length === 0 && !hasLocalInsertion) {
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
