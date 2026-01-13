<script lang="ts">
  export let className = "";
  export let title = "";
  export let description = "";
  // Slots are compile-time only; ignore TS complaints when checking presence
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const hasBodySlot = Boolean($$slots.default);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const hasHeadingAsideSlot = Boolean($$slots.headingAside);
</script>

<article class={`${className}`.trim()}>
  <div class="card-heading">
    <div class="card-heading__text">
      {#if title}
        <h3>{title}</h3>
      {/if}
      {#if description}
        <p>{description}</p>
      {/if}
    </div>
    {#if hasHeadingAsideSlot}
      <div class="card-heading__aside">
        <slot name="headingAside" />
      </div>
    {/if}
  </div>

  {#if hasBodySlot}
    <div class="card-shell-body">
      <slot />
    </div>
  {/if}
</article>

<style lang="scss">
  article {
    flex-direction: column;
    gap: var(--size-32);
    height: 100%;
    box-sizing: border-box;
    // background: var(--color-background);
    border: 1px solid #e6e3e2;
    border-radius: var(--ui-radius);
    overflow: hidden;
    display: flex;
    // padding: var(--size-48);
  }

   @media (max-width: 720px) {
    article {
      // padding: var(--size-24);
      grid-column: span 2;
    }
  }

  .card-shell-body {
    flex: 1 1 auto;
    border-top: 1px solid #e6e3e2;
    position: relative;
  }

  .card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--size-16);
    padding: var(--size-48) var(--size-48) 0 var(--size-48);
  }

  .card-heading__text {
    flex: 1 1 auto;
    min-width: 0;
  }

  .card-heading__text h3 {
    margin: 0;
    letter-spacing: -0.02em;
    font-size: 1.5rem;
  }

  .card-heading__text p {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    color: rgba(58, 42, 34, 0.75);
  }

  .card-heading__aside {
    display: flex;
    flex-shrink: 0;
    align-items: flex-start;
    justify-content: flex-end;
  }

  @media (max-width: 720px) {
    .card-heading {
      flex-direction: column;
      padding: var(--size-32);
      padding-bottom: 0;
    }

    .card-heading__aside {
      width: 100%;
      justify-content: flex-start;
    }
  }
</style>
