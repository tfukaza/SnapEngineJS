<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import type {
    ItemBase,
  } from "@snap-engine/snapsort";

  let {
    children,
    style = "",
    className = "",
  }: {
    children: any;
    style?: string;
    className?: string;
  } = $props();

  const itemObject: ItemBase | null = getContext("item");
  let handleElement: HTMLElement | null = null;

  onMount(() => {
    if (itemObject && handleElement) {
      itemObject?.addInputAlias(handleElement);
    }
  });

  onDestroy(() => {
    if (itemObject && handleElement) {
      itemObject?.removeInputAlias(handleElement);
    }
  });
</script>

<div
  class="snapsort-handle {className}"
  bind:this={handleElement}
  {style}
>
  {@render children()}
</div>

<style>

</style>
