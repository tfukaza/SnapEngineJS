import type { DomProperty } from "@snap-engine/core";

export type ItemId = string;
export type LayoutDirection = "column" | "row";
export type LayoutMainAxisAlign = "start" | "center";

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
  locked: boolean;
  box: DomProperty;
  children: ItemSnapshot<T>[];
}
