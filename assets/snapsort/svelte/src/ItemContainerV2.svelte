<script lang="ts">
  import { ItemContainerV2 } from "@snap-engine/snapsort";
  import type { ItemContainerV2Config } from "@snap-engine/snapsort";

  import { getContext, hasContext, setContext, onMount, onDestroy } from "svelte";
  import type { Engine } from "@snap-engine/core";
    import ItemV2 from "./ItemV2.svelte";

  let { config, children, container = $bindable(), locked = true }: { config: ItemContainerV2Config; children: any; container?: ItemContainerV2; locked?: boolean } =
    $props();
  const engine: Engine = getContext("engine");

  let itemContainer: ItemContainerV2 = new ItemContainerV2(engine, null, config);
  itemContainer.locked = locked;
  container = itemContainer;
  // If there's a parent container context, register this container as an item in it
  const parent: ItemContainerV2 | ItemV2 = getContext("container");
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
  class="container-v2"
  style="flex-direction: {config.direction}"
  bind:this={itemContainer.element}
>
  {@render children()}
</div>

<style>
  .container-v2 {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
  }
</style>
