<script lang="ts" generics="T">
  import { Container as SnapSortContainer, defaultCallbacks } from "@snap-engine/snapsort";
  import type {
    ContainerCallbacks,
    ContainerConfig,
    GhostCreateEvent,
    GhostInsertEvent,
    GhostRemoveEvent,
    Item as EngineItem,
  } from "@snap-engine/snapsort";

  import { getContext, setContext, onMount, onDestroy, mount, unmount, tick } from "svelte";
  import type { Snippet } from "svelte";
  // GhostHost's `snippet` prop is typed `Snippet<[unknown]>` (it's a
  // non-generic .svelte file — Svelte component generics can't be applied at
  // the `mount()` call site). The cast is safe: GhostHost always invokes
  // `snippet(entry)` with exactly the `entry` value passed alongside it, so
  // `ghostSnippet`'s real parameter type is honored at runtime regardless.
  type UnknownSnippet = Snippet<[unknown]>;
  import type { Engine } from "@snap-engine/core";
  import Item from "./Item.svelte";
  import GhostHost from "./GhostHost.svelte";

  let {
    config,
    children,
    items,
    getId = (entry: T) => (entry as { id: string }).id,
    getMetadata,
    getClassName,
    getSelected,
    onItemClick,
    item: itemSnippet,
    ghost: ghostSnippet,
    container = $bindable(),
    locked = true,
    selected = false,
    className = "",
    metadata = {},
  }: {
    config: ContainerConfig;
    /** Hand-authored children (legacy API). Ignored when `items` is provided. */
    children?: any;
    /**
     * Consumer state to render — replaces hand-authoring an `{#each}` over
     * `children`. When provided, the container renders one `<Item>` per
     * entry (keyed via `getId`) wrapping the `item` snippet's output.
     */
    items?: T[];
    /** Stable id for each `items` entry; also used as the underlying Item's `metadata.itemId`. Defaults to `entry.id`. */
    getId?: (entry: T) => string;
    /** Extra per-entry metadata fields beyond `itemId` (e.g. for a commit-event fallback that reads more than the id). Merged with `{ itemId: getId(entry) }`. */
    getMetadata?: (entry: T) => Record<string, unknown>;
    /** Per-entry className for the wrapping `<Item>`, e.g. for a "selected" style. */
    getClassName?: (entry: T) => string;
    /** Per-entry selected state for the wrapping `<Item>` (drives multi-select drag). */
    getSelected?: (entry: T) => boolean;
    /** Per-entry click handler on the wrapping `<Item>`, e.g. for toggling selection. */
    onItemClick?: (entry: T, event: MouseEvent) => void;
    item?: Snippet<[T]>;
    /**
     * Custom ghost content. Optional and independent of `items`/`item` — a
     * container using the legacy `children` API can still provide `ghost` to
     * skip hand-writing `createGhost`/`onGhostInsert`/`onGhostRemove`. Omit
     * for today's default spacer look.
     */
    ghost?: Snippet<[GhostCreateEvent]>;
    container?: SnapSortContainer;
    locked?: boolean;
    selected?: boolean;
    className?: string;
    metadata?: Record<string, unknown>;
  } = $props();
  const engine: Engine = getContext("engine");
  const parentContainer: SnapSortContainer | null = getContext("container");

  // A `ghost` snippet needs the ghost's DOM element mounted with real Svelte
  // component instances (so consumer markup, bindings, transitions, etc. all
  // work) — but ghost creation is driven by the core's synchronous
  // createGhost/onGhostRemove contract, not Container's own template, so
  // there's no declarative `{#if}`/`{#each}` block for Svelte to mount into.
  // `mount`/`unmount` (Svelte 5's imperative component API, distinct from the
  // onMount/onDestroy lifecycle hooks) are the escape hatch for exactly this:
  // instantiate a component tree on demand, outside the declarative tree.
  const ghostMounts = new Map<object, ReturnType<typeof mount>>();

  /**
   * Flow-mode ghost footprint: always sized to the dragged item's box so
   * layout doesn't jump, regardless of custom content. Shared between the
   * legacy children-mode DOM path (below) and items-mode's adapter-rendered
   * ghost entries (further down).
   */
  function flowGhostFootprintStyle(event: {
    original: EngineItem;
    ghostRect?: { width: number; height: number } | null;
  }): string {
    const origProp = event.original.dragSnapshot?.box ?? event.original.currentDomProperty;
    const width = event.ghostRect?.width ?? origProp.width;
    const height = event.ghostRect?.height ?? origProp.height;
    return (
      `width:${width}px;height:${height}px;` +
      `margin:${origProp.margin.top}px ${origProp.margin.right}px ${origProp.margin.bottom}px ${origProp.margin.left}px;` +
      `box-sizing:border-box;`
    );
  }

  function applyInlineStyle(el: HTMLElement, style: string) {
    el.style.cssText = style;
  }

  function handleCreateGhost(event: GhostCreateEvent): HTMLElement {
    const el = document.createElement("div");

    if (event.kind === "marker") {
      // Insertion-mode marker: a floating overlay line (height: 0), not a
      // content box — always the default look, regardless of `ghost`.
      const insetLeft = event.ghostRect?.insetLeft ?? 0;
      const insetRight = event.ghostRect?.insetRight ?? 0;
      const width = event.ghostRect
        ? Math.max(0, event.ghostRect.width - insetLeft - insetRight)
        : 0;
      el.dataset.snapsortGhost = "insertion";
      el.style.position = "absolute";
      el.style.width = `${width}px`;
      el.style.height = "0px";
      el.style.borderRadius = "999px";
      el.style.borderTop = "3px solid currentColor";
      el.style.background = "currentColor";
      el.style.color = "rgb(37, 99, 235)";
      el.style.pointerEvents = "none";
      el.style.boxSizing = "border-box";
      return el;
    }

    el.id = "spacer";
    applyInlineStyle(el, flowGhostFootprintStyle(event));

    if (ghostSnippet) {
      const instance = mount(GhostHost, {
        target: el,
        props: { snippet: ghostSnippet as UnknownSnippet, entry: event },
      });
      ghostMounts.set(event.ghostItem, instance);
    } else {
      el.classList.add("ghost");
    }
    return el;
  }

  function handleRemoveGhost(event: GhostRemoveEvent): void {
    const instance = ghostMounts.get(event.ghostItem);
    if (instance) {
      unmount(instance);
      ghostMounts.delete(event.ghostItem);
    }
    event.ghostItem.element?.remove();
  }

  // --- Items mode: the adapter owns flow-kind ghost events (ruling 7). ---

  const itemsMode = items !== undefined;

  if (
    itemsMode &&
    (config.callbacks?.createGhost || config.callbacks?.onGhostInsert || config.callbacks?.onGhostRemove)
  ) {
    console.warn(
      "SnapSort Container: ghost callbacks (createGhost/onGhostInsert/onGhostRemove) passed " +
        "alongside `items` only fire for marker-kind ghosts (insertion/swap) — flow-mode ghost " +
        "entries are rendered by the adapter itself in items mode. Use the `ghost` snippet to " +
        "customize flow-ghost content instead.",
    );
  }

  interface GhostEntryState {
    ghostItem: EngineItem;
    event: GhostInsertEvent;
  }
  let ghostEntries = $state<GhostEntryState[]>([]);

  function isFlowTargetGhost(event: { kind: string; role: string }): boolean {
    return event.kind === "flow" && event.role === "target";
  }

  function handleItemsModeCreateGhost(event: GhostCreateEvent): HTMLElement | void {
    if (isFlowTargetGhost(event)) return undefined; // adapter renders the entry itself
    return (config.callbacks?.createGhost ?? defaultCallbacks.createGhost)(event) ?? undefined;
  }

  function handleItemsModeGhostInsert(event: GhostInsertEvent): void {
    if (isFlowTargetGhost(event)) {
      // Upsert by ghostItem identity: a same-container reposition re-fires
      // insert for a run anchor without an intervening remove.
      ghostEntries = [
        ...ghostEntries.filter((g) => g.ghostItem !== event.ghostItem),
        { ghostItem: event.ghostItem, event },
      ];
      return;
    }
    (config.callbacks?.onGhostInsert ?? defaultCallbacks.onGhostInsert)(event);
  }

  function handleItemsModeGhostRemove(event: GhostRemoveEvent): void {
    if (isFlowTargetGhost(event)) {
      ghostEntries = ghostEntries.filter((g) => g.ghostItem !== event.ghostItem);
      return;
    }
    (config.callbacks?.onGhostRemove ?? defaultCallbacks.onGhostRemove)(event);
  }

  /** Builds the `GhostCreateEvent` shape the shared `ghost` snippet expects from a `GhostInsertEvent`. */
  function toGhostCreateEvent(event: GhostInsertEvent): GhostCreateEvent {
    return {
      session: event.session,
      kind: event.kind,
      role: event.role,
      container: event.container,
      original: event.original,
      originalMetadata: event.originalMetadata,
      items: event.session.items,
      ghostItem: event.ghostItem,
      ghostRect: event.ghostRect,
    };
  }

  /** Binds a ghost Item's `.element` to this node; guards against nulling a node a newer mount already rebound (cross-container recreation can mount-before-unmount within one flush). */
  function bindGhostElement(node: HTMLElement, ghostItem: EngineItem) {
    ghostItem.element = node;
    return {
      destroy() {
        if (ghostItem.element === node) {
          ghostItem.element = null;
        }
      },
    };
  }

  type RenderedEntry =
    | { kind: "item"; id: string; entry: T }
    | { kind: "ghost"; id: string; ghost: GhostEntryState };

  /**
   * Consumer `items` verbatim (dragged entries stay in the array mid-drag —
   * their DOM is hoisted in place by the core and must never be touched by
   * Svelte) with ghost entries spliced in by `event.index`. Generalizes the
   * single-item index-adjustment rule proven in the duolingo demo: walk the
   * base array counting only "core-visible" positions (non-dragged items,
   * plus any ghost already spliced in this pass) until `event.index` of them
   * have been seen, then skip past any dragged items sitting exactly at that
   * boundary (their slot is being replaced by the ghost, so the ghost lands
   * after them) — this also makes a per-member run land as N contiguous
   * ghost entries, since each next anchor's index already accounts for the
   * previous anchor once it's spliced in.
   */
  const renderedEntries = $derived.by((): RenderedEntry[] => {
    const base: RenderedEntry[] = (items ?? []).map((entry) => ({
      kind: "item" as const,
      id: getId(entry),
      entry,
    }));
    if (ghostEntries.length === 0) return base;

    const session = ghostEntries[0].event.session;
    const draggedIds = new Set(
      session.items.map((i) => String(i.metadata.itemId ?? i.id)),
    );
    const sorted = ghostEntries.slice().sort((a, b) => a.event.index - b.event.index);
    const result = base.slice();
    for (const g of sorted) {
      let count = 0;
      let p = 0;
      while (p < result.length && count < g.event.index) {
        if (!draggedIds.has(result[p].id)) count++;
        p++;
      }
      while (p < result.length && result[p].kind === "item" && draggedIds.has(result[p].id)) {
        p++;
      }
      result.splice(p, 0, { kind: "ghost", id: `ghost:${g.ghostItem.id}`, ghost: g });
    }
    return result;
  });

  const callbacks: ContainerCallbacks = itemsMode
    ? {
        ...config.callbacks,
        createGhost: handleItemsModeCreateGhost,
        onGhostInsert: handleItemsModeGhostInsert,
        onGhostRemove: handleItemsModeGhostRemove,
        awaitMutation: config.callbacks?.awaitMutation ?? tick,
      }
    : ghostSnippet
      ? { ...config.callbacks, createGhost: handleCreateGhost, onGhostRemove: handleRemoveGhost }
      : (config.callbacks ?? {});

  let itemContainer: SnapSortContainer = new SnapSortContainer(engine, parentContainer, {
    ...config,
    callbacks,
  });
  itemContainer.locked = locked;
  itemContainer.selected = selected;
  itemContainer.metadata = metadata;
  itemContainer.direction = config.direction ?? "column";
  itemContainer.mainAxisAlign = config.mainAxisAlign ?? "start";
  itemContainer.dropArea = config.dropArea ?? false;
  itemContainer.noDrop = config.noDrop ?? false;
  const justifyContent = $derived(config.mainAxisAlign === "center" ? "center" : "flex-start");
  setContext("container", itemContainer);

  $effect(() => {
    itemContainer.locked = locked;
    itemContainer.selected = selected;
    itemContainer.metadata = metadata;
    itemContainer.direction = config.direction ?? "column";
    itemContainer.mainAxisAlign = config.mainAxisAlign ?? "start";
    itemContainer.dropArea = config.dropArea ?? false;
    itemContainer.noDrop = config.noDrop ?? false;
  });

  onMount(() => {
    container = itemContainer;
    if (!parentContainer) {
      itemContainer.takeRootSnapshot();
    }
  });

  onDestroy(() => {
    for (const instance of ghostMounts.values()) {
      unmount(instance);
    }
    ghostMounts.clear();
    itemContainer.destroy();
  });
