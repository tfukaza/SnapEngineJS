import type { AnimationObject } from "@snap-engine/core/animation";
import type { dragStartProp, dragProp } from "@snap-engine/core";
import type { Container } from "../container";
import type { Item } from "../item";
import type { DropCandidate } from "../algorithm";
import type { DragLocation, GhostRect } from "../events";
import type { SortStrategy } from "./drop-strategy";

export type DragSessionStatus = "pending" | "active" | "dropping" | "ended";

/** @internal Ghost placement the lifecycle strategy is currently targeting. */
export interface GhostTarget {
  ghostItem: Item;
  container: Container;
  index: number;
  ghostRect?: GhostRect | null;
}

/**
 * Owns all state for one drag gesture. A single DragSession lives on the
 * root container for the duration of a drag (`root.dragSession`).
 *
 * `items`/`sources` are arrays so multi-item drag can be added later without
 * changing this surface; only `items.length === 1` is implemented today.
 */
export class DragSession {
  readonly root: Container;
  readonly items: Item[];
  readonly sources: DragLocation[];
  readonly strategy: SortStrategy;
  status: DragSessionStatus = "pending";

  start: { x: number; y: number };
  pointer: { x: number; y: number };
  offset: { x: number; y: number } = { x: 0, y: 0 };

  /** The live ghost/marker Item instance for this drag, if one has been created. */
  ghostItem: Item | null = null;
  /** The ghost placement most recently requested by the lifecycle strategy. */
  pendingGhostTarget: GhostTarget | null = null;
  /** Last drop candidate resolved by the drop-target strategy (raw, snapshot-space index). */
  dropTarget: DropCandidate | null = null;

  /** @internal FLIP/positioning bookkeeping used only by the flow-ghost lifecycle. */
  dragCoordinateParent: Item | null = null;
  /** @internal */
  dragLayoutPosition: { x: number; y: number } | null = null;
  /** @internal */
  dragTransformSyncAnimation: AnimationObject | null = null;

  constructor(
    root: Container,
    items: Item[],
    sources: DragLocation[],
    strategy: SortStrategy,
    prop: dragStartProp,
  ) {
    this.root = root;
    this.items = items;
    this.sources = sources;
    this.strategy = strategy;
    this.start = { x: prop.start.x, y: prop.start.y };
    this.pointer = { x: prop.start.x, y: prop.start.y };
  }

  get primaryItem(): Item {
    return this.items[0];
  }

  /** Schedules the READ_1/WRITE_1 work for starting a drag; see FlowGhostLifecycle/InsertionMarkerLifecycle for the mode-specific WRITE_1 continuation. */
  begin(prop: dragStartProp): void {
    const item = this.primaryItem;
    const root = this.root;
    const source = this.sources[0];

    item.schedule(
      () => {
        this.pointer = { x: prop.start.x, y: prop.start.y };
        this.start = { x: prop.start.x, y: prop.start.y };
        this.offset = {
          x: prop.start.x - item.worldTransform.x,
          y: prop.start.y - item.worldTransform.y,
        };
        source.container.readDom({ unapplyTransform: true });
        root.captureDragSnapshotTree();
      },
      { stage: "READ_1", queueId: `drag-start-offset-${item.id}` },
    );

    item.schedule(
      async () => {
        const vetoed =
          root.callbacks?.onDragStart?.({
            session: this,
            item,
            itemMetadata: item.metadata,
            element: item.element,
            source,
          }) === false;
        if (vetoed) {
          this.status = "ended";
          root.dragSession = null;
          return;
        }

        this.status = "active";
        if (item.element) {
          item.element.dataset.snapsortDragging = "true";
        }
        await this.strategy.lifecycle.dragStart(this);
      },
      { stage: "WRITE_1" },
    );
  }

  pointerMove(prop: dragProp): void {
    const item = this.primaryItem;
    item.schedule(
      async () => {
        this.pointer = { x: prop.position.x, y: prop.position.y };
        await this.updateDropTarget();
        await this.strategy.lifecycle.dragMove(this);
      },
      { stage: "WRITE_1", queueId: `drag-${item.id}` },
    );
    this.root.queueReadTree("READ_2", `drag-${item.id}`);
  }

  /**
   * Compute the current drop target and move the ghost when the target changes.
   * Mode-specific translation/comparison is delegated to the lifecycle strategy;
   * this method owns the shared "did the target change" bookkeeping and the
   * `onDropTargetChange` callback.
   */
  async updateDropTarget(): Promise<void> {
    const item = this.primaryItem;
    const root = this.root;
    // Defensive guard for a drag-start/drag race: the deeper fix should live in
    // the engine scheduler as built-in debounce/coalescing support for input
    // updates that depend on earlier READ/WRITE phases.
    if (!root.hasDragSnapshotTree() || !item.dragSnapshot) {
      return;
    }

    const target = this.strategy.dropTarget.resolve(item, root, this);
    if (!target) {
      return;
    }
    this.dropTarget = target;

    const lifecycle = this.strategy.lifecycle;
    const ghostSource = lifecycle.currentGhostLocation(this);
    const targetIndex =
      target.container != null ? lifecycle.translateTargetIndex(this, target) : -1;
    const targetContainer = target.container as unknown as Container;

    if (targetContainer && ghostSource) {
      const changed =
        targetContainer !== ghostSource.container ||
        targetIndex !== ghostSource.index;
      if (changed) {
        await lifecycle.moveGhost(
          this,
          targetContainer,
          targetIndex,
          target.ghostRect,
        );
        this.fireDropTargetChange(ghostSource, {
          container: targetContainer,
          index: targetIndex,
        });
      }
      lifecycle.afterSyncDropTarget(this);
    } else if (targetContainer) {
      await lifecycle.moveGhost(
        this,
        targetContainer,
        targetIndex,
        target.ghostRect,
      );
      this.fireDropTargetChange(null, {
        container: targetContainer,
        index: targetIndex,
      });
      lifecycle.afterSyncDropTarget(this);
    }
  }

  private fireDropTargetChange(
    previous: { container: Container; index: number } | null,
    current: { container: Container; index: number } | null,
  ): void {
    const item = this.primaryItem;
    const toLocation = (
      loc: { container: Container; index: number } | null,
    ): DragLocation | null =>
      loc
        ? {
            container: loc.container,
            containerMetadata: loc.container.metadata,
            index: loc.index,
          }
        : null;
    this.root.callbacks?.onDropTargetChange?.({
      session: this,
      item,
      itemMetadata: item.metadata,
      previous: toLocation(previous),
      current: toLocation(current),
    });
  }
}
