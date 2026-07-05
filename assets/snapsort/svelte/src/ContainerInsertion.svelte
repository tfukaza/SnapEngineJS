<script lang="ts">
  import { ContainerInsertion } from "@snap-engine/snapsort";
  import type { ItemBase, ContainerConfig, ContainerBase } from "@snap-engine/snapsort";

  import { getContext, setContext, onMount, onDestroy } from "svelte";
  import type { Engine } from "@snap-engine/core";

  let { config, children, container = $bindable(), locked = true, className = "", metadata = {} }: { config: ContainerConfig; children: any; container?: ContainerInsertion; locked?: boolean; className?: string; metadata?: Record<string, unknown> } =
    $props();
  const engine: Engine = getContext("engine");
  const parentContainer: ContainerBase | null = getContext("container");

  let itemContainer: ContainerInsertion = new ContainerInsertion(engine, parentContainer, { ...config });
  itemContainer.locked = locked;
  itemContainer.metadata = metadata;
  itemContainer.direction = config.direction ?? "column";
  itemContainer.mainAxisAlign = config.mainAxisAlign ?? "start";
  itemContainer.dropArea = config.dropArea ?? false;
  itemContainer.noDrop = config.noDrop ?? false;
  const justifyContent = $derived(config.mainAxisAlign === "center" ? "center" : "flex-start");
  // const parent: ItemBase | null = getContext("container");
  setContext("container", itemContainer);

  $effect(() => {
    itemContainer.locked = locked;
    itemContainer.metadata = metadata;
    itemContainer.direction = config.direction ?? "column";
    itemContainer.mainAxisAlign = config.mainAxisAlign ?? "start";
    itemContainer.dropArea = config.dropArea ?? false;
    itemContainer.noDrop = config.noDrop ?? false;
  });

  onMount(() => {
    container = itemContainer;
    // parent?.addItem(itemContainer);
    if (parentContainer) {
      // parentContainer.addItem(itemContainer);
    } else {
      itemContainer.takeRootSnapshot();
    }
  });

  onDestroy(() => {
    itemContainer.destroy();
  });
</script>

<div
  class="snapsort-container snapsort-container-insertion {className}"
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
