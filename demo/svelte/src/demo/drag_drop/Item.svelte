<script lang="ts">
  import { onMount, getContext, onDestroy } from "svelte";
  import { ItemContainer } from "../../../../../src/asset/drag_and_drop/container";
  import type { ClickAction } from "../../../../../src/asset/drag_and_drop/container";
  import { ItemObject } from "../../../../../src/asset/drag_and_drop/item";
  import type { Engine } from "../../../../../src/index";


  let { children, style = "", className = "", onClickAction = null }: { children: any; style?: string; className?: string; onClickAction?: ClickAction | null } = $props();
  const engine: Engine = getContext("engine");
  const itemContainer: ItemContainer = getContext("itemContainer");

  let itemObject: ItemObject = new ItemObject(engine, null);

  onMount(() => {
    itemContainer.addItem(itemObject);
    if (onClickAction) {
      itemObject.onClickAction = onClickAction;
    }
  });

  $effect(() => {
    if (onClickAction) {
      itemObject.onClickAction = onClickAction;
    }
  });

  onDestroy(() => {
    itemObject.destroy();
  });
</script>

<div class="item-wrapper {className}" bind:this={itemObject.element} {style}>
  <div class="item">
    {@render children()}
  </div>
</div>

<style>
  @import "../../../../app.scss";
  .item-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--size-4);
    box-sizing: border-box;

  }

  .item {
    /* padding: var(--size-4) var(--size-8);
    background-color: var(--color-background-tint);
    box-sizing: border-box; */
  }



  @media (max-width: 600px) and (min-width: 401px) {
    .item {
      padding: var(--size-8);
    }
  }

  @media (max-width: 400px) {
    .item {
      padding: 6px 8px 4px 8px;
      border-radius: var(--size-12);
      :global(p) {
        font-size: 0.8rem;
      }
    }
  }
</style>