</script>

<div
  class="snapsort-container snapsort-mode-{itemContainer.mode} {className}"
  style="flex-direction: {config.direction}; justify-content: {justifyContent}"
  bind:this={itemContainer.element}
>
  {#if itemsMode}
    {@render children?.()}
    {#each renderedEntries as re (re.id)}
      {#if re.kind === "ghost"}
        <!--
          `id="spacer"` matches today's core-created ghost identity (kept so
          existing DOM-shape assertions and demo CSS selectors targeting
          `#spacer` are unaffected by ghost rendering moving to the adapter).
          `data-snapsort-ghost-entry` is the NEW, additional marker meaning
          "this spacer is framework-rendered, not core-inserted" — the one
          to assert on for adapter-ownership tests.
        -->
        <div
          id="spacer"
          class={ghostSnippet ? "" : "ghost"}
          data-snapsort-ghost-entry={re.ghost.event.kind}
          style={flowGhostFootprintStyle(re.ghost.event)}
          use:bindGhostElement={re.ghost.ghostItem}
        >
          {#if ghostSnippet}{@render ghostSnippet(toGhostCreateEvent(re.ghost.event))}{/if}
        </div>
      {:else}
        <Item
          metadata={{ ...getMetadata?.(re.entry), itemId: re.id }}
          className={getClassName?.(re.entry) ?? ""}
          selected={getSelected?.(re.entry) ?? false}
          onclick={onItemClick ? (event: MouseEvent) => onItemClick(re.entry, event) : undefined}
        >
          {@render itemSnippet!(re.entry)}
        </Item>
      {/if}
    {/each}
  {:else}
    {@render children?.()}
  {/if}
</div>

<style>
  .snapsort-container {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
  }
</style>
