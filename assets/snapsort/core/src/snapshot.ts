import type { DomProperty } from "@snap-engine/core";

export type ItemId = string;
export type LayoutDirection = "column" | "row";
export type LayoutMainAxisAlign = "start" | "center";
/**
 * How a container arranges its children, and therefore how the drop
 * simulation predicts positions:
 *
 * - `"flow"` (default): flexbox-like — children take their own measured
 *   size and wrap when the accumulated main-axis extent exceeds capacity.
 * - `"slots"`: CSS-grid-like — position is a function of *index*. The
 *   pristine snapshot's measured child boxes are the slots; a simulated
 *   entry adopts the geometry of the slot at its index. Requires the
 *   main-axis track geometry to be independent of which items occupy it
 *   (fixed/fr/percent templates); see `slotLayoutPositions` for the full
 *   contract.
 */
export type LayoutModel = "flow" | "slots";

export interface ItemSnapshotMetadata extends Record<string, unknown> {
  itemId?: ItemId;
  insertionMarkerInsetLeft?: number;
  insertionMarkerInsetRight?: number;
  /**
   * Shrink (positive) or grow (negative) this item's pointer-hover hitbox
   * from the given edge. Used for item-hover detection (`onDragItemEnter` /
   * `onDragItemMove` / `onDragItemLeave`) and by swap mode. Defaults to 0.
   */
  hitboxInsetTop?: number;
  hitboxInsetRight?: number;
  hitboxInsetBottom?: number;
  hitboxInsetLeft?: number;
  /** Hitbox shape for the same hover hit-testing. Defaults to `"rect"`. */
  hitboxShape?: "rect" | "ellipse";
}

export interface ItemSnapshot<T> {
  value: T;
  key: string;
  metadata: ItemSnapshotMetadata;
  direction: LayoutDirection;
  mainAxisAlign: LayoutMainAxisAlign;
  layoutModel: LayoutModel;
  locked: boolean;
  box: DomProperty;
  children: ItemSnapshot<T>[];
}
