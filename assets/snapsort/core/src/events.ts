import type { Container } from "./container";
import type { Item } from "./item";
import type { DragSession } from "./drag/session";
import type { ItemSnapshotMetadata } from "./snapshot";

/**
 * A container + index location, used both for drag sources/destinations and
 * for the currently prospective drop target during a drag.
 */
export interface DragLocation {
  container: Container;
  containerMetadata: Record<string, unknown>;
  index: number;
}

export interface ItemRemoveEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
}

export interface ItemInsertEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
  index: number;
  beforeElement: HTMLElement | null;
}

/**
 * Fired for a single semantic move of an item from one container/index to
 * another (including within the same container). Preferred over the
 * insert/remove primitives when the consumer's state model can express a
 * move as one operation.
 */
export interface ItemMoveEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  from: DragLocation;
  to: DragLocation;
  beforeElement: HTMLElement | null;
}

export interface GhostRect {
  x: number;
  y: number;
  width: number;
  height: number;
  insetLeft?: number;
  insetRight?: number;
}

/** Which drag lifecycle produced a ghost: a flow-layout spacer, or a floating insertion marker. */
export type GhostKind = "flow" | "marker";

export interface GhostCreateEvent {
  session: DragSession;
  kind: GhostKind;
  container: Container;
  original: Item;
  originalMetadata: ItemSnapshotMetadata;
  ghostItem: Item;
  ghostRect?: GhostRect | null;
}

export interface GhostInsertEvent {
  session: DragSession;
  kind: GhostKind;
  original: Item;
  originalMetadata: ItemSnapshotMetadata;
  ghostItem: Item;
  ghostMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
  index: number;
  beforeElement: HTMLElement | null;
  ghostRect?: GhostRect | null;
}

export interface GhostRemoveEvent {
  session: DragSession;
  kind: GhostKind;
  original: Item;
  originalMetadata: ItemSnapshotMetadata;
  ghostItem: Item;
  ghostMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
}

/** @internal Passed between a lifecycle strategy and the Mutator; not part of the public callback surface. */
export interface GhostUpdateEvent {
  session: DragSession;
  kind: GhostKind;
  original: Item;
  container: Container | null;
  index: number;
  ghostRect?: GhostRect | null;
}

export interface DragStartEvent {
  session: DragSession;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  element: HTMLElement | null;
  source: DragLocation;
}

export interface DragEndEvent {
  session: DragSession;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  element: HTMLElement | null;
  source: DragLocation;
  /** Null when the item was dropped back to its source or the drag was cancelled. */
  destination: DragLocation | null;
}

export interface DropTargetChangeEvent {
  session: DragSession;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  previous: DragLocation | null;
  current: DragLocation | null;
}

export interface CanDropEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
  /**
   * Candidate insertion index. `canDrop` is evaluated once per container per
   * drop-target resolution (not once per candidate slot) for performance, so
   * this reflects whichever candidate for this container was evaluated
   * first and should not be used for per-slot gating.
   */
  index: number;
}

export interface ContainerCallbacks {
  /** Preferred by state-backed frameworks: one semantic event per move. */
  onItemMove?: (event: ItemMoveEvent) => void;

  /** Primitives kept as building blocks; defaults perform direct DOM mutation. */
  onItemInsert?: (event: ItemInsertEvent) => void;
  onItemRemove?: (event: ItemRemoveEvent) => void;

  /** Fired on the source container. Returning `false` vetoes the drag before any state changes. */
  onDragStart?: (event: DragStartEvent) => void | false;
  onDragEnd?: (event: DragEndEvent) => void;

  /** Fired only when the prospective drop container/index actually changes. */
  onDropTargetChange?: (event: DropTargetChangeEvent) => void;

  /** Consulted while resolving candidates for `container`; return false to reject it for this drag. */
  canDrop?: (event: CanDropEvent) => boolean;

  /** Ghost customization, unified across both drag lifecycles via `event.kind`. */
  createGhost?: (event: GhostCreateEvent) => HTMLElement | void | null;
  onGhostInsert?: (event: GhostInsertEvent) => void;
  onGhostRemove?: (event: GhostRemoveEvent) => void;

  /** Wait for the caller's framework to flush DOM after SnapSort mutates data. */
  awaitMutation?: () => void | Promise<void>;
}
