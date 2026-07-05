<script lang="ts">
  import AssetsShowcase from "$lib/landing/components/AssetsShowcase.svelte";
  import Hero from "$lib/landing/components/Hero.svelte";
  import Highlights from "$lib/landing/components/Highlights.svelte";
</script>

<Hero />
<Highlights />
<AssetsShowcase />

<style lang="scss">
  @use "$lib/landing/landing.scss";
</style>
