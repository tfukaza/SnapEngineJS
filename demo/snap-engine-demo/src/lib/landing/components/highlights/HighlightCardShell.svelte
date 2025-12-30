<script lang="ts">
  export let className = "";
</script>

<article class={`info-card card ${className}`.trim()}>
  <slot />
</article>

<style lang="scss">
  article {
    background: white;
    text-align: left;
    
    // padding: 1.5rem;
    // border-radius: 1.25rem;
    // box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 8px 20px rgba(27, 16, 10, 0.08);
    // text-align: left;
    // min-height: 160px;
  }

//   :global(.info-card h3) {
//     margin: 0 0 0.75rem;
//     font-size: 1.1rem;
//     color: #3a2a22;
//   }

//   :global(.info-card p) {
//     margin: 0;
//     color: #6c5b53;
//     font-size: 0.95rem;
//     line-height: 1.4;
//   }
</style>
