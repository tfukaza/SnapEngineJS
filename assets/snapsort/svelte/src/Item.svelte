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
    itemObject: providedItemObject = null,
  }: {
    children: any;
    style?: string;
    className?: string;
    metadata?: ItemSnapshotMetadata;
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
