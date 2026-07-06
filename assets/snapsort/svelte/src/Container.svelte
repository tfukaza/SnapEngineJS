<script lang="ts" generics="T">
  import { Container as SnapSortContainer } from "@snap-engine/snapsort";
  import type {
    ContainerCallbacks,
    ContainerConfig,
    GhostCreateEvent,
    GhostRemoveEvent,
  } from "@snap-engine/snapsort";

  import { getContext, setContext, onMount, onDestroy, mount, unmount } from "svelte";
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

    // Flow-mode spacer: always sized to the dragged item's footprint so
    // layout doesn't jump, regardless of custom content — `ghost` (if
    // provided) only customizes what renders *inside* that footprint.
    const origProp = event.original.dragSnapshot?.box ?? event.original.currentDomProperty;
    el.id = "spacer";
    const width = event.ghostRect?.width ?? origProp.width;
    const height = event.ghostRect?.height ?? origProp.height;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.margin = `${origProp.margin.top}px ${origProp.margin.right}px ${origProp.margin.bottom}px ${origProp.margin.left}px`;
    el.style.boxSizing = "border-box";

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

  const callbacks: ContainerCallbacks = ghostSnippet
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
  {#if items}
    {#each items as entry (getId(entry))}
      <Item
        metadata={{ itemId: getId(entry) }}
        className={getClassName?.(entry) ?? ""}
        selected={getSelected?.(entry) ?? false}
        onclick={onItemClick ? (event: MouseEvent) => onItemClick(entry, event) : undefined}
      >
        {@render itemSnippet!(entry)}
      </Item>
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
