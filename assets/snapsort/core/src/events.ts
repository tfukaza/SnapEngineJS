import type { Container } from "./container";
import type { Item } from "./item";
import type { DragSession } from "./drag/session";
import type { ItemSnapshotMetadata } from "./snapshot";

/**
 * A container + index location, used both for drag sources/destinations and
 * for the currently prospective drop target during a drag.
 */
export interface DragLocation {
  container: Container;
  containerMetadata: Record<string, unknown>;
  index: number;
}

/**
 * What committing the current drag should do to source data. Writable by
 * consumers (from `onDragStart` / `onDropTargetChange`) via `session.dropEffect`;
 * the core never infers this itself.
 *
 * - `"move"` (default): today's behavior — the original item is relocated.
 * - `"copy"`: the original returns to its source slot; `onItemInsert` fires at
 *   the destination with the original's metadata so the consumer can insert a
 *   clone in their own state.
 * - `"none"`: no mutation events fire; the original returns to its source slot.
 *   `onDragEnd` still reports the resolved destination (e.g. for a trash-bin
 *   drop, where the consumer removes the item themselves in `onDragEnd`).
 */
export type DropEffect = "move" | "copy" | "none";

/** Which role a ghost plays during a drag. See `DragSession.ghosts`. */
export type GhostRole = "target" | "source" | "pointer";

/**
 * Distinguishes a mid-drag relocation from the final placement on a mutation
 * event. `"preview"` fires as the drop target changes during a drag — apply
 * it to state, but gate side effects (server sync, undo checkpoints, etc.)
 * on `"commit"`, which fires once when the drag settles. Defaults to
 * `"commit"` on events that don't yet distinguish the two (pre-unified-
 * entries call sites); this will become load-bearing once previews are
 * fired (see the unified entries redesign).
 */
export type MutationPhase = "preview" | "commit";

export interface ItemRemoveEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full removed run, ordered. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  container: Container;
  containerMetadata: Record<string, unknown>;
  phase: MutationPhase;
}

export interface ItemInsertEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full inserted run, ordered. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  container: Container;
  containerMetadata: Record<string, unknown>;
  /** Index of the first item in the run. */
  index: number;
  /** Element the whole run is inserted before (all items share one insertion point). */
  beforeElement: HTMLElement | null;
  phase: MutationPhase;
}

/**
 * Fired once, at the destination, when a `"copy"`-effect drag commits. The
 * original `item` never leaves its source location — only its metadata is
 * meaningful here, as a template for the consumer to materialize a clone in
 * their own state (and DOM, if not framework-managed). There is no default
 * DOM implementation: unlike move/insert, SnapSort has no generically-correct
 * way to fabricate a cloned element, so a container that ever sets
 * `session.dropEffect = "copy"` must provide `onItemCopy`.
 */
export interface ItemCopyEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full copied run, ordered. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  container: Container;
  containerMetadata: Record<string, unknown>;
  /** Index of the first item in the run. */
  index: number;
  /** Element the whole run is inserted before (all items share one insertion point). */
  beforeElement: HTMLElement | null;
}

export interface ItemSwapParticipant {
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
  /** This item's slot before the swap — after committing, `b`'s item occupies this slot (and vice versa). */
  index: number;
}

/**
 * Fired when `"swap"` mode commits: the occupants of `a`'s and `b`'s slots
 * trade places. No default: falls back to two `onItemMove` calls (further
 * falling back to `onItemInsert`) when unregistered, which is a correct
 * substitute for adjacent-in-the-same-container or cross-container swaps,
 * but reads as "each item independently moved" — not a strict pairwise
 * swap — for non-adjacent same-container slots, since `onItemMove` has no
 * way to say "leave everything in between untouched." Provide `onItemSwap`
 * for state models that need that distinction.
 */
export interface ItemSwapEvent {
  session: DragSession | null;
  a: ItemSwapParticipant;
  b: ItemSwapParticipant;
  phase: MutationPhase;
}

