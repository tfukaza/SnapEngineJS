import type { Container } from "./container";
import type { Item } from "./item";
import type { DragSession } from "./drag/session";
import type {
  DragItemHoverEvent,
  DragLocation,
  GhostCreateEvent,
  GhostInsertEvent,
  GhostRemoveEvent,
  ItemCopyEvent,
  ItemInsertEvent,
  ItemMoveEvent,
  ItemRemoveEvent,
  ItemSwapEvent,
} from "./events";

/**
 * Single dispatch point for every ContainerCallbacks entry. Item and the drag
 * lifecycle strategies call these instead of invoking `container.callbacks`
 * directly, so fallback semantics (e.g. onItemMove -> onItemInsert) live in
 * exactly one place.
 */

export function fireItemInsert(
  container: Container,
  item: Item,
  index: number,
  beforeElement: HTMLElement | null,
  session: DragSession | null,
): void {
  const onInsert = container.callbacks?.onItemInsert;
  if (!onInsert) {
    throw new Error("Container callback onItemInsert is not defined");
  }
  const event: ItemInsertEvent = {
    session,
    item,
    itemMetadata: item.metadata,
    container,
    containerMetadata: container.metadata,
    index,
    beforeElement,
  };
  onInsert(event);
}

/**
 * Fire the copy primitive at the destination. Requires `onItemCopy` — unlike
 * move/insert there is no generically-correct default DOM behavior for
 * fabricating a clone, so a container using `dropEffect = "copy"` must supply one.
 */
export function fireItemCopy(
  container: Container,
  item: Item,
  index: number,
  beforeElement: HTMLElement | null,
  session: DragSession | null,
): void {
  const onCopy = container.callbacks?.onItemCopy;
  if (!onCopy) {
    throw new Error(
      'Container callback onItemCopy is not defined. Any container reachable with session.dropEffect = "copy" must provide onItemCopy.',
    );
  }
  const event: ItemCopyEvent = {
    session,
    item,
    itemMetadata: item.metadata,
    container,
    containerMetadata: container.metadata,
    index,
    beforeElement,
  };
  onCopy(event);
}

export function fireItemRemove(
  container: Container,
  item: Item,
  session: DragSession | null,
): void {
  const onRemove = container.callbacks?.onItemRemove;
  if (!onRemove) {
    throw new Error("Container callback onItemRemove is not defined");
  }
  const event: ItemRemoveEvent = {
    session,
    item,
    itemMetadata: item.metadata,
    container,
    containerMetadata: container.metadata,
  };
  onRemove(event);
}

/**
 * Fire the semantic move event on the destination container. Falls back to
 * the insert-only primitive path when no `onItemMove` is registered, which
 * matches the pre-refactor behavior (a DOM `insertBefore` inherently moves
 * the node, so no explicit remove is needed on the source).
 */
export function fireItemMove(
  from: DragLocation,
  to: DragLocation,
  item: Item,
  beforeElement: HTMLElement | null,
  session: DragSession | null,
): void {
  const onMove = to.container.callbacks?.onItemMove;
  if (onMove) {
    const event: ItemMoveEvent = {
      session,
      item,
      itemMetadata: item.metadata,
      from,
      to,
      beforeElement,
    };
    onMove(event);
    return;
  }
  fireItemInsert(to.container, item, to.index, beforeElement, session);
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
): void {
  const onSwap = a.container.callbacks?.onItemSwap;
  if (onSwap) {
    const event: ItemSwapEvent = {
      session,
      a: {
        item: a.item,
        itemMetadata: a.item.metadata,
        container: a.container,
        containerMetadata: a.container.metadata,
        index: a.index,
      },
      b: {
        item: b.item,
        itemMetadata: b.item.metadata,
        container: b.container,
        containerMetadata: b.container.metadata,
        index: b.index,
      },
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
    {
      container: a.container,
      containerMetadata: a.container.metadata,
      index: a.index,
    },
    {
      container: b.container,
      containerMetadata: b.container.metadata,
      index: b.index,
    },
    a.item,
    beforeElementFor(b.container, b.index),
    session,
  );
  fireItemMove(
    {
      container: b.container,
      containerMetadata: b.container.metadata,
      index: b.index,
    },
    {
      container: a.container,
      containerMetadata: a.container.metadata,
      index: a.index,
    },
    b.item,
    beforeElementFor(a.container, a.index),
    session,
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
    itemMetadata: item.metadata,
    overItem,
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
    originalMetadata: original.metadata,
    ghostItem,
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
    originalMetadata: original.metadata,
    ghostItem,
    ghostMetadata: ghostItem.metadata,
    container,
    containerMetadata: container.metadata,
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
  event.container.element?.insertBefore(
    event.item.element!,
    event.beforeElement,
  );
}

function defaultRemoveItem(event: ItemRemoveEvent): void {
  event.item.element?.remove();
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
  ghostElement.style.width = origProp.width + "px";
  ghostElement.style.height = origProp.height + "px";
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
