<script lang="ts">
  import { ItemContainer } from "../../../../../src/asset/drag_and_drop/container";
  import type { ItemContainerConfig } from "../../../../../src/asset/drag_and_drop/container";

  import { getContext, setContext, onDestroy } from "svelte";
  import type { Engine } from "../../../../index";

  let { config, children, container = $bindable() }: { config: ItemContainerConfig; children: any; container?: ItemContainer } =
    $props();
  const engine: Engine = getContext("engine");
  let itemContainer: ItemContainer = new ItemContainer(engine, null, config);
  container = itemContainer;

  setContext("itemContainer", itemContainer);

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
