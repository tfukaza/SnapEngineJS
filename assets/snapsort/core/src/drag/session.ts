import type { AnimationObject } from "@snap-engine/core/animation";
import type { dragStartProp, dragProp } from "@snap-engine/core";
import type { Container } from "../container";
import type { Item } from "../item";
import { findHoveredItem, type DropCandidate } from "../algorithm";
import type { DragLocation, DropEffect, GhostRect, GhostRole } from "../events";
import {
  fireDragItemEnter,
  fireDragItemLeave,
  fireDragItemMove,
} from "../mutation";
import type { SortStrategy } from "./drop-strategy";

export type DragSessionStatus = "pending" | "active" | "dropping" | "ended";

/** @internal Ghost placement the lifecycle strategy is currently targeting. */
export interface GhostTarget {
  ghostItem: Item;
  container: Container;
  index: number;
  ghostRect?: GhostRect | null;
}

/** @internal Direction-aware size of the whole dragged group, used to size a single group ghost/marker. */
export interface GroupDimensions {
  maxW: number;
  maxH: number;
  sumW: number;
  sumH: number;
}

/**
 * Owns all state for one drag gesture. A single DragSession lives on the
 * root container for the duration of a drag (`root.dragSession`).
 *
 * `items`/`sources` describe the full dragged run (ordered by original
 * document index, lowest first); `items.length === 1` is the single-item
 * case and behaves exactly as before multi-item support was added.
 */
export class DragSession {
  readonly root: Container;
  readonly items: Item[];
  readonly sources: DragLocation[];
  /** The item the pointer actually grabbed — may differ from `items[0]` (the run head) for disjoint selections. Anchors pointer-follow geometry. */
  readonly pressedItem: Item;
  /** `items` as a Set, for O(1) exclusion checks in layout/algorithm code. */
  readonly itemSet: Set<Item>;
  /** Direction-aware bounding size of the whole dragged group, computed once drag snapshots are captured. Degenerates to the single item's box when `items.length === 1`. */
  groupDims: GroupDimensions | null = null;
  /** Per-item constant visual offset (relative to `pressedItem`) so companions preview the collapsed run while hoisted. */
  readonly groupVisualOffsets: Map<Item, { x: number; y: number }> = new Map();
  readonly strategy: SortStrategy;
  status: DragSessionStatus = "pending";

  /**
   * What committing this drag should do to source data. Defaults to `"move"`.
   * Consumers set this from `onDragStart` / `onDropTargetChange` to opt into
   * copy or no-op (e.g. trash-bin) semantics; the core never infers it.
   */
  dropEffect: DropEffect = "move";

  start: { x: number; y: number };
  pointer: { x: number; y: number };
  offset: { x: number; y: number } = { x: 0, y: 0 };

  /**
   * Ghosts currently live for this drag, keyed by role. Most lifecycles only
   * ever populate `"target"` (the placeholder tracking the prospective drop
   * slot); `"source"` and `"pointer"` are used by copy/swap semantics to hold
   * a slot open or represent the pointer-following visual without disturbing
   * the target ghost. Ghosts can be added, moved, or removed independently at
   * any point during a drag.
   */
  readonly ghosts: Map<GhostRole, Item> = new Map();

  /**
   * `"source"`-role ghosts for `dropEffect = "copy"` in flow modes, one per
   * vacated slot (keyed by the original item). Unlike `ghosts`, which holds
   * at most one ghost per role, a multi-item copy needs to hold open every
   * member's original slot simultaneously.
   */
  readonly sourceGhosts: Map<Item, Item> = new Map();

  /** Convenience accessor for the `"target"` ghost — the placeholder most lifecycles track. */
  get ghostItem(): Item | null {
    return this.ghosts.get("target") ?? null;
  }

  set ghostItem(value: Item | null) {
    if (value) {
      this.ghosts.set("target", value);
    } else {
      this.ghosts.delete("target");
    }
  }

  /** The ghost placement most recently requested by the lifecycle strategy. */
  pendingGhostTarget: GhostTarget | null = null;
  /** Last drop candidate resolved by the drop-target strategy (raw, snapshot-space index). */
  dropTarget: DropCandidate | null = null;
  /** The item whose hitbox the pointer is currently over, if any — drives `onDragItemEnter`/`Move`/`Leave`. */
  hoveredItem: Item | null = null;

  /**
   * @internal FLIP/positioning bookkeeping used only by the flow-ghost
   * lifecycle, keyed per dragged item (each member can live under a
   * different original DOM parent).
   */
  readonly dragCoordinateParent: Map<Item, Item> = new Map();
  /** @internal */
  readonly dragLayoutPosition: Map<Item, { x: number; y: number }> = new Map();
  /** @internal */
  dragTransformSyncAnimation: AnimationObject | null = null;

  constructor(
    root: Container,
    items: Item[],
    sources: DragLocation[],
    strategy: SortStrategy,
    prop: dragStartProp,
    pressedItem: Item = items[0],
  ) {
    this.root = root;
    this.items = items;
    this.sources = sources;
    this.pressedItem = pressedItem;
    this.itemSet = new Set(items);
    this.strategy = strategy;
    this.start = { x: prop.start.x, y: prop.start.y };
    this.pointer = { x: prop.start.x, y: prop.start.y };
  }

