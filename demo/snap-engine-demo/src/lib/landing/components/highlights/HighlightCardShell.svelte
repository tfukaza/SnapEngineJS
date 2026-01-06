<script lang="ts">
  export let className = "";
</script>

<article class={`${className}`.trim()}>
  <slot />
</article>

<style lang="scss">
  article {
    // --card-accent: var(--color-secondary, #1e2659);
    // background: var(--color-background, #f6f5f4);
    text-align: left;
    // padding: clamp(1.25rem, 3vw, 2rem);
    // border-radius: var(--size-8, 1rem);
    // border: 1px solid rgba(58, 42, 34, 0.08);
    // box-shadow: none;
    height: 100%;
    box-sizing: border-box;
  }
</style>
