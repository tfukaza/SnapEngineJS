<script lang="ts">
  import { Container as SnapSortContainer } from "@snap-engine/snapsort";
  import type { ContainerConfig } from "@snap-engine/snapsort";

  import { getContext, setContext, onMount, onDestroy } from "svelte";
  import type { Engine } from "@snap-engine/core";

  let { config, children, container = $bindable(), locked = true, selected = false, className = "", metadata = {} }: { config: ContainerConfig; children: any; container?: SnapSortContainer; locked?: boolean; selected?: boolean; className?: string; metadata?: Record<string, unknown> } =
    $props();
  const engine: Engine = getContext("engine");
  const parentContainer: SnapSortContainer | null = getContext("container");

  let itemContainer: SnapSortContainer = new SnapSortContainer(engine, parentContainer, { ...config });
  itemContainer.locked = locked;
  itemContainer.selected = selected;
  itemContainer.metadata = metadata;
  itemContainer.direction = config.direction ?? "column";
  itemContainer.mainAxisAlign = config.mainAxisAlign ?? "start";
  itemContainer.dropArea = config.dropArea ?? false;
  itemContainer.noDrop = config.noDrop ?? false;
  const justifyContent = $derived(config.mainAxisAlign === "center" ? "center" : "flex-start");
  setContext("container", itemContainer);

  $effect(() => {
    itemContainer.locked = locked;
    itemContainer.selected = selected;
    itemContainer.metadata = metadata;
    itemContainer.direction = config.direction ?? "column";
    itemContainer.mainAxisAlign = config.mainAxisAlign ?? "start";
    itemContainer.dropArea = config.dropArea ?? false;
    itemContainer.noDrop = config.noDrop ?? false;
  });

  onMount(() => {
    container = itemContainer;
    if (!parentContainer) {
      itemContainer.takeRootSnapshot();
    }
  });

  onDestroy(() => {
    itemContainer.destroy();
  });
</script>

<div
  class="snapsort-container snapsort-mode-{itemContainer.mode} {className}"
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
