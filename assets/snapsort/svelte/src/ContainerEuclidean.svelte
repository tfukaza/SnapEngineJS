<script lang="ts">
  import { ContainerEuclidean } from "@snap-engine/snapsort";
  import type { ItemBase, ContainerConfig, ContainerBase } from "@snap-engine/snapsort";

  import { getContext, setContext, onMount, onDestroy } from "svelte";
  import type { Engine } from "@snap-engine/core";

  let { config, children, container = $bindable(), locked = true, className = "", metadata = {} }: { config: ContainerConfig; children: any; container?: ContainerEuclidean; locked?: boolean; className?: string; metadata?: Record<string, unknown> } =
    $props();
  const engine: Engine = getContext("engine");
  const parentContainer: ContainerBase | null = getContext("container");

  let itemContainer: ContainerEuclidean = new ContainerEuclidean(engine, parentContainer, { ...config });
  itemContainer.locked = locked;
  itemContainer.metadata = metadata;
  const justifyContent = $derived(config.mainAxisAlign === "center" ? "center" : "flex-start");
  // If there's a parent container context, register this container as an item in it
  // const parent: ItemBase | null = getContext("container");
  setContext("container", itemContainer);

  onMount(() => {
    container = itemContainer;
    if (!parentContainer) {
      container.takeRootSnapshot();
    }
    // parentContainer?.addItem(itemContainer);
  });

  onDestroy(() => {
    itemContainer.destroy();
  });
</script>

<div
  class="snapsort-container snapsort-container-euclidean {className}"
  style="flex-direction: {config.direction}; justify-content: {justifyContent}"
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
