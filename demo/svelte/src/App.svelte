<script lang="ts">
  import Landing from "./Landing.svelte";
</script>

<div class="svelte-demo-root dev-style">
  <Landing />
</div>

<style lang="scss">
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }

  .svelte-demo-root {
    width: 100%;
    min-height: 100vh;
  }
</style>
