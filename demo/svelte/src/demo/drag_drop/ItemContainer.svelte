<script lang="ts">
  import { ItemContainer } from "../../../../../src/asset/drag_and_drop/container";
  import type { ItemContainerConfig } from "../../../../../src/asset/drag_and_drop/container";

  import { getContext, setContext } from "svelte";
  import type { Engine } from "../../../../index";

  let { config, children }: { config: ItemContainerConfig; children: any } =
    $props();
  const engine: Engine = getContext("engine");
  let itemContainer: ItemContainer = new ItemContainer(engine, null, config);

  setContext("itemContainer", itemContainer);
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
