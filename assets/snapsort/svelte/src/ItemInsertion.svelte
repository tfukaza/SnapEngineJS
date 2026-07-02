<script lang="ts">
  import { getContext, setContext, onDestroy, onMount } from "svelte";
  import { ItemInsertion } from "@snap-engine/snapsort";
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
  }: {
    children: any;
    style?: string;
    className?: string;
    metadata?: ItemMetadata;
    itemObject?: ItemBase | null;
  } = $props();

  const engine: Engine = getContext("engine");
  const container: ContainerBase | null = getContext("container");
  const ownsItem = providedItemObject == null;
  const itemObject: ItemBase = providedItemObject ?? new ItemInsertion(engine, null);

  setContext("item", itemObject);

  if (ownsItem || Object.keys(metadata).length > 0) {
    itemObject.metadata = metadata;
  }

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
  class="snapsort-item snapsort-item-insertion {className}"
  bind:this={itemObject.element}
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
