import type { Container } from "../container";
import type { Item } from "../item";
import { resetDropSnapshotDebugDump, type DropCandidate } from "../algorithm";
import type { DragLocation, GhostRect, GhostRole } from "../events";
import {
  fireGhostInsert,
  fireItemSwap,
  fireMutation,
  settleMutation,
} from "../mutation";
import type { DragLifecycleStrategy } from "./lifecycle";
import type { DragSession } from "./session";

/**
 * Swap mode: the original item never moves during the drag (like the
 * insertion marker, it's never detached); a `"pointer"`-role ghost follows
 * the pointer as a purely visual preview. There is no target-role ghost —
 * which item the pointer is over is reported via `onDragItemEnter`/`Move`/
 * `Leave` (see session.ts's generic hover tracking), and it's the consumer's
 * job to render any target highlight. Dropping swaps the dragged item with
 * whichever item the pointer was last over.
 */

async function createPointerGhost(session: DragSession): Promise<void> {
  if (session.ghosts.has("pointer")) return;
  const item = session.primaryItem;
  const root = session.root;
  if (!root.element) return;

  const box = item.dragSnapshot?.box ?? null;
  const ghostRect: GhostRect | null = box
    ? { x: box.x, y: box.y, width: box.width, height: box.height }
    : null;

  const ghostItem = item.createGhostItem(session, "marker", root, ghostRect, "pointer");
  if (!ghostItem) return;
  session.ghosts.set("pointer", ghostItem);

  // The pointer ghost isn't part of any container's item list — like the
  // insertion marker, it's a purely visual, absolutely-positioned element.
  // `index: -1` signals "not applicable" (there is no list position).
  fireGhostInsert(root, item, ghostItem, -1, null, ghostRect, session, "marker", "pointer");
  await settleMutation();
}

function writePointerGhostPosition(session: DragSession): void {
  const ghostItem = session.ghosts.get("pointer");
  const ghostElement = ghostItem?.element;
  if (!ghostElement || ghostItem!.frameworkManagedGhostElement) return;

  const root = session.root;
  const rootProp = root.dragSnapshot?.box ?? root.currentDomProperty;
  const box = session.primaryItem.dragSnapshot?.box;
  const width = box?.width ?? 0;
  const height = box?.height ?? 0;
  const left = session.pointer.x - rootProp.x - width / 2;
  const top = session.pointer.y - rootProp.y - height / 2;

  ghostElement.dataset.snapsortGhost = "pointer";
  ghostElement.style.position = "absolute";
  ghostElement.style.left = `${left}px`;
  ghostElement.style.top = `${top}px`;
  ghostElement.style.width = `${width}px`;
  ghostElement.style.height = `${height}px`;
  ghostElement.style.pointerEvents = "none";
  ghostElement.style.zIndex = "1000";
}

async function removeGhost(
  session: DragSession,
  role: GhostRole = "target",
): Promise<void> {
  if (role === "target") {
    // Swap mode has no target-role ghost — hover feedback is entirely the
    // consumer's job via onDragItemEnter/Move/Leave.
    session.pendingGhostTarget = null;
    return;
  }
  const item = session.primaryItem;
  const ghostItem = session.ghosts.get(role);
  if (!ghostItem) return;

  const ghostContainer = ghostItem.parent as unknown as Container | null;
  if (ghostContainer) {
    item.removeGhostFrom(item, ghostContainer, ghostItem, session, "marker", role);
    await settleMutation();
  }
  ghostItem.destroy(!ghostItem.frameworkManagedGhostElement);
  session.ghosts.delete(role);
}

function drop(session: DragSession): void {
  const item = session.primaryItem;
  const root = session.root;

  item.schedule(
    async () => {
      const pending = session.pendingGhostTarget;

      await removeGhost(session, "pointer");
      session.pendingGhostTarget = null;
      session.clearHoveredItem();

      const aLocation = item.getIndexAndContainer();
      const bContainer = pending?.container ?? null;
      const bIndex = pending?.index ?? -1;
      const targetItem =
        bContainer && bIndex >= 0 && bIndex < bContainer.itemOrderedList.length
          ? bContainer.itemOrderedList[bIndex]
          : null;

      let destination: DragLocation | null = null;

      if (
        aLocation.container &&
        bContainer &&
        targetItem &&
        targetItem !== item
      ) {
        const aContainer = aLocation.container;
        const aIndex = aLocation.index;

        destination = {
          container: bContainer,
          containerMetadata: bContainer.metadata,
          index: bIndex,
        };

        // Update bookkeeping directly as a genuine swap: both items simply
        // trade slots (reparenting is a no-op when they share a container),
        // independent of whatever event ends up firing below.
        (bContainer as unknown as Item).appendChild(item);
        (aContainer as unknown as Item).appendChild(targetItem);
        aContainer.itemOrderedList[aIndex] = targetItem;
        bContainer.itemOrderedList[bIndex] = item;

        fireItemSwap(
          { item, container: aContainer, index: aIndex },
          { item: targetItem, container: bContainer, index: bIndex },
          session,
        );
        await settleMutation();
      }

      root.clearDragSnapshotTree();
      resetDropSnapshotDebugDump(item);
      session.status = "ended";
      root.dragSession = null;
      fireMutation(root, () => {
        root.callbacks?.onDragEnd?.({
          session,
          item,
          itemId: item.resolvedItemId,
          itemMetadata: item.metadata,
          items: session.items,
          itemIds: session.items.map((member) => member.resolvedItemId),
          itemsMetadata: session.items.map((member) => member.metadata),
          element: item.element,
          source: session.sources[0],
          sources: session.sources,
          destination,
        });
      });
    },
    { stage: "WRITE_1", queueId: `drag-end-swap-${item.id}` },
  );
}

export class SwapLifecycle implements DragLifecycleStrategy {
  readonly ghostKind = "marker" as const;

  async dragStart(session: DragSession): Promise<void> {
    await createPointerGhost(session);
    writePointerGhostPosition(session);
    await session.updateDropTarget();
  }

  dragMove(session: DragSession): void {
    writePointerGhostPosition(session);
  }

  currentGhostLocation(
    session: DragSession,
  ): { container: Container; index: number } | null {
    const pending = session.pendingGhostTarget;
    const pointerGhost = session.ghosts.get("pointer");
    if (!pending || !pointerGhost || pending.ghostItem !== pointerGhost) {
      return null;
    }
    return { container: pending.container, index: pending.index };
  }

  translateTargetIndex(_session: DragSession, target: DropCandidate): number {
    return target.index;
  }

  moveGhost(
    session: DragSession,
    container: Container,
    index: number,
    ghostRect: GhostRect | null | undefined,
  ): void {
    const pointerGhost = session.ghosts.get("pointer");
    if (!pointerGhost) return;
    session.pendingGhostTarget = { ghostItem: pointerGhost, container, index, ghostRect };
  }

  async removeGhost(
    session: DragSession,
    role: GhostRole = "target",
  ): Promise<void> {
    await removeGhost(session, role);
  }

  afterSyncDropTarget(_session: DragSession): void {
    // The pointer ghost tracks the raw pointer directly; it needs no
    // resync when the resolved target changes.
  }

  drop(session: DragSession): void {
    drop(session);
  }
}
