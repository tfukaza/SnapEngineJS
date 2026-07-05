import type { AnimationConfig } from "../container";
import type { Container } from "../container";
import type { Item } from "../item";
import { resetDropSnapshotDebugDump, type DropCandidate } from "../algorithm";
import type { DragLocation, GhostRect, GhostRole } from "../events";
import { fireAwaitMutation, fireItemCopy } from "../mutation";
import type { DragLifecycleStrategy } from "./lifecycle";
import type { DragSession } from "./session";

/**
 * Flow-layout spacer ghost: euclidean and progressive modes. The ghost is a
 * real member of the target container's item-ordered list and is FLIP-
 * animated into place as items reorder around it; the dragged item(s) are
 * hoisted to `position: absolute` and follow the pointer. For a multi-item
 * drag the whole group collapses into one contiguous run and is represented
 * by a single group-sized ghost (see `DragSession.groupDims`).
 */

function currentGhostLocation(
  session: DragSession,
): { container: Container; index: number } | null {
  const ghostItem = session.ghostItem;
  if (!ghostItem?.parent) return null;
  const container = ghostItem.parent as unknown as Container;
  const index = container.itemOrderedList.indexOf(ghostItem);
  if (index === -1) return null;
  return { container, index };
}

/**
 * Translate a frozen snapshot insertion index into the current live list.
 *
 * The live list may contain a ghost and no longer contain any dragged item,
 * so this maps through the snapshot item that should appear after the target.
 */
function liveIndexFromSnapshotIndex(
  session: DragSession,
  container: Container,
  snapshotIndex: number,
): number {
  const snapshotItems = (
    container.dragSnapshot?.children.map((snapshot) => snapshot.value) ?? []
  ).filter((i) => !session.itemSet.has(i) && !i.isGhost);
  const ghostItem = session.ghostItem;
  const liveItems = container.itemOrderedList.filter(
    (i) => !session.itemSet.has(i) && i !== ghostItem,
  );
  const clampedIndex = Math.max(0, Math.min(snapshotIndex, snapshotItems.length));
  const beforeItem = snapshotItems[clampedIndex] ?? null;
  if (!beforeItem) return liveItems.length;

  const liveIndex = liveItems.indexOf(beforeItem);
  return liveIndex === -1 ? liveItems.length : liveIndex;
}

/** Direction-aware size of the whole dragged group, for sizing a single group ghost in `container`. Null until group dims are known (e.g. before drag snapshots are captured). */
function groupGhostRect(
  session: DragSession,
  container: Container,
): GhostRect | null {
  const dims = session.groupDims;
  if (!dims) return null;
  const isRow = container.direction === "row";
  return {
    x: 0,
    y: 0,
    width: isRow ? dims.sumW : dims.maxW,
    height: isRow ? dims.maxH : dims.sumH,
  };
}

async function moveGhost(
  session: DragSession,
  container: Container,
  index: number,
  ghostRect: GhostRect | null | undefined,
): Promise<void> {
  const item = session.primaryItem;
  let ghostItem = session.ghostItem;
  const effectiveGhostRect = ghostRect ?? groupGhostRect(session, container);

  if (!ghostItem) {
    ghostItem = item.createGhostItem(
      session,
      "flow",
      container,
      effectiveGhostRect,
    );
    if (!ghostItem) return;
  } else if (
    effectiveGhostRect &&
    ghostItem.element &&
    !ghostItem.frameworkManagedGhostElement
  ) {
    // Resize the existing core-owned ghost when the group's projected size
    // for this container's direction differs from what it was created with
    // (e.g. the pointer crossed from a column container into a row one).
    ghostItem.element.style.width = `${effectiveGhostRect.width}px`;
    ghostItem.element.style.height = `${effectiveGhostRect.height}px`;
  }
  session.ghostItem = ghostItem;
  session.pendingGhostTarget = {
    ghostItem,
    container,
    index,
    ghostRect: effectiveGhostRect,
  };
  const resolvedGhostItem = ghostItem;

  const doMove = () => {
    const pendingTarget = session.pendingGhostTarget;
    if (
      session.ghostItem !== resolvedGhostItem ||
      pendingTarget?.ghostItem !== resolvedGhostItem ||
      pendingTarget.container !== container ||
      pendingTarget.index !== index ||
      (!resolvedGhostItem.element &&
        !resolvedGhostItem.frameworkManagedGhostElement) ||
      !container.element
    ) {
      return;
    }

    if (resolvedGhostItem.parent) {
      container.detachItemFromContainer(
        resolvedGhostItem.container,
        resolvedGhostItem,
      );
    }
    container.insertGhostAt(
      item,
      container,
      resolvedGhostItem,
      index,
      pendingTarget.ghostRect,
      session,
      "flow",
    );
  };

  if (resolvedGhostItem.parent) {
    container.withReorderAnimation(container, session.items, doMove);
  } else {
    doMove();
    await fireAwaitMutation(container);
  }
}

