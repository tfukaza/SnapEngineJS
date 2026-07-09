import type { Container } from "./container";
import type { Item } from "./item";
import type { DragSession } from "./drag/session";
import type {
  DragItemHoverEvent,
  DragLocation,
  GhostCreateEvent,
  GhostInsertEvent,
  GhostRemoveEvent,
  ItemInsertEvent,
  ItemMoveEvent,
  ItemRemoveEvent,
  ItemSwapEvent,
  MutationPhase,
} from "./events";

/**
 * Single dispatch point for every ContainerCallbacks entry. Item and the drag
 * lifecycle strategies call these instead of invoking `container.callbacks`
 * directly, so fallback semantics (e.g. onItemMove -> onItemInsert) live in
 * exactly one place.
 */

function itemIds(items: Item[]): string[] {
  return items.map((item) => item.resolvedItemId);
}

function ghostItems(session: DragSession): Item[] {
  return session.items;
}

function ghostItemIds(session: DragSession): string[] {
  return session.items.map((item) => item.resolvedItemId);
}

export function fireItemInsert(
  container: Container,
  items: Item[],
  index: number,
  beforeElement: HTMLElement | null,
  session: DragSession | null,
  phase: MutationPhase = "commit",
): void {
  const onInsert = container.callbacks?.onItemInsert;
  if (!onInsert) {
    throw new Error("Container callback onItemInsert is not defined");
  }
  const event: ItemInsertEvent = {
    session,
    item: items[0],
    itemId: items[0].resolvedItemId,
    itemMetadata: items[0].metadata,
    items,
    itemIds: itemIds(items),
    itemsMetadata: items.map((item) => item.metadata),
    container,
    containerMetadata: container.metadata,
    index,
    beforeElement,
    phase,
  };
  onInsert(event);
}

export function fireItemRemove(
  container: Container,
  items: Item[],
  session: DragSession | null,
  phase: MutationPhase = "commit",
): void {
  const onRemove = container.callbacks?.onItemRemove;
  if (!onRemove) {
    throw new Error("Container callback onItemRemove is not defined");
  }
  const event: ItemRemoveEvent = {
    session,
    item: items[0],
    itemId: items[0].resolvedItemId,
    itemMetadata: items[0].metadata,
    items,
    itemIds: itemIds(items),
    itemsMetadata: items.map((item) => item.metadata),
    container,
    containerMetadata: container.metadata,
    phase,
  };
  onRemove(event);
}

/**
 * Fire the semantic move event on the destination container for the whole
 * dragged run in one call. Falls back to the insert-only primitive path when
 * no `onItemMove` is registered, which matches the pre-refactor behavior (a
 * DOM `insertBefore` inherently moves the node, so no explicit remove is
 * needed on the source).
 *
 * Also the copy-drag commit path: a spawned item's `froms` entry is `null`
 * (see `ItemMoveEvent`) and `origins` carries the item it was spawned from.
 */
export function fireItemMove(
  froms: (DragLocation | null)[],
  to: DragLocation,
  items: Item[],
  beforeElement: HTMLElement | null,
  session: DragSession | null,
  phase: MutationPhase = "commit",
  origins: (Item | null)[] = items.map(() => null),
): void {
  const onMove = to.container.callbacks?.onItemMove;
  if (onMove) {
    const event: ItemMoveEvent = {
      session,
      item: items[0],
      itemId: items[0].resolvedItemId,
      itemMetadata: items[0].metadata,
      items,
      itemIds: itemIds(items),
      itemsMetadata: items.map((item) => item.metadata),
      from: froms[0] ?? null,
      to,
      froms,
      originItem: origins[0] ?? null,
      originItemId: origins[0]?.resolvedItemId ?? null,
      originItemMetadata: origins[0]?.metadata ?? null,
      origins,
      originItemIds: origins.map((origin) => origin?.resolvedItemId ?? null),
      originsMetadata: origins.map((origin) => origin?.metadata ?? null),
      beforeElement,
      phase,
    };
    onMove(event);
    return;
  }
  fireItemInsert(to.container, items, to.index, beforeElement, session, phase);
}

/**
 * Fire the swap primitive. `a`/`b` describe each item's slot *before* the
 * swap; the caller (the swap lifecycle) has already updated its own
 * bookkeeping to the final, correct swap by the time this runs — this only
 * decides what the *consumer* is told happened.
 */
