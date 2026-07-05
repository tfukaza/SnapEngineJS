import type { DomProperty } from "@snap-engine/core";

export type ItemId = string;
export type LayoutDirection = "column" | "row";
export type LayoutMainAxisAlign = "start" | "center";

export interface ItemSnapshotMetadata extends Record<string, unknown> {
  itemId?: ItemId;
  insertionMarkerInsetLeft?: number;
  insertionMarkerInsetRight?: number;
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
  // unWorldTransform: {
  //   x: number;
  //   y: number;
  // };
}