async function removeGhost(
  session: DragSession,
  role: GhostRole = "target",
): Promise<void> {
  const item = session.primaryItem;
  const ghostItem = session.ghosts.get(role);
  if (role === "target") {
    session.pendingGhostTarget = null;
  }
  if (!ghostItem) return;

  const ghostContainer = ghostItem.parent as unknown as Container | null;
  if (ghostContainer) {
    item.removeGhostFrom(item, ghostContainer, ghostItem, session, "flow", role);
    await fireAwaitMutation(ghostContainer);
  }
  ghostItem.destroy();
  session.ghosts.delete(role);
}

/**
 * Insert `"source"`-role ghosts holding every vacated slot, for members that
 * don't already have one. Used for `"copy"` effect: unlike the target ghost,
 * source ghosts are placed once per member and left alone — they aren't
 * re-resolved on every pointer move — so they need no `pendingGhostTarget`
 * -style race guard.
 */
async function ensureSourceGhosts(session: DragSession): Promise<void> {
  for (let i = 0; i < session.items.length; i++) {
    const member = session.items[i];
    if (session.sourceGhosts.has(member)) continue;
    const source = session.sources[i];
    if (!source.container.element) continue;

    const ghostItem = member.createGhostItem(
      session,
      "flow",
      source.container,
      null,
      "source",
    );
    if (!ghostItem) continue;
    session.sourceGhosts.set(member, ghostItem);
    source.container.insertGhostAt(
      member,
      source.container,
      ghostItem,
      source.index,
      null,
      session,
      "flow",
      "source",
    );
    await fireAwaitMutation(source.container);
  }
}

async function removeSourceGhosts(session: DragSession): Promise<void> {
  for (const [original, ghostItem] of Array.from(
    session.sourceGhosts.entries(),
  )) {
    const ghostContainer = ghostItem.parent as unknown as Container | null;
    if (ghostContainer) {
      original.removeGhostFrom(
        original,
        ghostContainer,
        ghostItem,
        session,
        "flow",
        "source",
      );
      await fireAwaitMutation(ghostContainer);
    }
    ghostItem.destroy();
    session.sourceGhosts.delete(original);
  }
}

/**
 * Reconcile the source-role ghosts with the session's current `dropEffect`.
 * Ghosts are added/removed independently of the target ghost — the source
 * slots only need to stay held open while `"copy"` is in effect.
 */
async function syncSourceGhost(session: DragSession): Promise<void> {
  const wantsSourceGhosts = session.dropEffect === "copy";
  const hasSourceGhosts = session.sourceGhosts.size > 0;
  if (wantsSourceGhosts === hasSourceGhosts) return;

  if (wantsSourceGhosts) {
    await ensureSourceGhosts(session);
  } else {
    await removeSourceGhosts(session);
  }
}