export function fireItemSwap(
  a: { item: Item; container: Container; index: number },
  b: { item: Item; container: Container; index: number },
  session: DragSession | null,
  phase: MutationPhase = "commit",
): void {
  const onSwap = a.container.callbacks?.onItemSwap;
  if (onSwap) {
    const event: ItemSwapEvent = {
      session,
      a: {
        item: a.item,
        itemId: a.item.resolvedItemId,
        itemMetadata: a.item.metadata,
        container: a.container,
        containerMetadata: a.container.metadata,
        index: a.index,
      },
      b: {
        item: b.item,
        itemId: b.item.resolvedItemId,
        itemMetadata: b.item.metadata,
        container: b.container,
        containerMetadata: b.container.metadata,
        index: b.index,
      },
      phase,
    };
    onSwap(event);
    return;
  }

  // No onItemSwap: approximate as two onItemMove calls (see ItemSwapEvent's
  // doc for the known limitation on non-adjacent same-container swaps).
  // Bookkeeping is already the final, correct swap, so `beforeElement` reads
  // straight off each destination container's current itemOrderedList.
  const beforeElementFor = (
    container: Container,
    index: number,
  ): HTMLElement | null =>
    index >= container.itemOrderedList.length - 1
      ? null
      : (container.itemOrderedList[index + 1]?.element ?? null);

  fireItemMove(
    [
      {
        container: a.container,
        containerMetadata: a.container.metadata,
        index: a.index,
      },
    ],
    {
      container: b.container,
      containerMetadata: b.container.metadata,
      index: b.index,
    },
    [a.item],
    beforeElementFor(b.container, b.index),
    session,
    phase,
  );
  fireItemMove(
    [
      {
        container: b.container,
        containerMetadata: b.container.metadata,
        index: b.index,
      },
    ],
    {
      container: a.container,
      containerMetadata: a.container.metadata,
      index: a.index,
    },
    [b.item],
    beforeElementFor(a.container, a.index),
    session,
    phase,
  );
}

function buildDragItemHoverEvent(
  session: DragSession,
  item: Item,
  overItem: Item,
  container: Container,
): DragItemHoverEvent {
  return {
    session,
    item,
    itemId: item.resolvedItemId,
    itemMetadata: item.metadata,
    overItem,
    overItemId: overItem.resolvedItemId,
    overItemMetadata: overItem.metadata,
    container,
    containerMetadata: container.metadata,
    pointer: { x: session.pointer.x, y: session.pointer.y },
  };
}

export function fireDragItemEnter(
  container: Container,
  item: Item,
  overItem: Item,
  session: DragSession,
): void {
  container.callbacks?.onDragItemEnter?.(
    buildDragItemHoverEvent(session, item, overItem, container),
  );
}

export function fireDragItemMove(
  container: Container,
  item: Item,
  overItem: Item,
  session: DragSession,
): void {
  container.callbacks?.onDragItemMove?.(
    buildDragItemHoverEvent(session, item, overItem, container),
  );
}

export function fireDragItemLeave(
  container: Container,
  item: Item,
  overItem: Item,
  session: DragSession,
): void {
  container.callbacks?.onDragItemLeave?.(
    buildDragItemHoverEvent(session, item, overItem, container),
  );
}

export function fireGhostInsert(
  container: Container,
  original: Item,
  ghostItem: Item,
  index: number,
  beforeElement: HTMLElement | null,
  ghostRect: GhostInsertEvent["ghostRect"],
  session: DragSession,
  kind: GhostInsertEvent["kind"],
  role: GhostInsertEvent["role"] = "target",
): void {
  const onInsert = container.callbacks?.onGhostInsert;
  if (!onInsert) {
    throw new Error("Container callback onGhostInsert is not defined");
  }
  const event: GhostInsertEvent = {
    session,
    kind,
    role,
    original,
    originalItemId: original.resolvedItemId,
    originalMetadata: original.metadata,
    items: ghostItems(session),
    itemIds: ghostItemIds(session),
    ghostItem,
    ghostItemId: ghostItem.resolvedItemId,
    ghostMetadata: ghostItem.metadata,
    container,
    containerMetadata: container.metadata,
    index,
    beforeElement,
    ghostRect,
  };
  onInsert(event);
}

