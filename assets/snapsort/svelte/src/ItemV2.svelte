<script lang="ts">
  import { onMount, getContext, onDestroy } from "svelte";
  import { ItemContainerV2 } from "@snap-engine/snapsort";
  import { ItemObjectV2 } from "@snap-engine/snapsort";
  import type { Engine } from "@snap-engine/core";

  let { children, style = "", className = "", metadata = {} }: { children: any; style?: string; className?: string; metadata?: Record<string, unknown> } = $props();
  const engine: Engine = getContext("engine");

  const container: ItemContainerV2 = getContext("container");
  let itemObject: ItemObjectV2 = new ItemObjectV2(engine, null);

  onMount(() => {
    if (container) {
      container.addItem(itemObject);
    }
    // itemObject.metadata = metadata;
  });

  $effect(() => {
    itemObject.metadata = metadata;
  });

  onDestroy(() => {
    itemObject.destroy();
  });
</script>

<div class="item-wrapper-v2 {className}" bind:this={itemObject.element} {style}>
  <div class="item-v2">
    {@render children()}
  </div>
</div>

<style>
  .item-wrapper-v2 {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--size-4);
    box-sizing: border-box;
  }
</style>
