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
      {#if title}
        <h3>{title}</h3>
      {/if}
      {#if description}
        <p>{description}</p>
      {/if}
    <!-- {#if hasHeadingAsideSlot}
      <div class="card-heading__aside">
        <slot name="headingAside" />
      </div>
    {/if} -->
  </div>

  {#if hasBodySlot}
    <div class="card-shell-body card ground ">
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
    background: var(--color-background-tint);
    border-radius: var(--ui-radius);
    overflow: hidden;
    display: flex; 

    --card-padding: var(--size-48);
    
    @media (max-width: 720px) {
      --card-padding: var(--size-24);
      grid-column: span 2;
    }
  }

  .card-heading {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: end;
    justify-content: space-between;
    gap: var(--size-48);
    padding: var(--card-padding) var(--card-padding) 0 var(--card-padding);

    h3 {
      width: min-content; 
      margin-bottom: 0;
    }

    @media (max-width: 720px) {
      gap: var(--size-12);
      > * {
        grid-column: span 2;
      }
    }
  }

  .card-shell-body {
    margin: var(--card-padding);
    margin-top: 0;
    height:100%;
  }

  // @media (max-width: 720px) {
  //   .card-heading {
  //     flex-direction: column;
  //     padding: var(--size-32);
  //     padding-bottom: 0;
  //   }
  // }
</style>