  /** The run head — lowest original index, first element of `items`. Used as the singular `item` in backwards-compatible event fields. */
  get primaryItem(): Item {
    return this.items[0];
  }

  /**
   * Compute this session's group dimensions from each member's drag
   * snapshot box. Called once drag snapshots are captured (READ_1 of
   * `begin`). Degenerates to the pressed item's own box for a single item.
   */
  private computeGroupDims(): GroupDimensions {
    let maxW = 0;
    let maxH = 0;
    let sumW = 0;
    let sumH = 0;
    let prevBox: { width: number; height: number; margin: { top: number; bottom: number; left: number; right: number } } | null = null;
    for (const member of this.items) {
      const box = member.dragSnapshot?.box;
      if (!box) continue;
      maxW = Math.max(maxW, box.width);
      maxH = Math.max(maxH, box.height);
      const columnGap = prevBox
        ? Math.max(prevBox.margin.bottom, box.margin.top)
        : 0;
      const rowGap = prevBox
        ? Math.max(prevBox.margin.right, box.margin.left)
        : 0;
      sumH += box.height + columnGap;
      sumW += box.width + rowGap;
      prevBox = box;
    }
    return { maxW, maxH, sumW, sumH };
  }

  /** Schedules the READ_1/WRITE_1 work for starting a drag; see FlowGhostLifecycle/InsertionMarkerLifecycle for the mode-specific WRITE_1 continuation. */
  begin(prop: dragStartProp): void {
    const item = this.pressedItem;
    const root = this.root;
    const source = this.sources[this.items.indexOf(this.pressedItem)] ?? this.sources[0];

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
        this.groupDims = this.computeGroupDims();
      },
      { stage: "READ_1", queueId: `drag-start-offset-${item.id}` },
    );

    item.schedule(
      async () => {
        const primary = this.primaryItem;
        const vetoed =
          root.callbacks?.onDragStart?.({
            session: this,
            item: primary,
            itemMetadata: primary.metadata,
            items: this.items,
            itemsMetadata: this.items.map((i) => i.metadata),
            element: primary.element,
            source: this.sources[0],
            sources: this.sources,
          }) === false;
        if (vetoed) {
          this.status = "ended";
          root.dragSession = null;
          return;
        }

        this.status = "active";
        for (const member of this.items) {
          if (member.element) {
            member.element.dataset.snapsortDragging = "true";
          }
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

    const lifecycle = this.strategy.lifecycle;
    const target = this.strategy.dropTarget.resolve(item, root, this);
    if (!target) {
      // No valid candidate anywhere (e.g. the pointer left every drop-eligible
      // container). The target ghost should not linger over a target that no
      // longer exists — clear it and report the loss, same as any other
      // drop-target change.
      const previousGhostLocation = lifecycle.currentGhostLocation(this);
      if (previousGhostLocation || this.dropTarget) {
        this.dropTarget = null;
        await lifecycle.removeGhost(this, "target");
        this.fireDropTargetChange(previousGhostLocation, null);
      }
      this.updateHoveredItem(null);
      return;
    }
    this.dropTarget = target;

    const ghostSource = lifecycle.currentGhostLocation(this);
    const targetIndex =
      target.container != null ? lifecycle.translateTargetIndex(this, target) : -1;
    const targetContainer = target.container as unknown as Container;

    this.updateHoveredItem(targetContainer);

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
      items: this.items,
      itemsMetadata: this.items.map((i) => i.metadata),
      previous: toLocation(previous),
      current: toLocation(current),
    });
  }

  /**
   * Fire a final `onDragItemLeave` if a hover was active when the drag ends,
   * so hover-driven UI (highlights, previews) doesn't get stuck. Lifecycle
   * `drop()` implementations call this before firing `onDragEnd`.
   */
  clearHoveredItem(): void {
    const previousHovered = this.hoveredItem;
    this.hoveredItem = null;
    if (!previousHovered?.parent) return;
    fireDragItemLeave(
      previousHovered.container,
      this.primaryItem,
      previousHovered,
      this,
    );
  }

  /**
   * Hit-test the pointer against `container`'s children (or clear the hover
   * when `container` is null, e.g. no valid drop target) and fire
   * enter/move/leave accordingly. Independent of drop-target resolution —
   * this tracks hovering over an *item*, not the resolved slot/gap.
   */
  private updateHoveredItem(container: Container | null): void {
    const item = this.primaryItem;
    const nextHovered = container
      ? findHoveredItem(item, container, this)
      : null;
    const previousHovered = this.hoveredItem;

    if (previousHovered === nextHovered) {
      if (nextHovered && container) {
        fireDragItemMove(container, item, nextHovered, this);
      }
      return;
    }

    if (previousHovered?.parent) {
      fireDragItemLeave(previousHovered.container, item, previousHovered, this);
    }
    this.hoveredItem = nextHovered;
    if (nextHovered && container) {
      fireDragItemEnter(container, item, nextHovered, this);
    }
  }
}
