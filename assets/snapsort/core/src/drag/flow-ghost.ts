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
 * animated into place as items reorder around it; the dragged item itself is
 * hoisted to `position: absolute` and follows the pointer.
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
 * The live list may contain a ghost and no longer contain the dragged item,
 * so this maps through the snapshot item that should appear after the target.
 */
function liveIndexFromSnapshotIndex(
  session: DragSession,
  container: Container,
  snapshotIndex: number,
  draggedItem: Item,
): number {
  const snapshotItems = (
    container.dragSnapshot?.children.map((snapshot) => snapshot.value) ?? []
  ).filter((i) => i !== draggedItem && !i.isGhost);
  const ghostItem = session.ghostItem;
  const liveItems = container.itemOrderedList.filter(
    (i) => i !== draggedItem && i !== ghostItem,
  );
  const clampedIndex = Math.max(0, Math.min(snapshotIndex, snapshotItems.length));
  const beforeItem = snapshotItems[clampedIndex] ?? null;
  if (!beforeItem) return liveItems.length;

  const liveIndex = liveItems.indexOf(beforeItem);
  return liveIndex === -1 ? liveItems.length : liveIndex;
}

async function moveGhost(
  session: DragSession,
  container: Container,
  index: number,
  ghostRect: GhostRect | null | undefined,
): Promise<void> {
  const item = session.primaryItem;
  let ghostItem = session.ghostItem;

  if (!ghostItem) {
    ghostItem = item.createGhostItem(session, "flow", container, ghostRect);
    if (!ghostItem) return;
  }
  session.ghostItem = ghostItem;
  session.pendingGhostTarget = { ghostItem, container, index, ghostRect };
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
    container.withReorderAnimation(container, item, doMove);
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
 * Insert a `"source"`-role ghost holding the vacated slot, if one doesn't
 * already exist. Used for `"copy"` effect: unlike the target ghost, the
 * source ghost is placed once and left alone — it isn't re-resolved on every
 * pointer move — so it needs no `pendingGhostTarget`-style race guard.
 */
async function ensureSourceGhost(
  session: DragSession,
  container: Container,
  index: number,
): Promise<void> {
  if (session.ghosts.has("source") || !container.element) return;
  const item = session.primaryItem;
  const ghostItem = item.createGhostItem(session, "flow", container, null, "source");
  if (!ghostItem) return;
  session.ghosts.set("source", ghostItem);
  container.insertGhostAt(
    item,
    container,
    ghostItem,
    index,
    null,
    session,
    "flow",
    "source",
  );
  await fireAwaitMutation(container);
}

/**
 * Reconcile the source-role ghost with the session's current `dropEffect`.
 * Ghosts are added/removed independently of the target ghost — the source
 * slot only needs to stay held open while `"copy"` is in effect.
 */
async function syncSourceGhost(session: DragSession): Promise<void> {
  const wantsSourceGhost = session.dropEffect === "copy";
  const hasSourceGhost = session.ghosts.has("source");
  if (wantsSourceGhost === hasSourceGhost) return;

  if (wantsSourceGhost) {
    const source = session.sources[0];
    await ensureSourceGhost(session, source.container, source.index);
  } else {
    await removeGhost(session, "source");
  }
}

function drop(session: DragSession): void {
  const item = session.primaryItem;
  const root = session.root;
  const dropKey = item.itemKey(item);
  let dropFirst: DOMRect | null = null;
  let dropLast: DOMRect | null = null;
  let dropTargetElement: HTMLElement | null = null;
  let dropAnimationConfig: AnimationConfig | null = null;

  item.schedule(
    () => {
      if (!item.element) return;
      const first = item.readDom({ unapplyTransform: false }, "READ_1");
      dropFirst = new DOMRect(
        first.screenX,
        first.screenY,
        first.width,
        first.height,
      );
    },
    { stage: "READ_1", queueId: `drag-end-read-first-${item.id}` },
  );

  item.schedule(
    async () => {
      // Get ghost's current position — this is where the item should land.
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
                item,
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

      item.style = {
        cursor: "grab",
        position: "relative",
        zIndex: "",
        top: "",
        left: "",
        width: "",
        height: "",
      };
      item.transformMode = "none";
      item.transformOrigin = null;
      if (item.element) {
        delete item.element.dataset.snapsortDragging;
        item.writeDom();
        item.writeTransform();
      }
      session.dragCoordinateParent = null;
      session.dragLayoutPosition = null;

      // Remove the ghost(s) first — a "copy" drag may have both a target and
      // a source ghost live; removing a role that was never created is a no-op.
      await removeGhost(session, "target");
      await removeGhost(session, "source");

      const destination: DragLocation | null = ghostPos?.container
        ? {
            container: ghostPos.container,
            containerMetadata: ghostPos.container.metadata,
            index: ghostPos.index,
          }
        : null;

      if (session.dropEffect === "move") {
        // Re-insert the dragged item at the ghost's former position.
        if (destination) {
          const destinationContainer = destination.container;
          dropAnimationConfig = item.dropAnimationConfig(destinationContainer);
          item.moveItemAt(
            session.sources[0],
            destinationContainer,
            item,
            destination.index,
            session,
          );
          await fireAwaitMutation(destinationContainer);
          if (item.element && destinationContainer.element) {
            const expectedBefore =
              destination.index >= destinationContainer.itemOrderedList.length - 1
                ? null
                : destinationContainer.itemOrderedList[destination.index + 1]
                    .element;
            if (
              item.element.parentElement !== destinationContainer.element ||
              item.element.nextElementSibling !== expectedBefore
            ) {
              console.warn(
                "SnapSort: the adapter did not place the dropped element where onItemMove/onItemInsert specified. Check the adapter's callback/awaitMutation wiring.",
                {
                  item,
                  container: destinationContainer,
                  index: destination.index,
                },
              );
            }
          }
        }
      } else {
        // "copy" / "none": the original was only ever *logically* detached —
        // its DOM element never left the source container's DOM — so
        // returning it is pure bookkeeping, with no mutation event.
        const source = session.sources[0];
        const returnIndex = Math.min(
          source.index,
          source.container.itemOrderedList.length,
        );
        item.attachItemToContainer(source.container, item, returnIndex);
        dropAnimationConfig = item.dropAnimationConfig(source.container);

        if (session.dropEffect === "copy" && destination) {
          const destinationContainer = destination.container;
          const beforeElement =
            destination.index >= destinationContainer.itemOrderedList.length
              ? null
              : (destinationContainer.itemOrderedList[destination.index]
                  ?.element ?? null);
          fireItemCopy(
            destinationContainer,
            item,
            destination.index,
            beforeElement,
            session,
          );
          await fireAwaitMutation(destinationContainer);
        }
      }

      session.clearHoveredItem();
      root.clearDragSnapshotTree();
      resetDropSnapshotDebugDump(item);
      session.status = "ended";
      root.dragSession = null;
      root.callbacks?.onDragEnd?.({
        session,
        item,
        itemMetadata: item.metadata,
        element: item.element,
        source: session.sources[0],
        destination,
      });
    },
    { stage: "WRITE_1", queueId: `drag-end-${item.id}` },
  );

  root.schedule(
    () => {
      const currentItem = root.findItemByKey(dropKey) ?? item;
      dropTargetElement = currentItem.element?.isConnected
        ? currentItem.element
        : null;
      if (!dropTargetElement) return;
      if (currentItem === item) {
        currentItem.readDom({ unapplyTransform: false }, "READ_2");
      }
      dropLast = dropTargetElement.getBoundingClientRect();
    },
    { stage: "READ_2", queueId: `drag-end-read-last-${item.id}` },
  );

  root.schedule(
    () => {
      item.playDropAnimation(
        dropFirst,
        dropLast,
        dropTargetElement,
        dropAnimationConfig,
        root,
      );
    },
    { stage: "WRITE_2", queueId: `drag-end-play-${item.id}` },
  );
}

export class FlowGhostLifecycle implements DragLifecycleStrategy {
  readonly ghostKind = "flow" as const;

  async dragStart(session: DragSession): Promise<void> {
    const item = session.primaryItem;
    const source = session.sources[0];
    const currentContainer = source.container;
    const currentIndex = source.index;

    if (session.dropEffect === "copy") {
      // Hold the vacated slot with a source-role ghost; the target ghost is
      // created separately, wherever the pointer resolves to (which may or
      // may not be this same slot — that's the consumer's call via `noDrop`).
      await ensureSourceGhost(session, currentContainer, currentIndex);
    } else {
      // Create a ghost element in the item's current location.
      await moveGhost(session, currentContainer, currentIndex, null);
    }
    // _Logically_ remove the dragged item from its container, meaning the DOM
    // element is still in the current container but the container code does
    // not recognize it anymore. The ghost now takes its place in the layout.
    item.detachItemFromContainer(currentContainer, item);

    const dragSnapshot = item.dragSnapshot;
    item.style = {
      cursor: "grabbing",
      position: "absolute",
      zIndex: "1000",
      top: "0px",
      left: "0px",
      width: dragSnapshot ? `${dragSnapshot.box.width}px` : "",
      height: dragSnapshot ? `${dragSnapshot.box.height}px` : "",
    };

    // The dragged item's DOM element stays under its original DOM parent for
    // the whole drag, so we maintain a logical reference to it.
    session.dragCoordinateParent = currentContainer;

    item.refreshDraggedItemPosition();
    item.debugAllItems();
  }

  async dragMove(session: DragSession): Promise<void> {
    await syncSourceGhost(session);
    session.primaryItem.writeDraggedTransform();
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
      session.primaryItem,
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
    session.primaryItem.refreshDraggedItemPosition();
  }

  drop(session: DragSession): void {
    drop(session);
  }
}