function drop(session: DragSession): void {
  const items = session.items;
  const root = session.root;
  const dropKeys = items.map((member) => member.itemKey(member));
  const dropRects: Array<{
    first: DOMRect | null;
    last: DOMRect | null;
    element: HTMLElement | null;
  }> = items.map(() => ({ first: null, last: null, element: null }));
  let dropAnimationConfig: AnimationConfig | null = null;

  session.pressedItem.schedule(
    () => {
      items.forEach((member, i) => {
        if (!member.element) return;
        const first = member.readDom({ unapplyTransform: false }, "READ_1");
        dropRects[i].first = new DOMRect(
          first.screenX,
          first.screenY,
          first.width,
          first.height,
        );
      });
    },
    {
      stage: "READ_1",
      queueId: `drag-end-read-first-${session.pressedItem.id}`,
    },
  );

  session.pressedItem.schedule(
    async () => {
      const item = session.primaryItem;
      // Get ghost's current position — this is where the run should land.
      const ghostItem = session.ghostItem;
      const pendingGhostTarget =
        session.pendingGhostTarget?.ghostItem === ghostItem
          ? session.pendingGhostTarget
          : null;
      const liveGhostPos = ghostItem?.getIndexAndContainer();
      const usePendingGhostTarget =
        !!pendingGhostTarget &&
        (!liveGhostPos?.container ||
          liveGhostPos.container !== pendingGhostTarget.container ||
          liveGhostPos.index !== pendingGhostTarget.index);
      let ghostPos = usePendingGhostTarget
        ? {
            index: pendingGhostTarget!.index,
            container: pendingGhostTarget!.container,
          }
        : (liveGhostPos as
            | { index: number; container: Container | null }
            | undefined);
      if (!ghostPos?.container) {
        const finalTarget =
          root.hasDragSnapshotTree() && item.dragSnapshot
            ? session.strategy.dropTarget.resolve(item, root, session)
            : null;
        ghostPos = finalTarget
          ? {
              index: liveIndexFromSnapshotIndex(
                session,
                finalTarget.container as unknown as Container,
                finalTarget.index,
              ),
              container: finalTarget.container as unknown as Container,
            }
          : session.sources[0]
            ? {
                index: session.sources[0].index,
                container: session.sources[0].container,
              }
            : undefined;
      }

      for (const member of items) {
        member.style = {
          cursor: "grab",
          position: "relative",
          zIndex: "",
          top: "",
          left: "",
          width: "",
          height: "",
        };
        member.transformMode = "none";
        member.transformOrigin = null;
        if (member.element) {
          delete member.element.dataset.snapsortDragging;
          member.writeDom();
          member.writeTransform();
        }
      }
      session.dragCoordinateParent.clear();
      session.dragLayoutPosition.clear();
      session.groupVisualOffsets.clear();

      // Remove the ghost(s) first — a "copy" drag may have both a target and
      // source ghosts live; removing ghosts that were never created is a no-op.
      await removeGhost(session, "target");
      await removeSourceGhosts(session);

      const destination: DragLocation | null = ghostPos?.container
        ? {
            container: ghostPos.container,
            containerMetadata: ghostPos.container.metadata,
            index: ghostPos.index,
          }
        : null;

      if (session.dropEffect === "move") {
        // Re-insert the dragged run at the ghost's former position.
        if (destination) {
          const destinationContainer = destination.container;
          dropAnimationConfig = item.dropAnimationConfig(destinationContainer);
          item.moveItemsAt(
            session.sources,
            destinationContainer,
            items,
            destination.index,
            session,
          );
          await fireAwaitMutation(destinationContainer);
          const headItem = items[0];
          if (headItem.element && destinationContainer.element) {
            const runEndIndex = destination.index + items.length;
            const expectedBefore =
              runEndIndex >= destinationContainer.itemOrderedList.length
                ? null
                : destinationContainer.itemOrderedList[runEndIndex].element;
            const runTailElement = items[items.length - 1].element;
            if (
              headItem.element.parentElement !== destinationContainer.element ||
              runTailElement?.nextElementSibling !== expectedBefore
            ) {
              console.warn(
                "SnapSort: the adapter did not place the dropped item(s) where onItemMove/onItemInsert specified. Check the adapter's callback/awaitMutation wiring.",
                {
                  items,
                  container: destinationContainer,
                  index: destination.index,
                },
              );
            }
          }
        }
      } else {
        // "copy" / "none": each original was only ever *logically* detached —
        // its DOM element never left its source container's DOM — so
        // returning it is pure bookkeeping, with no mutation event. Return in
        // ascending original index (per source container) so relative order
        // within any shared source container is preserved.
        const bySourceContainer = new Map<Container, number[]>();
        items.forEach((_, i) => {
          const list = bySourceContainer.get(session.sources[i].container) ?? [];
          list.push(i);
          bySourceContainer.set(session.sources[i].container, list);
        });
        for (const [sourceContainer, indices] of bySourceContainer) {
          indices
            .slice()
            .sort((a, b) => session.sources[a].index - session.sources[b].index)
            .forEach((i) => {
              const member = items[i];
              const returnIndex = Math.min(
                session.sources[i].index,
                sourceContainer.itemOrderedList.length,
              );
              member.attachItemToContainer(sourceContainer, member, returnIndex);
            });
        }
        dropAnimationConfig = item.dropAnimationConfig(session.sources[0].container);

        if (session.dropEffect === "copy" && destination) {
          const destinationContainer = destination.container;
          const beforeElement =
            destination.index >= destinationContainer.itemOrderedList.length
              ? null
              : (destinationContainer.itemOrderedList[destination.index]
                  ?.element ?? null);
          fireItemCopy(
            destinationContainer,
            items,
            destination.index,
            beforeElement,
            session,
          );
          await fireAwaitMutation(destinationContainer);
        }
      }

      session.clearHoveredItem();
      root.clearDragSnapshotTree();
      for (const member of items) {
        resetDropSnapshotDebugDump(member);
      }
      session.status = "ended";
      root.dragSession = null;
      root.callbacks?.onDragEnd?.({
        session,
        item,
        itemMetadata: item.metadata,
        items,
        itemsMetadata: items.map((member) => member.metadata),
        element: item.element,
        source: session.sources[0],
        sources: session.sources,
        destination,
      });
    },
    { stage: "WRITE_1", queueId: `drag-end-${session.pressedItem.id}` },
  );

  root.schedule(
    () => {
      items.forEach((member, i) => {
        const currentItem = root.findItemByKey(dropKeys[i]) ?? member;
        const element = currentItem.element?.isConnected
          ? currentItem.element
          : null;
        dropRects[i].element = element;
        if (!element) return;
        if (currentItem === member) {
          currentItem.readDom({ unapplyTransform: false }, "READ_2");
        }
        dropRects[i].last = element.getBoundingClientRect();
      });
    },
    { stage: "READ_2", queueId: `drag-end-read-last-${session.pressedItem.id}` },
  );

  root.schedule(
    () => {
      items.forEach((member, i) => {
        const { first, last, element } = dropRects[i];
        member.playDropAnimation(first, last, element, dropAnimationConfig, root);
      });
    },
    { stage: "WRITE_2", queueId: `drag-end-play-${session.pressedItem.id}` },
  );
}