/**
 * Fired for a single semantic move of an item from one container/index to
 * another (including within the same container). Preferred over the
 * insert/remove primitives when the consumer's state model can express a
 * move as one operation.
 */
export interface ItemMoveEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full moved run, ordered by original (document) index. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  from: DragLocation;
  to: DragLocation;
  /** Each item's source location, parallel to `items`. `from === froms[0]`. */
  froms: DragLocation[];
  /** Element the whole run is inserted before (all items share one insertion point). */
  beforeElement: HTMLElement | null;
  phase: MutationPhase;
}

export interface GhostRect {
  x: number;
  y: number;
  width: number;
  height: number;
  insetLeft?: number;
  insetRight?: number;
}

/** Which drag lifecycle produced a ghost: a flow-layout spacer, or a floating insertion marker. */
export type GhostKind = "flow" | "marker";

export interface GhostCreateEvent {
  session: DragSession;
  kind: GhostKind;
  /** Which role this ghost plays in the current drag; see `GhostRole`. */
  role: GhostRole;
  container: Container;
  original: Item;
  originalMetadata: ItemSnapshotMetadata;
  /** The full dragged run this ghost represents, ordered. `original === items[0]` (single-item case: length 1). */
  items: Item[];
  ghostItem: Item;
  ghostRect?: GhostRect | null;
}

export interface GhostInsertEvent {
  session: DragSession;
  kind: GhostKind;
  role: GhostRole;
  original: Item;
  originalMetadata: ItemSnapshotMetadata;
  ghostItem: Item;
  ghostMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
  index: number;
  beforeElement: HTMLElement | null;
  ghostRect?: GhostRect | null;
}

export interface GhostRemoveEvent {
  session: DragSession;
  kind: GhostKind;
  role: GhostRole;
  original: Item;
  originalMetadata: ItemSnapshotMetadata;
  ghostItem: Item;
  ghostMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
}

/** @internal Passed between a lifecycle strategy and the Mutator; not part of the public callback surface. */
export interface GhostUpdateEvent {
  session: DragSession;
  kind: GhostKind;
  original: Item;
  container: Container | null;
  index: number;
  ghostRect?: GhostRect | null;
}

export interface DragStartEvent {
  session: DragSession;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full dragged run, ordered. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  element: HTMLElement | null;
  source: DragLocation;
  /** Each item's source location, parallel to `items`. `source === sources[0]`. */
  sources: DragLocation[];
}

export interface DragEndEvent {
  session: DragSession;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full dragged run, ordered. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  element: HTMLElement | null;
  source: DragLocation;
  /** Each item's source location, parallel to `items`. `source === sources[0]`. */
  sources: DragLocation[];
  /** Null when the item was dropped back to its source or the drag was cancelled. */
  destination: DragLocation | null;
}

/**
 * Fired on the source (root) container at drag start when
 * `session.dropEffect === "copy"`, BEFORE the drag is hoisted. The consumer
 * must materialize a clone in their own state for each `cloneItems` entry and
 * render it (bound via `itemObject`) inside a drop container, then flush
 * (`awaitMutation`) so each clone has a DOM element. The core then hands the
 * drag off to the clones (`DragSession.handoff`) — the original items stay
 * exactly where they are, untouched and un-ghosted. If the consumer binds no
 * element, the copy drag is vetoed.
 *
 * `cloneItems` is parallel to `items` (the originals). At drop the clones
 * commit into the destination via the normal `onItemMove` path; a cancelled
 * drag fires `onDragEnd` with the clones and `destination: null` so the
 * consumer can remove them from state.
 */
export interface DragCloneEvent {
  session: DragSession;
  /** The original items (never moved). `item === items[0]`. */
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  sources: DragLocation[];
  /** Fresh clone items, parallel to `items`; the consumer binds each one's element. */
  cloneItems: Item[];
}

export interface DropTargetChangeEvent {
  session: DragSession;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full dragged run, ordered. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  previous: DragLocation | null;
  current: DragLocation | null;
}

