<script lang="ts">
  import { ItemContainer } from "@snap-engine/snapsort";
  import type { ItemContainerConfig } from "@snap-engine/snapsort";

  import { getContext, hasContext, setContext, onMount, onDestroy } from "svelte";
  import type { Engine } from "@snap-engine/core";

  let { config, children, container = $bindable(), locked = true }: { config: ItemContainerConfig; children: any; container?: ItemContainer; locked?: boolean } =
    $props();
  const engine: Engine = getContext("engine");
  let itemContainer: ItemContainer = new ItemContainer(engine, null, config);
  itemContainer.locked = locked;
  container = itemContainer;

  // If there's a parent container context, register this container as an item in it
  const parentContainer: ItemContainer | undefined = hasContext("itemContainer") ? getContext("itemContainer") : undefined;

  setContext("itemContainer", itemContainer);

  onMount(() => {
    if (parentContainer) {
      parentContainer.addItem(itemContainer);
    }
  });

  onDestroy(() => {
    itemContainer.destroy();
  });
</script>

<div
  class="container"
  style="flex-direction: {config.direction}"
  bind:this={itemContainer.element}
>
  {@render children()}
</div>

<style>
  .container {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    width: 100%;
  }
</style>
