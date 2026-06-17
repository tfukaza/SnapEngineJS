<script lang="ts">
  import { onMount, getContext, onDestroy } from "svelte";
  import { ItemContainer } from "@snap-engine/snapsort";
  import { ItemObject } from "@snap-engine/snapsort";
  import type { ItemMetadata } from "@snap-engine/snapsort";
  import type { Engine } from "@snap-engine/core";

  let { children, style = "", className = "", metadata = {} }: { children: any; style?: string; className?: string; metadata?: ItemMetadata } = $props();
  const engine: Engine = getContext("engine");

  const container: ItemContainer = getContext("container");
  let itemObject: ItemObject = new ItemObject(engine, null);
  const metadataItemKey = (value: ItemMetadata) => {
    return value.itemId ?? null;
  };
  let itemKey = $derived(metadataItemKey(metadata));

  onMount(() => {
    if (container) {
      container.addItem(itemObject);
    }
  });

  $effect(() => {
    itemObject.metadata = metadata;
  });

  onDestroy(() => {
    itemObject.destroy();
  });
</script>

<div
  class="snapsort-item {className}"
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
