<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  let {
    children,
    fallback,
    className = "",
  }: {
    children: Snippet;
    fallback?: Snippet;
    className?: string;
  } = $props();

  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });
</script>

{#if mounted}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{:else}
  <div class="demo-skeleton {className}" aria-hidden="true">
    <div></div>
    <div></div>
    <div></div>
  </div>
{/if}

<style>
  .demo-skeleton {
    display: grid;
    gap: 0.85rem;
    width: 100%;
    height: 100%;
    min-height: 16rem;
    padding: 1rem;
    border-radius: inherit;
    background: color-mix(in srgb, var(--color-background-tint, #f5f3ef) 88%, #000 4%);
    box-sizing: border-box;
  }

  .demo-skeleton div {
    border-radius: 8px;
    background: rgb(31 30 41 / 7%);
  }
</style>
