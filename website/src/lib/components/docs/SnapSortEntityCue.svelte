<script lang="ts">
  let { kind }: { kind: "item" | "container" | "ghost" } = $props();
</script>

<div class="entity-cue" class:is-ghost={kind === "ghost"} aria-hidden="true">
  {#if kind === "container"}
    <div class="entity-container slot shallow">
      <strong>Container</strong>
      <code>itemId: 1</code>
    </div>
  {:else if kind === "item"}
    <div class="entity-item card shallow">
      <strong>Item</strong>
      <code>itemId: 2</code>
    </div>
  {:else}
    <div class="entity-ghost"><strong>ghost</strong></div>
  {/if}
</div>

<style>
  .entity-cue {
    width: min(100%, var(--doc-reading-width, 700px));
    margin: var(--size-24) auto var(--size-32);
    padding: var(--size-24);
    border-radius: var(--ui-radius);
    background: var(--color-background-tint);
    box-sizing: border-box;
    user-select: none;
  }

  .entity-container,
  .entity-item,
  .entity-ghost {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--size-32);
    width: min(100%, 20rem);
    margin: 0 auto;
    padding: var(--size-4) var(--size-8);
    box-sizing: border-box;
  }

  .entity-container {
    background: var(--color-background-tint);
  }

  .entity-item {
    --card-radius: var(--size-8);
  }

  .entity-ghost {
    border-radius: var(--size-8);
    outline: 1px dashed color-mix(in srgb, var(--color-primary) 38%, transparent);
    outline-offset: -2px;
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  }

  strong {
    color: var(--color-text);
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.84rem;
    font-weight: 350;
  }

  .entity-ghost strong {
    color: var(--color-primary);
    font-size: 0.78rem;
  }

  code {
    color: var(--color-background-dark);
    font-family: "Geist Mono", monospace;
    font-size: 0.68rem;
    font-weight: 400;
  }
</style>
