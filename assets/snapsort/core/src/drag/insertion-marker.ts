import type { Container } from "../container";
import type { Item } from "../item";
import { resetDropSnapshotDebugDump, type DropCandidate } from "../algorithm";
import type { DragLocation, GhostRect, GhostRole } from "../events";
import {
  fireAwaitMutation,
  fireGhostInsert,
  fireGhostRemove,
} from "../mutation";
import type { DragLifecycleStrategy } from "./lifecycle";
import type { DragSession } from "./session";

/**
 * Floating insertion marker: insertion mode. Unlike the flow ghost, the
 * marker is never attached to a container's item-ordered list — its logical
 * position lives solely in `DragSession.pendingGhostTarget`, and its DOM
 * element is absolutely positioned from the algorithm's computed rect. The
 * dragged item itself never leaves its original DOM position during the drag.
 */

function updateInsertionGhostStyle(
  container: Container,
  ghostRect: GhostRect | null | undefined,
  ghostItem: Item,
) {
  const ghostElement = ghostItem.element;
  if (!ghostRect || !ghostElement) return;

  const containerProp =
    (container as unknown as Item).dragSnapshot?.box ??
    container.currentDomProperty;
  const markerInsetLeft = ghostRect.insetLeft ?? 0;
  const markerInsetRight = ghostRect.insetRight ?? 0;
  const left = ghostRect.x - containerProp.x + markerInsetLeft;
  const top = ghostRect.y - containerProp.y;
  const width = Math.max(
    0,
    ghostRect.width - markerInsetLeft - markerInsetRight,
  );

  ghostElement.dataset.snapsortGhost = "insertion";
  ghostElement.style.position = "absolute";
  ghostElement.style.left = `${left}px`;
  ghostElement.style.top = `${top}px`;
  ghostElement.style.width = `${width}px`;
  ghostElement.style.height = "0px";
  ghostElement.style.margin = "0";
  ghostElement.style.borderRadius = "999px";
  ghostElement.style.borderTop = "3px solid currentColor";
  ghostElement.style.background = "currentColor";
  ghostElement.style.color = "rgb(37, 99, 235)";
  ghostElement.style.pointerEvents = "none";
  ghostElement.style.boxSizing = "border-box";
  ghostElement.style.zIndex = "999";
}

async function moveGhost(
  session: DragSession,
  container: Container,
  index: number,
  ghostRect: GhostRect | null | undefined,
): Promise<void> {
  const item = session.primaryItem;
  let ghostItem = session.ghostItem;
  if (!ghostRect || !container.element) return;

  const firstRect = ghostItem?.element?.isConnected
    ? ghostItem.element.getBoundingClientRect()
    : null;

  if (!ghostItem) {
    ghostItem = item.createGhostItem(session, "marker", container, ghostRect);
    if (!ghostItem) return;
  }
  session.ghostItem = ghostItem;
  session.pendingGhostTarget = { ghostItem, container, index, ghostRect };

  if (!ghostItem.element && !ghostItem.frameworkManagedGhostElement) {
    return;
  }

  // The marker is intentionally never attached to the container's item list
  // (see module doc); it always "appends" from the DOM's perspective.
  fireGhostInsert(container, item, ghostItem, index, null, ghostRect, session, "marker");
  await fireAwaitMutation(container);

  // Core-created markers own their DOM element and are positioned/animated
  // directly; framework-managed markers get geometry solely via `ghostRect`
  // on the onGhostInsert event above.
  const ghostElement = ghostItem.element;
  if (!ghostElement || ghostItem.frameworkManagedGhostElement) return;

  updateInsertionGhostStyle(container, ghostRect, ghostItem);
  const lastRect = ghostElement.getBoundingClientRect();
  item.playElementRectAnimation(
    ghostItem,
    firstRect,
    lastRect,
    ghostElement,
    item.reorderAnimationConfig(container),
    ghostItem,
    { coordinateParent: container },
  );
}