export class FlowGhostLifecycle implements DragLifecycleStrategy {
  readonly ghostKind = "flow" as const;

  async dragStart(session: DragSession): Promise<void> {
    const pressedItem = session.pressedItem;
    const pressedIndex = session.items.indexOf(pressedItem);
    const pressedSource = session.sources[pressedIndex];
    const currentContainer = pressedSource.container;
    const currentIndex = pressedSource.index;

    if (session.dropEffect === "copy") {
      // Hold every vacated slot with a source-role ghost; the target ghost is
      // created separately, wherever the pointer resolves to (which may or
      // may not be one of these same slots — that's the consumer's call via
      // `noDrop`).
      await ensureSourceGhosts(session);
    } else {
      // Create a ghost element at the pressed item's current location.
      await moveGhost(session, currentContainer, currentIndex, null);
    }

    // Compute each member's offset (relative to the pressed item) along its
    // own source container's main axis, in run order. This is an
    // approximation of the collapsed run using each member's *original*
    // position/size — the destination's real gaps are corrected by FLIP once
    // the drop actually lands (see DragSession.groupDims doc).
    const axis = currentContainer.direction === "row" ? "x" : "y";
    let cumulative = 0;
    let pressedCumulative = 0;
    const cumulativeByItem = new Map<Item, number>();
    for (const member of session.items) {
      cumulativeByItem.set(member, cumulative);
      if (member === pressedItem) pressedCumulative = cumulative;
      const box = member.dragSnapshot?.box;
      cumulative += axis === "y" ? (box?.height ?? 0) : (box?.width ?? 0);
    }
    for (const member of session.items) {
      const delta = (cumulativeByItem.get(member) ?? 0) - pressedCumulative;
      session.groupVisualOffsets.set(
        member,
        axis === "y" ? { x: 0, y: delta } : { x: delta, y: 0 },
      );
    }

    // _Logically_ remove every dragged item from its container, meaning the
    // DOM element is still in the current container but the container code
    // does not recognize it anymore. The ghost now takes the pressed item's
    // place in the layout.
    session.items.forEach((member, i) => {
      const source = session.sources[i];
      member.detachItemFromContainer(source.container, member);

      const dragSnapshot = member.dragSnapshot;
      member.style = {
        cursor: "grabbing",
        position: "absolute",
        zIndex: "1000",
        top: "0px",
        left: "0px",
        width: dragSnapshot ? `${dragSnapshot.box.width}px` : "",
        height: dragSnapshot ? `${dragSnapshot.box.height}px` : "",
      };

      // Each dragged item's DOM element stays under its own original DOM
      // parent for the whole drag, so we maintain a logical reference to it.
      session.dragCoordinateParent.set(member, source.container);

      member.refreshDraggedItemPosition();
    });
    pressedItem.debugAllItems();
  }

  async dragMove(session: DragSession): Promise<void> {
    await syncSourceGhost(session);
    for (const member of session.items) {
      member.writeDraggedTransform();
    }
  }

  currentGhostLocation(
    session: DragSession,
  ): { container: Container; index: number } | null {
    return currentGhostLocation(session);
  }

  translateTargetIndex(session: DragSession, target: DropCandidate): number {
    return liveIndexFromSnapshotIndex(
      session,
      target.container as unknown as Container,
      target.index,
    );
  }

  async moveGhost(
    session: DragSession,
    container: Container,
    index: number,
    ghostRect: GhostRect | null | undefined,
  ): Promise<void> {
    await moveGhost(session, container, index, ghostRect);
  }

  async removeGhost(
    session: DragSession,
    role: GhostRole = "target",
  ): Promise<void> {
    await removeGhost(session, role);
  }

  afterSyncDropTarget(session: DragSession): void {
    for (const member of session.items) {
      member.refreshDraggedItemPosition();
    }
  }

  drop(session: DragSession): void {
    drop(session);
  }
}
