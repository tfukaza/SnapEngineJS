<script lang="ts" generics="T">
  import {
    Container as SnapSortContainer,
    // Item as SnapSortItem,
    defaultCallbacks,
  } from "@snap-engine/snapsort";
  import type {
    ContainerCallbacks,
    ContainerConfig,
    GhostCreateEvent,
    GhostInsertEvent,
    GhostRemoveEvent,
  } from "@snap-engine/snapsort";

  import { flushSync, getContext, setContext, onMount, onDestroy, untrack } from "svelte";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Engine } from "@snap-engine/core";
  import Ghost from "./Ghost.svelte";

  type ContainerProps<T> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    config: ContainerConfig;
    before?: Snippet<[]>;
    after?: Snippet<[]>;
    itemId?: string;
    items?: T[];
    getItemId?: (entry: T) => string;
    entry?: Snippet<[T]>;
    ghost?: Snippet<[GhostInsertEvent]>;
    container?: SnapSortContainer;
    locked?: boolean;
    selected?: boolean;
    className?: string;
    metadata?: Record<string, unknown>;
  };

  let {
    config,
    before,
    after,
    itemId,
    items,
    getItemId = (entry: T) => (entry as { id: string }).id,
    entry: entrySnippet,
    ghost: ghostSnippet,
    container = $bindable(),
    locked = true,
    selected = false,
    class: classValue = "",
    className = "",
    metadata = {},
    style = "",
    ...divProps
  }: ContainerProps<T> = $props();
  const engine: Engine = getContext("engine");
  const parentContainer: SnapSortContainer | null = getContext("container");
  const initial = untrack(() => ({ config, entrySnippet, itemId, locked, metadata, selected }));

  if (!initial.entrySnippet) {
    throw new Error("SnapSort Container: missing required `entry` snippet.");
  }
  const renderEntry: Snippet<[T]> = initial.entrySnippet;

  if (
    initial.config.callbacks?.createGhost ||
    initial.config.callbacks?.onGhostInsert ||
    initial.config.callbacks?.onGhostRemove
  ) {
    console.warn(
      "SnapSort Container: ghost callbacks (createGhost/onGhostInsert/onGhostRemove) passed " +
        "to the Svelte adapter only fire for marker-kind ghosts (insertion/swap) — flow-mode ghost " +
        "entries are rendered by the adapter itself in items mode. Use the `ghost` snippet to " +
        "customize flow-ghost content instead.",
    );
  }

  interface GhostEntryState {
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
      ghostEntries = [
        ...ghostEntries.filter((g) => g.event.ghostItem !== event.ghostItem),
        { event },
      ];
      return;
    }
    (config.callbacks?.onGhostInsert ?? defaultCallbacks.onGhostInsert)(event);
  }

  function handleItemsModeGhostRemove(event: GhostRemoveEvent): void {
    if (isFlowTargetGhost(event)) {
      ghostEntries = ghostEntries.filter((g) => g.event.ghostItem !== event.ghostItem);
      return;
    }
    (config.callbacks?.onGhostRemove ?? defaultCallbacks.onGhostRemove)(event);
  }

  type RenderedEntry =
    | { kind: "item"; id: string; entry: T }
    | { kind: "ghost"; id: string; ghost: GhostEntryState };

  const renderedEntries = $derived.by((): RenderedEntry[] => {
    const base: RenderedEntry[] = (items ?? []).map((entry) => ({
      kind: "item" as const,
      id: getItemId(entry),
      entry,
    }));
    if (ghostEntries.length === 0) return base;

    const session = ghostEntries[0].event.session;
    const draggedIds = new Set(
      session.items.map((i) => i.resolvedItemId),
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
      result.splice(p, 0, { kind: "ghost", id: `ghost:${g.event.ghostItem.id}`, ghost: g });
    }
    return result;
  });

  const callbacks: ContainerCallbacks = {
    ...initial.config.callbacks,
    createGhost: handleItemsModeCreateGhost,
    onGhostInsert: handleItemsModeGhostInsert,
    onGhostRemove: handleItemsModeGhostRemove,
    // Commit the state mutation before core advances to its final geometry
    // read and inverse-transform write in this rendering opportunity.
    flushMutation: (mutation) => flushSync(mutation),
  };

  let itemContainer: SnapSortContainer = new SnapSortContainer(engine, parentContainer, {
    ...initial.config,
    callbacks,
  });
  itemContainer.itemId = initial.itemId;
  itemContainer.locked = initial.locked;
  itemContainer.selected = initial.selected;
  itemContainer.metadata = initial.metadata;
  itemContainer.direction = initial.config.direction ?? "column";
  itemContainer.mainAxisAlign = initial.config.mainAxisAlign ?? "start";
  itemContainer.wrap = initial.config.wrap ?? "auto";
  itemContainer.stretchItems = initial.config.stretchItems ?? false;
  itemContainer.dropArea = initial.config.dropArea ?? false;
  itemContainer.noDrop = initial.config.noDrop ?? false;
  const justifyContent = $derived(config.mainAxisAlign === "center" ? "center" : "flex-start");
  const mergedClass = $derived(
    `snapsort-container snapsort-mode-${itemContainer.mode} ${classValue} ${className}`.trim(),
  );
  const mergedStyle = $derived(
    `flex-direction:${config.direction};justify-content:${justifyContent};${style ?? ""}`,
  );
  setContext("container", itemContainer);
  setContext("item", itemContainer);

  $effect(() => {
    itemContainer.itemId = itemId;
    itemContainer.locked = locked;
    itemContainer.selected = selected;
    itemContainer.metadata = metadata;
    itemContainer.direction = config.direction ?? "column";
    itemContainer.mainAxisAlign = config.mainAxisAlign ?? "start";
    itemContainer.wrap = config.wrap ?? "auto";
    itemContainer.stretchItems = config.stretchItems ?? false;
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
    itemContainer.destroy();
  });
</script>

{#snippet defaultGhost(event: GhostInsertEvent)}
  <Ghost {event} className="ghost" />
{/snippet}

<div
  {...divProps}
  class={mergedClass}
  style={mergedStyle}
  bind:this={itemContainer.element}
>
  {@render before?.()}
  {#each renderedEntries as re (re.id)}
    {#if re.kind === "ghost"}
      {@render (ghostSnippet ?? defaultGhost)(re.ghost.event)}
    {:else}
      {@render renderEntry(re.entry)}
    {/if}
  {/each}
  {@render after?.()}
</div>

<style>
  .snapsort-container {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
  }
</style>
