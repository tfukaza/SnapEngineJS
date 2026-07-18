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
    itemId,
    style = "",
    className = "",
    metadata = {},
    selected = false,
    onclick,
    itemObject: providedItemObject = null,
  }: {
    children: any;
    itemId?: string;
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

  if ("itemId" in metadata) {
    throw new Error("SnapSort Item: `metadata.itemId` was removed. Pass `itemId` as its own prop instead.");
  }

  setContext("item", itemObject);

  if (itemId !== undefined) {
    itemObject.itemId = itemId;
  }
  if (!itemObject.itemId) {
    throw new Error("SnapSort Item: missing required `itemId` prop.");
  }

  if (ownsItem || Object.keys(metadata).length > 0) {
    itemObject.metadata = metadata;
  }

  $effect(() => {
    if (itemId !== undefined) {
      itemObject.itemId = itemId;
    }
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
