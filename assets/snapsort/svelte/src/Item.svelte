<script lang="ts">
  import { getContext, setContext, onDestroy } from "svelte";
  import { Item as SnapSortItem } from "@snap-engine/snapsort";
  import type {
    Container,
    ItemSnapshotMetadata,
  } from "@snap-engine/snapsort";
  import type { Engine } from "@snap-engine/core";

  let {
    children,
    style = "",
    className = "",
    metadata = {},
    selected = false,
    onclick,
    itemObject: providedItemObject = null,
  }: {
    children: any;
    style?: string;
    className?: string;
    metadata?: ItemSnapshotMetadata;
    selected?: boolean;
    onclick?: (event: MouseEvent) => void;
    itemObject?: SnapSortItem | null;
  } = $props();

  const engine: Engine = getContext("engine");
  const container: Container | null = getContext("container");
  const ownsItem = providedItemObject == null;
  const itemObject: SnapSortItem = providedItemObject ?? new SnapSortItem(engine, container);

  setContext("item", itemObject);

  if (ownsItem || Object.keys(metadata).length > 0) {
    itemObject.metadata = metadata;
  }

  $effect(() => {
    itemObject.selected = selected;
  });

  onDestroy(() => {
    if (ownsItem) {
      itemObject.destroy();
    }
  });
</script>

<div
  class="snapsort-item {className}"
  bind:this={itemObject.element}
  {style}
  {onclick}
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
