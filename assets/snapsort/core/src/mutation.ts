import type { Container } from "./container";
import type { Item } from "./item";
import type { DragSession } from "./drag/session";
import type {
  DragLocation,
  GhostCreateEvent,
  GhostInsertEvent,
  GhostRemoveEvent,
  ItemInsertEvent,
  ItemMoveEvent,
  ItemRemoveEvent,
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

export function fireGhostInsert(
  container: Container,
  original: Item,
  ghostItem: Item,
  index: number,
  beforeElement: HTMLElement | null,
  ghostRect: GhostInsertEvent["ghostRect"],
  session: DragSession,
  kind: GhostInsertEvent["kind"],
): void {
  const onInsert = container.callbacks?.onGhostInsert;
  if (!onInsert) {
    throw new Error("Container callback onGhostInsert is not defined");
  }
  const event: GhostInsertEvent = {
    session,
    kind,
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
): void {
  const onRemove = container.callbacks?.onGhostRemove;
  if (!onRemove) {
    throw new Error("Container callback onGhostRemove is not defined");
  }
  const event: GhostRemoveEvent = {
    session,
    kind,
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
