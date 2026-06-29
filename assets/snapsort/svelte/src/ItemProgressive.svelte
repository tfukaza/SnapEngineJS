<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import { ItemProgressive } from "@snap-engine/snapsort";
  import type {
    ItemBase,
    ContainerBase,
    ItemMetadata,
  } from "@snap-engine/snapsort";
  import type { Engine } from "@snap-engine/core";

  let {
    children,
    style = "",
    className = "",
    metadata = {},
    itemObject: providedItemObject = null,
    itemKey = null,
  }: {
    children: any;
    style?: string;
    className?: string;
    metadata?: ItemMetadata;
    itemObject?: ItemBase | null;
    itemKey?: string | null;
  } = $props();

  const engine: Engine = getContext("engine");
  const container: ContainerBase | null = getContext("container");
  const ownsItem = providedItemObject == null;
  const itemObject: ItemBase = providedItemObject ?? new ItemProgressive(engine, null);
  if (ownsItem || Object.keys(metadata).length > 0) {
    itemObject.metadata = metadata;
  }

  const metadataItemKey = (value: ItemMetadata) => value.itemId ?? null;
  let resolvedItemKey = $derived(itemKey ?? metadataItemKey(itemObject.metadata));

  onMount(() => {
    if (ownsItem) {
      container?.addItem(itemObject);
    }
  });

  onDestroy(() => {
    if (ownsItem) {
      itemObject.destroy();
    }
  });
</script>

<div
  class="snapsort-item snapsort-item-progressive {className}"
  bind:this={itemObject.element}
  data-snapsort-item-key={resolvedItemKey}
  {style}
>
  {@render children()}
</div>

<style>
  .snapsort-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--size-4);
    box-sizing: border-box;
  }
</style>
