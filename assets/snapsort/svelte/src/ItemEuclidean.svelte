<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import { ItemEuclidean } from "@snap-engine/snapsort";
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
  }: {
    children: any;
    style?: string;
    className?: string;
    metadata?: ItemMetadata;
  } = $props();

  const engine: Engine = getContext("engine");
  const container: ContainerBase | null = getContext("container");
  const itemObject: ItemBase = new ItemEuclidean(engine, null);
  itemObject.metadata = metadata;

  const metadataItemKey = (value: ItemMetadata) => value.itemId ?? null;
  let itemKey = $derived(metadataItemKey(metadata));

  onMount(() => {
    container?.addItem(itemObject);
  });

  onDestroy(() => {
    itemObject.destroy();
  });
</script>

<div
  class="snapsort-item snapsort-item-euclidean {className}"
  bind:this={itemObject.element}
  data-snapsort-item-key={itemKey}
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
