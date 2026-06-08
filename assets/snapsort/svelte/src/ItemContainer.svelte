<script lang="ts">
  import { ItemContainer } from "@snap-engine/snapsort";
  import type { ItemContainerConfig } from "@snap-engine/snapsort";

  import { getContext, setContext, onMount, onDestroy } from "svelte";
  import type { Engine } from "@snap-engine/core";
  import Item from "./Item.svelte";

  let { config, children, container = $bindable(), locked = true, className = "" }: { config: ItemContainerConfig; children: any; container?: ItemContainer; locked?: boolean; className?: string } =
    $props();
  const engine: Engine = getContext("engine");

  let itemContainer: ItemContainer = new ItemContainer(engine, null, config);
  itemContainer.locked = locked;
  container = itemContainer;
  // If there's a parent container context, register this container as an item in it
  const parent: ItemContainer | Item = getContext("container");
  setContext("container", itemContainer);

  onMount(() => {
    if (parent) {
      parent.addItem(itemContainer);
    }
  });

  onDestroy(() => {
    itemContainer.destroy();
  });
</script>

<div
  class="snapsort-container {className}"
  style="flex-direction: {config.direction}"
  bind:this={itemContainer.element}
>
  {@render children?.()}
</div>

<style>
  .snapsort-container {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
  }
</style>