async function removeGhost(
  session: DragSession,
  role: GhostRole = "target",
): Promise<void> {
  const item = session.primaryItem;
  const ghostItem = session.ghosts.get(role);
  const previousTarget = role === "target" ? session.pendingGhostTarget : null;
  if (role === "target") {
    session.pendingGhostTarget = null;
  }
  if (!ghostItem) return;

  if (previousTarget?.container) {
    fireGhostRemove(previousTarget.container, item, ghostItem, session, "marker", role);
    await fireAwaitMutation(previousTarget.container);
  } else {
    // No known container to route onGhostRemove through (e.g. drag ended
    // before a target was ever resolved) — fall back to a direct removal.
    ghostItem.element?.remove();
  }
  ghostItem.destroy();
  session.ghosts.delete(role);
}

function drop(session: DragSession): void {
  const item = session.primaryItem;
  const items = session.items;
  const root = session.root;

  session.pressedItem.schedule(
    async () => {
      const ghostItem = session.ghostItem;
      const pendingGhostTarget =
        session.pendingGhostTarget?.ghostItem === ghostItem
          ? session.pendingGhostTarget
          : null;

      for (const member of items) {
        if (member.element) {
          delete member.element.dataset.snapsortDragging;
        }
        member.writeTransform();
      }

      await removeGhost(session);

      let destination: DragLocation | null = null;
      if (pendingGhostTarget?.container) {
        const destinationContainer = pendingGhostTarget.container;
        destination = {
          container: destinationContainer,
          containerMetadata: destinationContainer.metadata,
          index: pendingGhostTarget.index,
        };

        if (session.dropEffect === "move") {
          item.moveItemsToContainer(
            destinationContainer,
            items,
            pendingGhostTarget.index,
            session,
          );
          await fireAwaitMutation(destinationContainer);
        } else if (session.dropEffect === "copy") {
          // The originals never leave their source slots in insertion mode
          // (unlike flow mode, they're never detached) — there's no floating
          // instance to spawn either (rows stay put; only the marker line
          // shows mid-drag), so unlike flow-mode spawn there is no id to
          // assign at dragStart. Commits through the same onItemMove path a
          // move would: `froms` null marks "not moved from anywhere",
          // `origins[i] === items[i]` (the original IS its own provenance),
          // and moveItemsAt's null-froms skip-attach rule leaves each
          // original exactly where it is — the consumer mints the
          // duplicate's id when it materializes the entry (see
          // ItemMoveEvent's doc for the full contract, including how this
          // is the one sanctioned asymmetry with flow-mode spawn).
          item.moveItemsAt(
            items.map(() => null),
            destinationContainer,
            items,
            pendingGhostTarget.index,
            session,
            items,
          );
          await fireAwaitMutation(destinationContainer);
        }
        // "none": no mutation events — the items already sit where they always were.
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
    { stage: "WRITE_1", queueId: `drag-end-insertion-${session.pressedItem.id}` },
  );
}

export class InsertionMarkerLifecycle implements DragLifecycleStrategy {
  readonly ghostKind = "marker" as const;

  async dragStart(session: DragSession): Promise<void> {
    await session.updateDropTarget();
  }

  dragMove(_session: DragSession): void {
    // The marker never moves the dragged item's own transform.
  }

  currentGhostLocation(
    session: DragSession,
  ): { container: Container; index: number } | null {
    const ghostItem = session.ghostItem;
    const pending = session.pendingGhostTarget;
    if (!pending || pending.ghostItem !== ghostItem) return null;
    return { container: pending.container, index: pending.index };
  }

  translateTargetIndex(_session: DragSession, target: DropCandidate): number {
    return target.index;
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

  afterSyncDropTarget(_session: DragSession): void {
    // The marker never repositions the dragged item itself.
  }

  drop(session: DragSession): void {
    drop(session);
  }
}