export function fireGhostRemove(
  container: Container,
  original: Item,
  ghostItem: Item,
  session: DragSession,
  kind: GhostRemoveEvent["kind"],
  role: GhostRemoveEvent["role"] = "target",
): void {
  const onRemove = container.callbacks?.onGhostRemove;
  if (!onRemove) {
    throw new Error("Container callback onGhostRemove is not defined");
  }
  const event: GhostRemoveEvent = {
    session,
    kind,
    role,
    original,
    originalItemId: original.resolvedItemId,
    originalMetadata: original.metadata,
    items: ghostItems(session),
    itemIds: ghostItemIds(session),
    ghostItem,
    ghostItemId: ghostItem.resolvedItemId,
    ghostMetadata: ghostItem.metadata,
    container,
    containerMetadata: container.metadata,
    ghostRect:
      session.pendingGhostTarget?.ghostItem === ghostItem
        ? session.pendingGhostTarget.ghostRect
        : undefined,
  };
  onRemove(event);
}

export function fireCreateGhost(
  event: GhostCreateEvent,
): HTMLElement | void | null {
  return event.container.callbacks?.createGhost?.(event);
}

export async function fireAwaitMutation(
  container: Container | null,
): Promise<void> {
  await container?.callbacks?.awaitMutation?.();
}

// --- Default DOM implementations, merged with user config in Container's constructor. ---

function defaultInsertItem(event: ItemInsertEvent) {
  // Insert every item before the same anchor, in run order: each item lands
  // immediately before the anchor and after whichever run member was just
  // inserted, so the DOM ends up in `items` order.
  for (const item of event.items) {
    event.container.element?.insertBefore(item.element!, event.beforeElement);
  }
}

function defaultRemoveItem(event: ItemRemoveEvent): void {
  for (const item of event.items) {
    item.element?.remove();
  }
}

function defaultInsertGhost(event: GhostInsertEvent) {
  event.container.element?.insertBefore(
    event.ghostItem.element!,
    event.beforeElement,
  );
}

function defaultRemoveGhost(event: GhostRemoveEvent): void {
  event.ghostItem.element?.remove();
}

function defaultCreateFlowGhost(event: GhostCreateEvent): HTMLElement {
  const ghostElement = document.createElement("div");
  ghostElement.id = "spacer";

  const origProp =
    event.original.dragSnapshot?.box ?? event.original.currentDomProperty;
  // `ghostRect`, when present, is the whole dragged group's size (see
  // DragSession.groupDims) — a single item's snapshot box for `items.length
  // === 1`, so this degenerates to the original behavior in that case.
  const width = event.ghostRect?.width ?? origProp.width;
  const height = event.ghostRect?.height ?? origProp.height;
  ghostElement.style.width = width + "px";
  ghostElement.style.height = height + "px";
  ghostElement.style.margin = `${origProp.margin.top}px ${origProp.margin.right}px ${origProp.margin.bottom}px ${origProp.margin.left}px`;
  ghostElement.style.boxSizing = "border-box";
  ghostElement.classList.add("ghost");

  return ghostElement;
}

function defaultCreateMarkerGhost(event: GhostCreateEvent): HTMLElement {
  const ghostElement = document.createElement("div");
  ghostElement.id = "spacer";
  const { ghostRect } = event;
  const insetLeft = ghostRect?.insetLeft ?? 0;
  const insetRight = ghostRect?.insetRight ?? 0;
  const width = ghostRect
    ? Math.max(0, ghostRect.width - insetLeft - insetRight)
    : 0;

  ghostElement.dataset.snapsortGhost = "insertion";
  ghostElement.style.position = "absolute";
  ghostElement.style.width = `${width}px`;
  ghostElement.style.height = "0px";
  ghostElement.style.borderRadius = "999px";
  ghostElement.style.borderTop = "3px solid currentColor";
  ghostElement.style.background = "currentColor";
  ghostElement.style.color = "rgb(37, 99, 235)";
  ghostElement.style.pointerEvents = "none";
  ghostElement.style.boxSizing = "border-box";

  return ghostElement;
}

function defaultCreateGhost(event: GhostCreateEvent): HTMLElement {
  return event.kind === "marker"
    ? defaultCreateMarkerGhost(event)
    : defaultCreateFlowGhost(event);
}

export const defaultCallbacks = {
  onItemInsert: defaultInsertItem,
  onItemRemove: defaultRemoveItem,
  onGhostInsert: defaultInsertGhost,
  onGhostRemove: defaultRemoveGhost,
  createGhost: defaultCreateGhost,
};