export interface CanDropEvent {
  session: DragSession | null;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  /** The full dragged run, ordered. `item === items[0]` (single-item case: length 1). */
  items: Item[];
  itemsMetadata: ItemSnapshotMetadata[];
  container: Container;
  containerMetadata: Record<string, unknown>;
  /**
   * Candidate insertion index. `canDrop` is evaluated once per container per
   * drop-target resolution (not once per candidate slot) for performance, so
   * this reflects whichever candidate for this container was evaluated
   * first and should not be used for per-slot gating.
   */
  index: number;
}

/**
 * Fired while dragging as the pointer's hitbox test starts, continues, or
 * stops matching another item's hitbox. Distinct from `onDropTargetChange`,
 * which tracks the resolved drop slot/gap — this tracks hovering over an
 * *item*, independent of any sort algorithm. `overItem`'s hitbox is
 * adjustable via `hitboxInset*`/`hitboxShape` metadata (see
 * `ItemSnapshotMetadata`). Used directly by swap mode; also available
 * generally for hover-driven UI (highlight-on-hover, previews, etc.).
 */
export interface DragItemHoverEvent {
  session: DragSession;
  item: Item;
  itemMetadata: ItemSnapshotMetadata;
  overItem: Item;
  overItemMetadata: ItemSnapshotMetadata;
  container: Container;
  containerMetadata: Record<string, unknown>;
  pointer: { x: number; y: number };
}

export interface ContainerCallbacks {
  /** Preferred by state-backed frameworks: one semantic event per move. */
  onItemMove?: (event: ItemMoveEvent) => void;

  /** Primitives kept as building blocks; defaults perform direct DOM mutation. */
  onItemInsert?: (event: ItemInsertEvent) => void;
  onItemRemove?: (event: ItemRemoveEvent) => void;

  /**
   * Fired when `"swap"` mode commits. No default: falls back to two
   * `onItemMove` calls when unregistered (see `ItemSwapEvent`).
   */
  onItemSwap?: (event: ItemSwapEvent) => void;

  /**
   * Flow-mode (euclidean/progressive) copy: fired at drag start when
   * `dropEffect === "copy"` (see `DragCloneEvent`). The consumer must bind an
   * element to each clone, or the copy drag is vetoed. The clones then commit
   * at drop through the normal `onItemMove` path.
   */
  onDragClone?: (event: DragCloneEvent) => void;

  /**
   * Insertion-mode copy: fired at drop when `dropEffect === "copy"`. Unlike
   * flow mode, the insertion marker never moves the dragged item, so the
   * original stays put with no flicker and the clone is materialized here at
   * the destination. Required on any insertion container that sets
   * `dropEffect = "copy"`.
   */
  onItemCopy?: (event: ItemCopyEvent) => void;

  /** Fired on the source container. Returning `false` vetoes the drag before any state changes. */
  onDragStart?: (event: DragStartEvent) => void | false;
  onDragEnd?: (event: DragEndEvent) => void;

  /** Fired only when the prospective drop container/index actually changes. */
  onDropTargetChange?: (event: DropTargetChangeEvent) => void;

  /** Fired on the container owning `overItem`, once per hovered item, when the pointer's hitbox first matches it. */
  onDragItemEnter?: (event: DragItemHoverEvent) => void;
  /** Fired on the container owning `overItem` on every pointer move while its hitbox still matches. */
  onDragItemMove?: (event: DragItemHoverEvent) => void;
  /** Fired on the container owning `overItem` when the pointer's hitbox stops matching it. */
  onDragItemLeave?: (event: DragItemHoverEvent) => void;

  /** Consulted while resolving candidates for `container`; return false to reject it for this drag. */
  canDrop?: (event: CanDropEvent) => boolean;

  /** Ghost customization, unified across both drag lifecycles via `event.kind`. */
  createGhost?: (event: GhostCreateEvent) => HTMLElement | void | null;
  onGhostInsert?: (event: GhostInsertEvent) => void;
  onGhostRemove?: (event: GhostRemoveEvent) => void;

  /** Wait for the caller's framework to flush DOM after SnapSort mutates data. */
  awaitMutation?: () => void | Promise<void>;
}
